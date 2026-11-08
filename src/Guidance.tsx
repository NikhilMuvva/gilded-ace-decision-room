import { ArrowUpRight } from "lucide-react";
const methodTopics = [
  {
    title: "Financial and operating metrics",
    source: "prepared_daily_view, machine_day, game_math, property_day",
    formula:
      "House win = wagers − payouts; theo = Σ(wagers × configured house edge); availability = Σavailable / Σscheduled; theo/hour = Σtheo / Σavailable.",
    why: "Ratios of sums respect different exposure sizes. Actual scheduled seconds handle installations, retirements and the 23-hour DST day. Active machine-days exclude off-floor records.",
    limit:
      "Theo is an expectation for observed play, not predicted future demand. Contribution after supplied costs excludes broader overhead; guests have the opposite gaming-net sign.",
  },
  {
    title: "Matched-peer comparison and the review screen",
    source: "prepared_daily_view joined to machine_day and game_math",
    formula:
      "Peer rate = (stratum theo − target-machine theo) / (stratum hours − target-machine hours); expected = peer rate × available hours; index = Σtheo / Σexpected.",
    why: "Strata match zone, configuration, month and weekday, leaving the target out. Below 24 peer-hours, fall back to configuration/month/weekday across zones. Continuous scores, scope-relative ranks, percentiles and support replace the uncalibrated 0.80× failure label; map bands use 0.95× and 1.05× descriptively.",
    limit:
      "This is retrospective; whole-month peer references remain fixed under bank drilldowns. There is no calibrated confidence interval for the index. Unmeasured position differences and sparse comparisons remain.",
  },
  {
    title: "Payout variance, z-scores, p-values and FDR",
    source:
      "machine_day.sum_bet_squared and game_math.payout_multiplier_variance",
    formula:
      "Variance($²) = Σ(sum bet² in cents² × payout-multiplier variance) / 10,000; z = (Σhouse win − Σtheo) / √variance; two-sided p = erfc(|z|/√2).",
    why: "Scale payout deviations by game and bet-specific dispersion. Sort p-values, apply Benjamini–Hochberg rank adjustment and reverse cumulative minima to get q-values. Negative z with q < 0.05 flags review. The family includes all machines in selected months before zone/bank filtering.",
    limit:
      "Normal tails, configured mathematics and dependence assumptions limit the FDR interpretation, particularly for heavy-tailed payouts. A q-value is not a defect probability and a flag is not a verdict.",
  },
  {
    title: "Location, crossings, events and relocations",
    source:
      "floor_walkways, placements, floor_locations, zone_traffic_hourly, events and property_day",
    formula:
      "Closure comparison = (Back during / Back before) / (other-floor during / other-floor before) − 1. Traffic = entries / covered sensor-hours. Event difference = observed / same-month-weekday reference − 1.",
    why: "Available-hour rates and contemporaneous floor comparison reduce obvious exposure differences. Events are scaled to actual available hours. Moves use up to 28 days before/after, reporting actual day counts. NOAA monthly weather is separately attributed context.",
    limit:
      "No parallel-trends identification or randomized move/event trial. Crossings are not unique people. Sparse events and overlapping explanations prevent causal uplift claims. Context audits are labeled with their own windows.",
  },
  {
    title: "Downtime opportunity and repair capacity",
    source: "machine_day, optional machine_hour and operations",
    formula:
      "Downtime = (scheduled seconds − available seconds)/3,600; opportunity = downtime × leave-machine-out peer coin/theo rate. Queue = work start − opened; repair = available again − work start.",
    why: "Meter time is exact within the supplied records; the peer rate prices an explicit counterfactual proxy. Hourly and daily downtime reconcile. Ticket wait is separated from hands-on work; its historical estimated theo opportunity informs the technician pool.",
    limit:
      "Substitution, nonrandom outage timing and overlapping tickets remain. The 50–150% sensitivity is a scenario, not a confidence interval. Queue benefit is not proven recoverable by new staff.",
  },
  {
    title: "Tracked outcomes, contribution and loyalty accounting",
    source: "player_period, loyalty_ledger and fnb_transactions",
    formula:
      "Player net = payouts − wagers; tracked contribution = −player net + linked POS cash − linked POS cogs. Reinvestment = redeemed economic cost / all-play property theo.",
    why: "Regroup player-month rows into selected-period accounts before ranking or ahead rates. Positive-wager accounts define the gambler denominator; loss concentration uses max(−net,0). Redemptions join one-to-one to POS; comp cost is already in cogs.",
    limit:
      "Person-level uncarded activity is unknown. Guest filters do not create zone-level account outcomes. Neither tracked contribution nor machine contribution is full profit.",
  },
  {
    title: "Point pricing with fixed composition",
    source: "loyalty_ledger joined one-to-one to fnb_transactions",
    formula:
      "Realized price = Σredeemed points / Σface dollars. Standardized price = Σ(January face-dollar weight of cell × current-month cell price).",
    why: "Use item × tier-before-redemption cells with at least 20 redemptions in each of all six months. Fixed January weights test whether composition alone explains the change.",
    limit:
      "The supported-cell subset does not identify policy causation, guest response, unredeemed points liability or full incremental program returns.",
  },
  {
    title: "Weekday forecast, baseline and chronological test",
    source: "property_day.coin_in_usd and calendar weekday only",
    formula:
      "Forecast = training mean for the future day’s weekday. Baseline = constant mean of all training days. MAE = mean(|actual − prediction|). Reduction = 1 − model MAE / baseline MAE.",
    why: "Train candidates on Jan–Mar and select on April: full weekday means vs recent-56-day weekday means. Refit Jan–Apr; freeze 61 May–June predictions. Paired circular seven-day blocks, 2,000 resamples with seed 2026, produce the 2.5/97.5 percentile error-improvement interval.",
    limit:
      "No holdout lags, future repairs, weather or later external revisions as features. One synthetic property and one holdout do not prove July accuracy. The bootstrap interval is for average MAE improvement, not prediction or profit.",
  },
  {
    title: "Budget costs, financial objectives and scenario search",
    source:
      "action_catalog, June target rates, historical repair-queue opportunity and June comp costs",
    formula:
      "Unit price = one-time + recurring/day × max(0,30−lead). Scenario net = assumed gross gain − downtime theo debit − action cost, after overlap deductions.",
    why: "Primary: maximize base-scenario property contribution net of catalog cost and planned outage; tie-break by low net, then cost. The financial alternative adds a management downside cap. Experimental learning separately maximizes question coverage under $20,000 downside. Enforce ≤$100,000, ≤3 paid types, quantities, targets and catalog conflicts; cap overlapping positive recovery/demand benefits.",
    limit:
      "Published effects are explicit low/base/high assumptions, not causal estimates or probability weights. Search covers generated bundles only; the custom comparator separately checks ≤8 configured subsets. Information is unpriced. Moves require vacant or jointly vacated destinations; bank downtime is per machine. Unmodeled variable costs, overhead and long-term asset value remain outside the comparison.",
  },
];
export function MethodReference() {
  return (
    <section className="technical-reference">
      <div className="panel-head">
        <div>
          <p className="eyebrow">
            TECHNICAL REFERENCE · AUDIT THE IMPLEMENTATION
          </p>
          <h3>Metrics, methods, sources and limits</h3>
        </div>
      </div>
      <p className="caption">
        Open a topic for the implemented calculation and its reasoning. For a
        beginner introduction, use the separate header Help center.
      </p>
      {methodTopics.map((t) => (
        <details key={t.title}>
          <summary>{t.title}</summary>
          <div>
            <p>
              <strong>Source:</strong> {t.source}
            </p>
            <code>{t.formula}</code>
            <p>
              <strong>Why this method:</strong> {t.why}
            </p>
            <p>
              <strong>Limits:</strong> {t.limit}
            </p>
          </div>
        </details>
      ))}
      <a href="/docs/CLAIMS_AND_EVIDENCE.md" target="_blank" rel="noreferrer">
        Open the Claims & Evidence appendix <ArrowUpRight size={14} />
      </a>
    </section>
  );
}
