import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  selectRows,
  aggregate,
  machineScores,
  unitCost,
  validatePlan,
  estimatePlan,
} from "../src/lib.mjs";
const data = JSON.parse(
  fs.readFileSync(
    new URL("../public/data/dashboard.json", import.meta.url),
    "utf8",
  ),
);
const action = (id) => data.actions.find((a) => a.action_type_id === id);
const entry = (id, targets, extra = {}) => ({
  id,
  quantity: targets.length,
  targets,
  effect: 0,
  extraCost: 0,
  ...extra,
});
const close = (a, b, tol = 0.2) =>
  assert.ok(Math.abs(a - b) < tol, `${a} differs from ${b}`);

test("active source records and currency reconcile with independent Python totals", () => {
  assert.equal(data.rows.length, 55092);
  const a = aggregate(selectRows(data, "2025-01", "2025-06"));
  close(a.coin, 248905219.25);
  close(a.win, 23638155.1);
  close(a.theo, 23545364.4785, 2);
  close(a.down, 5021.07889, 0.02);
  close(a.lostTheo, 94331.15734, 2);
});
test("period and zone filters partition wagers without duplication", () => {
  const all = aggregate(selectRows(data, "2025-01", "2025-06")).coin;
  close(
    data.months.reduce((s, m) => s + aggregate(selectRows(data, m, m)).coin, 0),
    all,
  );
  close(
    data.zones.reduce(
      (s, z) =>
        s + aggregate(selectRows(data, "2025-01", "2025-06", z.zone_id)).coin,
      0,
    ),
    all,
  );
});
test("game-math payout flags and bottom ten agree with independent Python implementation", () => {
  const s = machineScores(data, data.rows);
  assert.deepEqual(
    s.slice(0, 10).map((s) => s.id),
    data.facts.bottom,
  );
  assert.deepEqual(
    s.filter((s) => s.z < 0 && s.q < 0.05).map((s) => s.id),
    ["M-1158"],
  );
  assert.equal(s.filter((s) => s.index < 0.8).length, 0);
});
test("July lease uses 16 operating days and costs $3,380", () => {
  assert.equal(unitCost(action("A-REPLACE-LEASE")), 3380);
  assert.equal(unitCost(action("A-TECH-SHIFT")), 11520);
});
test("planner enforces three types, integer limits, budget, and distinct valid targets", () => {
  const mids = data.planner.machines.slice(0, 6).map((m) => m.id);
  assert.equal(validatePlan(data, [entry("A-INSPECT", [mids[0]])]).valid, true);
  assert.equal(
    validatePlan(data, [entry("A-INSPECT", [mids[0], mids[0]])]).valid,
    false,
  );
  assert.equal(
    validatePlan(data, [entry("A-INSPECT", ["bogus"])]).valid,
    false,
  );
  assert.equal(validatePlan(data, [entry("A-REPLACE-BUY", mids)]).valid, false);
  assert.equal(
    validatePlan(data, [entry("A-INSPECT", [mids[0]], { quantity: 1.5 })])
      .valid,
    false,
  );
  const four = [
    entry("A-INSPECT", [mids[0]]),
    entry("A-TECH-SHIFT", ["swing"]),
    entry("A-SURVEY", ["property"]),
    entry("A-COMP-PILOT", ["property"]),
  ];
  assert.equal(validatePlan(data, four).valid, false);
});
test("same-target replacements and incompatible comp policies are rejected", () => {
  const m = data.planner.machines[0].id;
  assert.equal(
    validatePlan(data, [
      entry("A-REPLACE-LEASE", [m]),
      entry("A-REPLACE-BUY", [m]),
    ]).valid,
    false,
  );
  assert.equal(
    validatePlan(data, [
      entry("A-COMP-PILOT", ["property"]),
      entry("A-COMP-CHANGE", ["property"], { pointsRate: 10 }),
    ]).valid,
    false,
  );
  assert.equal(
    validatePlan(data, [
      entry("A-COMP-CHANGE", ["property"], { pointsRate: 21 }),
    ]).valid,
    false,
  );
});
test("relocations require vacant destinations and reject conflicting bank targets", () => {
  const m = data.planner.machines[0],
    vacant = data.locations.find(
      (l) => !data.planner.machines.some((m) => m.location === l.location_id),
    );
  assert.equal(
    validatePlan(data, [entry("A-MOVE-MACHINE", [m.id])]).valid,
    false,
  );
  assert.equal(
    validatePlan(data, [
      entry("A-MOVE-MACHINE", [m.id], { destinations: [m.location] }),
    ]).valid,
    false,
  );
  if (vacant)
    assert.equal(
      validatePlan(data, [
        entry("A-MOVE-MACHINE", [m.id], { destinations: [vacant.location_id] }),
      ]).valid,
      true,
    );
  assert.equal(
    validatePlan(data, [
      entry("A-MOVE-BANK", [m.bank]),
      entry("A-REPLACE-LEASE", [m.id]),
    ]).errors.some((s) => s.includes("conflicting")),
    true,
  );
});
test("inspections monetize no invented benefit and debit actual required downtime", () => {
  const m = data.planner.machines.find((m) => m.id === "M-1158"),
    plan = estimatePlan(data, [entry("A-INSPECT", [m.id])]);
  assert.equal(plan.gain, 0);
  assert.equal(plan.cost, 1200);
  close(plan.outage, m.hourlyTheo * 2, 0.001);
  close(plan.net, -1200 - m.hourlyTheo * 2, 0.001);
});
test("technician quantities cannot recover more than the shared queue pool", () => {
  const plan = estimatePlan(data, [
    entry("A-TECH-SHIFT", ["day", "swing", "grave"], { effect: 100 }),
  ]);
  close(plan.gain, data.planner.techDailyOpportunity * 23, 0.001);
});
test("downtime interventions do not double count overlapping benefits", () => {
  const tech = entry("A-TECH-SHIFT", ["day"], { effect: 50 }),
    maint = entry("A-PREVENTIVE", [data.planner.machines[0].manufacturer], {
      effect: 50,
    });
  const a = estimatePlan(data, [tech]),
    b = estimatePlan(data, [maint]),
    both = estimatePlan(data, [tech, maint]);
  close(both.gain, Math.max(a.gain, b.gain), 0.001);
});
test("guest monthly ranges aggregate net consistently and preserve sign", () => {
  const g = data.guests.find(
    (g) =>
      g.start === "2025-01" && g.end === "2025-06" && g.dimension === "all",
  );
  close(g.net, g.payout - g.wagers, 0.01);
  close(
    data.months.reduce(
      (s, m) =>
        s +
        data.guests.find(
          (g) => g.start === m && g.end === m && g.dimension === "all",
        ).net,
      0,
    ),
    g.net,
    0.01,
  );
  assert.ok(g.players <= g.accounts);
  assert.ok(g.ahead <= g.players);
  assert.ok(
    g.wagerConcentration.every(
      (s, i, arr) => s >= 0 && s <= 1.00001 && (!i || s >= arr[i - 1]),
    ),
  );
});
test("holdout is untouched future time and baseline is frozen", () => {
  assert.equal(data.model.points.length, 61);
  assert.equal(new Set(data.model.points.map((p) => p.baseline)).size, 1);
  assert.ok(data.model.points.every((p) => p.date > "2025-04-30"));
  const mae =
    data.model.points.reduce((s, p) => s + Math.abs(p.actual - p.model), 0) /
    61;
  close(mae, data.model.mae, 0.01);
});
test("demand scenarios retain the largest gain instead of stacking overlapping uplifts", () => {
  const a = entry("A-WAYFINDING", [data.zones[0].zone_id], { effect: 10 });
  const b = entry("A-PROMO", ["July weekend 1"], { effect: 10 });
  const together = estimatePlan(data, [a, b]);
  close(
    together.gain,
    Math.max(estimatePlan(data, [a]).gain, estimatePlan(data, [b]).gain),
    0.001,
  );
});
