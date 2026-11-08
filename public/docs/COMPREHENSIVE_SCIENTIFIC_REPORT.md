# Dashboard Royale: comprehensive scientific audit and investment decision report

> Current November 8 deployment, Cloud development trust, API/benchmark evidence and remaining checks are recorded in [Sponsor evidence](SPONSOR_EVIDENCE.md) and [release audit](SPONSOR_RELEASE_AUDIT.md). Earlier pass-specific statements below retain their historical scope.

## Decision and scientific conclusion

The inspection-only recommendation was a useful diagnostic response, but it was not a comprehensive investment optimum. The expanded analysis separates demand, supplied-cost economics, payout behavior, faults, location and insufficient evidence. It discovers actionable reliability concentration and validates low-demand scheduling, while retaining the original frozen forecast.

The decision engine searches **968 feasible portfolios** from **20 evidence-based bundles**, including all paid catalog action types and preserving cash. The **primary financial recommendation spends $0.00, retaining $100,000.00**. No paid candidate improves on preserving cash under the base objective. Its objective is to maximize modeled base-scenario incremental property contribution after catalog costs, lead time, planned downtime, displacement and overlap. Ties favor higher low-scenario net, then lower spend. These are assumed effects applied to historical financial bases, not learned causal returns. The amount and targets are recomputed; neither cash nor the experimental plan is hardwired as the financial answer.

Primary low/base/high net is **$0.00 / $0.00 / $0.00**. Retained budget is not an earned return. A separate **risk-sensitive financial** objective maximizes the same base net subject to a stated low-scenario downside cap, a management preference. The low-scenario maximin comparison remains available. No scenario probabilities or arbitrary weighted expected return are assigned.

The **experimental backup** deliberately buys learning: **$13,900.00**, leaving **$86,100.00**, for two targeted inspections, Back Forty wayfinding and a controlled loyalty pilot under a **$20,000.00 modeled-downside cap**. Its low/base/high nets remain **-$19,089.54 / -$10,022.96 / $1,634.08**; zero-effect cost including debit is **$13,908.64**. Information value is unpriced. It is selectable as a separate management objective, not the primary financial optimum.

## A. Data verification and accounting

Dataset: `0.9.0-draft`, fictional casino, January–June 2025. Manifest SHA-256: `1a59c68ed4f4b2eb0f875c8e169effd5686fbc98a94a09ac170b8f22bad836e2`. Original inputs are read-only. Source integrity independently passed **62 file checksums/sizes and 31 CSV/Parquet row/format comparisons**. The expanded executed audit passes **132 source-to-display checks**; every numerical tolerance is recorded in SCIENTIFIC_AUDIT.json.

Raw all-play meters reconcile to prepared and property totals: wagers **$248,905,219.25**, payouts **$225,267,064.15**, actual house win **$23,638,155.10**, theoretical win **$23,545,364.48**. Observed hold is **9.50%**, observed return-to-player **90.50%**, availability **99.62%**, occupancy **36.43%**. Use ratios of sums and separate configured long-run RTP from observed payout/wager ratio.

There are 56,110 machine-day keys, 55,092 active and 1,018 off-floor. Each active row joins exactly one effective placement/configuration at the 06:00 Los Angeles gaming boundary; no two active machines share a daily slot. March 8 has 23 elapsed hours. Hourly currency, spins, availability and occupied seconds reconcile independently to daily meters; inactive rows are not zero-performance observations.

Recorded supplied machine costs total **$2,496,767.35**; machine contribution after those costs **$21,141,387.75**. Property contribution after supplied costs is **$22,387,661.55**, including POS cash/cogs and actual technician labor. Neither is complete profit. Lease-fixed $45/day, positive-house-win revenue-share 20%, manufacturer service and power rates, and opened-gaming-day direct repairs are independently reconstructed. Actual worked technician headcount, not planned headcount, reproduces property labor cost.

Tracked sessions reconcile to carded meter subsets, trip identity/cardinality and player-month accounting. Session end boundaries are tested. Whole-period guests are deduplicated before ahead rates and separate wager/positive-loss concentration rankings. POS cash/cogs and every redemption reconcile one-to-one; economic comp cost is inside cogs and counted once. Traffic uses observed crossings per covered sensor-hour with missing counts retained as missing, not converted to zero. No player identities or restricted third-party rows are exported.

### Corrections and shortcomings addressed

1. **Recommendation scope:** the default now publishes the candidate search's financial winner. The former learning default remains a separately labeled experimental strategy. Inspection-only is a paid-information comparator. Saved user plans are labeled and preserved until explicitly replaced.
2. **Valid swaps:** the previous planner rejected every occupied destination, even when its occupant was also moving. Catalog-valid paired/whole-bank swaps are now allowed only when every occupant vacates, destinations are unique and no move is a no-op; unvacated occupied destinations remain invalid.
3. **Technician opportunity:** the new engine/custom planner uses the chosen shift's unioned queue/meter intersection rather than treating all-floor queue opportunity as a shift-specific baseline. Hands-on repair time is not assumed recoverable by adding a technician.
4. **Planned downtime:** quiet-hour debits are measured planning proxies. Relocations obey the 06:00 catalog boundary. Broad sweeps fall back to all-hour rates when quiet-task capacity is not established; multiple simultaneous quiet crews are not silently assumed.
5. **Machine definition:** a below-0.80 rule cannot define intrinsic underperformance. Continuous ranks, support, conditional intervals, persistence and separate economic/operational dimensions now explain concerns; contradictory benchmark results are visible.
6. **Inference and prediction:** pointwise intervals do not imply 310-machine simultaneous certainty. Poisson fault screens and moment-matched payout simulations are explicitly assumption-sensitive. The examined May–June period is not relabeled pristine for new research.

## B. Algorithm register

| Algorithm | Mathematical specification | Inputs | Parameters / selection | Validation | Limitations |
| --- | --- | --- | --- | --- | --- |
| Accounting and ratios | Exact cents; USD conversion /100; hold=Σwin/Σwagers; observed RTP=Σpayout/Σwagers | Raw meters, property, sessions and POS | No fitted parameter; denominators explicitly positive | Raw/prepared/property rollup and controlled zero-denominator tests | Observed accounting; not profit or a future guarantee |
| Exposure and placements | Raw scheduled/available/occupied seconds; effective_from ≤ UTC gaming-day start < effective_to | Calendar, machine_day, machine_hour, placements | 06:00 Los Angeles; DST actual elapsed time | Every active row joins exactly one placement; daily/hourly and install/retire checks | Do not treat off-floor rows as zero demand |
| Exact matched peers | Rate=(cell total−target total)/(cell hours−target hours); expected=rate×target available hours | Zone/configuration/month/weekday | 24 local peer-hours, otherwise cross-zone same config/month/weekday; target excluded | Independent source reconstruction; 0/24/96 support sensitivity | Retrospective and conditional on location; no relocation counterfactual |
| Benchmark alternatives | Cross-zone reference; support-weighted blend λ=H/(H+k) | Same source; k=24,96,384 equivalent hours | Sensitivity grid, not learned intrinsic-quality prior | Rank correlations, changes and first/second-half rank stability | Different geographic conditioning answers different questions; no forced consensus |
| Conditional peer intervals | Resample paired day outcomes and fitted expectations in circular 7-day blocks within month; ratio of resampled sums | Theo, fitted expectation, occupied hours and supplied-cost contribution | 1,200 source draws; seed 20261108; 600 deterministic interactive dossier draws | Ratio-identity, strata preservation and reproducibility fixtures | Pointwise conditional intervals; not simultaneous coverage or causal defect probabilities; fitted peer uncertainty omitted |
| Demand persistence | Below-peer months plus pointwise upper ratio bound <1; keep continuous values | Machine-month theo/expected | At least 56 active days, ≥2 months; below in ceil(2M/3) months, minimum 2 | 28/56/84-day support sensitivity and temporal disagreement | Exploratory management policy; full-window equivalent is 4 of 6 months |
| Economic diagnostic | Actual contribution=win−recorded supplied costs; theo less costs separately; compare matched contribution | Lease/service/power/repair, actual and theoretical win | Economic review also requires above-current-cohort median cost burden | Raw cost-rule reconstruction and independently aggregated contribution | Relative weak economics does not mean loss-making; avoidable old contracts and full overhead unknown |
| Payout test | Variance=Σbet²_cents×payout_multiplier_variance/10,000; z=(win−theo)/sqrt(variance); p=erfc( / z / /sqrt2); BH reverse cumulative minimum | Raw bet² and supplied game math | Two-sided policy q<.05 and negative residual; all selected-month machines before floor drilldown | Independent exact normal calculation, known p/q fixture, uniform-null FDR and injected signal tests | Independence/normal-tail assumptions; no diagnosis of wrongdoing or malfunction |
| Payout distribution sensitivity | Construct 0/a/max awards matching RTP, variance and hit probability; effective bet=Σbet²/Σbet; effective spins=(Σbet)²/Σbet² | Supplied game moments and full M-1158 wager moments | 150,000 multinomial draws, seed 20261108 | Moment identities and Monte Carlo interval; variance ×1/1.25/1.5/2 also retained | Constructed distribution is not identified paytable and may not match increments; simulation tail is not a replacement calibrated p-value |
| Fault screen and manufacturer association | Machine Poisson upper tail vs leave-target-out floor exposure rate; BH .05. Manufacturer offset Poisson with quasi-Poisson covariance | Fault operation counts; active machine-days; manufacturer/config/zone/month/weekday | Weekly/seasonal adjustment features; numerical ridge 1e−7 only; no effect threshold tuning | Known rate-ratio fixture; design rank and dispersion recorded | Repeated tickets/dependence can invalidate Poisson FDR calibration; manufacturer association is not causal |
| Comparative closure design | Available-hour-weighted log wager rate; zone×configuration and date fixed effects; Back Forty during/after indicators; optional differential trend | Daily meters, placements, walkways | Newey–West date-score covariance lag 7; recorded closure dates | Known fixed-effect fixture; broad/adjacent windows, trend and pre-trend sensitivity | Local confounding, nonparallel trends and spillovers preclude a causal closure or signage estimate |
| Relocation audit | Theo/hour and matched-index after/before ratios | All four actual placement transitions | 14/21/28-day windows; effective gaming-day dates | Each width retains actual observed before/after exposure | Nonrandom moves and one conspicuous effect cannot establish general uplift |
| Queue versus meter opportunity | Union [opened,work-started) intervals per machine; intersect with unavailable meter seconds; multiply matched theo rate; aggregate actual shifts | Operations, machine_hour, shift_roster | Full Jan–Jun queue baseline /181 days; 23 eligible technician days | No overlap double count; queue bounded by metered downtime; selected-shift pool test | Queue proxy is not recoverable profit; hands-on repairs not assumed avoidable by staffing |
| Planned outage debit | June machine-hour theo/available-hour profile; exact required duration; catalog relocations start 06:00 | Hourly wagers, configured RTP and catalog minutes | Quiet job proxy only when ≤1 target task per eligible day; broader sweeps use all-hour debit if capacity unverified | Independent fractional/wraparound and catalog-boundary/crew-capacity fixtures | Scheduling proxy, not observed savings; feasibility and July demand require operational confirmation |
| Loyalty economics | One-to-one ledger redemption → POS; economic cost=cogs once; fixed January face-value item×tier weights | Ledger, POS, tracked months | ≥20 redemptions in every month; thresholds 1–100 sensitivity | 98.93% January face coverage; economic totals reconcile | Menu value is not cost; causal guest response and unused point liability unknown |
| Original forecast | Weekday means selected Jan–Mar→April; refit Jan–Apr; freeze May–Jun | Property wagers only; no future lags or revised context | Original selection rule and 61-day predictions unchanged; paired 7-day block interval | Independent frozen-prediction/MAE equality, chronological fixture and segment diagnostics | Holdout has been examined; cannot be reused as pristine for a new model |
| Additional forecast research | Feb/Mar/Apr month-origin forecasts: constant, weekday mean/median, seasonal-naive frozen cycle, recent56 and calendar ridge | Only dates/wagers before each origin | Ridge α=.1/1/10/100 via earlier 14-day inner folds; February defaults to 1 | Equal origins/horizons; MAE/RMSE/WAPE/MASE; paired retrospective difference interval | Exploratory historical procedure; no new untouched final test or action ROI model |
| Candidate portfolio search | Exhaustive 0–3 distinct-action-type combinations of evidence-generated bundles; deterministic source catalog constraints | Opportunity Register, June active targets/vacancies/swaps, action catalog | 20 bundles; exact costs, limits, lead times, destinations and conflicts | Known optimal small fixture and independent exhaustive enumeration; every returned solution revalidated | Search is exhaustive only over declared bundles, not all quantities/targets/causal investments |
| Scenarios and overlap | Effect×historical eligible base×retained share; subtract exact cost and planned debit; cap positive gains within demand/recovery pools; count all negative effects | Catalog and historical exposure | Explicit low/base/high rates; base retains 50%, high 75% of positive demand uplift | Zero-effect, negative effect, recurring, purchase, overlap and shift-cap fixtures | No effect probabilities or empirically identified treatment returns; unmodeled variable costs/overhead remain |
| Learning decision policy | Maximize number of distinct pre-registered questions under modeled-downside cap; tie-break higher base net then lower cash spend | Feasible candidate results and registered questions | Default $20,000 cap; display $0/$5k/$10k/$20k/$30k frontier | Selected solution satisfies cap and all official constraints; pure financial objectives displayed separately | Policy is not learned utility, expected profit or monetized information value; risk tolerance requires management judgment |
| Grounded copilot | Read-only deterministic retrieval; Gemini chooses allowlisted tools and verified evidence IDs | Current scope, configured plan, source-matched evidence | Bounded requests/tokens/time; source/argument validation; explicit navigation click | Injection, stale scope, tool, evidence-ID, API failure and exact-money tests; live checks separately recorded | No autonomous budget changes, raw identities or generated financial substitutes |

## C. Machine diagnostics and rankings

| Dimension | Machines (overlap allowed) |
| --- | --- |
| Weak relative economics | 89 |
| No substantial detected concern | 137 |
| Persistent low utilization | 84 |
| Possible location opportunity | 48 |
| Excessive fault/downtime review | 17 |
| Insufficient evidence | 4 |
| Unusual payout behavior | 1 |

These are concerns to investigate, not definitive defects. No category is forced to contain a percentile quota. A machine may be both location-exposed and below its zone-matched benchmark; low utilization and unfavorable cost burden are distinct from a payout flag. All six-month actual and theoretical-minus-recorded-cost contributions are positive, so “weak relative economics” must not be read as “unprofitable machine.”

The following list ranks historical downtime exposure, not a combined badness score or recoverable profit. The interactive dossier recomputes applicable financial/exposure metrics and diagnostic dimensions for selected months/zone/bank. Full-window reference context is labeled. Original raw win ranking remains available for comparison.

| Machine | Manufacturer | Index / conditional interval | Faults | Unavailable hours | Theo downtime proxy | Recorded costs | Diagnostic dimensions |
| --- | --- | --- | --- | --- | --- | --- | --- |
| M-1002 | Ridgeline | 1.010 (0.984–1.034) | 9 | 72.35 | $1,534.66 | $25,171.42 | Weak relative economics |
| M-1078 | Ridgeline | 0.907 (0.884–0.928) | 13 | 62.58 | $1,389.80 | $4,399.67 | Persistent low utilization / Weak relative economics / Excessive fault/downtime review |
| M-1112 | Ridgeline | 1.043 (1.015–1.071) | 11 | 60.43 | $1,357.08 | $3,719.35 | Excessive fault/downtime review |
| M-1036 | Ridgeline | 1.044 (1.019–1.069) | 12 | 54.69 | $1,205.58 | $12,276.87 | Weak relative economics / Excessive fault/downtime review |
| M-1028 | Ridgeline | 1.010 (0.984–1.035) | 11 | 55.68 | $1,201.72 | $3,764.91 | Excessive fault/downtime review |
| M-1176 | Ridgeline | 1.121 (1.087–1.153) | 14 | 65.69 | $1,176.49 | $4,309.94 | Excessive fault/downtime review |
| M-1241 | Ridgeline | 0.901 (0.877–0.927) | 16 | 57.36 | $1,100.76 | $4,389.99 | Persistent low utilization / Weak relative economics / Excessive fault/downtime review |
| M-1293 | Ridgeline | 1.031 (0.999–1.063) | 8 | 48.90 | $1,080.48 | $3,170.24 | No substantial detected concern |
| M-1065 | Ridgeline | 1.035 (1.007–1.063) | 14 | 81.11 | $1,073.29 | $4,305.10 | Excessive fault/downtime review |
| M-1193 | Ridgeline | 1.039 (1.011–1.067) | 10 | 41.03 | $1,041.53 | $3,709.17 | No substantial detected concern |
| M-1121 | Ridgeline | 1.039 (1.006–1.069) | 12 | 37.05 | $1,018.66 | $3,701.52 | Excessive fault/downtime review |
| M-1267 | Ridgeline | 0.969 (0.945–0.992) | 8 | 32.99 | $1,010.29 | $50,352.34 | Persistent low utilization / Weak relative economics |
| M-1111 | Ridgeline | 1.063 (1.041–1.087) | 13 | 42.94 | $1,000.21 | $31,046.74 | Weak relative economics / Excessive fault/downtime review |
| M-1051 | Ridgeline | 0.962 (0.935–0.987) | 9 | 45.82 | $994.42 | $24,448.26 | Persistent low utilization / Weak relative economics |
| M-1285 | Northwind | 1.034 (1.005–1.062) | 7 | 43.70 | $985.52 | $23,479.09 | Weak relative economics |

Exact versus cross-zone rank Spearman correlation is **0.337**; first versus second half is **0.745**. This is meaningful disagreement: geographic conditioning changes the comparison and rankings are not immutable machine qualities. At 24/96/384 equivalent-hour pooling sensitivities, rank correlations are **0.972, 0.834, 0.594**. No alternative was selected merely because it creates a dramatic flag.

| Machine | Exact index | Cross-zone index | Absolute rank difference |
| --- | --- | --- | --- |
| M-1157 | 1.096 | 0.587 | 286 |
| M-1185 | 1.119 | 0.668 | 274 |
| M-1063 | 1.150 | 0.699 | 271 |
| M-1283 | 1.117 | 0.703 | 260 |
| M-1238 | 1.146 | 0.754 | 259 |
| M-1194 | 1.128 | 0.752 | 258 |
| M-1146 | 1.105 | 0.738 | 253 |
| M-1180 | 1.073 | 0.680 | 245 |
| M-1158 | 1.088 | 0.709 | 243 |
| M-1140 | 1.084 | 0.707 | 242 |
| M-1232 | 1.065 | 0.696 | 240 |
| M-1128 | 1.066 | 0.702 | 235 |

## D. Most consequential reproducible findings

### 1. Manufacturer reliability concentration

**Question:** Investigate recurring faults before a broad sweep. **Target:** Ridgeline.

**Observed evidence:** 680 faults over 16839 active machine-days; adjusted rate ratio 3.56 versus Halcyon.

**Scale:** $118,386.72; Observed six-month direct repair cost. **Source tables:** operations, machine_day, placements, game_math, shift_roster.

**Method / trace:** See the corresponding algorithm register entry and `build_decision_evidence.py` source calculation; each result and input hash is in SCIENTIFIC_AUDIT.json.

**Alternative explanation / uncertainty:** Rate-ratio interval is model-based; repeat tickets and unmeasured condition can confound association. Inspection can identify a cause; preventive and staffing recoveries are unobserved.

**Action and measurement:** Root-cause findings and faults per active machine-day. July after one-day inspection lead; log all subsequent tickets. Do not claim diagnosis from a Poisson screen. Escalate only a documented recurring defect/process; broad sweep requires a separate business case.

### 2. Access and location demand opportunity

**Question:** Bounded prospective test. **Target:** Back Forty.

**Observed evidence:** Adjusted closure-period association -31.5%; trend specification -30.7%.

**Scale:** $259,045.20; June-based 20-day zone theo baseline (not recoverable loss). **Source tables:** prepared_daily_view, floor_walkways, placements, zone_traffic_hourly.

**Method / trace:** See the corresponding algorithm register entry and `build_decision_evidence.py` source calculation; each result and input hash is in SCIENTIFIC_AUDIT.json.

**Alternative explanation / uncertainty:** Pre-trends differ and local confounding remains; ranks depend strongly on benchmark geography. No causal signage or relocation uplift is identified. Property-wide displacement must be measured.

**Action and measurement:** Incremental property-wide theo/contribution after supplied incremental costs, adjusted for available hours and calendar. July 11–30 after 10-day lead. Freeze analysis before launch; inspect weekly operational harm, stop if demand shifts away elsewhere or signs impair access. A small break-even effect may be undetectable in 20 days; inconclusive evidence does not prove zero.

### 3. Point-price change warrants a controlled policy test

**Question:** Test before a floor-wide rate change. **Target:** Whole-property loyalty program.

**Observed evidence:** Recorded May point-price shift persists with fixed item×tier mix; supported cells cover 98.93% of January face value.

**Scale:** $32,972.80; Observed June redeemed economic cost. **Source tables:** loyalty_ledger, fnb_transactions, player_period.

**Method / trace:** See the corresponding algorithm register entry and `build_decision_evidence.py` source calculation; each result and input hash is in SCIENTIFIC_AUDIT.json.

**Alternative explanation / uncertainty:** Behavioral response, unused point liability and uncarded activity are not identified. No causal policy benefit is booked; information value is unpriced.

**Action and measurement:** Tracked contribution per eligible account, including linked POS cogs exactly once. July 6–30 after five-day design/training lead. Pre-register guest-protection and cost caps; stop for unexpected cost or harm. Pilot information value remains unpriced; a later rollout is not included as July earnings.

### 4. Accumulated payout exception

**Question:** Targeted information purchase. **Target:** M-1158.

**Observed evidence:** z=-4.570, BH q=0.001511 over Jan–Jun.

**Scale:** $36,164.75; Observed residual magnitude (not recoverable loss). **Source tables:** machine_day, game_math, sessions.

**Method / trace:** See the corresponding algorithm register entry and `build_decision_evidence.py` source calculation; each result and input hash is in SCIENTIFIC_AUDIT.json.

**Alternative explanation / uncertainty:** A constructed 0/a/max payout distribution matches RTP, hit probability and variance. Equal effective bets match aggregate first/second wager moments. It is not the actual unidentified paytable and need not respect every payout increment. Monte Carlo error interval covers this simulation only. It is a sensitivity check, not a replacement p-value or defect probability. A flag is not proof of malfunction or future recovery.

**Action and measurement:** Inspection result, meters/session reconciliation and paytable/configuration agreement. July 2 onward; one inspection and ongoing independent reconciliation. Retain the machine if configuration and meters are correct; do not replace based solely on another luck residual.

### 5. Lease burden and replacement economics

**Question:** Defer replacement without stronger evidence. **Target:** M-1212.

**Observed evidence:** Supplied costs are 41.2% of theo; all machines remain positive on six-month contribution after supplied costs.

**Scale:** $50,446.39; Observed six-month supplied costs. **Source tables:** cost_rules, machine_day, prepared_daily_view, action_catalog.

**Method / trace:** See the corresponding algorithm register entry and `build_decision_evidence.py` source calculation; each result and input hash is in SCIENTIFIC_AUDIT.json.

**Alternative explanation / uncertainty:** Contract termination savings, new-title demand and full overhead are absent. No avoided old lease cost is silently credited. Replacing a positive-contribution machine needs an incremental business case.

**Action and measurement:** Incremental contribution versus retained matched machines. 16 eligible lease days or nine purchase days; long-run asset value outside this horizon. Do not replace solely on raw win or a descriptive percentile.

### Additional operational checks

The adjusted Ridgeline/Halcyon fault-rate ratio is **3.563** with quasi-Poisson interval **3.034–4.184**. Design rank is 29/29; dispersion 1.038. Repeated tickets and unmeasured condition are still limitations. 238 tickets occur within seven days of a previous recorded repair; that is descriptive recurrence, not evidence preventive maintenance caused or prevented a fault.

| Shift | Unioned queued meter hours | Historical queue theo proxy | Daily planning proxy |
| --- | --- | --- | --- |
| day | 338.17 | $6,472.82 | $35.76 |
| grave | 671.29 | $12,120.25 | $66.96 |
| swing | 368.36 | $7,371.53 | $40.73 |

Back Forty’s weighted fixed-effect closure association is **-31.51%**, versus **-30.69%** with a differential trend. Its pre-period differential monthly trend is **-1.82%**; parallel trends cannot simply be assumed. Shared gaming-date effects account for weekday/calendar/common-event variation; configuration×zone strata reduce mix confounding. Local events and spillovers remain.

| Machine / move | Window | Raw theo/hour ratio | Matched-index ratio |
| --- | --- | --- | --- |
| M-1113 / 2025-02-18 | 14 | 1.019 | 1.018 |
| M-1113 / 2025-02-18 | 21 | 1.093 | 1.083 |
| M-1113 / 2025-02-18 | 28 | 1.120 | 1.099 |
| M-1126 / 2025-05-06 | 14 | 0.962 | 0.911 |
| M-1126 / 2025-05-06 | 21 | 1.008 | 0.956 |
| M-1126 / 2025-05-06 | 28 | 1.027 | 0.989 |
| M-1152 / 2025-02-04 | 14 | 2.310 | 1.130 |
| M-1152 / 2025-02-04 | 21 | 2.162 | 1.050 |
| M-1152 / 2025-02-04 | 28 | 2.266 | 1.094 |
| M-1299 / 2025-06-10 | 14 | 1.008 | 1.122 |
| M-1299 / 2025-06-10 | 21 | 0.916 | 1.033 |
| M-1299 / 2025-06-10 | 28 | 0.898 | 1.019 |

M-1158’s normal-tail p is 0.00000487; BH q 0.0015109. The constructed moment-matched simulation tail frequency is 0.00002000, with Monte Carlo interval 0.00000366–0.00004862. This is one assumed distribution, not the known generating paytable. Daily standardized lag-one median correlation -0.012 does not prove spin-level independence. Keep the inspection flag and caveats, not a defect diagnosis.

## E. Forecast evaluation and operational decision

The original Jan–Mar→April choice, Jan–Apr refit and frozen 61-day May–June predictions are unchanged. Headline MAE **$68,698.55** versus frozen constant **$218,258.10**; reduction **68.52%**. No post-test median switch occurs.

Additional models were evaluated at equal February, March and April monthly origins, with no within-test-month lags. Ridge uses only prior-data inner 14-day folds; α∈{0.1,1,10,100}, default 1 when February has no eligible inner fold. The median's retrospective rolling-origin MAE is slightly lower, while its RMSE is worse than the mean. The paired mean-minus-median MAE difference is **$2,032.15**, conditional 95% block interval **-$6,549.34–$9,964.18**. This research does not justify relabeling the observed holdout as unseen.

| Origin | Model | Training days | Test days | MAE | RMSE | WAPE | MASE | Ridge α |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2025-02-01 | constant | 31 | 28 | $274,100.35 | $334,813.86 | 19.39% | 5.491 | — |
| 2025-02-01 | weekdayMean | 31 | 28 | $96,678.19 | $161,777.48 | 6.84% | 1.937 | — |
| 2025-02-01 | weekdayMedian | 31 | 28 | $94,935.29 | $157,512.32 | 6.72% | 1.902 | — |
| 2025-02-01 | seasonalNaive | 31 | 28 | $117,828.22 | $194,534.61 | 8.34% | 2.360 | — |
| 2025-02-01 | recent56 | 31 | 28 | $96,678.19 | $161,777.48 | 6.84% | 1.937 | — |
| 2025-02-01 | ridgeCalendar | 31 | 28 | $136,784.18 | $200,678.54 | 9.68% | 2.740 | 1 |
| 2025-03-01 | constant | 59 | 31 | $223,644.29 | $272,375.68 | 15.88% | 2.186 | — |
| 2025-03-01 | weekdayMean | 59 | 31 | $72,161.92 | $103,127.99 | 5.13% | 0.705 | — |
| 2025-03-01 | weekdayMedian | 59 | 31 | $64,707.78 | $110,292.33 | 4.60% | 0.633 | — |
| 2025-03-01 | seasonalNaive | 59 | 31 | $115,670.21 | $161,348.79 | 8.22% | 1.131 | — |
| 2025-03-01 | recent56 | 59 | 31 | $71,972.84 | $102,406.89 | 5.11% | 0.704 | — |
| 2025-03-01 | ridgeCalendar | 59 | 31 | $99,107.31 | $114,898.97 | 7.04% | 0.969 | 0.1 |
| 2025-04-01 | constant | 90 | 30 | $203,431.01 | $233,964.34 | 14.78% | 1.809 | — |
| 2025-04-01 | weekdayMean | 90 | 30 | $40,715.03 | $55,613.31 | 2.96% | 0.362 | — |
| 2025-04-01 | weekdayMedian | 90 | 30 | $44,015.66 | $59,080.62 | 3.20% | 0.391 | — |
| 2025-04-01 | seasonalNaive | 90 | 30 | $60,152.61 | $68,469.18 | 4.37% | 0.535 | — |
| 2025-04-01 | recent56 | 90 | 30 | $55,887.19 | $72,252.04 | 4.06% | 0.497 | — |
| 2025-04-01 | ridgeCalendar | 90 | 30 | $57,728.16 | $69,202.52 | 4.19% | 0.513 | 0.1 |

| Original frozen segment | Days | Model MAE | Constant MAE |
| --- | --- | --- | --- |
| weekday | 43 | $53,408.59 | $215,787.25 |
| weekend | 18 | $105,224.58 | $224,160.67 |
| 2025-05 | 31 | $61,360.66 | $233,993.90 |
| 2025-06 | 30 | $76,281.04 | $201,997.77 |
| quiet | 34 | $50,650.49 | $217,467.85 |
| busy | 27 | $91,425.75 | $219,253.22 |

Operational connection: the quiet two-hour rule from Jan–Apr starts at **5:00 local**. In the later diagnostic, its per-machine debit is **$6.61**, versus **$34.78** at the all-hour rate. This supports when to plan work; it does not predict whether signage, replacements or a promotion will produce incremental revenue.

## F. Opportunity Register and feasible investment strategies

| Opportunity | Target | Historical scale (not treatment benefit) | Management priority |
| --- | --- | --- | --- |
| Manufacturer reliability concentration | Ridgeline | $118,386.72 Observed six-month direct repair cost | Investigate recurring faults before a broad sweep |
| Access and location demand opportunity | Back Forty | $259,045.20 June-based 20-day zone theo baseline (not recoverable loss) | Bounded prospective test |
| Point-price change warrants a controlled policy test | Whole-property loyalty program | $32,972.80 Observed June redeemed economic cost | Test before a floor-wide rate change |
| Accumulated payout exception | M-1158 | $36,164.75 Observed residual magnitude (not recoverable loss) | Targeted information purchase |
| Lease burden and replacement economics | M-1212 | $50,446.39 Observed six-month supplied costs | Defer replacement without stronger evidence |
| Queue opportunity is smaller than full downtime | Technician shifts | $25,964.60 Six-month queue theo proxy (not causal recovery) | Compare full-recovery ceiling with cost before staffing |
| Schedule work in lower-demand hours | Local hour 5:00 versus 20:00 peak | $30.06 Observed hourly theo-rate difference per machine | Use as a scheduling condition on every action |

| Feasible strategy | Cash spend | Retained | Low net | Base net | High net |
| --- | --- | --- | --- | --- | --- |
| Conservative inspection only | $1,200.00 | $98,800.00 | -$1,202.07 | -$1,202.07 | -$1,202.07 |
| Targeted loyalty pilot | $5,200.00 | $94,800.00 | -$5,202.07 | -$5,202.07 | -$5,202.07 |
| Operational recovery comparison | $20,520.00 | $79,480.00 | -$22,799.65 | -$21,637.57 | -$19,313.40 |
| Location/demand trial | $9,300.00 | $90,700.00 | -$14,791.43 | -$5,420.99 | $6,236.04 |
| Replace ten low-earning active machines (lease) | $33,800.00 | $66,200.00 | -$35,471.42 | -$32,371.48 | -$26,946.57 |
| Preserve budget | $0.00 | $100,000.00 | $0.00 | $0.00 | $0.00 |
| Primary financial recommendation | $0.00 | $100,000.00 | $0.00 | $0.00 | $0.00 |
| Downside-constrained financial recommendation | $0.00 | $100,000.00 | $0.00 | $0.00 | $0.00 |
| Experimental learning portfolio | $13,900.00 | $86,100.00 | -$19,089.54 | -$10,022.96 | $1,634.08 |
| Low-scenario maximin comparison | $0.00 | $100,000.00 | $0.00 | $0.00 | $0.00 |
| Highest high-scenario net (assumption-driven) | $16,500.00 | $83,500.00 | -$22,986.60 | -$9,356.21 | $14,608.42 |

The ten-machine purchase interpretation costs $220,000 and violates the budget. The feasible replacement comparator uses ten low-earning machines still active on June 30, not retired machines or fictitious available targets. New-title effects and old-contract termination savings are unknown. Full purchase costs and all lease recurring eligible days are charged; no lifetime asset credit is invented within 30 days.

### Conservative inspection only

| Action | Exact targets / destinations | One-time | Recurring | Lead / eligible days | Downtime / schedule | Break-even |
| --- | --- | --- | --- | --- | --- | --- |
| A-INSPECT × 1 | M-1158 | $1,200.00 | $0.00 | 1 / 29 | 2.0 h; $2.07 debit; June quiet-hour proxy; at most one target job per eligible day assumed | Unpriced information |

Zero-effect net: -$1,202.07. Low/base/high net: -$1,202.07 / -$1,202.07 / -$1,202.07. At the base assumptions, additional unpriced information/decision benefits must cover $1,202.07 to offset the quantified shortfall. These are scenarios, not expected results.

### Targeted loyalty pilot

| Action | Exact targets / destinations | One-time | Recurring | Lead / eligible days | Downtime / schedule | Break-even |
| --- | --- | --- | --- | --- | --- | --- |
| A-INSPECT × 1 | M-1158 | $1,200.00 | $0.00 | 1 / 29 | 2.0 h; $2.07 debit; June quiet-hour proxy; at most one target job per eligible day assumed | Unpriced information |
| A-COMP-PILOT × 1 | property | $4,000.00 | $0.00 | 5 / 25 | 0.0 h; $0.00 debit; No scheduled outage | Unpriced information |

Zero-effect net: -$5,202.07. Low/base/high net: -$5,202.07 / -$5,202.07 / -$5,202.07. At the base assumptions, additional unpriced information/decision benefits must cover $5,202.07 to offset the quantified shortfall. These are scenarios, not expected results.

### Operational recovery comparison

| Action | Exact targets / destinations | One-time | Recurring | Lead / eligible days | Downtime / schedule | Break-even |
| --- | --- | --- | --- | --- | --- | --- |
| A-PREVENTIVE × 1 | Ridgeline | $9,000.00 | $0.00 | 7 / 23 | 138.0 h; $2,279.65 debit; All-hour debit; more tasks than eligible days and quiet-work crew capacity is unverified | 242.66% net property effect |
| A-TECH-SHIFT × 1 | grave | $11,520.00 | $0.00 | 7 / 23 | 0.0 h; $0.00 debit; No scheduled outage | 747.98% net property effect |

Zero-effect net: -$22,799.65. Low/base/high net: -$22,799.65 / -$21,637.57 / -$19,313.40. At the base assumptions, additional unpriced information/decision benefits must cover $21,637.57 to offset the quantified shortfall. These are scenarios, not expected results.

### Location/demand trial

| Action | Exact targets / destinations | One-time | Recurring | Lead / eligible days | Downtime / schedule | Break-even |
| --- | --- | --- | --- | --- | --- | --- |
| A-WAYFINDING × 1 | Z-B40 | $7,500.00 | $0.00 | 10 / 20 | 0.0 h; $0.00 debit; No scheduled outage | 2.90% net property effect |
| A-MOVE-MACHINE × 1 | M-1008 → L-07-3 | $1,800.00 | $0.00 | 2 / 28 | 3.0 h; $6.67 debit; Catalog relocation boundary: 06:00 local | 29.73% net property effect |

Zero-effect net: -$9,306.67. Low/base/high net: -$14,791.43 / -$5,420.99 / $6,236.04. At the base assumptions, additional unpriced information/decision benefits must cover $5,420.99 to offset the quantified shortfall. These are scenarios, not expected results.

### Replace ten low-earning active machines (lease)

| Action | Exact targets / destinations | One-time | Recurring | Lead / eligible days | Downtime / schedule | Break-even |
| --- | --- | --- | --- | --- | --- | --- |
| A-REPLACE-LEASE × 10 | M-5076, M-1158, M-1238, M-1181, M-1035, M-1179, M-1017, M-1265, M-1256, M-1063 | $25,000.00 | $8,800.00 | 14 / 16 | 60.0 h; $121.45 debit; June quiet-hour proxy; at most one target job per eligible day assumed | 109.43% net property effect |

Zero-effect net: -$33,921.45. Low/base/high net: -$35,471.42 / -$32,371.48 / -$26,946.57. At the base assumptions, additional unpriced information/decision benefits must cover $32,371.48 to offset the quantified shortfall. These are scenarios, not expected results.

### Preserve budget

No catalog spend. Retain $100,000; quantified incremental net is zero.

Zero-effect net: $0.00. Low/base/high net: $0.00 / $0.00 / $0.00. At the base assumptions, additional unpriced information/decision benefits must cover $0.00 to offset the quantified shortfall. These are scenarios, not expected results.

### Primary financial recommendation

No catalog spend. Retain $100,000; quantified incremental net is zero.

Zero-effect net: $0.00. Low/base/high net: $0.00 / $0.00 / $0.00. At the base assumptions, additional unpriced information/decision benefits must cover $0.00 to offset the quantified shortfall. These are scenarios, not expected results.

### Downside-constrained financial recommendation

No catalog spend. Retain $100,000; quantified incremental net is zero.

Zero-effect net: $0.00. Low/base/high net: $0.00 / $0.00 / $0.00. At the base assumptions, additional unpriced information/decision benefits must cover $0.00 to offset the quantified shortfall. These are scenarios, not expected results.

### Experimental learning portfolio

| Action | Exact targets / destinations | One-time | Recurring | Lead / eligible days | Downtime / schedule | Break-even |
| --- | --- | --- | --- | --- | --- | --- |
| A-INSPECT × 2 | M-1158, M-1241 | $2,400.00 | $0.00 | 1 / 29 | 4.0 h; $8.64 debit; June quiet-hour proxy; at most one target job per eligible day assumed | Unpriced information |
| A-WAYFINDING × 1 | Z-B40 | $7,500.00 | $0.00 | 10 / 20 | 0.0 h; $0.00 debit; No scheduled outage | 2.90% net property effect |
| A-COMP-PILOT × 1 | property | $4,000.00 | $0.00 | 5 / 25 | 0.0 h; $0.00 debit; No scheduled outage | Unpriced information |

Zero-effect net: -$13,908.64. Low/base/high net: -$19,089.54 / -$10,022.96 / $1,634.08. At the base assumptions, additional unpriced information/decision benefits must cover $10,022.96 to offset the quantified shortfall. These are scenarios, not expected results.

### Low-scenario maximin comparison

No catalog spend. Retain $100,000; quantified incremental net is zero.

Zero-effect net: $0.00. Low/base/high net: $0.00 / $0.00 / $0.00. At the base assumptions, additional unpriced information/decision benefits must cover $0.00 to offset the quantified shortfall. These are scenarios, not expected results.

### Highest high-scenario net (assumption-driven)

| Action | Exact targets / destinations | One-time | Recurring | Lead / eligible days | Downtime / schedule | Break-even |
| --- | --- | --- | --- | --- | --- | --- |
| A-COMP-CHANGE × 1 | property | $1,500.00 | $0.00 | 3 / 27 | 0.0 h; $0.00 debit; No scheduled outage | 5.05% net property effect |
| A-PROMO × 1 | July weekend 1 | $15,000.00 | $0.00 | 14 / 16 | 0.0 h; $0.00 debit; No scheduled outage | 6.00% net property effect |

Zero-effect net: -$16,500.00. Low/base/high net: -$22,986.60 / -$9,356.21 / $14,608.42. At the base assumptions, additional unpriced information/decision benefits must cover $9,356.21 to offset the quantified shortfall. These are scenarios, not expected results.

### Why the financial choice beats the replacement proposal

The ten-active-machine lease comparator spends **$33,800.00** for 16 eligible days and has modeled base net **-$32,371.48**, after planned downtime and displacement. Ten outright purchases exceed the budget. Raw earnings do not establish that replacement will improve property contribution; location, exposure, reliability and luck remain competing explanations. The paid financial runners-up are:

| Portfolio keys | Spend | Low net | Base net | High net |
| --- | --- | --- | --- | --- |
| comp-change | $1,500.00 | -$2,983.78 | -$609.73 | $1,467.55 |
| inspect-payout | $1,200.00 | -$1,202.07 | -$1,202.07 | -$1,202.07 |
| inspect-fault | $1,200.00 | -$1,203.60 | -$1,203.60 | -$1,203.60 |

The first cash break-even boundary across portfolios with positive base benefits is **1.684890×** the existing positive benefit assumptions, for **comp-change**. Hold action costs, negative effects, opportunity debits, eligible days, displacement and overlap fixed while scaling all positive base benefits together. At equality the cost tie-break favors cash; above it a paid portfolio can become preferable. This is a sensitivity boundary, not a treatment-effect estimate. Individual action details above show exact financial bases and net-effect hurdles; surveys and inspections have no invented monetary information value.

### July monitoring and approval gates

| Priority / target | Monitor using existing routine records | Condition for additional paid spending |
| --- | --- | --- |
| 1. M-1241 | Review existing ticket logs weekly: faults per active machine-day, queue wait intersecting meter downtime, hands-on hours and direct repair costs. | Approve paid repair/inspection only with a documented recoverable cause and credible avoided property contribution above catalog cost plus downtime debit, or explicitly choose the experimental objective. A manufacturer association alone is insufficient. |
| 2. M-1158 | Continue routine meter/configuration reconciliation; retain the full testing-family qualification. A residual is not a defect diagnosis. | A verified configuration discrepancy or documented exposure changes the business case. A paid catalog inspection remains separately priced; it is not silently included as free work. |
| 3. Back Forty access | Track wager/theo per available hour, occupancy and crossings per covered sensor-hour alongside other zones and property totals; compare weekdays and game mix. | Fund wayfinding only when credible incremental property contribution clears its displayed break-even threshold after displacement and the 10-day lead, or opt into controlled learning. The closure association is not a signage effect estimate. |
| 4. Property loyalty economics | Reconcile weekly redeemed economic cost, points per fixed item/tier face value, tracked outcomes and property contribution. Protect guests; do not optimize losses of vulnerable cohorts. | Fund a point-rate change only with credible net incremental contribution above its break-even boundary and harm controls. A controlled $4,000 pilot belongs to the optional experimental budget; reduced points per face dollar alone proves no behavioral uplift. |
| 5. Replacement and July demand | Review exposure-adjusted demand, contribution after supplied costs and availability before any ten-machine order. Use the frozen weekday model for demand/scheduling context, not treatment ROI. | Require prospective replacement benefit above full lease/purchase cost and outage opportunity, with exact eligible days and property-wide displacement. Ten purchases remain infeasible; re-run the financial search when verified inputs or explicit assumptions change. |

Use weekly operational reviews and pre-register any subsequently funded pilot. Forecasts inform calendar/scheduling context, not intervention ROI. Do not count catalog inspections or pilots as free work in the cash plan. Approval requires credible incremental property contribution above full cost plus outage opportunity, viable eligible days, displacement/harm checks and the catalog constraints, or an explicit decision to fund the separate learning objective.

### Candidate generation and optimization audit

Bundles include the payout target, persistent recurrent-fault targets with ≥84 active days, Back Forty access trial, a controlled comp pilot, floor-wide comp scenario, highest-fault manufacturer sweep, one/two/three distinct technician shifts, one/three/ten eligible leased replacements, one purchase, a vacancy move, matched-configuration pair swap, equal-size whole-bank swap, a promotion and survey. A broad survey is compared but not treated as a substitute for a controlled causal policy test. Candidate target selection is documented rather than pretending all machine/action/location possibilities were optimized.

Enumerate every combination with ≤3 distinct action types, then validate budget, quantity, all target membership, same-machine conflicts, comp incompatibility, unique destinations, vacated occupancy, complete-bank destination grouping, lead/downtime and recurring costs. Preserve cash is a candidate. Independent exhaustive enumeration over the same bundles and a controlled small fixture with a known optimum validate the search.

The financial default maximizes base-scenario net; the risk-sensitive financial option adds the user-selected low-scenario downside limit. Experimental learning separately maximizes covered pre-registered questions, then base net and lower spend, under its $20,000 cap. Equal question coverage and that cap are explicit policies, not learned utility or safety guarantees. The following is **experimental learning-policy sensitivity**, not the financial recommendation:

| Modeled-downside cap | Spend | Low-scenario downside | Questions |
| --- | --- | --- | --- |
| $0.00 | $0.00 | $0.00 | Preserve cash |
| $5,000.00 | $2,400.00 | $2,408.64 | payout, reliability |
| $10,000.00 | $6,400.00 | $6,408.64 | payout, reliability, loyalty |
| $20,000.00 | $13,900.00 | $19,089.54 | payout, reliability, access, loyalty |
| $30,000.00 | $13,900.00 | $19,089.54 | payout, reliability, access, loyalty |

## G. Statistical and economic limitations

- No action-specific causal effect is identified from these records. Prospective pilots require controls, pre-registered outcomes and property-wide displacement measurement. Signage has only 20 eligible days; an inconclusive small-effect test is plausible and is not proof of zero.
- Demand and contribution uncertainty are conditional on fitted peer expectations and observed data, not intrinsic quality. Pointwise intervals do not adjust all machine screens simultaneously. History and persistence settings are transparent policies with sensitivity checks.
- The fault-count Poisson policy can be anti-conservative under dependence; quasi-Poisson manufacturer covariance addresses count dispersion only within its model. A source-derived rate association is not a brand defect.
- All supplied costs are partial. Theoretical win minus recorded costs still contains observed-win sensitivity through revenue-share charges; it is not a completely luck-free profitability estimate. Scenario contribution omits unknown marginal cost, tax and overhead; old contract savings are not credited without contractual evidence. High scenarios are not expected returns.
- The 50–150% downtime band is a hypothetical rate sensitivity; the separate historical block-bootstrap interval measures variability, not incremental recoverable profit. Queue, repair and meter durations are not added together.
- Synthetic casino data and draft organizer calibration limit external validity. NOAA/LVCVA/Missouri are separate context, not casino guest facts or features available at the historical prediction origin. Restricted raw source tables and individual identities remain local.
- No July outcomes are present in the challenge data. Proposed actions are evaluated from the June 30 planning origin, regardless of today's calendar date.

## H. Two-minute demonstration plan

0:00-0:15: Open briefing: original ten-low-earner replacement proposal; distinguish exposure, location, cost and luck.

0:15-0:35: Drill into a bank and M-1158; show separate dimensions, support and payout qualifications.

0:35-0:55: Opportunities: recurring manufacturer faults, the noncausal closure association and loyalty pricing; explain why they do not identify an action ROI.

0:55-1:03: Methods: frozen weekday forecast versus constant baseline; demand scheduling context, not treatment profit.

1:03-1:10: Hourly operations: compare a quiet and busy maintenance template; show actual Tiger query evidence and disclose provisional development trust. Use the tested local Cloud-backed view if public preview remains unverified.

1:10-1:35: Planner: primary $0.00 spend and $100,000.00 retained, exact base-contribution objective and low/base/high results. Compare the costly ten-lease strategy and paid runners-up. Show the break-even boundary.

1:35-1:50: Select the separate experimental backup: $13,900.00, $86,100.00 retained, $20,000 management downside cap, negative base net and unpriced information. Explain the risk-sensitive financial alternative separately.

1:50-2:00: Open July monitoring/approval gates; demonstrate evidence-backed Gemini retrieval. Disclose synthetic draft data and prospective causal uncertainty. This is a rehearsal plan, not a recorded video.

## I. Reproduction, source register and unresolved risks

Run `npm run data` with the local original sources, `python scripts/write_deliverables.py`, then `npm run verify`. The data command executes base preparation, independent source evidence and catalog-constrained portfolio construction. `npm run start:local` runs the static app and private Gemini endpoint; no hosting or Tiger Data changes were made. Gemini can retrieve new diagnostics/opportunities/portfolios but cannot invent values or override plans.

Required remaining checks are live browser/touch/rendering sign-off where Computer Use is unavailable, deployed-runtime confirmation, prospective effect/power/operational validation, organizer calibration and applicable publisher evidence. A passing build is not proof of causal economics. Historical source-audit status is in SCIENTIFIC_VALIDATION.json. Current recommendation regression and service checks are recorded in FINANCIAL_RECOMMENDATION_VALIDATION.md.

| Source table | Rows read | Parquet SHA-256 |
| --- | --- | --- |
| prepared_daily_view | 56110 | dcf59b0a3ad7dceeff1de7ae5a86e313c42300f3f3b73c652df86cd60fd0eebb |
| machine_day | 56110 | 8bd1ebdb1dd2f695eef8585da0d3d5b6785d7c050e29ae52b14c2123c7c33176 |
| property_day | 181 | 8e3df1d0662e27cd964d72287bac224e9f2395600ad8bece9ce4f8b17f5457d5 |
| calendar_day | 181 | b6c26f1c60fba6594d52803228e14c734088bd8fb905520ee71041d191092e19 |
| game_math | 10 | b6ebc7040d7120dd20be89c5f6ba264d650be9e4bfd03530a2e0abfb3f4f931d |
| machines | 310 | da7f869b62161b61bc44b0fc19d266ccaab2eab94505aa279956d70a1b8047e0 |
| floor_locations | 378 | 47958de9cb8cfbba7cfeab41eb015f8e840e1572f1a2f3d2ed6b6d494de43c39 |
| placements | 314 | 0759516a4c8885176ac2e027b6a214f771144d4d4e3d23210d008c3eb806f810 |
| operations | 1226 | 1d08ce76f31037c95ac3f40918917afa1f4b2fab9d8500a609c7ed4e05e9ca13 |
| action_catalog | 13 | d4583febb24d0528feb90f8fa81bb4c2910abba94def7d8c06b96897814d2842 |
| cost_rules | 9 | feedcd1b0ffa965191a6e76b547ec88c981a9ed5955485820d50c5b904a0a498 |
| shift_roster | 10317 | c688b49849c6cd1501b54cf700a9cdb811554a2fea1d402c3b3890a8602f0f4e |
| sessions | 776297 | 2557a50f213e4e8b16d0b733281bf2d7c77ecad6300a0fcc6febdbb17ed45e98 |
| trips | 351729 | 4ce086b3d08919b818f5e5474acfaab50a51c77f97f04cb1b202d674128fc031 |
| player_period | 148893 | e7ddbbafb2ddd9a24ec8bb7b5c5a9c79a17ff0d379011a4f35054be03a0fac2f |
| loyalty_ledger | 782773 | f00e81ec27c36fc9d6adea0569a7b31d041f41572bef596dadfdd2ffcbe46f5e |
| fnb_transactions | 227833 | 6021ec899dfded9241bb617e85f922045de42d12af77d6cd0a2e85cce5a1df4b |
| zone_traffic_hourly | 30401 | 5f33099b4e65115461828c0de1bde4f88244d57b9069b263601abdbc20e22e3c |
| machine_hour | 1321908 | 5916c0fa6b758350e8d60b188f8e4a8987868d053628a9c44bce574a6414aaf9 |
| floor_walkways | 10 | 9cdb3c0205d179dea91ef6c71948913c14dd214e95c76805aeb8624efa07854c |

### Method references

The multiple-testing policy follows the independence-qualified [Benjamini–Hochberg procedure](https://rss.onlinelibrary.wiley.com/doi/10.1111/j.2517-6161.1995.tb02031.x). Block resampling requires dependence/stability assumptions; see [Politis and Romano, The Stationary Bootstrap](https://doi.org/10.1080/01621459.1994.10476870) for the role of weak dependence (our implementation uses fixed circular blocks, not their random-length algorithm). Chronological evaluation principles are described in the [Alan Turing Institute rolling-origin reference](https://alan-turing-institute.github.io/tea-techniques/techniques/rolling-origin-evaluation/). These references support method definitions, not this property's intervention effects.
