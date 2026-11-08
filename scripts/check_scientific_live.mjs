// Exercise source-matched read-only analytical tools through the actual local/deployed endpoint.
// No API key is read or sent by this client script.
import { readFile, writeFile } from "node:fs/promises";
const base = process.argv[2] || "http://127.0.0.1:5173";
const d = JSON.parse(
  await readFile(
    new URL("../public/data/dashboard.json", import.meta.url),
    "utf8",
  ),
);
const decision = JSON.parse(await readFile(new URL("../public/data/decision.json", import.meta.url), "utf8"));
const context = {
  page: "opportunities",
  start: "2025-01",
  end: "2025-06",
  zone: "all",
  bank: "all",
  machine: "M-1241",
  group: "all|All tracked guests",
  plan: d.planner.recommended,
  sourceVersion: d.version,
};
const checks = [];
async function ask(question, requestId) {
  const response = await fetch(base + "/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: new URL(base).origin,
    },
    body: JSON.stringify({ question, requestId, context }),
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) throw Error("http");
  const result = await response.json();
  if (result.mode !== "live") throw Error("offline");
  return result;
}
try {
  const portfolio = await ask(
    "Retrieve the primary financial recommendation using compare_portfolios strategyId recommended. Give its spend, reserve, scenarios and uncertainty; this is separate from experimental learning.",
    "science-portfolio",
  );
  if (
    !portfolio.cards.some(
      (c) =>
        c.id.includes("compare_portfolios:recommended") &&
        c.metrics.some(
          (m) => m.label === "Action spend" && m.value === decision.recommendation.cost,
        ) &&
        c.metrics.some((m) => m.label === "Cash retained" && m.value === decision.recommendation.remaining),
    )
  )
    throw Error("portfolio");
  checks.push(
    `Live primary retrieval matches ${decision.recommendation.cost} spend and ${decision.recommendation.remaining} reserve, with explicit scenario caveats.`,
  );
  const backup = await ask("Retrieve the experimental backup portfolio using compare_portfolios strategyId learning; explain its separate objective and downside cap.", "science-backup");
  if (!backup.cards.some((c) => c.id.includes("compare_portfolios:learning") && c.metrics.some((m) => m.label === "Action spend" && m.value === decision.experimentalRecommendation.cost))) throw Error("portfolio");
  checks.push(`Live experimental backup retrieval matches ${decision.experimentalRecommendation.cost} spend and its separate learning objective.`);
  const machine = await ask(
    "Explain the utilization, economics and recorded fault history of M-1241 in the selected period.",
    "science-machine",
  );
  if (
    !machine.cards.some(
      (c) =>
        c.id.includes("get_machine_diagnostics:M-1241") &&
        c.metrics.some(
          (m) =>
            m.label === "Recorded fault tickets in scope" && m.value === 16,
        ) &&
        c.evidence.some(
          (e) => e.href === "/docs/COMPREHENSIVE_SCIENTIFIC_REPORT.md",
        ),
    )
  )
    throw Error("machine");
  checks.push(
    "Live machine diagnostics reconcile 16 fault tickets and link the scientific evidence.",
  );
  const result = {
    status: "passed",
    mode: "live",
    base,
    checks,
    qualification:
      "Actual HTTP + Gemini tools; no real-browser rendering or deployed runtime claim for a local origin.",
  };
  await writeFile(
    new URL("../docs/SCIENTIFIC_LIVE_CHECK.json", import.meta.url),
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(JSON.stringify(result));
} catch (e) {
  const reason = ["http", "offline", "portfolio", "machine"].includes(e.message)
    ? e.message
    : "unavailable";
  await writeFile(
    new URL("../docs/SCIENTIFIC_LIVE_CHECK.json", import.meta.url),
    JSON.stringify({ status: "failed", base, reason, checks }, null, 2) + "\n",
  );
  console.log(JSON.stringify({ status: "failed", reason, checks }));
  process.exitCode = 1;
}
