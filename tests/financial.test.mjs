import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { selectModelPortfolios, baseBenefitBoundary } from "../src/decisionEngine.mjs";
import { attachDecision } from "../src/machineDiagnostics.mjs";
import { runTool, offlineEvidence } from "../src/investigation.mjs";
import { answerQuestion } from "../server/chat.mjs";

const data = JSON.parse(fs.readFileSync(new URL("../public/data/dashboard.json", import.meta.url)));
const analysis = JSON.parse(fs.readFileSync(new URL("../public/data/decision.json", import.meta.url)));
const context = { page: "planner", start: "2025-01", end: "2025-06", zone: "all", bank: "all", machine: "M-1158", group: "all|All tracked guests", plan: [], sourceVersion: data.version };

test("published primary is the computed feasible financial winner, with the learning policy retained separately", () => {
  const s = selectModelPortfolios(data, analysis);
  assert.equal(s.portfolios.length, 968);
  assert.deepEqual(analysis.recommendation.entries, s.financial.entries);
  assert.deepEqual(data.planner.recommended, s.financial.entries);
  assert.equal(data.planner.recommendationObjective, "financial");
  assert.equal(s.financial.cost, 0);
  assert.equal(s.financial.remaining, 100000);
  assert.ok(s.portfolios.filter((p) => p.cost > 0).every((p) => p.scenarios.base.net < 0));
  assert.equal(s.learning.cost, 13900);
  assert.equal(s.learning.remaining, 86100);
  assert.deepEqual(s.learning.entries, analysis.experimentalRecommendation.entries);
  assert.equal(analysis.experimentalRecommendation.riskCap, 20000);
  assert.equal(selectModelPortfolios(data, analysis, 0).learning.cost, 13900);
});

test("an explicit hypothetical effect change can switch the primary without altering production assumptions", () => {
  const revised = structuredClone(analysis);
  // Test-only sensitivity, not an estimated treatment effect or a published recommendation.
  revised.scenarioEffects["A-COMP-CHANGE"] = [-0.05, 0.1, 0.1];
  const choice = selectModelPortfolios(data, revised).financial;
  assert.deepEqual(choice.keys, ["comp-change"]);
  assert.equal(choice.cost, 1500);
  assert.ok(Math.abs(choice.scenarios.base.net - 1467.551991) < 1e-6);
  assert.equal(selectModelPortfolios(data, analysis).financial.cost, 0);
  revised.scenarioEffects["A-COMP-CHANGE"] = [0.2, 0.1, 0.1];
  assert.throws(() => selectModelPortfolios(data, revised), /ordered finite fractions/);
});

test("financial and experimental copilot evidence use their own actual objectives and amounts", () => {
  const d = attachDecision(data, analysis);
  const metric = (c, label) => c.metrics.find((m) => m.label === label)?.value;
  const primary = runTool(d, context, "compare_portfolios", { strategyId: "recommended" });
  const backup = runTool(d, { ...context, riskCap: 0 }, "compare_portfolios", { strategyId: "learning" });
  assert.equal(metric(primary, "Action spend"), 0);
  assert.equal(metric(primary, "Cash retained"), 100000);
  assert.equal(metric(primary, "Base-scenario net"), 0);
  assert.equal(metric(backup, "Action spend"), 13900);
  assert.ok(Math.abs(metric(backup, "Base-scenario net") + 10022.957255592855) < 1e-6);
  assert.match(primary.explanation, /base-scenario/);
  assert.match(backup.explanation, /pre-registered/);
  assert.equal(offlineEvidence(d, context, "Compare the experimental backup portfolio")[0].id, "compare_portfolios:learning");
  assert.equal(offlineEvidence(d, context, "What is the primary recommendation?")[0].id, "compare_portfolios:recommended");
  assert.equal(offlineEvidence(d, { ...context, portfolioId: "learning" }, "Compare the primary financial recommendation portfolio")[0].id, "compare_portfolios:recommended");
});

test("break-even sensitivity keeps negative effects and cost separate from positive benefit scaling", () => {
  const p = { cost: 50, scenarios: { base: { debit: 10, overlap: 20, actions: [{ gain: 120 }, { gain: -10 }] } } };
  // $60 in costs plus a fixed $10 loss must be covered by $100 of retained positive benefit.
  assert.equal(baseBenefitBoundary(p), 0.7);
  assert.equal(baseBenefitBoundary({ cost: 5, scenarios: { base: { debit: 1, overlap: 0, actions: [{ gain: 0 }] } } }), null);
});

test("Gemini function-call and evidence-selection turns keep primary and backup distinct", async () => {
  let calls = 0;
  const result = await answerQuestion(attachDecision(data, analysis), {
    question: "Compare the primary recommendation and experimental backup portfolio", requestId: "financial-grounding", context,
  }, { key: "test-only", fetchImpl: async () => ({ ok: true, text: async () => JSON.stringify({ candidates: [{ content: ++calls === 1
    ? { role: "model", parts: ["recommended", "learning"].map((strategyId) => ({ functionCall: { name: "compare_portfolios", args: { strategyId } } })) }
    : { role: "model", parts: [{ text: JSON.stringify({ evidenceIds: ["1:compare_portfolios:recommended", "2:compare_portfolios:learning"] }) }] } }] }) }) });
  assert.equal(result.mode, "live");
  assert.deepEqual(result.cards.map((c) => c.metrics.find((m) => m.label === "Action spend").value), [0, 13900]);
  assert.deepEqual(result.cards.map((c) => c.open.portfolioId), ["recommended", "learning"]);
});

test("historical accounting, forecasts, diagnostics, and scientific findings equal commit 42dafcc", () => {
  const hash = (v) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
  const { planner, ...dashboard } = data;
  const { recommended, recommendationSource, recommendationObjective, ...planningBases } = planner;
  const { candidates, strategies, search, recommendation, scenarioEffects, experimentalRecommendation, riskRecommendation, monitoringPlan, ...science } = analysis;
  assert.equal(hash(dashboard), "7ba8e33b8530a8909ad4ad4b3d1f0a5359619ff9187bb64385ee095778f5c894");
  assert.equal(hash(planningBases), "2dfd7f8ee13211e93e88cdb3b826deb1aaa173ddd618554c5d25c56efdd8979b");
  assert.equal(hash(science), "0b2479867d516956b064660c32737321c2fe4e62a3c7a43dc672c2021994af95");
  const diagnostic = JSON.parse(fs.readFileSync(new URL("../public/data/diagnostics.json", import.meta.url)));
  assert.equal(hash(diagnostic), "c49cb1ca4d88816de8cd3a263df3ef08a40a7ddc786334fc6531e6bc799d0d8f");
});
