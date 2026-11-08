import { readFile, writeFile } from "node:fs/promises";
import {
  generateCandidates,
  enumeratePortfolios,
  choosePortfolios,
  evaluatePortfolio,
  actionScenario,
} from "../src/decisionEngine.mjs";
const root = new URL("../", import.meta.url);
const data = JSON.parse(
  await readFile(new URL("public/data/dashboard.json", root), "utf8"),
);
const analysis = JSON.parse(
  await readFile(new URL("public/data/decision.json", root), "utf8"),
);
const candidates = generateCandidates(data, analysis),
  portfolios = enumeratePortfolios(data, analysis, candidates),
  selection = choosePortfolios(portfolios, 20000);
const byKey = new Map(candidates.map((c) => [c.key, c]));
const named = (id, name, keys) => ({
  id,
  name,
  keys,
  entries: keys.map((k) => byKey.get(k)?.entry).filter(Boolean),
  ...evaluatePortfolio(
    data,
    analysis,
    keys.map((k) => byKey.get(k)?.entry).filter(Boolean),
  ),
});
const strategies = [
  named("inspection", "Conservative inspection only", ["inspect-payout"]),
  named("pilot", "Targeted loyalty pilot", ["inspect-payout", "comp-pilot"]),
  named("operations", "Operational recovery comparison", [
    "preventive",
    "tech-1",
  ]),
  named("location", "Location/demand trial", ["wayfinding-back", "move-one"]),
  named("replacement", "Replace ten low-earning active machines (lease)", [
    "lease-10",
  ]),
  named("preserve", "Preserve budget", []),
  {
    ...selection.learning,
    id: "recommended",
    name: "Bounded learning portfolio",
  },
  {...selection.high,id:'optimistic',name:'Highest high-scenario net (assumption-driven)'},
];
if (strategies.some((s) => !s.valid))
  throw Error("A required comparison portfolio is infeasible");
const mfr = [...analysis.manufacturer].sort(
  (a, b) => b.faultsPer1000Days - a.faultsPer1000Days,
)[0];
const peak = analysis.hourly.reduce((a, b) =>
    a.theoPerHour > b.theoPerHour ? a : b,
  ),
  quiet = analysis.hourly.reduce((a, b) =>
    a.theoPerHour < b.theoPerHour ? a : b,
  );
const economic = analysis.machines
  .filter((m) => data.planner.machines.some((p) => p.id === m.machine_id))
  .sort((a, b) => b.costShare - a.costShare)[0];
const lowBank = [...analysis.banks].sort(
  (a, b) => a.occupancy - b.occupancy,
)[0];
const candidateAction = (key) => {
  const c = byKey.get(key);
  return c
    ? {
        key,
        entry: c.entry,
        base: actionScenario(data, analysis, c.entry, "base"),
      }
    : null;
};
const measurement = {
  payout: {
    treatment: "M-1158",
    control: "Reconciled configured game mathematics; no revenue uplift booked",
    primary:
      "Inspection result, meters/session reconciliation and paytable/configuration agreement",
    baseline: "Jan–Jun accumulated payout residual",
    period:
      "July 2 onward; one inspection and ongoing independent reconciliation",
    stop: "Retain the machine if configuration and meters are correct; do not replace based solely on another luck residual.",
  },
  manufacturer: {
    treatment: byKey.get("inspect-fault")?.entry.targets.join(", "),
    control:
      "Same-configuration/zone machines from the same manufacturer and other manufacturers",
    primary: "Root-cause findings and faults per active machine-day",
    secondary:
      "Queue wait, hands-on time, meter downtime and direct repair cost",
    baseline: "Jan–Jun; verify June recurrence and installation history",
    period: "July after one-day inspection lead; log all subsequent tickets",
    stop: "Do not claim diagnosis from a Poisson screen. Escalate only a documented recurring defect/process; broad sweep requires a separate business case.",
  },
  closure: {
    treatment: "Back Forty signage/sightline refresh",
    control:
      "Pre-registered other-zone/game strata and property-wide totals; do not use contaminated nearby banks as independent controls",
    primary:
      "Incremental property-wide theo/contribution after supplied incremental costs, adjusted for available hours and calendar",
    secondary:
      "Zone wager rate, crossings per covered sensor-hour, occupancy and displacement to/from other zones",
    baseline:
      "Pre-register June 11–30 and a matched weekday/control comparison before work",
    period: "July 11–30 after 10-day lead",
    stop: "Freeze analysis before launch; inspect weekly operational harm, stop if demand shifts away elsewhere or signs impair access. A small break-even effect may be undetectable in 20 days; inconclusive evidence does not prove zero.",
  },
  loyalty: {
    treatment:
      "Randomly assign eligible cohorts to a controlled point-policy pilot; do not target loss history",
    control:
      "Concurrent status-quo cohort balanced on pre-period tier/item mix; keep incremental comp budget at zero unless separately funded",
    primary:
      "Tracked contribution per eligible account, including linked POS cogs exactly once",
    secondary:
      "Redemption cost/face value, engagement, satisfaction and uncarded coverage limits",
    baseline:
      "June, fixed cohort eligibility and analysis plan before assignment",
    period: "July 6–30 after five-day design/training lead",
    stop: "Pre-register guest-protection and cost caps; stop for unexpected cost or harm. Pilot information value remains unpriced; a later rollout is not included as July earnings.",
  },
};
const opportunities = [
  {
    id: "manufacturer",
    title: "Manufacturer reliability concentration",
    target: mfr.manufacturer,
    type: "Availability / recurring faults",
    evidence: `${mfr.faults} faults over ${mfr.activeDays} active machine-days; adjusted rate ratio ${mfr.adjustedRateRatio.toFixed(2)} versus ${analysis.manufacturerModel.referenceManufacturer}.`,
    scale: mfr.repairCost,
    scaleLabel: "Observed six-month direct repair cost",
    persistent: true,
    action: candidateAction("inspect-fault"),
    alternatives: ["preventive", "tech-1"],
    strength: "Observed recurrence + adjusted association",
    uncertainty:
      "Rate-ratio interval is model-based; repeat tickets and unmeasured condition can confound association.",
    causal:
      "Inspection can identify a cause; preventive and staffing recoveries are unobserved.",
    priority: "Investigate recurring faults before a broad sweep",
    measurement: measurement.manufacturer,
    sources: [
      "operations",
      "machine_day",
      "placements",
      "game_math",
      "shift_roster",
    ],
    open: { page: "downtime" },
  },
  {
    id: "closure",
    title: "Access and location demand opportunity",
    target: "Back Forty",
    type: "Location / low utilization",
    evidence: `Adjusted closure-period association ${(analysis.closureDesign.models[0].duringAssociation * 100).toFixed(1)}%; trend specification ${(analysis.closureDesign.models[1].duringAssociation * 100).toFixed(1)}%.`,
    scale: data.closures[0].backRate
      ? data.planner.machines
          .filter((m) => m.zone === "Z-B40")
          .reduce((s, m) => s + m.dailyTheo, 0) * 20
      : 0,
    scaleLabel: "June-based 20-day zone theo baseline (not recoverable loss)",
    persistent: true,
    action: candidateAction("wayfinding-back"),
    alternatives: ["move-one", "swap-pair", "swap-banks"],
    strength: "Repeated rate pattern + comparative historical design",
    uncertainty:
      "Pre-trends differ and local confounding remains; ranks depend strongly on benchmark geography.",
    causal:
      "No causal signage or relocation uplift is identified. Property-wide displacement must be measured.",
    priority: "Bounded prospective test",
    measurement: measurement.closure,
    sources: [
      "prepared_daily_view",
      "floor_walkways",
      "placements",
      "zone_traffic_hourly",
    ],
    open: { page: "demand" },
  },
  {
    id: "loyalty",
    title: "Point-price change warrants a controlled policy test",
    target: "Whole-property loyalty program",
    type: "Loyalty economics",
    evidence:
      "Recorded May point-price shift persists with fixed item×tier mix; supported cells cover 98.93% of January face value.",
    scale: data.planner.compDailyCost * 30,
    scaleLabel: "Observed June redeemed economic cost",
    persistent: true,
    action: candidateAction("comp-pilot"),
    alternatives: ["comp-change", "survey"],
    strength: "One-to-one accounting + composition sensitivity",
    uncertainty:
      "Behavioral response, unused point liability and uncarded activity are not identified.",
    causal:
      "No causal policy benefit is booked; information value is unpriced.",
    priority: "Test before a floor-wide rate change",
    measurement: measurement.loyalty,
    sources: ["loyalty_ledger", "fnb_transactions", "player_period"],
    open: { page: "loyalty" },
  },
  {
    id: "payout",
    title: "Accumulated payout exception",
    target: "M-1158",
    type: "Statistical inspection",
    evidence: `z=${analysis.machines.find((m) => m.machine_id === "M-1158").z.toFixed(3)}, BH q=${analysis.machines.find((m) => m.machine_id === "M-1158").q.toFixed(6)} over Jan–Jun.`,
    scale: Math.abs(
      analysis.machines.find((m) => m.machine_id === "M-1158").win -
        analysis.machines.find((m) => m.machine_id === "M-1158").theo,
    ),
    scaleLabel: "Observed residual magnitude (not recoverable loss)",
    persistent: false,
    action: candidateAction("inspect-payout"),
    alternatives: [],
    strength: "Adjusted statistical flag + tail sensitivity",
    uncertainty: analysis.payoutSensitivity.qualification,
    causal: "A flag is not proof of malfunction or future recovery.",
    priority: "Targeted information purchase",
    measurement: measurement.payout,
    sources: ["machine_day", "game_math", "sessions"],
    open: { page: "machines", machine: "M-1158" },
  },
  {
    id: "economics",
    title: "Lease burden and replacement economics",
    target: economic.machine_id,
    type: "Contribution / supplied costs",
    evidence: `Supplied costs are ${(economic.costShare * 100).toFixed(1)}% of theo; all machines remain positive on six-month contribution after supplied costs.`,
    scale: economic.cost,
    scaleLabel: "Observed six-month supplied costs",
    persistent: true,
    action: candidateAction("lease-1"),
    alternatives: ["lease-10", "purchase-one"],
    strength: "Exact accounting; new-title economics unknown",
    uncertainty:
      "Contract termination savings, new-title demand and full overhead are absent. No avoided old lease cost is silently credited.",
    causal:
      "Replacing a positive-contribution machine needs an incremental business case.",
    priority: "Defer replacement without stronger evidence",
    measurement: {
      primary: "Incremental contribution versus retained matched machines",
      baseline: "June active-machine contribution and actual cost terms",
      period:
        "16 eligible lease days or nine purchase days; long-run asset value outside this horizon",
      stop: "Do not replace solely on raw win or a descriptive percentile.",
    },
    sources: [
      "cost_rules",
      "machine_day",
      "prepared_daily_view",
      "action_catalog",
    ],
    open: { page: "machines", machine: economic.machine_id },
  },
  {
    id: "queue",
    title: "Queue opportunity is smaller than full downtime",
    target: "Technician shifts",
    type: "Operational process",
    evidence: `${analysis.queueByShift.reduce((s, q) => s + q.queueHours, 0).toFixed(1)} queued hours intersect metered outages; hands-on repair is a different process.`,
    scale: analysis.queueByShift.reduce((s, q) => s + q.queueTheo, 0),
    scaleLabel: "Six-month queue theo proxy (not causal recovery)",
    persistent: true,
    action: candidateAction("tech-1"),
    alternatives: ["tech-2", "tech-3"],
    strength: "Measured queue/meter intersection; effect unobserved",
    uncertainty:
      "Adding a technician cannot recover all repair time; guests may switch machines.",
    causal:
      "The recoverable fraction is a scenario and capped at its shift pool.",
    priority: "Compare full-recovery ceiling with cost before staffing",
    measurement: {
      primary:
        "Metered queued downtime by shift and property-wide contribution",
      control:
        "Comparable shifts/weeks; record actual staffing and queue arrivals",
      period: "23 eligible days after seven-day lead",
      stop: "Do not add ticket durations to metered downtime or count the same recovery twice.",
    },
    sources: ["operations", "machine_hour", "shift_roster"],
    open: { page: "downtime" },
  },
  {
    id: "quiet-hours",
    title: "Schedule work in lower-demand hours",
    target: `Local hour ${quiet.local_hour}:00 versus ${peak.local_hour}:00 peak`,
    type: "Scheduling / opportunity cost",
    evidence: `Observed theo per available hour ${quiet.theoPerHour.toFixed(2)} versus ${peak.theoPerHour.toFixed(2)}. Frozen training-window quiet choice remains best in the later diagnostic.`,
    scale: peak.theoPerHour - quiet.theoPerHour,
    scaleLabel: "Observed hourly theo-rate difference per machine",
    persistent: true,
    action: null,
    alternatives: [],
    strength: "Hourly meters + chronological timing diagnostic",
    uncertainty:
      "June profiles are planning proxies; July demand and scheduling constraints can differ.",
    causal:
      "Moving planned work in time does not create new play or guarantee recovered profit.",
    priority: "Use as a scheduling condition on every action",
    measurement: {
      primary: "Actual scheduled start, downtime and displaced play",
      period:
        "Every intervention; gaming-day boundary and guest-access constraints respected",
      stop: "Reconcile actual outage to meters; do not claim the debit difference as observed earnings.",
    },
    sources: ["machine_hour", "calendar_day", "game_math"],
    open: { page: "methods" },
  },
];
analysis.opportunities = opportunities;
analysis.candidates = candidates;
analysis.strategies = strategies;
analysis.search = {
  candidateBundles: candidates.length,
  feasiblePortfolios: portfolios.length,
  maxTypes: 3,
  scope:
    "Exhaustive combinations of generated evidence-based bundles, not all possible machine/location/quantity configurations. Preserve cash is included.",
  scenarioAssumptions: {
    rates:
      "Explicit low/base/high effects by action; no effect probabilities or causal estimates.",
    displacement:
      "Positive demand base retains 50%, high retains 75%; low negative effects are not reduced.",
    costs:
      "Catalog costs charged in full; quiet-window debit uses June hourly theo profiles; no unverified old-contract savings.",
    overlap:
      "Largest positive benefit in each demand/recovery pool, all negative effects counted.",
  },
  frontier: [0, 5000, 10000, 20000, 30000].map((cap) => {
    const choice = choosePortfolios(portfolios, cap).learning;
    return {
      riskCap: cap,
      keys: choice.keys,
      cost: choice.cost,
      worstDownside: choice.worstDownside,
      channels: choice.channels,
      baseNet: choice.scenarios.base.net,
    };
  }),
};
analysis.recommendation = {
  ...selection.learning,
  policy: selection.policy,
  riskCap: selection.riskCap,
  goal: "Bounded learning, not a proven maximum-profit portfolio",
  financialMaximin: selection.financial.keys,
  baseScenarioBest: selection.base.keys,
  highScenarioBest: selection.high.keys,
};
analysis.infeasibleAlternatives = [
  {
    name: "Purchase ten machines",
    cost: 220000,
    reason: "Full $22,000 unit capital cost × 10 exceeds the $100,000 budget.",
  },
];
analysis.measurementPlans = measurement;
await writeFile(
  new URL("public/data/decision.json", root),
  JSON.stringify(analysis),
);
const report = { ...analysis };
delete report.diagnosticRows;
await writeFile(
  new URL("docs/SCIENTIFIC_AUDIT.json", root),
  JSON.stringify(report, null, 2) + "\n",
);
data.sourceManifestSha256 = analysis.sourceManifestSha256;
data.planner.recommended = analysis.recommendation.entries;
data.planner.recommendationSource =
  "decision-engine-v1: bounded learning under explicit downside policy";
await writeFile(
  new URL("public/data/dashboard.json", root),
  JSON.stringify(data),
);
console.log(
  JSON.stringify(
    {
      candidates: candidates.map((c) => c.key),
      feasible: portfolios.length,
      recommended: {
        keys: selection.learning.keys,
        cost: selection.learning.cost,
        remaining: selection.learning.remaining,
        downside: selection.learning.worstDownside,
        baseNet: selection.learning.scenarios.base.net,
        highNet: selection.learning.scenarios.high.net,
        channels: selection.learning.channels,
      },
      financial: selection.financial.keys,
    },
    null,
    2,
  ),
);
