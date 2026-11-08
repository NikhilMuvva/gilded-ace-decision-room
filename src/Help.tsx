import React, {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, Search, X } from "lucide-react";
import { glossary, helpTopics, type HelpTopic } from "./helpContent";

export const HelpContext = createContext<
  (topic: HelpTopic, term?: string) => void
>(() => {});
export function MetricHelp({ term, label }: { term: string; label?: string }) {
  const entry = glossary.find((t) => t.id === term),
    [open, setOpen] = useState(false),
    [position, setPosition] = useState({ left: 12, top: 12 }),
    id = useId(),
    root = useRef<HTMLSpanElement>(null),
    popup = useRef<HTMLSpanElement>(null),
    openHelp = useContext(HelpContext),
    trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    popup.current?.focus();
    const outside = (event: PointerEvent) => {
      if (
        !root.current?.contains(event.target as Node) &&
        !popup.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  if (!entry) return null;
  return (
    <span
      className="metric-help"
      ref={root}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setOpen(false);
          trigger.current?.focus();
          e.stopPropagation();
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="help-dot"
        title={entry.meaning}
        aria-label={`Explain ${label || entry.name}`}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={(e) => {
          e.stopPropagation();
          const b = e.currentTarget.getBoundingClientRect();
          setPosition({
            left: Math.max(12, Math.min(b.left, window.innerWidth - 352)),
            top:
              b.bottom + 270 < window.innerHeight
                ? b.bottom + 8
                : Math.max(12, b.top - 255),
          });
          setOpen((v) => !v);
        }}
      >
        ?
      </button>
      {open &&
        createPortal(
          <span
            ref={popup}
            tabIndex={-1}
            id={id}
            className="metric-popover"
            role="note"
            style={position}
          >
            <strong>{entry.name}</strong>
            <span>{entry.meaning}</span>
            <button
              className="text-button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                openHelp(entry.topic, entry.id);
              }}
            >
              Learn with examples <ArrowRight size={13} />
            </button>
            <button
              className="popover-close"
              aria-label="Close explanation"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                trigger.current?.focus();
              }}
            >
              <X size={13} />
            </button>
          </span>,
          document.body,
        )}
    </span>
  );
}

const dollars = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(v);
function Lesson({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="learning-example">
      <p className="eyebrow">
        TRY IT · ILLUSTRATIVE INPUTS, NOT CASINO RESULTS
      </p>
      <h3>{title}</h3>
      {children}
    </div>
  );
}
function GamingExample() {
  const [wager, setWager] = useState(500),
    [payout, setPayout] = useState(460),
    [rtp, setRtp] = useState(92),
    win = wager - payout,
    theo = wager * (1 - rtp / 100);
  return (
    <Lesson title="The same play, two sides of the ledger">
      <div className="lesson-inputs">
        <label>
          Total wagers ($)
          <input
            type="number"
            min="0"
            step="10"
            value={wager}
            onChange={(e) => setWager(Math.max(0, Number(e.target.value)))}
          />
        </label>
        <label>
          Game payouts ($)
          <input
            type="number"
            min="0"
            step="10"
            value={payout}
            onChange={(e) => setPayout(Math.max(0, Number(e.target.value)))}
          />
        </label>
        <label>
          Configured RTP (%)
          <input
            type="number"
            min="0"
            max="100"
            value={rtp}
            onChange={(e) =>
              setRtp(Math.max(0, Math.min(100, Number(e.target.value))))
            }
          />
        </label>
      </div>
      <dl className="lesson-results" aria-live="polite">
        <div>
          <dt>House win</dt>
          <dd>{dollars(win)}</dd>
        </div>
        <div>
          <dt>Player net</dt>
          <dd>{dollars(-win)}</dd>
        </div>
        <div>
          <dt>Observed hold</dt>
          <dd>
            {wager
              ? `${((win / wager) * 100).toFixed(1)}%`
              : "Undefined: no wagers"}
          </dd>
        </div>
        <div>
          <dt>Expected house win (theo)</dt>
          <dd>{dollars(theo)}</dd>
        </div>
        <div>
          <dt>House luck residual</dt>
          <dd>{dollars(win - theo)}</dd>
        </div>
      </dl>
      <p>
        Try increasing payouts while keeping wagers and RTP fixed. The actual
        house result changes; theo stays the same. A payout greater than wagers
        is a valid player win.
      </p>
    </Lesson>
  );
}
function HoursExample() {
  const [available, setAvailable] = useState(22),
    [occupied, setOccupied] = useState(11);
  return (
    <Lesson title="Being open is different from being busy">
      <p>Imagine one machine scheduled for 24 hours.</p>
      <div className="lesson-inputs">
        <label>
          Available hours: {available}
          <input
            aria-label="Learning available hours"
            type="range"
            min="0"
            max="24"
            value={available}
            onChange={(e) => {
              const v = Number(e.target.value);
              setAvailable(v);
              setOccupied(Math.min(v, occupied));
            }}
          />
        </label>
        <label>
          Occupied hours: {occupied}
          <input
            aria-label="Learning occupied hours"
            type="range"
            min="0"
            max={available}
            value={occupied}
            onChange={(e) => setOccupied(Number(e.target.value))}
          />
        </label>
      </div>
      <dl className="lesson-results" aria-live="polite">
        <div>
          <dt>Availability</dt>
          <dd>{((available / 24) * 100).toFixed(1)}%</dd>
        </div>
        <div>
          <dt>Occupancy</dt>
          <dd>
            {available
              ? `${((occupied / available) * 100).toFixed(1)}%`
              : "Undefined: no available hours"}
          </dd>
        </div>
        <div>
          <dt>Downtime</dt>
          <dd>{24 - available} hours</dd>
        </div>
      </dl>
      <p>
        Availability asks whether the machine could be played. Occupancy asks
        whether its available time was used. Real dashboard days use actual
        scheduled time, including daylight-saving changes.
      </p>
    </Lesson>
  );
}
function BudgetExample() {
  const [lead, setLead] = useState(14),
    [effect, setEffect] = useState(5),
    days = Math.max(0, 30 - lead),
    cost = 2500 + 55 * days,
    base = 200 * days,
    gain = (base * effect) / 100;
  return (
    <Lesson title="A plausible idea still needs to clear its cost">
      <p>
        Learning example: a $2,500 lease plus $55 per operating day, against a
        hypothetical $200/day expected-win baseline. The baseline is
        illustrative; it is not a casino estimate.
      </p>
      <div className="lesson-inputs">
        <label>
          Lead time: {lead} days
          <input
            aria-label="Learning lead days"
            type="range"
            min="0"
            max="30"
            value={lead}
            onChange={(e) => setLead(Number(e.target.value))}
          />
        </label>
        <label>
          Assumed improvement: {effect}%
          <input
            aria-label="Learning assumed improvement"
            type="range"
            min="0"
            max="150"
            value={effect}
            onChange={(e) => setEffect(Number(e.target.value))}
          />
        </label>
      </div>
      <dl className="lesson-results" aria-live="polite">
        <div>
          <dt>Benefit days</dt>
          <dd>{days}</dd>
        </div>
        <div>
          <dt>30-day price</dt>
          <dd>{dollars(cost)}</dd>
        </div>
        <div>
          <dt>Assumed additional theo</dt>
          <dd>{dollars(gain)}</dd>
        </div>
        <div>
          <dt>Net before downtime</dt>
          <dd>{dollars(gain - cost)}</dd>
        </div>
        <div>
          <dt>Break-even improvement</dt>
          <dd>
            {base
              ? `${((cost / base) * 100).toFixed(1)}%`
              : "Unavailable: no benefit days"}
          </dd>
        </div>
      </dl>
      <p>
        Changing the assumed improvement changes this scenario, not the
        evidence. The real planner also debits required downtime, enforces
        catalog rules, and avoids adding overlapping benefits. Its effect ranges
        are narrower than this learning example.
      </p>
    </Lesson>
  );
}

const destinations = [
  [
    "hourly",
    "Hourly operations",
    "Query historical machine-hours from Tiger Data, compare quiet and busy hours, and assess maintenance disruption. The original investigations remain available if the service is offline.",
  ],
  [
    "overview",
    "Executive briefing",
    "Start with the replacement question, the strongest findings, and the next decision.",
  ],
  [
    "machines",
    "Machine performance",
    "Choose a machine; compare actual win, hours, similar machines, and payout flags.",
  ],
  [
    "demand",
    "Demand & location",
    "Examine zone demand, walkway access, traffic, events, and recorded moves.",
  ],
  [
    "downtime",
    "Availability & repairs",
    "See unavailable time and estimated opportunity, then examine the repair queue.",
  ],
  [
    "guests",
    "Tracked guest outcomes",
    "Read carded-player results and explore a home-region or opening-tier group.",
  ],
  [
    "loyalty",
    "Loyalty costs",
    "Distinguish benefit menu value from cost, and investigate point pricing.",
  ],
  [
    "planner",
    "Investment planner",
    "Price and compare up to three action types for July 1–30, 2025.",
  ],
  [
    "opportunities",
    "Opportunities",
    "Review separate reliability, demand, cost, location and loyalty questions, then open the evidence or a portfolio comparison.",
  ],
  [
    "methods",
    "Methods & evidence",
    "Audit formulas, sources, forecast validation, and limitations.",
  ],
];

export function HelpPage({
  topic,
  focusTerm,
  onReturn,
  returnLabel,
  onNavigate,
}: {
  topic: HelpTopic;
  focusTerm?: string;
  onReturn: () => void;
  returnLabel: string;
  onNavigate: (page: string) => void;
}) {
  const [activeTopic, setActiveTopic] = useState<HelpTopic>(topic),
    [search, setSearch] = useState(""),
    [showAll, setShowAll] = useState(false);
  const moveTo = (id: string) => {
    const section = document.getElementById(`learn-${id}`);
    section?.scrollIntoView?.({ block: "start" });
    section?.focus({ preventScroll: true });
  };
  useEffect(() => {
    setActiveTopic(topic);
    if (topic === "start") {
      window.scrollTo({ top: 0, behavior: "auto" });
      document
        .getElementById("help-welcome-heading")
        ?.focus({ preventScroll: true });
    } else moveTo(topic);
  }, [topic]);
  useEffect(() => {
    if (focusTerm) {
      const entry = glossary.find((t) => t.id === focusTerm);
      setSearch(entry?.name || "");
      setShowAll(false);
    }
  }, [focusTerm]);
  const found = glossary.filter((t) =>
      `${t.name} ${t.meaning} ${t.aliases || ""}`
        .toLowerCase()
        .includes(search.toLowerCase().trim()),
    ),
    visible = showAll || search ? found : found.slice(0, 12);
  const section = (id: HelpTopic, title: string, children: React.ReactNode) => (
    <section
      className="help-section"
      id={`learn-${id}`}
      tabIndex={-1}
      aria-labelledby={`learn-title-${id}`}
    >
      <p className="eyebrow">LEARN AT YOUR OWN PACE</p>
      <h2 id={`learn-title-${id}`}>{title}</h2>
      {children}
    </section>
  );
  return (
    <div className="help-center">
      <div className="help-welcome">
        <span className="tag">
          BEGINNER GUIDE · NO STATISTICS BACKGROUND NEEDED
        </span>
        <h2 id="help-welcome-heading" tabIndex={-1}>
          Using the operations dashboard
        </h2>
        <p>
          Start with the basics, try a small example, then return to your
          investigation. Your selected months, floor filters, machine, guest
          group and saved plan stay with you.
        </p>
        <button className="button primary" onClick={onReturn}>
          <ArrowLeft size={15} /> Return to {returnLabel}
        </button>
      </div>
      <nav className="help-toc" aria-label="Help topics">
        {helpTopics.map((t) => (
          <button
            key={t.id}
            aria-current={activeTopic === t.id ? "location" : undefined}
            onClick={() => {
              setActiveTopic(t.id);
              moveTo(t.id);
            }}
          >
            {t.name}
          </button>
        ))}
      </nav>
      <div className="help-sections">
        {section(
          "start",
          "What is this application for?",
          <>
            <p>
              The Gilded Ace’s manager wants to replace the ten machines that
              earned the least. But low earnings can come from a quiet location,
              fewer operating hours, or unusual payouts—not necessarily a poor
              machine.
            </p>
            <p>
              This decision room helps you check those explanations before
              spending. You can see what happened, compare alternatives, and
              price a response. The casino records are synthetic challenge data;
              real NOAA weather is labeled separately.
            </p>
            <div className="learning-path">
              <strong>Your first five minutes</strong>
              <ol>
                <li>Read the executive briefing and open one investigation.</li>
                <li>
                  Choose a period, then a bank or machine. Read the scope label.
                </li>
                <li>
                  Compare actual earnings with expected win and similar
                  machines.
                </li>
                <li>Check the competing explanations and any uncertainty.</li>
                <li>
                  Open the planner, price a small test, and decide how success
                  would be measured.
                </li>
              </ol>
            </div>
          </>,
        )}
        {section(
          "navigation",
          "Find the right page",
          <>
            <p>
              The left navigation lets you explore in any order. On a narrow
              screen, use the menu button in the header. This beginner guide
              teaches operation; Methods & evidence remains the separate
              technical reference.
            </p>
            <div className="help-page-list">
              {destinations.map(([id, name, description]) => (
                <div key={id}>
                  <button
                    className="text-button"
                    onClick={() => onNavigate(id)}
                  >
                    {name}
                    <ArrowRight size={14} />
                  </button>
                  <p>{description}</p>
                </div>
              ))}
            </div>
            <p>
              On Hourly operations, choose months, zone and bank, then choose zones,
              banks or individual machines and press “Query Tiger Data”. Changed
              filters require a new query. Darker heatmap cells mean a higher
              selected rate; blank cells mean missing available-time support.
              Click a cell to inspect its nominal maintenance window. Compare
              weekdays with weekends before choosing a quiet time: weekend here
              means the Saturday/Sunday gaming day, which ends at 06:00 the next
              morning. A two-hour window at $3 theo per available hour suggests
              about $6 of theoretical opportunity per representative machine,
              not a guaranteed $6 loss or profit. Check actual target machines,
              staff, parts, guests and the catalog’s scheduling rules.
            </p>
            <p>
              Use the header’s <strong>? Help</strong> button anywhere. Small
              question marks beside metrics open a quick explanation; “Learn
              with examples” opens the relevant topic here. “Return to…” takes
              you back to where you came from.
            </p>
          </>,
        )}
        {section(
          "filters",
          "Choose what you are analyzing",
          <>
            <p>
              Think of filters as choosing the pages of a ledger you want to
              read. A filter changes the question’s scope; it does not change
              the underlying records.
            </p>
            <div className="help-filter-steps">
              <p>
                <strong>1. Choose months.</strong> Both start and end month are
                included. March → April includes all of both months. If you move
                one end past the other, the range adjusts to stay valid.
              </p>
              <p>
                <strong>2. Choose a zone, then a bank.</strong> A zone is a
                larger floor area; a bank is a group of machines. Changing zone
                resets the bank so a bank from the old zone cannot silently
                remain selected.
              </p>
              <p>
                <strong>3. Select a machine.</strong> On Machine performance,
                click a dot or machine ID, or use search. This opens its
                dossier; it does not filter the whole floor to that machine.
              </p>
              <p>
                <strong>4. Select a guest group.</strong> On Tracked guest
                outcomes, choose a home region or opening loyalty tier. The
                account results are recomputed for that group and selected
                months.
              </p>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Page or analysis</th>
                    <th>What changes it?</th>
                    <th>What stays fixed?</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      Briefing KPIs, machine results, zone demand, daily
                      downtime
                    </td>
                    <td>Months, zone and bank</td>
                    <td>
                      Peer references retain whole-month comparison groups
                    </td>
                  </tr>
                  <tr>
                    <td>Machine payout flags</td>
                    <td>Selected months</td>
                    <td>
                      Tested across all machines before narrowing zone/bank
                    </td>
                  </tr>
                  <tr>
                    <td>Tracked guests</td>
                    <td>Months and guest group</td>
                    <td>Carded accounts only; no floor-level guest filter</td>
                  </tr>
                  <tr>
                    <td>Loyalty</td>
                    <td>Months</td>
                    <td>Whole property</td>
                  </tr>
                  <tr>
                    <td>
                      Briefing findings, closure, moves, repair and hourly
                      audits
                    </td>
                    <td>These are labeled fixed historical context</td>
                    <td>
                      Full Jan–Jun audit, or the stated before/after window
                    </td>
                  </tr>
                  <tr>
                    <td>Events and weather</td>
                    <td>Selected months</td>
                    <td>Property/destination context; not bank-specific</td>
                  </tr>
                  <tr>
                    <td>Forecast validation</td>
                    <td>Historical filters do not apply</td>
                    <td>Jan–Apr training; May–Jun test</td>
                  </tr>
                  <tr>
                    <td>Action planner</td>
                    <td>Your actions, targets and assumptions</td>
                    <td>July 1–30 horizon; observed historical baselines</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              <strong>Reset filters</strong> restores January–June and, on floor
              pages, all zones and banks. On guest and loyalty pages it resets
              their visible month filters. Guest-group and machine choices are
              separate controls. Your floor choices are retained when visiting
              Help, Methods or the planner.
            </p>
          </>,
        )}
        {section(
          "metrics",
          "Understand the numbers, one idea at a time",
          <>
            <p>
              Start with three questions: How much was bet? How much came back?
              How much time was available?
            </p>
            <div className="metric-families">
              {[
                [
                  "Gaming money",
                  ["coin", "payout", "win", "hold", "rtp", "theo", "residual"],
                ],
                [
                  "Time and operations",
                  [
                    "scheduled",
                    "available",
                    "availability",
                    "occupied",
                    "down",
                    "rate",
                    "opportunity",
                    "contribution",
                  ],
                ],
                [
                  "Guests and loyalty",
                  [
                    "tracked",
                    "player-net",
                    "ahead",
                    "concentration",
                    "comp",
                    "face",
                    "economic-cost",
                    "reinvestment",
                    "points-price",
                  ],
                ],
              ].map(([title, ids]) => (
                <details key={String(title)} open={title === "Gaming money"}>
                  <summary>{title}</summary>
                  <dl>
                    {(ids as string[]).map((id) => {
                      const t = glossary.find((t) => t.id === id)!;
                      return (
                        <div key={id}>
                          <dt>{t.name}</dt>
                          <dd>
                            {t.meaning}
                            <small>{t.example}</small>
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </details>
              ))}
            </div>
            <GamingExample />
            <HoursExample />
            <p>
              For every other label, including median, concentration,
              standardization and forecast error, use the searchable glossary
              below. Rates always need their denominator: “per available hour”
              differs from “per occupied hour.”
            </p>
          </>,
        )}
        {section(
          "charts",
          "Read the visual before acting on it",
          <>
            <div className="help-card-grid">
              <article>
                <h3>Lines and dates</h3>
                <p>
                  Read the horizontal axis for time and the vertical axis for
                  the amount or rate. Check the legend before comparing lines. A
                  sharp daily win change may reflect payouts even when expected
                  win is steadier.
                </p>
              </article>
              <article>
                <h3>Bars and comparisons</h3>
                <p>
                  A longer bar means more of the named quantity. Check whether
                  it shows hours, wagers, or an estimate. Hover or focus an
                  available chart element to inspect values; use the
                  accompanying tables, labels and scope notes.
                </p>
              </article>
              <article>
                <h3>The floor map</h3>
                <p>
                  The map shows installed machines on its explicit floor layout
                  date. The analysis period still controls the metrics.
                  Selecting a machine that was retired earlier can switch the
                  layout to its last active date within that period. Zone labels
                  and bank outlines show the hierarchy; lines are walkways. A
                  dashed walkway was closed on the displayed layout date.
                </p>
              </article>
              <article>
                <h3>Map controls</h3>
                <p>
                  Wheel over the map to zoom near the cursor; drag to pan. Use +
                  / −, Fit floor, or the bank locator. Pinch on touch screens or
                  double-click to zoom. Keyboard arrows pan, +/− zoom, and Home
                  fits. Selecting a machine in the table focuses its recorded
                  location; Enter/Space selects a focused map marker. Normal
                  page scrolling works outside the map.
                </p>
              </article>
              <article>
                <h3>Colors and shapes</h3>
                <p>
                  A triangle on a machine marks a payout review; a square is
                  below 0.95× peers; a diamond is above 1.05×; a circle is
                  between them. These are descriptive bands, not calibrated
                  failure thresholds. Color is supported by shapes and text, so
                  a green symbol does not certify a machine as good.
                </p>
              </article>
              <article>
                <h3>Concentration curve</h3>
                <p>
                  The horizontal axis is the top share of tracked gamblers
                  ranked by wagering; the vertical axis is their cumulative
                  share of wagers. A steeper curve means a small group accounts
                  for more play. It is not a reason to encourage high-loss
                  guests to gamble more.
                </p>
              </article>
            </div>
            <p>
              Use rankings as a starting point. Sorting by “lowest actual win”
              differs from sorting by “lowest peer index” or “most negative
              payout residual.” Read the measure and its window before comparing
              rows.
            </p>
          </>,
        )}
        {section(
          "peers",
          "Investigate a machine fairly",
          <>
            <p>
              Imagine two shops: one is open all month at the entrance, the
              other is open for a week at the back. Comparing their total
              takings alone would be unfair. Machine earnings have the same
              problem.
            </p>
            <ol className="help-checklist">
              <li>
                <strong>Check exposure.</strong> Was the machine active for the
                same number of days? Was it available?
              </li>
              <li>
                <strong>Separate play from payouts.</strong> Theo measures
                expected house win for the play that occurred. Actual house win
                can swing with luck.
              </li>
              <li>
                <strong>Compare matched peers.</strong> Other machines are
                matched by zone, game, month and weekday; the target is
                excluded. Sparse groups use a wider floor comparison.
              </li>
              <li>
                <strong>Read the index.</strong> 1.00× matches the benchmark;
                0.80× is 20% below it. A low index is a screening clue, not an
                identified machine defect.
              </li>
              <li>
                <strong>Read the flag separately.</strong> The payout test
                considers game volatility and checking many machines. A small
                adjusted value warrants inspection, not an accusation.
              </li>
            </ol>
            <div className="learning-callout">
              <strong>What a flag does not tell you</strong>
              <p>
                A q-value is not the probability a machine is broken. A machine
                can have normal demand and an unusual payout result. Large, rare
                jackpots also make the test approximate. Keep the detailed
                z-score and test assumptions in Methods & evidence when you need
                to audit them.
              </p>
            </div>
            <p>
              After checking the dossier, decide whether the next step is an
              inspection, a location test, maintenance, or preserving the
              machine. The planner prices the response; it does not diagnose the
              cause for you.
            </p>
          </>,
        )}
        {section(
          "forecast",
          "Understand the forecast without learning machine learning",
          <>
            <p>
              The model asks: “Based on earlier Mondays, what might another
              Monday’s total wagers look like?” It repeats that idea for every
              weekday. This is a simple time-series forecast.
            </p>
            <div className="learning-path">
              <strong>Learn → choose → test</strong>
              <ol>
                <li>January–March data teach two candidate weekday rules.</li>
                <li>
                  April helps choose between all training history and the recent
                  eight weeks.
                </li>
                <li>The chosen rule is refitted through April, then frozen.</li>
                <li>
                  May–June were held out for the original evaluation against a
                  simpler constant-average baseline. We have now reviewed them;
                  new model research cannot call them a fresh unseen test.
                </li>
              </ol>
            </div>
            <p>
              <strong>MAE means average mistake size.</strong> If one day is $10
              too high and another $30 too low, MAE is ($10 + $30) ÷ 2 = $20.
              Smaller is better. A 40% error reduction means more accurate
              wagers, not 40% more earnings.
            </p>
            <p>
              The improvement interval describes uncertainty about the model’s
              average error advantage. It is not a prediction range for next
              Friday. The model predicts whole-floor wagers; it does not predict
              personal losses, profit, promotion returns or July performance
              with certainty.
            </p>
            <p>
              Use the calendar pattern to think about quieter maintenance
              windows. Do not treat a historically quiet day as proof that a
              promotion will pay for itself. No future test outcomes or later
              tourism revisions are allowed to teach the frozen forecast.
            </p>
          </>,
        )}
        {section(
          "planner",
          "Use the $100,000 planner responsibly",
          <>
            <p>
              The portfolio comparison includes inspection-only, targeted pilot,
              operations, location, replacement and preserve-cash strategies.
              The default financial recommendation chooses the highest base-scenario
              property contribution after costs, downtime, displacement and overlap.
              When paid candidates do not improve on cash, keep the full budget available.
              Check the live comparison for the calculated amount. The original $13,900 experimental plan buys evidence about four
              questions and retains $86,100, under its explicit $20,000 downside cap.
              It accepts a negative modeled base result; information value is unpriced.
            </p>
            <p>
              Low/base/high values are examples of what could happen under
              stated effects, not probabilities. The financial downside cap
              limits the negative low scenario, not every possible real-world
              loss. Changing it recomputes the downside-constrained financial alternative;
              the experimental backup keeps its $20,000 policy. Neither silently edits
              your saved plan. Use Load model-selected financial recommendation to
              explicitly replace it. Read July monitoring and spending approval triggers
              before approving additional funding; break-even is a hurdle, not a forecast.
            </p>
            <ol className="help-checklist">
              <li>
                <strong>Start with a reason.</strong> An unusual payout might
                call for an inspection; a location pattern may call for a
                controlled test.
              </li>
              <li>
                <strong>Add up to three action types.</strong> Choose quantities
                and distinct targets. The app checks the official catalog limits
                and incompatible combinations.
              </li>
              <li>
                <strong>Read the full 30-day price.</strong> One-time price plus
                recurring charges after lead time. Fixed packages and purchase
                costs are charged in full.
              </li>
              <li>
                <strong>Read days and disruption.</strong> July 1–30 is fixed.
                Delays leave fewer benefit days; required downtime has an
                expected-win debit.
              </li>
              <li>
                <strong>Enter an assumption.</strong> Effects start at zero.
                Change a recovery or uplift percentage to explore a scenario,
                not to create evidence.
              </li>
              <li>
                <strong>Read the hurdle.</strong> Break-even is the effect
                needed to cover modeled costs. A value beyond the allowed range
                means the scenario cannot clear the hurdle in that range.
              </li>
              <li>
                <strong>Compare and measure.</strong> The comparator checks
                subsets of your configured actions. Export a valid plan and
                define a control group, outcome and stop rule before
                implementation.
              </li>
            </ol>
            <BudgetExample />
            <div className="help-card-grid">
              <article>
                <h3>Why preserve money?</h3>
                <p>
                  Unspent budget remains available. Inspections, pilots and
                  surveys buy information, which is deliberately left unpriced.
                  The comparator may favor cash even when a small
                  information-gathering action is sensible.
                </p>
              </article>
              <article>
                <h3>What is unknown?</h3>
                <p>
                  Action effects, displacement to other machines, future demand,
                  and lifetime asset value are not identified. Demand gains and
                  overlapping downtime recovery are conservatively capped
                  instead of added together.
                </p>
              </article>
            </div>
            <p>
              A lease with a 14-day lead has 16 operating days in this horizon.
              Changing the floor-wide points rate checks the allowed 5–20 range,
              but does not automatically predict guest response or savings.
              Moves need empty destinations or a complete configured swap in
              which every current occupant moves out. Relocations start at the 6
              a.m. gaming boundary. Quiet-hour outage costs are planning
              estimates; large sweeps use an all-hour estimate if quiet-work
              capacity is unverified. No money is spent by configuring or
              exporting a plan.
            </p>
          </>,
        )}
        {section(
          "evidence",
          "Know how strong a finding is",
          <>
            <div className="evidence-ladder">
              <article>
                <span className="tag">RECORDED OBSERVATION</span>
                <h3>What happened?</h3>
                <p>
                  “The meter shows two down hours.” This describes the supplied
                  records.
                </p>
              </article>
              <article>
                <span className="tag">STATISTICAL FLAG</span>
                <h3>How unusual is it under a model?</h3>
                <p>
                  “Payouts differ unusually from configured expectations.” This
                  depends on model assumptions.
                </p>
              </article>
              <article>
                <span className="tag">HYPOTHESIS</span>
                <h3>What might explain it?</h3>
                <p>
                  “The closed walkway may have reduced access.” Other
                  explanations still need testing.
                </p>
              </article>
              <article>
                <span className="tag">RECOMMENDATION</span>
                <h3>What should we try?</h3>
                <p>
                  “Inspect, or run a small controlled test.” This is a decision
                  under uncertainty.
                </p>
              </article>
            </div>
            <p>
              <strong>Association is not causation.</strong> Umbrellas and wet
              roads appear together, but umbrellas do not cause rain. Likewise,
              an event weekend and higher play can coincide without showing how
              much the event caused.
            </p>
            <p>
              Ask what else changed, whether the comparison groups were similar,
              and whether results could reflect chance. A control group helps
              estimate what would have happened without a change. Check
              property-wide outcomes so moving play between machines does not
              look like new revenue.
            </p>
            <p>
              Claims & Evidence on the Methods page links findings to their
              calculations and limits. Responsible decisions also consider guest
              wellbeing; high recorded losses are not an invitation to increase
              those guests’ play.
            </p>
          </>,
        )}
        {section(
          "glossary",
          "Search the glossary",
          <>
            <label className="glossary-search">
              <Search size={18} />
              <span className="sr-only">Search glossary</span>
              <input
                aria-label="Search glossary"
                type="search"
                placeholder="Try “theo”, “q-value”, “break-even” or “holdout”"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowAll(false);
                }}
              />
              {search && (
                <button
                  aria-label="Clear glossary search"
                  className="icon-button"
                  onClick={() => setSearch("")}
                >
                  <X size={14} />
                </button>
              )}
            </label>
            <p className="glossary-count" role="status">
              {found.length} of {glossary.length} terms match
              {!search && !showAll
                ? ` · showing the first ${visible.length}`
                : ""}
              .
            </p>
            <dl className="glossary-results">
              {visible.map((t) => (
                <div key={t.id} id={`term-${t.id}`}>
                  <dt>{t.name}</dt>
                  <dd>
                    {t.meaning}
                    <small>{t.example}</small>
                  </dd>
                </div>
              ))}
            </dl>
            {!found.length && (
              <div className="empty">
                <h3>No matching term yet.</h3>
                <p>
                  Try a shorter word, such as “win”, “points” or “forecast”.
                </p>
                <button
                  className="button secondary"
                  onClick={() => setSearch("")}
                >
                  Show all terms
                </button>
              </div>
            )}
            {!search && !showAll && found.length > 12 && (
              <button
                className="button secondary"
                onClick={() => setShowAll(true)}
              >
                Show all {glossary.length} terms
              </button>
            )}
          </>,
        )}
      </div>
      <div className="help-return">
        <button className="button primary" onClick={onReturn}>
          <ArrowLeft size={15} /> Return to {returnLabel}
        </button>
        <p>Your analysis selections are retained.</p>
      </div>
    </div>
  );
}
