// Shared, read-only retrieval. Both offline evidence and the API use these exact calculations.
import {
  selectRows,
  aggregate,
  machineScores,
  validatePlan,
  estimatePlan,
  estimateAction,
} from "./lib.mjs";
import { rankPeers, peerSupport } from "./diagnostics.mjs";
import { machineDiagnostic } from "./machineDiagnostics.mjs";
import { selectModelPortfolios, currentPortfolioStrategies } from "./decisionEngine.mjs";
export const COPILOT_PAGES = [
  "overview",
  "machines",
  "demand",
  "downtime",
  "guests",
  "loyalty",
  "planner",
  "methods",
  "help",
  "opportunities",
  "hourly",
];
const object = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const keys = (value, allowed) =>
  assert(
    object(value) && Object.keys(value).every((k) => allowed.includes(k)),
    "Unexpected fields.",
  );
const finite = (v, lo, hi) =>
  typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;
export function validateContext(data, value) {
  keys(value, [
    "page",
    "start",
    "end",
    "zone",
    "bank",
    "machine",
    "group",
    "plan",
    "sourceVersion",
    "opportunityId",
    "portfolioId",
    "riskCap",
  ]);
  assert(
    value.sourceVersion === data.version,
    "Stale data version. Refresh the dashboard.",
  );
  assert(
    value.riskCap === undefined || finite(value.riskCap, 0, 100000),
    "Invalid financial downside cap.",
  );
  assert(
    value.portfolioId === undefined ||
      [
        "recommended",
        "learning",
        "risk-sensitive",
        "robust",
        "inspection",
        "pilot",
        "operations",
        "location",
        "replacement",
        "preserve",
        "optimistic",
      ].includes(value.portfolioId),
    "Unknown portfolio context.",
  );
  assert(
    value.opportunityId === undefined ||
      [
        "manufacturer",
        "closure",
        "loyalty",
        "payout",
        "economics",
        "queue",
        "quiet-hours",
      ].includes(value.opportunityId),
    "Unknown opportunity context.",
  );
  assert(COPILOT_PAGES.includes(value.page), "Unknown page.");
  assert(
    data.months.includes(value.start) &&
      data.months.includes(value.end) &&
      value.start <= value.end,
    "Invalid period.",
  );
  assert(
    value.zone === "all" || data.zones.some((z) => z.zone_id === value.zone),
    "Unknown zone.",
  );
  assert(
    typeof value.bank === "string" &&
      (value.bank === "all" ||
        selectRows(data, value.start, value.end, value.zone).some(
          (r) => r[3] === value.bank,
        )),
    "Unknown bank in this scope.",
  );
  assert(
    value.machine === null || data.machines.some((m) => m.id === value.machine),
    "Unknown machine ID.",
  );
  const group = value.group || "all|All tracked guests";
  const [dimension, name, ...extra] = group.split("|");
  assert(
    !extra.length &&
      data.guests.some(
        (g) =>
          g.start === value.start &&
          g.end === value.end &&
          g.dimension === dimension &&
          g.group === name,
      ),
    "Unknown guest group.",
  );
  const plan = value.plan || [];
  assert(
    Array.isArray(plan) && plan.length <= 3,
    "At most three configured actions.",
  );
  const cleanPlan = plan.map((e) => {
    keys(e, [
      "id",
      "quantity",
      "targets",
      "effect",
      "extraCost",
      "pointsRate",
      "destinations",
    ]);
    const a = data.actions.find((a) => a.action_type_id === e.id);
    assert(
      a &&
        Number.isInteger(e.quantity) &&
        finite(e.quantity, 1, a.quantity_limit),
      "Invalid action or quantity.",
    );
    assert(
      Array.isArray(e.targets) &&
        e.targets.length <= 24 &&
        e.targets.every((t) => typeof t === "string" && t.length <= 80),
      "Invalid targets.",
    );
    assert(
      finite(e.effect ?? 0, 0, 200) && finite(e.extraCost ?? 0, 0, 1000000),
      "Invalid scenario assumption.",
    );
    assert(
      e.pointsRate === undefined || finite(e.pointsRate, 0, 100),
      "Invalid point rate.",
    );
    assert(
      e.destinations === undefined ||
        (Array.isArray(e.destinations) &&
          e.destinations.length <= 308 &&
          e.destinations.every((t) => typeof t === "string" && t.length <= 40)),
      "Invalid destinations.",
    );
    return { ...e, effect: e.effect ?? 0, extraCost: e.extraCost ?? 0 };
  });
  return { ...value, group, plan: cleanPlan };
}
const m = (label, value, unit) => ({
  label,
  value: Number.isFinite(value) ? value : null,
  unit,
});
const baseCard = (
  id,
  title,
  kind,
  scope,
  metrics,
  explanation,
  limitations,
  open,
  claim = "CLAIMS_AND_EVIDENCE.md",
) => ({
  id,
  title,
  kind,
  scope,
  metrics,
  explanation,
  limitations,
  open,
  evidence: [
    { label: "Calculation and evidence", href: "/docs/" + claim },
    {
      label: "Parameters and qualifications",
      href: "/docs/PARAMETER_REGISTER.md",
    },
  ],
});
const period = (c) =>
  `${c.start} through ${c.end} · ${c.zone} · ${c.bank} · all play`;
const scopeRows = (data, c) => selectRows(data, c.start, c.end, c.zone, c.bank);
const contextOpen = (c, page, patch = {}) => ({
  page,
  start: c.start,
  end: c.end,
  zone: c.zone,
  bank: c.bank,
  machine: c.machine,
  ...patch,
});
const schema = (properties = {}, required = []) => ({
  type: "OBJECT",
  properties,
  required,
});
const str = { type: "STRING" };
export const TOOL_DECLARATIONS = [
  {
    name: "get_opportunities",
    description:
      "Full-window multi-dimensional Opportunity Register: reliability, access, loyalty, payout and economic limitations, with measurement plans.",
    parameters: schema(),
  },
  {
    name: "compare_portfolios",
    description:
      "Actual current primary financial recommendation (recommended), separate experimental backup (learning, fixed $20,000 cap), downside-constrained financial alternative (risk-sensitive), or other comparisons. Recomputed costs and low/base/high net; not causal ROI.",
    parameters: schema({
      strategyId: {
        type: "STRING",
        enum: [
          "recommended",
          "learning",
          "risk-sensitive",
          "robust",
          "inspection",
          "pilot",
          "operations",
          "location",
          "replacement",
          "preserve",
          "optimistic",
        ],
      },
    }),
  },
  {
    name: "get_machine_diagnostics",
    description:
      "Demand, utilization, contribution, payout, fault and evidence-support dimensions for a machine in the current period and floor scope.",
    parameters: schema({ machineId: str }),
  },
  {
    name: "get_machine_summary",
    description:
      "Continuous machine peer score, rank, exposure, support and actual/expected win. Current period and floor scope.",
    parameters: schema({ machineId: str }),
  },
  {
    name: "explain_anomaly",
    description:
      "Payout z and BH q computed across all machines in the current months before floor drilldown. Statistical flag, not proof.",
    parameters: schema({ machineId: str }),
  },
  {
    name: "compare_zones",
    description:
      "Compare up to three zone wager rates and availability; optionally use explicit requested month endpoints.",
    parameters: schema(
      { zoneIds: { type: "ARRAY", items: str }, start: str, end: str },
      ["zoneIds"],
    ),
  },
  {
    name: "get_downtime",
    description:
      "Metered downtime and matched-peer opportunity proxy in the current floor scope.",
    parameters: schema(),
  },
  {
    name: "get_model_validation",
    description:
      "Frozen forecast MAE, training/test chronology and quieter-weekday maintenance heuristic.",
    parameters: schema(),
  },
  {
    name: "get_loyalty_metric",
    description:
      "Property redemption cost and point pricing for selected months; floor filters do not apply.",
    parameters: schema(),
  },
  {
    name: "get_guest_metrics",
    description:
      "Tracked-only outcomes for current guest group and period; floor filters do not apply.",
    parameters: schema(),
  },
  {
    name: "get_claim_evidence",
    description:
      "Fixed full-window evidence and qualifications for closure, inspection, peers, downtime or loyalty.",
    parameters: schema(
      {
        claim: {
          type: "STRING",
          enum: ["closure", "inspection", "peers", "downtime", "loyalty"],
        },
      },
      ["claim"],
    ),
  },
  {
    name: "evaluate_configured_plan",
    description:
      "Read-only evaluation of the user-configured July plan; exact costs, break-even, zero-effect and limitations. Does not modify entries.",
    parameters: schema(),
  },
];
const allowed = Object.fromEntries(
  TOOL_DECLARATIONS.map((t) => [t.name, Object.keys(t.parameters.properties)]),
);
export function runTool(data, context, name, args = {}, audit = null) {
  assert(Object.hasOwn(allowed, name), "Tool is not allowlisted.");
  keys(args, allowed[name]);
  const c = validateContext(data, context);
  if (name === "get_opportunities") {
    const a = data.decision;
    assert(
      a?.opportunities,
      "Source-matched decision evidence is unavailable.",
    );
    const opportunities = [...a.opportunities].sort(
      (x, y) =>
        Number(y.id === c.opportunityId) - Number(x.id === c.opportunityId),
    );
    return baseCard(
      "get_opportunities",
      "Operational opportunities and evidence",
      "Observed findings and prospective questions",
      "Fixed Jan–Jun 2025 evidence; proposed July 1–30 actions",
      opportunities
        .slice(0, 3)
        .map((o) => m(o.title + " · " + o.scaleLabel, o.scale, "USD")),
      opportunities
        .slice(0, 4)
        .map((o) => `${o.target}: ${o.evidence} ${o.priority}.`)
        .join(" "),
      "Financial exposure is not recoverable value. Diagnostic categories can overlap and are not a badness score. " +
        a.benchmarkValidation.benchmarkDecision,
      { page: "opportunities", opportunityId: c.opportunityId },
      "COMPREHENSIVE_SCIENTIFIC_REPORT.md",
    );
  }
  if (name === "compare_portfolios") {
    const a = data.decision;
    assert(a?.strategies, "Source-matched portfolio evidence is unavailable.");
    const strategy = args.strategyId || c.portfolioId || "recommended",
      riskCap = c.riskCap ?? 20000;
    const selection = selectModelPortfolios(data, a, riskCap);
    const p = currentPortfolioStrategies(data, a, selection).find((p) => p.id === strategy);
    assert(p, "Unknown portfolio strategy.");
    return baseCard(
      "compare_portfolios:" + p.id,
      p.name,
      p.id === "recommended" ? "Financial optimization / explicit base scenario" : "Comparison portfolio / explicit management policy",
      "July 1–30, 2025; $100,000 budget; fixed June planning bases",
      [
        m("Action spend", p.cost, "USD"),
        m("Cash retained", p.remaining, "USD"),
        m("Low-scenario net", p.scenarios.low.net, "USD"),
        m("Base-scenario net", p.scenarios.base.net, "USD"),
        m("High-scenario net", p.scenarios.high.net, "USD"),
        m("Modeled downside", p.worstDownside, "USD"),
      ],
      p.entries.length
        ? p.entries
            .map((e) => `${e.id} × ${e.quantity}: ${e.targets.join(", ")}`)
            .join("; ") +
            ". " +
            (p.id === "learning" ? selection.objectives.learning : p.id === "risk-sensitive" ? selection.objectives.riskSensitive : selection.objectives.financial)
        : "No paid actions. Cash retained is budget, not earned return. " + (p.id === "risk-sensitive" ? selection.objectives.riskSensitive : selection.objectives.financial),
      `Effects are assumptions, not probabilities or causal estimates. Financial downside cap: $${riskCap.toLocaleString("en-US")}; the separate experimental option uses $20,000 and unpriced information value. No future July outcome is observed. Search covers generated bundles, not every possible portfolio. Monitor faults, meters, access, loyalty and property contribution; approve additional spending only above its documented contribution break-even boundary or explicitly choose learning.`,
      { page: "planner", portfolioId: p.id, riskCap },
      "COMPREHENSIVE_SCIENTIFIC_REPORT.md",
    );
  }
  if (name === "get_machine_diagnostics") {
    assert(data.decision, "Source-matched diagnostics unavailable.");
    const id = args.machineId ?? c.machine ?? "M-1158";
    assert(
      data.machines.some((m) => m.id === id),
      "Unknown machine ID.",
    );
    const rows = scopeRows(data, c),
      full = machineScores(data, selectRows(data, c.start, c.end)),
      scope = machineScores(data, rows),
      s = scope.find((s) => s.id === id),
      family = full.find((s) => s.id === id);
    assert(s && family, "Machine has no active rows in this scope.");
    s.z = family.z;
    s.q = family.q;
    s.support = peerSupport(rows.filter((r) => r[1] === s.machineIndex));
    const ratios = scope.map((s) => s.costs / s.theo).sort((a, b) => a - b),
      d = machineDiagnostic(
        data,
        data.decision,
        rows.filter((r) => r[1] === s.machineIndex),
        s,
        full,
        c.start,
        c.end,
        ratios[Math.floor(ratios.length / 2)],
      );
    return baseCard(
      "get_machine_diagnostics:" + id,
      id + ": separate diagnostic dimensions",
      "Exploratory retrospective diagnostics",
      period(c),
      [
        m("Actual house win", s.win, "USD"),
        m("Selected-month payout z", family.z, "standard deviations"),
        m("Selected-month BH q", family.q, "probability"),
        m(
          "Actual contribution after supplied costs",
          d.actualContribution,
          "USD",
        ),
        m(
          "Theo less recorded supplied costs",
          d.theoreticalContribution,
          "USD",
        ),
        m("Occupancy", d.occupancy * 100, "%"),
        m("Peer index lower bound", d.indexInterval?.[0], "×"),
        m("Peer index upper bound", d.indexInterval?.[1], "×"),
        m("Recorded fault tickets in scope", d.faults, "tickets"),
      ],
      d.labels.join("; ") +
        ". " +
        `Below peers in ${d.monthsBelowPeer}/${d.monthsObserved} observed months.`,
      d.qualification +
        " Fault/payout testing families use all machines in selected months before floor drilldown.",
      contextOpen(c, "machines", { machine: id }),
      "COMPREHENSIVE_SCIENTIFIC_REPORT.md",
    );
  }
  if (name === "get_machine_summary" || name === "explain_anomaly") {
    const id = args.machineId ?? c.machine ?? "M-1158";
    assert(
      typeof id === "string" && data.machines.some((x) => x.id === id),
      "Unknown machine ID.",
    );
    const full = machineScores(data, selectRows(data, c.start, c.end)),
      family = full.find((s) => s.id === id);
    const rs = scopeRows(data, c),
      rows = rs.filter((r) => data.machines[r[1]].id === id),
      a = aggregate(rows),
      support = peerSupport(rows);
    assert(rows.length && family, "Machine has no active rows in this scope.");
    const s = rankPeers(machineScores(data, rs)).find((s) => s.id === id);
    const anomaly = name === "explain_anomaly";
    return baseCard(
      `${name}:${id}`,
      `${id}: ${anomaly ? "payout evidence" : "matched-peer comparison"}`,
      anomaly ? "Statistical flag" : "Retrospective comparison",
      anomaly
        ? `${c.start} through ${c.end} · ${id}, all placements · BH family: all machines before floor filters`
        : period(c),
      anomaly
        ? [
            m("Actual house win", family.win, "USD"),
            m("Theoretical win", family.theo, "USD"),
            m("z", family.z, "standard deviations"),
            m("BH adjusted q", family.q, "probability"),
            m("Testing family", full.length, "machines"),
          ]
        : [
            m("House win", a.win, "USD"),
            m("Theoretical win", a.theo, "USD"),
            m("Peer index", a.index, "×"),
            m("Rank, low to high", s.peerRank, "rank"),
            m("Ranking population", s.peerPopulation, "machines"),
            m("Descriptive percentile", s.peerPercentile, "percentile"),
            m("Available exposure", a.available, "hours"),
            m("Fallback days", support.fallbackDays, "machine-days"),
            m("Active days", support.days, "days"),
          ],
      anomaly
        ? family.z < 0 && family.q < 0.05
          ? "This selected-month result warrants checking settings, meters and paytable. It does not establish a defective machine or wrongdoing."
          : "There is no adjusted negative payout flag in this selected-month family."
        : "The peer index compares theo with matched exposure, excluding the target. Rank is relative to the current floor scope, not a probability of failure.",
      anomaly
        ? "Payout tests cover all machines in selected months before zone/bank filtering. Normal tails, configured variance and independence are assumptions. M-1158’s full six-month flag does not imply independently significant monthly flags."
        : "Zone/configuration/month/weekday matching is retrospective; sparse cells use wider floor peers. Raw earnings confound exposure, demand and payout luck.",
      contextOpen(c, "machines", { machine: id }),
    );
  }
  if (name === "compare_zones") {
    assert(
      Array.isArray(args.zoneIds) &&
        args.zoneIds.length >= 1 &&
        args.zoneIds.length <= 3 &&
        new Set(args.zoneIds).size === args.zoneIds.length,
      "Choose one to three distinct zones.",
    );
    assert(
      args.zoneIds.every((id) => data.zones.some((z) => z.zone_id === id)),
      "Unknown zone.",
    );
    const start = args.start ?? c.start,
      end = args.end ?? c.end;
    assert(
      data.months.includes(start) && data.months.includes(end) && start <= end,
      "Invalid comparison period.",
    );
    const metrics = [];
    for (const id of args.zoneIds) {
      const a = aggregate(selectRows(data, start, end, id)),
        label = data.zones.find((z) => z.zone_id === id).name;
      metrics.push(
        m(
          label + " wagers / available hour",
          a.available ? a.coin / a.available : null,
          "USD/hour",
        ),
        m(label + " available exposure", a.available, "hours"),
        m(label + " total wagers", a.coin, "USD"),
      );
    }
    return baseCard(
      "compare_zones",
      "Zone demand comparison",
      "Observed rate",
      `${start} through ${end} · named zones · all banks and all play`,
      metrics,
      "These are ratios of sums: total wagers divided by available machine-hours.",
      "Zone comparisons include differences in game mix, demand, position and availability; they do not identify a causal relocation uplift.",
      contextOpen(c, "demand", {
        start,
        end,
        zone: "all",
        bank: "all",
        machine: null,
      }),
    );
  }
  if (name === "get_downtime") {
    const a = aggregate(scopeRows(data, c));
    return baseCard(
      "get_downtime",
      "Downtime and opportunity",
      "Retrospective estimate",
      period(c),
      [
        m("Metered unavailable time", a.down, "hours"),
        m("Forgone theo proxy", a.lostTheo, "USD"),
        m("50% rate scenario", a.lostTheo * 0.5, "USD"),
        m("150% rate scenario", a.lostTheo * 1.5, "USD"),
      ],
      "Unavailable hours are measured. Multiplying them by matched-peer rates estimates historical opportunity.",
      "The 50–150% range is hypothetical, not a confidence interval. Substitution and nonrandom outages mean recoverable property contribution can be zero.",
      contextOpen(c, "downtime"),
    );
  }
  if (name === "get_model_validation") {
    const model = data.model;
    const weekday = new Map();
    for (const p of model.points) {
      const w = (new Date(p.date + "T12:00:00Z").getUTCDay() + 6) % 7;
      weekday.set(w, p.model);
    }
    const quiet = [...weekday]
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3)
      .map(
        ([w]) =>
          [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ][w],
      )
      .join(", ");
    return baseCard(
      "get_model_validation",
      "Forecast and maintenance scheduling",
      "Validated prediction",
      `Selection: Jan–Mar → April; refit Jan–Apr; frozen May–June 2025`,
      [
        m("Frozen daily wager MAE", model.mae, "USD/day"),
        m("Constant baseline MAE", model.baselineMae, "USD/day"),
        m("MAE reduction", model.improvement * 100, "%"),
        m("Holdout days", model.testDays, "days"),
      ],
      `${model.name} was selected using April. Quieter predicted weekdays: ${quiet}. This can guide the timing of planned maintenance.`,
      "Scheduling is a weekday-demand heuristic, not causal outage savings, hourly demand or action ROI. May–June has already been examined; later candidates are exploratory. The bootstrap interval concerns error improvement, not future earnings.",
      contextOpen(c, "methods"),
    );
  }
  if (name === "get_loyalty_metric") {
    const records = data.loyalty.filter(
        (r) => r.month >= c.start && r.month <= c.end,
      ),
      cost = records.reduce((s, r) => s + r.cost, 0),
      face = records.reduce((s, r) => s + r.face, 0),
      points = records.reduce((s, r) => s + r.points, 0);
    return baseCard(
      "get_loyalty_metric",
      "Loyalty cost and point pricing",
      "Accounting and retrospective comparison",
      `${c.start} through ${c.end} · whole property · floor filters inapplicable`,
      [
        m("Economic cost", cost, "USD"),
        m("Menu face value", face, "USD"),
        m(
          "Realized points / face dollar",
          face ? points / face : null,
          "points/USD",
        ),
        ...records.map((r) =>
          m(
            r.month + " fixed-mix points / dollar",
            r.standardizedPoints,
            "points/USD",
          ),
        ),
      ],
      "Redemption costs reconcile one-to-one to POS cogs; face value is not economic cost. Fixed January item/tier weights retain the May point-price shift.",
      "Do not subtract comp cost again from contribution already net of cogs. Supported cells cover about 98.93% of January face value. These comparisons do not identify behavioral effects.",
      contextOpen(c, "loyalty"),
    );
  }
  if (name === "get_guest_metrics") {
    const [dimension, group] = c.group.split("|"),
      g = data.guests.find(
        (g) =>
          g.start === c.start &&
          g.end === c.end &&
          g.dimension === dimension &&
          g.group === group,
      );
    return baseCard(
      "get_guest_metrics",
      "Tracked guest outcomes",
      "Observed tracked outcomes",
      `${c.start} through ${c.end} · ${group} · carded play only`,
      [
        m("Tracked wagers", g.wagers, "USD"),
        m("Tracked payouts", g.payout, "USD"),
        m("Player net", g.net, "USD"),
        m("Players ahead", g.players ? (g.ahead / g.players) * 100 : null, "%"),
      ],
      "Player net is payouts minus wagers. Replayed winnings are part of wagers.",
      "Uncarded activity is missing at person level; tracked results are incomplete. Do not target high-loss guests to increase play.",
      contextOpen(c, "guests"),
    );
  }
  if (name === "get_claim_evidence") {
    assert(
      ["closure", "inspection", "peers", "downtime", "loyalty"].includes(
        args.claim,
      ),
      "Unknown evidence claim.",
    );
    const fixed = {
      ...c,
      start: "2025-01",
      end: "2025-06",
      zone: "all",
      bank: "all",
      machine: "M-1158",
    };
    if (args.claim !== "closure")
      return runTool(
        data,
        fixed,
        {
          inspection: "explain_anomaly",
          peers: "get_machine_summary",
          downtime: "get_downtime",
          loyalty: "get_loyalty_metric",
        }[args.claim],
        {},
        audit,
      );
    return baseCard(
      "closure",
      "Back Forty access disruption",
      "Retrospective association",
      "Fixed Jan–Jun 2025 · before/during closure relative to other zones",
      [
        m("Broad pre-period relative change", data.closureRelative * 100, "%"),
        ...(audit?.closureSensitivity
          ? [
              m(
                "Adjacent 35-day comparison",
                audit.closureSensitivity[1].relativeChange * 100,
                "%",
              ),
            ]
          : []),
      ],
      "Back Forty’s wager rate per available hour weakened relative to the rest of the floor during the recorded closure.",
      "This is not causal proof. Parallel trends are unverified and game mix, events and local demand can differ.",
      contextOpen(fixed, "demand"),
    );
  }
  if (name === "evaluate_configured_plan") {
    const validation = validatePlan(data, c.plan),
      estimate = estimatePlan(data, c.plan);
    const metrics = [
      m("Committed action cost", validation.cost, "USD"),
      m("Budget remaining", validation.remaining, "USD"),
      m("Assumed gross gain after overlap", estimate.gain, "USD"),
      m("Downtime theo debit", estimate.outage, "USD"),
      m("Scenario net", estimate.net, "USD"),
      m("Zero-effect net", -estimate.cost - estimate.outage, "USD"),
    ];
    c.plan.forEach((e) => {
      const a = estimateAction(data, e);
      metrics.push(
        m(
          e.id + " break-even effect",
          a.breakeven == null ? null : a.breakeven * 100,
          "%",
        ),
        m(e.id + " assumed effect", e.effect, "%"),
      );
    });
    return baseCard(
      "evaluate_configured_plan",
      "Configured July action plan",
      "Hypothetical scenario",
      "July 1–30, 2025 · June bases · $100,000 budget · configured entries only",
      metrics,
      validation.valid
        ? "Catalog and budget checks pass. Break-even is a required assumed effect, not an estimated treatment effect."
        : `Plan is invalid: ${validation.errors.join(" ")}`,
      "Information value is unpriced; the inspection costs $1,200 plus its expected downtime debit. Benefits can be zero. Compare only configured subsets, not all portfolios. Pre-register pilot/control, property-wide displacement checks and stop rules. No entries are modified.",
      { page: "planner" },
      "METHODOLOGY.md",
    );
  }
  throw new Error("Unavailable statistic.");
}
export function offlineEvidence(data, context, question, audit = null) {
  const c = validateContext(data, context);
  assert(
    typeof question === "string" &&
      question.trim().length > 0 &&
      question.length <= 1200,
    "Question must contain 1–1,200 characters.",
  );
  const ids = question.match(/M-\d+/gi) || [];
  assert(
    ids.every((id) => data.machines.some((m) => m.id === id.toUpperCase())),
    "Unknown machine ID in the question.",
  );
  const explicit = ids[0]?.toUpperCase();
  let calls = [];
  if (/caus|prove|guarantee|certain.*profit/i.test(question)) {
    const card = baseCard(
      "causality",
      "What the data cannot establish",
      "Limitation",
      period(c),
      [],
      "These observational records cannot prove causal action benefits or guarantee profit.",
      "Use pre-registered controls and property-wide outcomes to test an intervention. Scenario effects are assumptions.",
      contextOpen(c, "methods"),
    );
    return [card];
  }
  const zones = data.zones.filter((z) =>
    question.toLowerCase().includes(z.name.toLowerCase()),
  );
  if (data.decision && /opportunit|reliability|manufacturer/i.test(question))
    calls.push(["get_opportunities", {}]);
  else if (
    data.decision &&
    /portfolio|allocat|invest|budget|fund|spend|recommend|experimental|backup|13,?900/i.test(question)
  )
    calls.push([
      "compare_portfolios",
      /learning|experiment|backup|13,?900/i.test(question) ? { strategyId: "learning" }
        : /risk|downside/i.test(question) ? { strategyId: "risk-sensitive" }
        : /recommend|primary|financial/i.test(question) ? { strategyId: "recommended" } : {},
    ]);
  else if (
    data.decision &&
    /diagnos|weak.*economic|utilization|contribution.*machine/i.test(question)
  )
    calls.push([
      "get_machine_diagnostics",
      { machineId: explicit ?? c.machine ?? "M-1158" },
    ]);
  else if (zones.length >= 2)
    calls.push([
      "compare_zones",
      {
        zoneIds: zones.slice(0, 3).map((z) => z.zone_id),
        ...(/\bjune\b/i.test(question)
          ? { start: "2025-06", end: "2025-06" }
          : {}),
      },
    ]);
  else if (/closure|walkway|back forty/i.test(question))
    calls.push(["get_claim_evidence", { claim: "closure" }]);
  else if (/inspect|\$1,?200|budget|plan|move two|break.even/i.test(question))
    calls.push(["evaluate_configured_plan", {}]);
  else if (/quiet|forecast|maintenance.*day|model|holdout/i.test(question))
    calls.push(["get_model_validation", {}]);
  else if (/loyalty|comp|point/i.test(question))
    calls.push(["get_loyalty_metric", {}]);
  else if (/guest|player|tracked/i.test(question))
    calls.push(["get_guest_metrics", {}]);
  else if (/downtime|repair|lost revenue/i.test(question))
    calls.push(["get_downtime", {}]);
  else if (explicit || c.machine || /flag|payout|replace/i.test(question))
    calls.push(
      ["get_machine_summary", { machineId: explicit ?? c.machine ?? "M-1158" }],
      ["explain_anomaly", { machineId: explicit ?? c.machine ?? "M-1158" }],
    );
  else
    calls.push([
      {
        machines: "get_machine_summary",
        demand: "get_claim_evidence",
        downtime: "get_downtime",
        guests: "get_guest_metrics",
        loyalty: "get_loyalty_metric",
        planner: "evaluate_configured_plan",
        opportunities: "get_opportunities",
      }[c.page] ?? "get_model_validation",
      c.page === "demand" ? { claim: "closure" } : {},
    ]);
  return calls.map(([name, args]) => runTool(data, c, name, args, audit));
}
