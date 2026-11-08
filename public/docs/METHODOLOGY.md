# Analytical methodology

> Current analytical supplement: [Comprehensive scientific audit and investment report](COMPREHENSIVE_SCIENTIFIC_REPORT.md) covers diagnostics, shift pools, quiet scheduling, primary financial selection and separate experimental learning. Original frozen forecast and accounting metrics are retained.

## Sources and architecture

React/TypeScript/Vite, Recharts, self-hosted font files; Python/pandas/NumPy/PyArrow preprocessing. Prepared static JSON supplies all core analytics; no database, authentication, runtime Python or custom telemetry is required. An optional Node `/api/chat` endpoint uses the Gemini REST API for bounded read-only tool routing and verified evidence selection. Keys stay server-side; deterministic offline evidence is explicitly labeled. See GEMINI_SETUP.md. `scripts/build_data.py` accepts `--source PATH`. The originals are read-only inputs in `sources/` and excluded from publication. The supplied starter is reference material, not executable authority over this app.

All 31 Parquet tables are inventoried with schemas/row counts and SHA-256. Decision inputs use prepared daily, raw machine-day, calendar, game math, locations, walkways, placements, operations, action catalog, player-month, loyalty ledger, POS, traffic, events, optional hourly meters and NOAA weather. Cost rules and machine metadata are inspected; supplied prepared costs are used rather than recalculated incompletely. Sessions/trips are represented by the organizer's already reconciled player-month view; they are not joined row-to-row to POS or duplicated as a second source of player totals. Staffing/security/survey and restricted real-world tourism/benchmarks were reviewed as optional sources, not forced into a model. A schema inventory is not evidence that every table supports a finding.

NOAA context is real; casino rows are synthetic. NOAA GHCN-Daily at USW00023169 is summarized with attribution, no endorsement. Calendar observations differ from gaming days. LVCVA/Missouri tables are left local; late revisions and survey publications are not forecast inputs. Source terms are in the supplied reference/SOURCE_TERMS.md. The app does not redistribute those tables or upstream source folders.

## Grain and money

Use only active machine-days. Scheduled exposure comes from raw meters, not 24-hour assumptions; March 8 has 23 elapsed hours. Machine locations follow daily effective placements. The floor is a snapshot on the explicitly selected layout date (default: last selected date), displaying only machines active on that date at supplied coordinates. Period table metadata uses each machine's last in-window location. Selecting a machine absent from the snapshot focuses its last active in-period date. Metric scores still cover the selected months; layout date changes placement, not statistical scope. Hourly meters are a fixed full-window timing audit.

Ratios are ratios of sums. House win = coin-in − payout; player net has the opposite sign. Theo = coin-in × (1−configured RTP). Wagers include replay. Sum-bet-squared is in cents², divided by 10,000 when converted to dollar variance. Contribution is after supplied costs, not full profit. Food/benefit economic cost is inside POS cogs, subtracted once. Payouts already include game jackpots once.

## Machine screening

Reference strata: zone × configuration × month × weekday, excluding every row belonging to the target machine. At least 24 peer available hours are required; otherwise use configuration × month × weekday, still excluding the target. Expected theo = peer theo / peer hours × target available hours. Index = actual theo / reference theo. This is a retrospective comparison, not a forecast, and retains whole-month peer definitions even under bank drilldown. The uncalibrated 0.80 review label has been replaced by continuous scores, scope-relative ranks/percentiles and support. Rank orders finite peer scores from low to high within the current floor scope; tied scores share the lowest tied rank. Percentile = 100 × (rank−1)/(N−1), or 50 for a singleton. It is not a failure probability. Full-window fallback is 307/55,092 rows; see PARAMETER_REGISTER.md and the independent ALGORITHM_AUDIT.json.

Payout residual z = (actual win−theo)/sqrt(sum(game payout-multiplier variance × sum-bet-squared / 10,000)). Normal-tail p-values are approximate, especially for heavy tails. Apply BH to all tested machines within the selected month range, then retain that same z/q in zone/bank drilldowns. This avoids selecting a smaller testing family after seeing an anomaly. Frontend normal probabilities use an Abramowitz–Stegun approximation checked against independent Python results. Heavy-tail and dependence assumptions limit formal FDR guarantees.

## Demand and availability

Closure comparison uses phase-wide coin/hour rates; normalize Back Forty's during/before rate ratio by the remaining floor's ratio. This is descriptive, without an established parallel-trend assumption. Event days use same-month/same-weekday non-event rates, weighted by actual event-day available hours. Traffic is entries/covered sensor-hour, not people. Missing counts are not zero. The four move comparisons use 28-day windows; one has only 21 post days. They are not controlled experiments.

Downtime = exact scheduled−available hours. Opportunity proxy = downtime × retrospective leave-machine-out matched coin/theo rate. Do not interpret as certain recoverable property revenue. Queue/repair ticket durations can overlap; they partition ticket time only, never add to meter downtime. The hourly audit exactly reconciles. 50–150% sensitivity is an explicit rate scenario; zero incremental gain is possible with substitution.

## Guests and loyalty

All 21 contiguous month ranges are preaggregated before publishing. Regroup each player across the range, then calculate concentration and ahead rate. Account IDs do not leave the pipeline. Positive-wager accounts are the gambler denominator; accounts with other activity are counted separately. Opening-tier and home-region groups are mutually exclusive within their own dimension; dimensions must not be added together. Top 10% uses ceil(0.1 × gambler count). Wagers and positive losses are ranked separately; loss denominator sums positive losses with winners set to zero. It is not net floor loss.

Redemptions join ledger→POS one-to-one; costs and all property comp costs reconcile. Use local wall-clock 06:00 gaming dates across DST. Realized point price = total redeemed points / total face dollars. Standardization keeps January face-dollar weights in item×tier cells represented by at least 20 redemptions in every month. This tests composition but not behavior or unredeemed points liability. No high-loss guest targeting is recommended.

## Time-series validation

Inner split: Jan–Mar training, April validation. Compare full-training weekday means and trailing-eight-week weekday means using MAE. Select once, refit Jan–Apr (120 days), freeze May–June predictions (61 days); no holdout-derived features. Constant training mean is the baseline. A seven-day circular paired block bootstrap of daily baseline-error minus model-error estimates a 95% interval for average MAE improvement (2,000 draws, seed 2026). That is not a prediction interval, and does not establish July performance. Re-estimating after viewing the holdout would invalidate the reported test.

## Planning

July 1–30 inclusive, max $100,000 and three paid action types. Preserve cash consumes no slot. Cost in dollars = q×(catalog one-time cents + recurring cents/day×max(0,30−lead))/100 + incremental comp budget. Fixed packages and purchased assets are fully charged. Benefit days exclude lead time. Per-machine required downtime is debited at June theo/hour. A bank move conservatively applies the catalog's eight hours to every machine; preventive sweeps apply 90 minutes per affected machine. Moves require distinct vacant destinations; whole-bank relocations remain together in one destination bank. Leases incur recurring charges only within the horizon; possible later commitments are outside the comparison.

Benefits start at zero. User assumptions apply to observed June target theo, June downtime opportunity, historical technician queue opportunity, or current comp cost as appropriate. Information from inspections/pilots/surveys is unpriced. Promotion units use a declared two-day weekend baseline. Technician units share and cap the same opportunity pool. Technician/preventive recovery uses the larger gain; demand interventions use only the largest gain, conservatively preventing additive overlap. Subset comparison exhaustively evaluates subsets of the configured portfolio, with targets and quantities fixed. It does not search all possible portfolios or estimate causal treatment effects. See the Claims & Evidence appendix for the proposed information-first plan and evaluation protocol.

## Filter semantics and reproducibility

Month endpoints are inclusive and enforce start≤end. Machine, floor, demand and meter metrics follow time, zone and bank filters. Player and loyalty views follow months only; floor filters are explicitly inapplicable. Operations, relocations, closure audit and hourly timing show labeled fixed full-window context. Event/NOAA summaries follow selected months but remain property/destination context. Forecast and July planner stay fixed to their declared windows. Exports carry scope. The planner stores edits in local browser storage; no data is transmitted.

JSON rounds hours to four decimals, money to 2–3 where appropriate and variance to three. Full-precision outputs remain in machine-audit.csv and the Python analysis. Tiny client/server rounding differences are covered by numeric tolerances. Re-run the pipeline after any source change, then regenerate docs and tests/build.

## Hourly operational database

The separate historical explorer uses a UTC hypertable and verified bank/hour continuous aggregate, with effective placement/configuration preprocessing, 06:00 Las Vegas gaming dates, exact cents/seconds and ratio-of-sums rates. Quiet maintenance templates summarize descriptive theo debit per exposure-weighted representative machine, with missing-support and DST qualifications. They do not modify the frozen forecast, peer methods, investment objective or action assumptions. See [full schema, temporal methods, tolerances, executed reconciliation and benchmark](TIGER_DATA_SETUP.md).
