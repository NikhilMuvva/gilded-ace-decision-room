import { plannedDebit } from "./scheduling.mjs";
export const C = {
  date: 0,
  machine: 1,
  zone: 2,
  bank: 3,
  config: 4,
  coin: 5,
  win: 6,
  theo: 7,
  available: 8,
  scheduled: 9,
  occupied: 10,
  costs: 11,
  variance: 12,
  expected: 13,
  lostCoin: 14,
  lostTheo: 15,
  location: 16,
  peerHours: 17,
};
export function selectRows(data, start, end, zone = "all", bank = "all") {
  return data.rows.filter(
    (r) =>
      data.dates[r[0]].slice(0, 7) >= start &&
      data.dates[r[0]].slice(0, 7) <= end &&
      (zone === "all" || data.zones[r[2]].zone_id === zone) &&
      (bank === "all" || r[3] === bank),
  );
}
export function aggregate(rows) {
  const result = {
    coin: 0,
    win: 0,
    theo: 0,
    available: 0,
    scheduled: 0,
    occupied: 0,
    costs: 0,
    variance: 0,
    expected: 0,
    lostCoin: 0,
    lostTheo: 0,
  };
  for (const r of rows)
    for (const key of Object.keys(result)) result[key] += r[C[key]];
  return {
    ...result,
    down: result.scheduled - result.available,
    rate: result.available ? result.theo / result.available : null,
    index: result.expected ? result.theo / result.expected : null,
    availability: result.scheduled ? result.available / result.scheduled : null,
    hold: result.coin ? result.win / result.coin : null,
  };
}
// Abramowitz-Stegun normal tail approximation; two-sided probability.
export function normalP(z) {
  const x = Math.abs(z) / Math.SQRT2,
    t = 1 / (1 + 0.3275911 * x);
  return Math.min(
    1,
    Math.max(
      0,
      ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
        t +
        0.254829592) *
        t *
        Math.exp(-x * x),
    ),
  );
}
export function machineScores(data, rows) {
  const groups = new Map();
  for (const r of rows) {
    if (!groups.has(r[1])) groups.set(r[1], []);
    groups.get(r[1]).push(r);
  }
  const scores = [...groups].map(([id, rs]) => {
    const a = aggregate(rs),
      last = rs.reduce((a, b) => (a[0] > b[0] ? a : b));
    const z = a.variance ? (a.win - a.theo) / Math.sqrt(a.variance) : 0;
    return {
      ...a,
      ...data.machines[id],
      machineIndex: id,
      zone: data.zones[last[2]],
      bank: last[3],
      location: last[16],
      days: new Set(rs.map((r) => r[0])).size,
      z,
      p: normalP(z),
      q: 1,
    };
  });
  const ordered = [...scores].sort((a, b) => a.p - b.p);
  let q = 1;
  for (let i = ordered.length - 1; i >= 0; i--) {
    q = Math.min(q, (ordered[i].p * ordered.length) / (i + 1));
    ordered[i].q = q;
  }
  return scores.sort((a, b) => a.win - b.win);
}
export function unitCost(action) {
  return (
    (action.unit_cost_cents +
      action.recurring_cost_cents_per_day *
        Math.max(0, 30 - action.lead_days)) /
    100
  );
}
export function targetOptions(data, action) {
  const m = data.planner.machines;
  if (action.unit === "machine") return m.map((x) => x.id);
  if (action.unit === "bank") return [...new Set(m.map((x) => x.bank))].sort();
  if (action.unit === "zone")
    return data.zones
      .filter((z) => m.some((x) => x.zone === z.zone_id))
      .map((z) => z.zone_id);
  if (action.unit === "manufacturer")
    return [...new Set(m.map((x) => x.manufacturer))].sort();
  if (action.unit === "technician_shift") return ["day", "swing", "grave"];
  if (action.unit === "event") return ["July weekend 1", "July weekend 2"];
  return ["property"];
}
export function affectedMachines(data, action, entry) {
  const m = data.planner.machines;
  if (action.unit === "machine") return entry.targets;
  if (action.unit === "bank")
    return m.filter((x) => entry.targets.includes(x.bank)).map((x) => x.id);
  if (action.unit === "manufacturer")
    return m
      .filter((x) => entry.targets.includes(x.manufacturer))
      .map((x) => x.id);
  return [];
}
export function validatePlan(data, entries) {
  const errors = [],
    used = new Map();
  let cost = 0;
  if (entries.length > 3) errors.push("Choose at most three action types.");
  if (new Set(entries.map((e) => e.id)).size !== entries.length)
    errors.push("Combine units of the same action type.");
  const byId = Object.fromEntries(
    data.actions.map((a) => [a.action_type_id, a]),
  );
  const moving = new Set(
    entries
      .filter(
        (e) =>
          e.id.startsWith("A-MOVE") && byId[e.id] && Array.isArray(e.targets),
      )
      .flatMap((e) => affectedMachines(data, byId[e.id], e)),
  );
  const occupants = new Map(
    data.planner.machines.map((m) => [m.location, m.id]),
  );
  for (const e of entries) {
    const a = byId[e.id];
    if (!a) {
      errors.push("Unknown catalog action.");
      continue;
    }
    if (
      !Number.isInteger(e.quantity) ||
      e.quantity < 1 ||
      e.quantity > a.quantity_limit
    ) {
      errors.push(`${a.name}: quantity must be 1–${a.quantity_limit}.`);
      continue;
    }
    cost += unitCost(a) * e.quantity + (e.extraCost || 0);
    if (!Array.isArray(e.targets)) {
      errors.push(`${a.name}: select one distinct valid target per unit.`);
      continue;
    }
    if (e.extraCost < 0 || !Number.isFinite(e.extraCost || 0))
      errors.push("Additional comp budget must be nonnegative.");
    if (
      e.id === "A-COMP-CHANGE" &&
      (!Number.isFinite(e.pointsRate) || e.pointsRate < 5 || e.pointsRate > 20)
    )
      errors.push(
        "Floor-wide comp rate must be between 5 and 20 points per comp dollar.",
      );
    const opts = targetOptions(data, a);
    if (
      !Array.isArray(e.targets) ||
      e.targets.length !== e.quantity ||
      new Set(e.targets).size !== e.targets.length ||
      e.targets.some((t) => !opts.includes(t))
    )
      errors.push(`${a.name}: select one distinct valid target per unit.`);
    if (a.incompatibility_group === "comp_policy") {
      if (used.has("comp_policy"))
        errors.push(
          "Comp pilot and floor-wide comp change cannot be combined.",
        );
      used.set("comp_policy", a.name);
    }
    if (a.incompatibility_group === "same_machine")
      for (const id of affectedMachines(data, a, e)) {
        if (used.has(id))
          errors.push(`${id} has conflicting move/replacement actions.`);
        used.set(id, a.name);
      }
    // Moves must specify feasible, vacant destinations; a bank needs enough vacant slots.
    if (e.id.startsWith("A-MOVE")) {
      const occupied = new Set(
        data.planner.machines.map((m) => m.location).filter(Boolean),
      );
      const destinations = e.destinations || [];
      const affected = affectedMachines(data, a, e);
      if (
        destinations.length !== affected.length ||
        new Set(destinations).size !== destinations.length ||
        destinations.some(
          (id) =>
            (occupied.has(id) && !moving.has(occupants.get(id))) ||
            !data.locations.some((l) => l.location_id === id),
        )
      )
        errors.push(
          `${a.name}: assign one distinct vacant destination slot for every affected machine.`,
        );
      for (const id of destinations) {
        if (used.has("slot:" + id))
          errors.push("A destination slot is assigned twice.");
        used.set("slot:" + id, a.name);
      }
      if (
        affected.some(
          (id, i) =>
            data.planner.machines.find((m) => m.id === id)?.location ===
            destinations[i],
        )
      )
        errors.push("A relocation must change each affected machine position.");
      if (e.id === "A-MOVE-BANK" && destinations.length === affected.length) {
        for (const sourceBank of e.targets) {
          const targetBanks = new Set(
            affected
              .map((id, i) => ({ id, destination: destinations[i] }))
              .filter(
                (x) =>
                  data.planner.machines.find((m) => m.id === x.id)?.bank ===
                  sourceBank,
              )
              .map(
                (x) =>
                  data.locations.find((l) => l.location_id === x.destination)
                    ?.bank_id,
              ),
          );
          if (targetBanks.size !== 1 || targetBanks.has(undefined))
            errors.push(
              "A whole-bank relocation must keep that bank together in one destination bank.",
            );
        }
      }
    }
  }
  if (cost > data.planner.budget + 1e-8)
    errors.push("Plan exceeds the $100,000 budget.");
  return {
    cost,
    remaining: data.planner.budget - cost,
    errors: [...new Set(errors)],
    valid: !errors.length,
  };
}
export function estimateAction(data, entry) {
  const a = data.actions.find((a) => a.action_type_id === entry.id),
    days = Math.max(0, 30 - a.lead_days);
  const machines = data.planner.machines.filter((m) =>
    affectedMachines(data, a, entry).includes(m.id),
  );
  const effect = Number(entry.effect || 0) / 100;
  let base = 0,
    description = "Information value is not monetized.",
    downtimeHours = (machines.length * a.downtime_minutes) / 60;
  if (entry.id === "A-TECH-SHIFT") {
    base = data.decision
      ? entry.targets.reduce(
          (sum, shift) =>
            sum +
            (data.decision.queueByShift.find((s) => s.shift === shift)
              ?.dailyOpportunity || 0),
          0,
        ) * days
      : data.planner.techDailyOpportunity * days;
    description = data.decision
      ? "Recover a share of unioned metered queue opportunity in the selected shift(s); hands-on repair time is not booked as staffing recovery."
      : "Recover a share of historical queue opportunity; shared pool capped at 100%.";
  }
  if (entry.id === "A-PREVENTIVE") {
    base = machines.reduce((s, m) => s + m.dailyDowntimeTheo, 0) * days;
    description =
      "Avoid a share of June downtime opportunity for the selected manufacturer(s).";
  }
  if (entry.id === "A-WAYFINDING") {
    base =
      data.planner.machines
        .filter((m) => entry.targets.includes(m.zone))
        .reduce((s, m) => s + m.dailyTheo, 0) * days;
    description =
      "Assumed incremental zone theo; displacement elsewhere is unobserved.";
  }
  if (
    [
      "A-MOVE-MACHINE",
      "A-MOVE-BANK",
      "A-REPLACE-LEASE",
      "A-REPLACE-BUY",
    ].includes(entry.id)
  ) {
    base = machines.reduce((s, m) => s + m.dailyTheo, 0) * days;
    description =
      "Assumed uplift over the June target baseline; new-title performance is unknown.";
  }
  if (entry.id === "A-COMP-CHANGE") {
    base = data.planner.compDailyCost * days;
    description =
      "Assumed comp cost saving; guest response and point liability are unmodeled.";
  }
  if (entry.id === "A-PROMO") {
    base =
      data.planner.machines.reduce((s, m) => s + m.dailyTheo, 0) *
      2 *
      entry.quantity;
    description =
      "Two-day event baseline; assumed uplift, with no spillover benefit counted.";
  }
  let gain = base * effect;
  if (entry.id === "A-TECH-SHIFT" && !data.decision)
    gain = base * Math.min(1, effect * entry.quantity);
  const schedule = plannedDebit(data, machines, a.downtime_minutes, {
      actionId: entry.id,
      days,
      quantity: entry.quantity,
    }),
    outageCost = schedule.debit;
  const cost = unitCost(a) * entry.quantity + (entry.extraCost || 0);
  return {
    days,
    base,
    gain,
    outageCost,
    allHourOutageCost: schedule.average,
    startHour: schedule.start,
    scheduleMode: schedule.mode,
    downtimeHours,
    cost,
    net: gain - outageCost - cost,
    description,
    breakeven: base
      ? (cost + outageCost) /
        (base *
          (entry.id === "A-TECH-SHIFT" && !data.decision ? entry.quantity : 1))
      : null,
  };
}
export function estimatePlan(data, entries) {
  const estimates = entries.map((e) => estimateAction(data, e));
  // Tech and preventive actions address overlapping downtime; use the larger benefit.
  const tech = entries.findIndex((e) => e.id === "A-TECH-SHIFT"),
    maintenance = entries.findIndex((e) => e.id === "A-PREVENTIVE");
  const overlap =
    tech >= 0 && maintenance >= 0
      ? Math.min(estimates[tech].gain, estimates[maintenance].gain)
      : 0;
  const demandIds = [
    "A-WAYFINDING",
    "A-MOVE-MACHINE",
    "A-MOVE-BANK",
    "A-REPLACE-LEASE",
    "A-REPLACE-BUY",
    "A-PROMO",
  ];
  const demandGains = entries.map((e, i) =>
    demandIds.includes(e.id) ? estimates[i].gain : 0,
  );
  const demandOverlap =
    demandGains.reduce((s, g) => s + g, 0) - Math.max(0, ...demandGains);
  return {
    estimates,
    overlap: overlap + demandOverlap,
    gain: estimates.reduce((s, e) => s + e.gain, 0) - overlap - demandOverlap,
    outage: estimates.reduce((s, e) => s + e.outageCost, 0),
    cost: estimates.reduce((s, e) => s + e.cost, 0),
    net: estimates.reduce((s, e) => s + e.net, 0) - overlap - demandOverlap,
  };
}
