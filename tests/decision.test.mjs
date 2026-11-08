import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { validatePlan, unitCost } from "../src/lib.mjs";
import {
  profileWindow,
  generateCandidates,
  enumeratePortfolios,
  choosePortfolios,
  evaluatePortfolio,
  actionScenario,
} from "../src/decisionEngine.mjs";
import { plannedDebit } from "../src/scheduling.mjs";
import {
  attachDecision,
  machineDiagnostic,
} from "../src/machineDiagnostics.mjs";
import { selectRows, machineScores } from "../src/lib.mjs";
import { peerSupport } from "../src/diagnostics.mjs";
import { runTool, offlineEvidence } from "../src/investigation.mjs";
const data = JSON.parse(
  fs.readFileSync(
    new URL("../public/data/dashboard.json", import.meta.url),
    "utf8",
  ),
);
const analysis = JSON.parse(
  fs.readFileSync(
    new URL("../public/data/decision.json", import.meta.url),
    "utf8",
  ),
);
const entry = (id, targets, extra = {}) => ({
  id,
  quantity: targets.length,
  targets,
  effect: 0,
  extraCost: 0,
  pointsRate: 10,
  destinations: [],
  ...extra,
});
test("quiet schedule uses a single feasible window and exact fractional hours", () => {
  const rates = Array(24).fill(10);
  rates[23] = 1;
  rates[0] = 2;
  assert.deepEqual(profileWindow(rates, 1.5), { start: 23, debit: 2 });
  assert.throws(() => profileWindow(rates, 25));
});
test("catalog moves remain at 6am and large sweeps do not invent simultaneous quiet crews", () => {
  const machine = data.planner.machines[0],
    enriched = attachDecision(data, analysis);
  const move = plannedDebit(enriched, [machine], 180, {
    actionId: "A-MOVE-MACHINE",
    days: 28,
  });
  assert.equal(move.start, 6);
  const crew = plannedDebit(enriched, data.planner.machines, 90, {
    actionId: "A-PREVENTIVE",
    days: 23,
  });
  assert.equal(crew.start, null);
  assert.equal(crew.debit, crew.average);
});
test("injected payout signal and extreme volatility are separated by the variance model", () => {
  const fixture = {
    machines: Array.from({ length: 30 }, (_, i) => ({ id: "m" + i })),
    zones: [{ zone_id: "z" }],
  };
  const rows = fixture.machines.map((_, i) => [
    0,
    i,
    0,
    "b",
    0,
    1000,
    100,
    100,
    24,
    24,
    12,
    0,
    100,
    100,
    0,
    0,
    0,
    100,
  ]);
  rows[3][6] = 40; // -6 sigma at variance 100.
  rows[4][6] = 40;
  rows[4][12] = 1e8; // same dollar residual, much higher volatility.
  const scores = machineScores(fixture, rows),
    signal = scores.find((s) => s.id === "m3"),
    volatile = scores.find((s) => s.id === "m4");
  assert.equal(signal.z, -6);
  assert.ok(signal.q < 0.05);
  assert.ok(volatile.q > 0.05);
});
test("source binding and period-dependent diagnostics prevent stale classifications", () => {
  assert.equal(
    attachDecision(data, { ...analysis, sourceManifestSha256: "stale" }),
    data,
  );
  const enriched = attachDecision(data, analysis),
    full = machineScores(data, selectRows(data, "2025-01", "2025-06")),
    chosen = full.find((s) => s.id === "M-1158"),
    rows = selectRows(data, "2025-01", "2025-06").filter(
      (r) => r[1] === chosen.machineIndex,
    );
  chosen.support = peerSupport(rows);
  const annual = machineDiagnostic(
    enriched,
    analysis,
    rows,
    chosen,
    full,
    "2025-01",
    "2025-06",
  );
  assert.ok(annual.labels.includes("Unusual payout behavior"));
  assert.ok(annual.labels.includes("Possible location opportunity"));
  assert.ok(
    Math.abs(
      Object.values(annual.costBreakdown).reduce((s, v) => s + v, 0) -
        chosen.costs,
    ) < 0.01,
  );
  const monthScores = machineScores(
      data,
      selectRows(data, "2025-06", "2025-06"),
    ),
    monthly = monthScores.find((s) => s.id === "M-1158"),
    monthRows = selectRows(data, "2025-06", "2025-06").filter(
      (r) => r[1] === monthly.machineIndex,
    );
  monthly.support = peerSupport(monthRows);
  const june = machineDiagnostic(
    enriched,
    analysis,
    monthRows,
    monthly,
    monthScores,
    "2025-06",
    "2025-06",
  );
  assert.ok(june.labels.includes("Insufficient evidence"));
  assert.ok(!june.labels.includes("Unusual payout behavior"));
  assert.equal(june.monthsObserved, 1);
  assert.notEqual(june.theoreticalContribution, annual.theoreticalContribution);
});
test("new copilot evidence agrees with source-matched diagnostics and portfolio results", () => {
  const enriched = attachDecision(data, analysis),
    context = {
      page: "opportunities",
      start: "2025-01",
      end: "2025-06",
      zone: "all",
      bank: "all",
      machine: "M-1158",
      group: "all|All tracked guests",
      plan: [],
      sourceVersion: data.version,
    };
  const card = runTool(enriched, context, "compare_portfolios", {});
  assert.equal(
    card.metrics.find((m) => m.label === "Action spend").value,
    0,
  );
  assert.equal(
    card.metrics.find((m) => m.label === "Cash retained").value,
    100000,
  );
  const capped=runTool(enriched,{...context,riskCap:0,portfolioId:'recommended'},'compare_portfolios',{});
  assert.equal(capped.metrics.find(m=>m.label==='Action spend').value,0);
  assert.throws(()=>runTool(enriched,{...context,riskCap:-1},'compare_portfolios',{}),/downside cap/);
  assert.match(card.limitations, /not probabilities/);
  const backup = runTool(enriched, { ...context, riskCap: 0 }, "compare_portfolios", { strategyId: "learning" });
  assert.equal(backup.metrics.find((m) => m.label === "Action spend").value, 13900);
  assert.equal(backup.metrics.find((m) => m.label === "Cash retained").value, 86100);
  assert.match(backup.explanation, /pre-registered|Information/i);
  assert.equal(
    offlineEvidence(
      enriched,
      context,
      "Which opportunities support the portfolio?",
    )[0].title,
    "Operational opportunities and evidence",
  );
  assert.throws(
    () =>
      runTool(enriched, context, "compare_portfolios", {
        strategyId: "invented",
      }),
    /Unknown portfolio/,
  );
  assert.ok(
    runTool(enriched, context, "get_machine_diagnostics", {}).metrics.some(
      (m) => m.label === "Recorded fault tickets in scope",
    ),
  );
});
test("a genuine paired swap is feasible, occupied unvacated and no-op positions are not", () => {
  const [a, b, c] = data.planner.machines;
  assert.equal(
    validatePlan(data, [
      entry("A-MOVE-MACHINE", [a.id, b.id], {
        destinations: [b.location, a.location],
      }),
    ]).valid,
    true,
  );
  assert.equal(
    validatePlan(data, [
      entry("A-MOVE-MACHINE", [a.id], { destinations: [c.location] }),
    ]).valid,
    false,
  );
  assert.equal(
    validatePlan(data, [
      entry("A-MOVE-MACHINE", [a.id], { destinations: [a.location] }),
    ]).valid,
    false,
  );
  assert.equal(
    validatePlan(data, [{ id: "A-MOVE-MACHINE", quantity: 1 }]).valid,
    false,
  );
});
test("all candidate bundles obey official constraints including full-bank swaps", () => {
  const candidates = generateCandidates(data, analysis);
  for (const c of candidates)
    assert.equal(validatePlan(data, [c.entry]).valid, true, c.key);
  assert.ok(candidates.some((c) => c.entry.id === "A-MOVE-BANK"));
  assert.ok(candidates.some((c) => c.entry.id === "A-REPLACE-BUY"));
  assert.ok(candidates.some((c) => c.entry.id === "A-SURVEY"));
  assert.ok(candidates.some((c) => c.key === "lease-10"));
});
test("costs include all recurring days and capital; information value is not invented", () => {
  const target = data.planner.machines[0].id;
  const lease = actionScenario(
    data,
    analysis,
    entry("A-REPLACE-LEASE", [target]),
  );
  assert.equal(lease.cost, 3380);
  assert.equal(lease.oneTimeCost, 2500);
  assert.equal(lease.recurringCost, 880);
  assert.equal(lease.days, 16);
  const purchase = actionScenario(
    data,
    analysis,
    entry("A-REPLACE-BUY", [target]),
  );
  assert.equal(purchase.cost, 22000);
  assert.equal(purchase.days, 9);
  const inspect = actionScenario(data, analysis, entry("A-INSPECT", [target]));
  assert.equal(inspect.gain, 0);
  assert.equal(inspect.breakevenNetEffect, null);
  assert.ok(inspect.net < 0);
  assert.ok(inspect.plannedDebit <= inspect.allHourDebit);
});
test("shift recovery uses the selected measured queue pool, not quantity times all-floor opportunity", () => {
  const a = actionScenario(
    data,
    analysis,
    entry("A-TECH-SHIFT", ["day"]),
    "high",
  );
  assert.ok(
    Math.abs(
      a.base -
        analysis.queueByShift.find((s) => s.shift === "day").dailyOpportunity *
          23,
    ) < 1e-7,
  );
  const all = actionScenario(
    data,
    analysis,
    entry("A-TECH-SHIFT", ["day", "grave", "swing"]),
    "high",
  );
  assert.ok(
    all.gain <=
      analysis.queueByShift.reduce((s, q) => s + q.dailyOpportunity * 23, 0),
  );
});
test("portfolio scenarios do not add overlapping positive demand gains and count negative effects", () => {
  const candidates = generateCandidates(data, analysis),
    a = candidates.find((c) => c.key === "wayfinding-back").entry,
    b = candidates.find((c) => c.key === "move-one").entry;
  const plan = evaluatePortfolio(data, analysis, [a, b]);
  assert.equal(plan.valid, true);
  assert.ok(
    Math.abs(
      plan.scenarios.high.gain -
        Math.max(...plan.scenarios.high.actions.map((a) => a.gain)),
    ) < 1e-7,
  );
  assert.ok(
    Math.abs(
      plan.scenarios.low.gain -
        plan.scenarios.low.actions.reduce((s, a) => s + a.gain, 0),
    ) < 1e-7,
  );
});
test("generated search is exhaustive over its bundles and every selected solution is feasible", () => {
  const candidates = generateCandidates(data, analysis),
    portfolios = enumeratePortfolios(data, analysis, candidates);
  let independentlyValid = 1;
  for (let i = 0; i < candidates.length; i++) {
    independentlyValid++;
    for (let j = i + 1; j < candidates.length; j++) {
      if (validatePlan(data, [candidates[i].entry, candidates[j].entry]).valid)
        independentlyValid++;
      for (let k = j + 1; k < candidates.length; k++)
        if (
          validatePlan(data, [
            candidates[i].entry,
            candidates[j].entry,
            candidates[k].entry,
          ]).valid
        )
          independentlyValid++;
    }
  }
  assert.equal(portfolios.length, independentlyValid);
  for (const p of portfolios) {
    assert.ok(p.cost <= 100000);
    assert.ok(p.entries.length <= 3);
    assert.equal(validatePlan(data, p.entries).valid, true);
  }
  for (const cap of [0, 5000, 10000, 20000, 30000]) {
    const chosen = choosePortfolios(portfolios, cap);
    assert.ok(chosen.learning.worstDownside <= cap + 1e-7);
    assert.deepEqual(chosen.financial.entries, []);
  }
});
test("controlled small optimization fixture has independently known base optimum and no-spend robust optimum", () => {
  const action = (id, cost, unit) => ({
    action_type_id: id,
    unit,
    unit_cost_cents: cost * 100,
    recurring_cost_cents_per_day: 0,
    lead_days: 0,
    downtime_minutes: 0,
    quantity_limit: 1,
    incompatibility_group: "",
  });
  const fixture = {
    actions: [
      action("A-WAYFINDING", 10, "zone"),
      action("A-COMP-CHANGE", 20, "policy"),
      action("A-INSPECT", 5, "machine"),
    ],
    zones: [{ zone_id: "z" }],
    locations: [],
    planner: {
      budget: 30,
      compDailyCost: 100,
      machines: [{ id: "m", zone: "z", dailyTheo: 100, hourlyTheo: 1 }],
    },
  };
  const candidates = [
    entry("A-WAYFINDING", ["z"]),
    entry("A-COMP-CHANGE", ["property"]),
    entry("A-INSPECT", ["m"]),
  ].map((e, i) => ({
    key: String(i),
    entry: e,
    channels: [],
    learning: false,
  }));
  const options = enumeratePortfolios(
      fixture,
      { juneHourlyProfiles: {} },
      candidates,
    ),
    selected = choosePortfolios(options);
  assert.equal(selected.base.cost, 30);
  assert.equal(selected.base.scenarios.base.net, 105);
  assert.deepEqual(selected.base.keys, ["0", "1"]);
  assert.equal(selected.financial.scenarios.base.net, 105);
  assert.equal(selected.financial.cost, 30);
  assert.equal(selected.robust.cost, 0);
  assert.equal(choosePortfolios(options, 0).riskSensitive.cost, 0);
  const revised = enumeratePortfolios(fixture, {
    juneHourlyProfiles: {},
    scenarioEffects: { "A-WAYFINDING": [0, 0, 0], "A-COMP-CHANGE": [0, 0, 0] },
  }, candidates);
  assert.equal(choosePortfolios(revised).financial.cost, 0);
  assert.ok(revised.filter((p) => p.cost > 0).every((p) => p.scenarios.base.net < 0));
  assert.equal(
    evaluatePortfolio(
      fixture,
      {},
      candidates.map((c) => c.entry),
    ).valid,
    false,
  );
});
test("all major catalogue constraints still reject invalid financial portfolios", () => {
  const m = data.planner.machines[0];
  assert.equal(
    validatePlan(data, [
      entry(
        "A-REPLACE-BUY",
        data.planner.machines.slice(0, 5).map((m) => m.id),
      ),
    ]).valid,
    false,
  );
  assert.equal(
    validatePlan(data, [
      entry("A-COMP-PILOT", ["property"]),
      entry("A-COMP-CHANGE", ["property"]),
    ]).valid,
    false,
  );
  assert.equal(
    validatePlan(data, [
      entry("A-MOVE-MACHINE", [m.id], { destinations: ["missing"] }),
    ]).valid,
    false,
  );
  assert.equal(
    validatePlan(data, [
      entry("A-REPLACE-LEASE", [m.id]),
      entry("A-REPLACE-BUY", [m.id]),
    ]).valid,
    false,
  );
  assert.equal(
    validatePlan(data, [{ ...entry("A-INSPECT", [m.id]), quantity: 16 }]).valid,
    false,
  );
});
