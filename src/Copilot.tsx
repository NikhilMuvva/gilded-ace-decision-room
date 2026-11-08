import { useEffect, useRef, useState } from "react";
import { X, Send, ArrowRight } from "lucide-react";
import { offlineEvidence, validateContext } from "./investigation.mjs";
import { number, money, type Data } from "./ui";
export function savedPlan(data: Data) {
  try {
    const value = JSON.parse(
      localStorage.getItem("gilded-ace-plan-v1") || "null",
    );
    if (Array.isArray(value)) return value;
  } catch {}
  return data.planner.recommended.map((e: Data) => ({
    ...e,
    effect: 0,
    extraCost: 0,
  }));
}
const examples = [
  "Which operational opportunities support the recommended portfolio?",
  "Why is M-1158 flagged, and should it be replaced?",
  "What do we really know about Back Forty and its walkway closure?",
  "Compare June demand between Back Forty and Center Pit.",
  "What are the assumptions behind this $1,200 inspection?",
  "Which quieter days might be better for planned maintenance?",
];
export function CopilotPanel({
  data,
  context,
  onClose,
  onOpen,
}: {
  data: Data;
  context: Data;
  onClose: () => void;
  onOpen: (target: Data) => void;
}) {
  const [question, setQuestion] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [answer, setAnswer] = useState<Data>(null),
    [asked, setAsked] = useState("");
  const field = useRef<HTMLTextAreaElement>(null),
    abort = useRef<AbortController | null>(null),
    live = useRef(context);
  live.current = context;
  const fingerprint = JSON.stringify(context),
    stale = answer && JSON.stringify(answer.context) !== fingerprint;
  useEffect(() => {
    field.current?.focus();
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", escape);
    return () => {
      abort.current?.abort();
      document.removeEventListener("keydown", escape);
      document.getElementById("ask-data")?.focus();
    };
  }, []);
  const ask = async (text: string) => {
    setError("");
    setAnswer(null);
    setBusy(true);
    setAsked(text);
    setQuestion(text);
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    const requestContext = JSON.parse(JSON.stringify(live.current));
    try {
      validateContext(data, requestContext);
      // Validate IDs/question locally too; unsupported IDs never reach an external API.
      const evidence = offlineEvidence(data, requestContext, text);
      let result: Data;
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: text,
            context: requestContext,
            requestId: crypto.randomUUID(),
          }),
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(22000),
          ]),
        });
        if (!response.ok) {
          const message =
            response.status === 429
              ? "Request limit reached."
              : response.status === 400
                ? "The service rejected this request."
                : "";
          throw Error(message);
        }
        result = await response.json();
        if (
          JSON.stringify(result.context) !== JSON.stringify(requestContext) ||
          !["live", "offline"].includes(result.mode) ||
          !Array.isArray(result.cards) ||
          !result.cards.length ||
          result.cards.length > 4
        )
          throw Error("Unverified response.");
      } catch (e) {
        if (controller.signal.aborted) return;
        result = {
          context: requestContext,
          mode: "offline",
          reason: `Live Gemini is unavailable. ${(e as Error).message || "No API connection."} Showing deterministic local evidence.`,
          cards: evidence,
        };
      }
      if (!controller.signal.aborted) setAnswer(result);
    } catch (e) {
      if (!controller.signal.aborted) setError((e as Error).message);
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  };
  return (
    <aside
      className="copilot-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby="copilot-title"
    >
      <div className="copilot-head">
        <div>
          <h2 id="copilot-title">Investigation copilot</h2>
          <small>Read-only evidence · synthetic casino</small>
        </div>
        <button
          className="icon-button"
          aria-label="Close investigation copilot"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>
      <p className="copilot-scope">
        Current context: {context.page} · {context.start}–{context.end} ·{" "}
        {context.zone} / {context.bank}
        {context.machine ? ` · ${context.machine}` : ""}. Guest group:{" "}
        {context.group}. Plan: {context.plan.length} configured action types.
      </p>
      <div className="copilot-body">
        {!answer && !busy && (
          <div className="copilot-examples">
            <p>Choose a question or ask your own.</p>
            {examples.map((q) => (
              <button key={q} onClick={() => ask(q)}>
                {q}
                <ArrowRight size={13} />
              </button>
            ))}
          </div>
        )}
        {busy && <p role="status">Checking evidence for “{asked}”…</p>}
        {error && (
          <p role="alert" className="errors">
            {error}
          </p>
        )}
        {answer && (
          <>
            <p className="copilot-question">{asked}</p>
            <div className={"copilot-mode " + answer.mode} role="status">
              <b>
                {answer.mode === "live"
                  ? "Live Gemini · verified evidence"
                  : "Offline evidence · live AI unavailable"}
              </b>
              <p>{answer.reason}</p>
            </div>
            {stale && (
              <p role="alert" className="errors">
                Analysis selections have changed. This answer uses its recorded
                scope. Ask again before opening an analysis.
              </p>
            )}
            {answer.cards.map((card: Data) => (
              <article key={card.id} className="evidence-card">
                <span className="eyebrow">{card.kind}</span>
                <h3>{card.title}</h3>
                <small>{card.scope}</small>
                <dl>
                  {card.metrics.map((metric: Data, i: number) => (
                    <div key={i}>
                      <dt>{metric.label}</dt>
                      <dd>
                        {metric.value === null
                          ? "Unpriced / unavailable"
                          : metric.unit === "USD" ||
                              metric.unit === "USD/day" ||
                              metric.unit === "USD/hour"
                            ? money(metric.value, false, 2)
                            : number(
                                metric.value,
                                metric.unit === "probability" ? 6 : 3,
                              )}
                        {metric.unit === "USD" ? "" : ` ${metric.unit}`}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p>{card.explanation}</p>
                <p className="evidence-limit">{card.limitations}</p>
                <div className="doc-links">
                  {card.evidence
                    .filter((e: Data) =>
                      /^\/docs\/[A-Z_]+\.(md|json)$/.test(e.href),
                    )
                    .map((e: Data) => (
                      <a
                        key={e.href}
                        href={e.href}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {e.label} ↗
                      </a>
                    ))}
                </div>
                {card.open && (
                  <button
                    className="button secondary"
                    disabled={Boolean(stale)}
                    onClick={() => onOpen(card.open)}
                  >
                    Open analysis <ArrowRight size={13} />
                  </button>
                )}
              </article>
            ))}
          </>
        )}
      </div>
      <form
        className="copilot-form"
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
      >
        <label htmlFor="copilot-question">Ask about this data</label>
        <textarea
          ref={field}
          id="copilot-question"
          maxLength={1200}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={2}
        />
        <div>
          <small>{question.length}/1,200 · No plan edits or purchases</small>
          <button
            className="button primary"
            disabled={busy || !question.trim()}
            type="submit"
          >
            <Send size={14} /> Ask
          </button>
        </div>
      </form>
    </aside>
  );
}
