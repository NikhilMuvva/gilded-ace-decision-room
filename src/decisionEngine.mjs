// Deterministic, catalog-constrained search over explicitly generated candidate bundles.
import {
  unitCost,
  validatePlan,
  estimateAction,
  affectedMachines,
} from "./lib.mjs";
import { profileWindow, plannedDebit } from "./scheduling.mjs";
export { profileWindow } from "./scheduling.mjs";
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
const scenarioRates = {
  "A-WAYFINDING": [-0.02, 0.03, 0.08],
  "A-MOVE-MACHINE": [-0.05, 0.05, 0.15],
  "A-MOVE-BANK": [-0.05, 0.05, 0.15],
  "A-REPLACE-LEASE": [-0.05, 0.1, 0.3],
  "A-REPLACE-BUY": [-0.05, 0.1, 0.3],
  "A-PROMO": [-0.02, 0.05, 0.15],
  "A-TECH-SHIFT": [0, 0.25, 0.75],
  "A-PREVENTIVE": [0, 0.25, 0.75],
  "A-COMP-CHANGE": [-0.05, 0.03, 0.1],
};
const displacement = [0, 0.5, 0.25]; // low negative response is not reduced; positive base/high allow displacement.
export function actionScenario(data, analysis, e, scenario = "base") {
  const a = data.actions.find((a) => a.action_type_id === e.id);
  if (!a) throw Error("Unknown action");
  const estimate = estimateAction(data, e),
    index = ["low", "base", "high"].indexOf(scenario);
  if (index < 0) throw Error("Unknown scenario");
  const affected = affectedMachines(data, a, e);
  const schedule = plannedDebit(
    { ...data, decision: analysis },
    data.planner.machines.filter((m) => affected.includes(m.id)),
    a.downtime_minutes,
    { actionId: e.id, days: estimate.days, quantity: e.quantity },
  );
  const debit = schedule.debit,
    startHour = schedule.start;
  let base = estimate.base;
  if (e.id === "A-TECH-SHIFT")
    base =
      e.targets.reduce(
        (sum, shift) =>
          sum +
          (analysis.queueByShift.find((s) => s.shift === shift)
            ?.dailyOpportunity || 0),
        0,
      ) * estimate.days;
  const demand = [
    "A-WAYFINDING",
    "A-MOVE-MACHINE",
    "A-MOVE-BANK",
    "A-REPLACE-LEASE",
    "A-REPLACE-BUY",
    "A-PROMO",
  ].includes(e.id);
  const rate = scenarioRates[e.id]?.[index] || 0;
  const retained = demand && rate > 0 ? 1 - displacement[index] : 1;
  const gain = base * rate * retained;
  const maximumRate = [
    "A-TECH-SHIFT",
    "A-PREVENTIVE",
    "A-COMP-CHANGE",
  ].includes(e.id)
    ? 1
    : null;
  const breakeven = base > 0 ? (estimate.cost + debit) / base : null;
  return {
    id: e.id,
    quantity: e.quantity,
    targets: e.targets,
    destinations: e.destinations || [],
    days: estimate.days,
    leadDays: a.lead_days,
    oneTimeCost: (a.unit_cost_cents * e.quantity) / 100,
    recurringCost:
      (a.recurring_cost_cents_per_day * estimate.days * e.quantity) / 100,
    extraCost: e.extraCost || 0,
    cost: estimate.cost,
    requiredMachineDowntimeHours: estimate.downtimeHours,
    plannedDebit: debit,
    allHourDebit: schedule.average,
    startHour,
    scheduleMode: schedule.mode,
    base,
    assumedEffect: rate,
    retainedShare: retained,
    gain,
    net: gain - estimate.cost - debit,
    breakevenNetEffect: breakeven,
    breakEvenBeforeDisplacement:
      breakeven == null ? null : breakeven / (demand ? 0.5 : 1),
    maximumRate,
    impossibleWithinRecoveryPool:
      maximumRate !== null && breakeven > maximumRate,
    informationUnpriced: base === 0,
  };
}
export function evaluatePortfolio(data, analysis, entries) {
  const validation = validatePlan(data, entries);
  if (!validation.valid)
    return {
      valid: false,
      errors: validation.errors,
      cost: validation.cost,
      remaining: validation.remaining,
    };
  const scenarios = {};
  for (const level of ["low", "base", "high"]) {
    const actions = entries.map((e) =>
      actionScenario(data, analysis, e, level),
    );
    const recovery = actions.filter((a) =>
      ["A-TECH-SHIFT", "A-PREVENTIVE"].includes(a.id),
    );
    const demand = actions.filter((a) =>
      [
        "A-WAYFINDING",
        "A-MOVE-MACHINE",
        "A-MOVE-BANK",
        "A-REPLACE-LEASE",
        "A-REPLACE-BUY",
        "A-PROMO",
      ].includes(a.id),
    );
    // Conservative nonadditivity for uncertain positive benefits. Negative effects all count.
    const cap = (group) =>
      group.reduce((s, a) => s + Math.max(0, a.gain), 0) -
      Math.max(0, ...group.map((a) => a.gain));
    const overlap = cap(recovery) + cap(demand),
      gain = actions.reduce((s, a) => s + a.gain, 0) - overlap,
      debit = actions.reduce((s, a) => s + a.plannedDebit, 0);
    scenarios[level] = {
      actions,
      gain,
      debit,
      overlap,
      net: gain - debit - validation.cost,
    };
  }
  return {
    valid: true,
    errors: [],
    cost: validation.cost,
    remaining: validation.remaining,
    scenarios,
    worstDownside: Math.max(0, -scenarios.low.net),
    informationValueRequired: Math.max(0, -scenarios.base.net),
    qualification:
      "Low/base/high are explicit policy scenarios, not probabilities or expected ROI. Contribution is before unmodeled incremental variable costs/overhead. Positive demand and recovery benefits are conservatively capped within each pool; negative effects all count.",
  };
}

export function generateCandidates(data, analysis) {
  const current = new Map(data.planner.machines.map((m) => [m.id, m]));
  const eligible = analysis.machines.filter((m) => current.has(m.machine_id));
  const flagged = eligible
    .filter((m) => m.z < 0 && m.q < 0.05)
    .sort((a, b) => a.z - b.z);
  const faults = eligible
    .filter((m) => m.days >= 84 && m.faults >= 2)
    .sort((a, b) => b.faults / b.days - a.faults / a.days);
  const low = [...eligible].sort((a, b) => a.win - b.win),
    lowIndex = [...eligible].sort((a, b) => a.index - b.index);
  const back = lowIndex.find((m) => m.zone === "Z-B40") || lowIndex[0];
  const occupied = new Set(data.planner.machines.map((m) => m.location));
  const vacancies = data.locations.filter((l) => !occupied.has(l.location_id));
  const candidates = [];
  const add = (
    key,
    title,
    e,
    channels = [],
    learning = false,
    evidence = [],
  ) => {
    const validation = validatePlan(data, [e]);
    if (validation.valid)
      candidates.push({ key, title, entry: e, channels, learning, evidence });
  };
  const inspection = flagged[0]?.machine_id;
  if (inspection)
    add(
      "inspect-payout",
      "Inspect payout exception",
      entry("A-INSPECT", [inspection]),
      ["payout"],
      true,
      ["payout"],
    );
  const repeatTarget = faults.find(
    (m) => m.machine_id !== inspection,
  )?.machine_id;
  if (repeatTarget)
    add(
      "inspect-fault",
      "Inspect recurrent-fault machine",
      entry("A-INSPECT", [repeatTarget]),
      ["reliability"],
      true,
      ["manufacturer", "faults"],
    );
  if (inspection && repeatTarget)
    add(
      "inspect-both",
      "Inspect payout and recurrent-fault targets",
      entry("A-INSPECT", [inspection, repeatTarget]),
      ["payout", "reliability"],
      true,
      ["payout", "manufacturer"],
    );
  const topFaults = [
    ...new Set(
      [inspection, ...faults.slice(0, 3).map((m) => m.machine_id)].filter(
        Boolean,
      ),
    ),
  ].slice(0, 3);
  if (topFaults.length === 3)
    add(
      "inspect-three",
      "Three targeted diagnostic inspections",
      entry("A-INSPECT", topFaults),
      ["payout", "reliability"],
      true,
      ["payout", "manufacturer"],
    );
  add(
    "wayfinding-back",
    "Controlled Back Forty access/signage trial",
    entry("A-WAYFINDING", ["Z-B40"]),
    ["access"],
    true,
    ["closure"],
  );
  add(
    "comp-pilot",
    "Controlled loyalty policy pilot",
    entry("A-COMP-PILOT", ["property"]),
    ["loyalty"],
    true,
    ["loyalty"],
  );
  add(
    "comp-change",
    "Floor-wide point-policy scenario",
    entry("A-COMP-CHANGE", ["property"]),
    [],
    false,
    ["loyalty"],
  );
  const mfr = [...analysis.manufacturer].sort(
    (a, b) => b.faultsPer1000Days - a.faultsPer1000Days,
  )[0].manufacturer;
  add(
    "preventive",
    "Preventive sweep for high-fault manufacturer",
    entry("A-PREVENTIVE", [mfr]),
    ["reliability"],
    false,
    ["manufacturer"],
  );
  const shifts = [...analysis.queueByShift].sort(
    (a, b) => b.dailyOpportunity - a.dailyOpportunity,
  );
  for (let n = 1; n <= Math.min(3, shifts.length); n++)
    add(
      "tech-" + n,
      `${n} technician shift${n > 1 ? "s" : ""}`,
      entry(
        "A-TECH-SHIFT",
        shifts.slice(0, n).map((s) => s.shift),
      ),
      ["reliability"],
      false,
      ["queue"],
    );
  for (const n of [1, 3, 10])
    add(
      "lease-" + n,
      `Lease ${n} low-earning active machine${n > 1 ? "s" : ""}`,
      entry(
        "A-REPLACE-LEASE",
        low.slice(0, n).map((m) => m.machine_id),
      ),
      [],
      false,
      ["economics"],
    );
  add(
    "purchase-one",
    "Purchase one replacement",
    entry("A-REPLACE-BUY", [back.machine_id]),
    [],
    false,
    ["economics"],
  );
  const destination = vacancies.find((l) => l.zone_id !== back.zone);
  if (destination)
    add(
      "move-one",
      "Single-machine relocation trial",
      entry("A-MOVE-MACHINE", [back.machine_id], {
        destinations: [destination.location_id],
      }),
      ["access"],
      false,
      ["location"],
    );
  const swap = eligible.find(
    (m) => m.zone !== back.zone && m.configuration === back.configuration,
  );
  if (swap)
    add(
      "swap-pair",
      "Swap two comparable machines",
      entry("A-MOVE-MACHINE", [back.machine_id, swap.machine_id], {
        destinations: [
          current.get(swap.machine_id).location,
          current.get(back.machine_id).location,
        ],
      }),
      ["access"],
      false,
      ["location"],
    );
  const sourceBank = current.get(back.machine_id).bank,
    sourceMembers = data.planner.machines.filter((m) => m.bank === sourceBank);
  const otherBank = [
    ...new Set(
      data.planner.machines
        .filter((m) => m.zone !== back.zone)
        .map((m) => m.bank),
    ),
  ].find(
    (bank) =>
      data.planner.machines.filter((m) => m.bank === bank).length ===
      sourceMembers.length,
  );
  if (otherBank) {
    const members = data.planner.machines.filter((m) => m.bank === otherBank);
    add(
      "swap-banks",
      "Swap two complete banks",
      entry("A-MOVE-BANK", [sourceBank, otherBank], {
        destinations: [...sourceMembers, ...members]
          .sort(
            (a, b) =>
              data.planner.machines.indexOf(a) -
              data.planner.machines.indexOf(b),
          )
          .map((m) =>
            m.bank === sourceBank
              ? members[sourceMembers.indexOf(m)].location
              : sourceMembers[members.indexOf(m)].location,
          ),
      }),
      ["access"],
      false,
      ["location"],
    );
  }
  add(
    "promotion",
    "One property promotion weekend",
    entry("A-PROMO", ["July weekend 1"]),
    ["access"],
    false,
    ["events"],
  );
  add(
    "survey",
    "Expanded intercept survey",
    entry("A-SURVEY", ["property"]),
    ["guest-experience"],
    false,
    ["guest"],
  );
  return candidates;
}

export function enumeratePortfolios(data, analysis, candidates) {
  const results = [];
  const visit = (selected, start) => {
    const entries = selected.map((c) => c.entry),
      value = evaluatePortfolio(data, analysis, entries);
    if (value.valid)
      results.push({
        ...value,
        keys: selected.map((c) => c.key),
        entries,
        channels: [
          ...new Set(
            selected.filter((c) => c.learning).flatMap((c) => c.channels),
          ),
        ],
        learningEligible: selected.every((c) => c.learning),
      });
    if (selected.length === 3) return;
    for (let i = start; i < candidates.length; i++) {
      if (selected.some((c) => c.entry.id === candidates[i].entry.id)) continue;
      visit([...selected, candidates[i]], i + 1);
    }
  };
  visit([], 0);
  return results;
}
export function choosePortfolios(portfolios, riskCap = 20000) {
  const financial = [...portfolios].sort(
    (a, b) => b.scenarios.low.net - a.scenarios.low.net || a.cost - b.cost,
  )[0];
  const learning =
    portfolios
      .filter((p) => p.learningEligible && p.worstDownside <= riskCap)
      .sort(
        (a, b) =>
          b.channels.length - a.channels.length ||
          b.scenarios.base.net - a.scenarios.base.net ||
          a.cost - b.cost,
      )[0] || financial;
  const base = [...portfolios].sort(
    (a, b) => b.scenarios.base.net - a.scenarios.base.net || a.cost - b.cost,
  )[0];
  const high = [...portfolios].sort(
    (a, b) => b.scenarios.high.net - a.scenarios.high.net || a.cost - b.cost,
  )[0];
  return {
    financial,
    learning,
    base,
    high,
    riskCap,
    policy:
      "Learning recommendation maximizes the number of distinct pre-registered questions within a stated modeled-downside cap, then favors the higher base-scenario net and lower cash cost. This is a transparent management policy, not learned treatment effects or a global causal optimum.",
  };
}
