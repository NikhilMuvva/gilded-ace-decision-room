"""Generate judge-facing documentation from the executed analysis artifact."""
from pathlib import Path
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]
D = json.loads((ROOT/'public/data/dashboard.json').read_text())
DOC = ROOT/'docs'
DOC.mkdir(exist_ok=True)
f, m = D['facts'], D['model']
guest = next(g for g in D['guests'] if g['start']=='2025-01' and g['end']=='2025-06' and g['dimension']=='all')
inspect = next(x for x in D['planner']['machines'] if x['id']=='M-1158')
usd = lambda x: ('-' if x<0 else '')+f'${abs(x):,.2f}'
pc = lambda x: f'{x*100:.2f}%'
loy = D['loyalty']


def doc(name, text):
    (DOC/name).write_text(text.strip()+'\n',encoding='utf-8')


doc('CLAIMS_AND_EVIDENCE.md', f'''
# Claims & Evidence

All casino results describe The Gilded Ace, a fictional property. Dataset: `{D['version']}`, January–June 2025. These are computed outputs, not results about a real casino. Reproduce with `python scripts/build_data.py` then `python scripts/write_deliverables.py`. The upstream table hashes are in `source-inventory.json`; machine calculations are in `machine-audit.csv`.

## C1. Raw earnings are an inadequate replacement rule

- **Tables / calculation:** `prepared_daily_view`, active rows; group by machine and sum `house_win_usd`, ascending. Join the last in-window effective zone. `{f['backBottomCount']}/10` last appear in Back Forty. IDs: {', '.join(f['bottom'])}.
- **Result:** No machine has whole-window theo below 80% of its leave-machine-out matched peer benchmark. That is a descriptive screen, not proof that every machine is good. Exposure includes active scheduled time and availability, and theo removes observed payout luck from the demand metric.
- **Competing explanation tested:** Game configuration, month, weekday and zone are matched; the target machine is excluded from its peer reference. Replacement and retired machine exposure is handled by active rows and hours. `game_math` supplies the payout variance instead of assuming low hold implies a fault.
- **Limitation:** Zone matching deliberately conditions on location. It cannot separate a machine's intrinsic demand from all unrecorded within-zone position effects. A low index is not a causal replacement estimate. Rare game/zone cells fall back to configuration/month/weekday peers below 24 peer-hours.
- **Decision:** Do not replace ten machines based on raw win.

## C2. Back Forty weakened during the access disruption

- **Tables / calculation:** `floor_walkways` closure interval March 3–April 7, exclusive end. `prepared_daily_view`: ratio of summed coin-in to available hours in Back Forty vs the remaining floor, before and during closure. `(Back_during/Back_before)/(Other_during/Other_before)-1`.
- **Result:** Relative wager-rate change {pc(f['closureRelative'])}. Before: Back Forty {usd(D['closures'][0]['backRate'])}/hour, other floor {usd(D['closures'][0]['otherRate'])}/hour. During: {usd(D['closures'][1]['backRate'])} vs {usd(D['closures'][1]['otherRate'])}. After reopening: {usd(D['closures'][2]['backRate'])} vs {usd(D['closures'][2]['otherRate'])}.
- **Competing explanations tested:** Contemporaneous other-floor rates adjust for shared seasonality. Optional event-day comparisons match non-event month/weekday demand. Zone counters use coverage, never missing-as-zero. Four observed moves are audited with pre/post rates and matched indices; they do not provide a randomized relocation trial.
- **Limitation:** A ratio-of-ratios association is not causal difference-in-differences identification. Parallel trends are not established. Local game mix, events, and within-zone traffic can differ.
- **Decision:** Consider a controlled access/wayfinding experiment rather than assuming a replacement will fix location.

## C3. One negative payout exception supports an inspection

- **Tables / calculation:** `machine_day.sum_bet_squared` (cents²) × `game_math.payout_multiplier_variance` / 10,000 gives dollar² variance, summed by machine. `z = (sum house win - sum theo)/sqrt(sum variance)`. Two-sided normal-tail p-values; Benjamini–Hochberg adjustment across all 310 machines for the whole-window result.
- **Result:** M-1158 has z = {inspect['z']:.3f}, q = {inspect['q']:.5f}. There are {f['payoutFlags']} negative residual flags at 5% FDR. June demand index is approximately {inspect['dailyTheo']/inspect['peerDaily']:.3f}× peers, so low observed win does not also establish weak play demand.
- **Competing explanation tested:** Supplied game volatility and actual bet sizes; multiple testing adjustment. The app recomputes the family across all machines in selected months before floor drilldowns.
- **Limitation:** The normal approximation is imperfect for rare, heavy-tailed payouts; independence and correct configured game mathematics are assumptions. FDR is approximate under these assumptions. No finding of malfunction or wrongdoing is established.
- **Decision:** Spend $1,200 on one inspection of M-1158. Debit two hours of expected opportunity, {usd(2*inspect['hourlyTheo'])}; do not book its information value as earnings.

## C4. Downtime represents opportunity, not guaranteed incremental win

- **Tables / calculation:** Active `machine_day.scheduled_seconds - available_seconds`, divided by 3,600. Multiply by leave-machine-out peer coin or theo rate, matching zone/configuration/month/weekday, with the same sparse-cell fallback.
- **Result:** {f['downHours']:,.2f} unavailable machine-hours, {usd(f['lostCoin'])} forgone wager proxy and {usd(f['lostTheo'])} forgone theo proxy. Optional hourly meters reconcile exactly to the daily scheduled downtime. Repair tickets contain {D['operations']['waitHours']:,.2f} queued hours and {D['operations']['repairHours']:,.2f} hands-on hours; ticket time is not added to meter downtime.
- **Competing explanation tested:** Separating queued vs repair duration avoids treating every unavailable hour as preventable by staffing. DST uses actual elapsed hours, not 24 × days. Sparse peers are disclosed.
- **Limitation:** Outage timing is not random; guests can switch machines. The peer-rate proxy need not be incremental property demand. A 50–150% rate sensitivity is a scenario, not a statistical confidence interval; zero incremental gain remains possible.
- **Decision:** Compare marginal recoverable theo with catalog costs before adding technicians or maintenance sweeps.

## C5. Tracked outcomes are concentrated and have the player sign

- **Tables / calculation:** `player_period`; regroup by player across the selected contiguous months before summing, ranking, or computing ahead rates. Only gamblers with positive tracked wagers are in ahead/concentration denominators; other accounts stay in activity counts.
- **Result:** {guest['players']:,} tracked gamblers wagered {usd(guest['wagers'])}, received {usd(guest['payout'])}, and netted {usd(guest['net'])}. {guest['ahead']:,} ({pc(guest['ahead']/guest['players'])}) finished ahead. Top 10% by wagers account for {pc(guest['wagerConcentration'][2])} of tracked wagers. Separately, the top 10% by positive gaming loss account for {pc(guest['top10LossShare'])} of positive losses.
- **Competing explanation tested:** Do not equate wagers with deposits or payouts with profits. Repeated monthly identities are deduplicated across the period. Wager and loss rankings use separate denominators.
- **Limitation:** Tracked carded play excludes uncarded gaming, including possible uncarded activity by card holders. Person-level outcomes are incomplete.
- **Decision:** Report outcomes honestly; do not target high-loss or vulnerable players to increase their play.

## C6. Loyalty economics changed even after an item/tier mix check

- **Tables / calculation:** Each `loyalty_ledger` redemption joins one-to-one to `fnb_transactions` via `redeemed_pos_id`. Ledger economic cost equals linked POS cogs. UTC redemption timestamps convert to Los Angeles wall time, subtract six hours, then group by gaming month.
- **Result:** Economic cost {usd(sum(x['cost'] for x in loy))}, face value {usd(sum(x['face'] for x in loy))}. Weighted realized points per face dollar decline from {loy[0]['pointsPerFaceDollar']:.3f} in January to {loy[-1]['pointsPerFaceDollar']:.3f} in June. With January face-dollar weights fixed across {loy[0]['standardizedCells']} item × tier cells having at least 20 redemptions every month, the corresponding standardized rates are {loy[0]['standardizedPoints']:.3f} and {loy[-1]['standardizedPoints']:.3f}. The break occurs in May.
- **Competing explanation tested:** Holding item and tier mix fixed retains the shift. Every ledger redemption and cost reconciles to POS. Subtracting economic comp cost again would double-count cogs.
- **Limitation:** Standardized cells are a supported subset. This does not identify the effect on guest behavior, explain all points liability, or establish that lower point prices caused more redemptions.
- **Decision:** Use a controlled comp-policy pilot before a broad change; preserve current funds until its value is justified.

## C7. A simple time-series forecast improves calendar planning

- **Tables / calculation:** `property_day.coin_in_usd` only. Inner training Jan–Mar / validation April selects weekday mean vs trailing-eight-week weekday mean. Refit Jan–Apr and freeze all May–June predictions. Compare constant Jan–Apr mean; metric is daily wager MAE.
- **Result:** {m['name']} MAE {usd(m['mae'])}; constant baseline {usd(m['baselineMae'])}; reduction {pc(m['improvement'])} over {m['testDays']} future gaming days. Paired seven-day circular block bootstrap, 2,000 repetitions, seed 2026: 95% interval for MAE improvement {usd(m['improvementUsdCI'][0])}–{usd(m['improvementUsdCI'][1])} per day.
- **Competing explanation tested:** Inner validation rejects choosing a recent-only weekday pattern; the baseline uses the same frozen training window. No test-day lags or later external revisions are features.
- **Limitation:** One synthetic series, one holdout, no independently validated July performance. The interval describes error improvement, not a prediction interval. Forecasts concern wagers, not net contribution or staffing response.
- **Decision:** Schedule non-urgent work around predictable weekday peaks; do not treat a quiet day as evidence that a promotion is profitable.

## C8. Preserve cash while buying targeted information

- **Calculation / source:** `action_catalog`; cost = quantity × [one-time cost + recurring/day × max(0,30−lead)] + explicit incremental comp budget. Full fixed package and purchase costs are charged. Inspect M-1158: $1,200, one-day lead, 29 eligible days, 120 minutes downtime. Preserve $98,800. Scenario net after the inspection and downtime debit is {usd(-1200-2*inspect['hourlyTheo'])}, before unpriced information value.
- **Alternatives:** The interactive planner includes every paid catalog action, ≤3 action types, distinct valid targets, quantities, same-machine conflicts, comp-policy incompatibility, 5–20 comp points/dollar, vacant relocation destinations, and whole-bank grouping. Technician benefit is capped by the shared historical queue pool. Bank downtime is conservatively treated as 480 minutes per affected machine. Demand benefits are not stacked; only the largest assumed demand-action gain is retained. Overlapping technician/preventive recovery also uses the larger gain.
- **Uncertainty:** All effect sliders start at zero. Their rates are user assumptions applied to observed bases, not estimated treatment effects. The subset comparator exhaustively evaluates the ≤8 subsets of the configured actions at their configured quantities/targets; it is not a global causal optimizer. Information value, displacement, long-term lease commitments and lifetime asset value are not identified.
- **Measurement:** Pre-register primary theo per available hour and machine availability; log inspection findings, settings and meter reconciliation. Use matched controls or randomization, watch floor-wide spillover and economic comp cost, set safety/guest-protection constraints, and stop if no supported improvement in 30 days. Do not remove a correct machine simply because a 30-day luck residual remains negative.

## C9. Independent parameter review supports stable methods, not extra flags

- **Source / reproduction:** `scripts/audit_algorithms.py` reads original CSV.gz tables independently of the Parquet production pipeline. `ALGORITHM_AUDIT.json` records input SHA-256 and 16 executed checks; `PARAMETER_REGISTER.md` identifies policies, fixed requirements and sensitivity assumptions.
- **Result:** The 24h peer rule falls back on 307/55,092 active machine-days; minimum whole-window index is 0.834334. Loyalty common cells cover 98.9256% of January face value. Adjacent 35-day closure comparison is −30.5088%. These support keeping the current peer, loyalty and forecast methods.
- **Change:** Replace the uncalibrated 0.80 failure label with continuous score, scope-relative rank/percentile and exposure/support; retain the 5% payout policy. Add descriptive robustness diagnostics without changing primary metrics or the frozen forecast. Every configured action now shows zero-effect net and break-even conditions; information benefits remain unpriced.
- **Limitation:** Variance multipliers are hypothetical, descriptive resampling is not causal recovery, and later candidate comparisons do not make the already-examined May–June holdout pristine. No tail distribution can be identified from supplied second moments alone.
''')

doc('METHODOLOGY.md', '''
# Analytical methodology

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
''')

writeup = f'''The Gilded Ace plans to replace its ten lowest-earning machines. Our decision room asks a different question: luck, location, or a leak?

We analyze six months of synthetic casino records, distinguishing expected house win from observed payout luck, and comparing machines against peers with the same zone, game configuration, month and weekday. Off-floor days are excluded; availability uses actual scheduled seconds.

{f['backBottomCount']} of management's bottom ten were last placed in Back Forty. During its walkway closure, wager volume per available hour declined {pc(-f['closureRelative'])} relative to the rest of the floor. This is observational, but it challenges a machine-only explanation. No machine falls below 80% of its matched theo benchmark over the full window.

Game-math variance and multiple-testing adjustment identify one negative payout exception: M-1158. We recommend its $1,200 inspection, with a two-hour opportunity debit, and preserving $98,800. Information value is unpriced; a residual is not proof of malfunction. The planner prices every official action, lead time, recurring fee and downtime requirement, limits plans to three types, checks conflicts, and compares configured subsets under visible assumptions.

Downtime totals {f['downHours']:,.0f} machine-hours, representing {usd(f['lostTheo'])} in theo opportunity before displacement, not guaranteed earnings. Tracked guests wagered {usd(guest['wagers'])}, received {usd(guest['payout'])}, and netted {usd(guest['net'])}. Their outcomes are incomplete because uncarded gaming is invisible at the person level. We do not recommend increasing high-loss guests' play.

The loyalty ledger reconciles one-to-one to POS, preventing double-counted comp costs. A May decline in redemption point prices persists after fixing item and tier mix.

A weekday forecast, selected using an inner chronological split, reduces May–June daily-wager MAE from {usd(m['baselineMae'])} to {usd(m['mae'])}. Predictions are frozen before the holdout; later external revisions are excluded.

Judges can change months, drill into banks and machines, inspect guest groups, verify model validation and trace each recommendation. An optional Gemini copilot routes questions to verified read-only evidence; offline mode is labeled and live verification requires server configuration. A reproducible Python pipeline, executed checks, evidence appendix and AI disclosure accompany the app. The draft source release and causal limits are visible throughout.'''
doc('SUBMISSION.md', '# Submission draft\n\n## Main write-up\n\n'+writeup+f'\n\nWord count (whitespace): {len(writeup.split())}. Limit: 400.\n\n'+'''
## Walkthrough script — target 1:50 to 1:58

**0:00–0:12 | Executive briefing.** “Management wants to replace ten low earners. Nine were last in Back Forty. We separate luck, location and downtime before spending.”

**0:12–0:28 | Machine performance.** “Change the month range and pick a bank. Select M-1158: demand is near matched peers, but its payout residual warrants inspection after variance and multiple-testing adjustment. This is not evidence of wrongdoing.”

**0:28–0:40 | Demand.** “Back Forty weakened during the walkway closure. Other-floor comparison and move-window sensitivity test alternatives. These associations cannot prove causality.”

**0:40–0:58 | Availability, guests, loyalty.** “Downtime is exact; lost play is a proxy. Guest net is payout minus wagers and covers carded play only. Comp cost is counted once. The May point-price shift survives a fixed item/tier mix.”

**0:58–1:13 | Methods.** “April selects the weekday forecast; May–June predictions were frozen. Their error beats the constant baseline. We have now examined that holdout, so later candidates cannot treat it as unseen.”

**1:13–1:33 | Planner.** “Inspect M-1158 for $1,200 and preserve $98,800. Costs, lead time, downtime, quantity and conflicts update. Break-even and zero-effect outcomes are explicit. Effects start at zero; information value is unknown.”

**1:33–1:50 | Copilot.** After successful live verification, ask “Why is M-1158 flagged?” Show live status, exact evidence, caveat and the user-clicked Open analysis. If unconfigured, explicitly demonstrate offline evidence and state that live Gemini remains blocked; do not call it a successful Gemini demo.

**1:50–1:58 | Appendix.** “Every claim links to a calculation, competing explanation and limitation. All casino data is synthetic.”

The script is a draft, not a recorded video. Rehearse and shorten live narration if clicks take longer. Submit the public URL only after user-led deployment and a private-window check.
''')

doc('AI_DISCLOSURE.md','''
# AI-use disclosure

OpenAI Codex assisted with inspecting the supplied repository and starter, analytical design, Python transformations, statistical calculations, interface and planner implementation, testing, documentation, and draft narration. The Sites skill was used as web workflow guidance; no Site was created or deployed. Computer Use was consulted for browser verification, but its browser/native connection was unavailable.

All displayed operational results derive from the supplied synthetic challenge files. No AI-generated casino records or placeholder statistics were substituted. A separate independent Python/JavaScript calculation check validates the machine ranking and payout flags. The forecast uses a chronological holdout and reports its baseline honestly. Action uplifts are visibly labeled user assumptions, not AI-estimated treatment effects. The beginner Help calculators use explicitly labeled illustrative inputs and never modify the actual analysis.

The optional Gemini investigation feature uses official REST function calling to select application-computed evidence and a structured evidence-ID response. Application-owned templates render the numbers and explanations. Missing credentials or API failures are explicitly offline deterministic evidence, never presented as a live model response. The live-check record documents whether a real request was possible; no live Gemini verification or award eligibility is claimed when blocked. Only synthetic aggregate facts and the user's compact current context are sent; original player identities and restricted source tables are excluded.

AI also consulted official Vercel, Vite and GoDaddy documentation for deployment preparation. No credentials, domain records, real account data or original restricted publisher tables were uploaded. The original datasets remain local and unchanged. Fonts and icons use packaged libraries; no image generation was used.

Human team members should review the analysis, rehearse the walkthrough and take responsibility for the final submission. No live browser visual sign-off or recorded video is claimed.
''')

doc('LIMITATIONS.md','''
# Remaining risks and limitations

- Upstream data is `0.9.0-draft`. Organizer release-readiness checks fail for missing final calibration approval and LVCVA/Missouri publisher evidence. All checksums, format comparisons and accounting checks passed. Regenerate the app if the organizers issue corrected data.
- The upstream verifier constructs platform-dependent path separators on Windows. Our wrapper normalizes them in memory, preserving every original file and every substantive check.
- Browser/native Computer Use was unavailable. Production compilation, HTTP readiness, pure analytical tests and simulated-DOM interaction tests can be executed; this is not visual QA. Chart zero-dimension warnings in the layout-free test environment do not verify rendered chart geometry. Complete a desktop/mobile and keyboard browser pass before public submission.
- Month-based historical filters are deliberate; arbitrary partial-month player concentration is not offered. Fixed audit contexts and full-period payout-family semantics are labeled.
- Machine peer indices are descriptive; uncertainty about intrinsic machine effects remains. Normal-tail payout tests and approximate FDR rely on game-math/independence assumptions and can be imperfect for heavy tails.
- Closure/event/move findings are observational. Parallel trends and causal relocation/promotion uplifts are not established. Item/tier standardization does not identify a loyalty behavioral response.
- Downtime opportunity omits substitution, repeat visits and nonrandom outage timing. Ticket hours can overlap and do not replace meter downtime. Supplied costs omit broad overhead and taxes.
- Carded guests are a partial view. No original identities are published. Cohort aggregation does not reconstruct uncarded behavior or full gambling outcomes.
- The forecast has one holdout on one synthetic property. It predicts wagers, not profit, staffing effect or July treatment response.
- Planner effect sliders are assumptions. Information benefits are unpriced. It compares configured subsets, not all targets/quantities globally. Bank downtime is a conservative per-machine assumption; operational relocation destinations still need physical approval. Longer-term lease commitments and purchased-asset lifetime value fall outside the 30-day comparison.
- Public hosting, GoDaddy DNS, a recorded video, actual submission and account credentials remain user actions. A deployment guide and sanitized ZIPs are supplied; no deployment is claimed.
''')

doc('DEPLOYMENT.md','''
# Deployment and GoDaddy domain

This is a static Vite frontend with an optional Node Gemini function. Deploy the sanitized app project, never the `sources/` directory or complete upstream ZIP. The precomputed `public/data/dashboard.json` permits a frontend build without Python or original datasets on the host. Node 22.12+ (tested here with 26.13) and `npm ci` are sufficient. The lockfile is included. Deploying only `dist/` provides offline evidence; live Gemini needs `api/`, `server/`, source modules, included aggregate JSON, and a privately configured server key. See GEMINI_SETUP.md for local/API/Vercel instructions and verification blockers.

## Local production check

```powershell
npm ci
npm run verify
npm run preview -- --port 4173
```

Open `http://127.0.0.1:4173`. The dev equivalent is `npm run dev -- --port 5173`. Opening dist/index.html directly from disk will not load fetch/module assets correctly; use the server. `npm run verify` runs analytical tests, simulated-DOM interactions and the production build. It does not launch a real browser.

## Vercel, with your account

1. From the sanitized project root, run `npx vercel login` and complete sign-in yourself.
2. Run `npx vercel`. Confirm the project root, Vite, build command `npm run build`, output `dist`. This creates the preview deployment; review it.
3. Run `npx vercel --prod` when ready to publish. Alternatively import a repository containing only the sanitized app, with Install `npm ci`, Build `npm run build`, Output `dist`. `vercel.json` describes the static build, data caching and Node function's included JSON files. Set GEMINI_API_KEY privately on the server, never as VITE_*, and verify a real mode=live answer after deployment. Configure durable public rate controls; the built-in limiter is per instance.
4. Copy the returned HTTPS URL and test it in a private browser window, including machine selection, filters, all sections, docs and planner export. Public competition access requires a public production URL without authentication protection.

No CLI login, publication or DNS change has been performed by this task. The exact host URL and DNS destination are account/project-specific and cannot be supplied before that project exists.

## Keep GoDaddy as DNS provider

1. Vercel project → Settings → Domains → add `yourdomain.com` and `www.yourdomain.com`, or a chosen subdomain such as `dashboard.yourdomain.com`.
2. GoDaddy Domain Portfolio → select the domain → DNS → DNS Records. Use the authoritative DNS provider if the domain's nameservers point elsewhere.
3. For an apex domain, edit/add an **A** record with Name **@**, Value **the IP Vercel shows for this project**, TTL **default**.
4. For `www` or `dashboard`, edit/add a **CNAME** with Name **www** or **dashboard**, Value **the exact CNAME target Vercel shows**, TTL **default**. Do not paste a URL scheme or path. Do not guess a legacy universal Vercel target: current projects may receive unique CNAME destinations.
5. If Vercel requests ownership verification, add its exact **TXT** Name and Value. Choose the canonical domain and redirect the alternative in Vercel.
6. Preserve unrelated email MX/TXT records. Resolve conflicts only at the exact web record being replaced. Wait for Vercel's domain verification and HTTPS certificate provisioning, then recheck the custom domain in a private window.

Official references checked November 7, 2026:

- [Vite static deployment](https://vite.dev/guide/static-deploy.html)
- [Vercel custom domains](https://vercel.com/docs/domains/working-with-domains/add-a-domain)
- [GoDaddy CNAME records](https://www.godaddy.com/en-in/help/add-a-cname-record-19236?locale=en)
- [GoDaddy DNS management](https://help-center.dc-aws.godaddy.com/help/manage-dns-records-680)

## Reproducible source refresh

```powershell
python -m venv .venv
.venv\\Scripts\\python -m pip install -r requirements.txt
.venv\\Scripts\\python scripts/build_data.py --source "sources/dashboard-royale-main"
.venv\\Scripts\\python scripts/build_decision_evidence.py
node scripts/build_portfolios.mjs
.venv\\Scripts\\python scripts/write_deliverables.py
npm run verify
python scripts/package_submission.py
```

On macOS/Linux replace `.venv\\Scripts\\python` with `.venv/bin/python`. Place the locally supplied upstream archive's contents at the indicated source path first. Rebuilding data requires locally held publisher files; distributing the app does not grant rights to distribute those inputs. The organizer's release-readiness check remains separate from a successful app build.
''')

doc('VALIDATION.md',f'''
# Verification record

- Source integrity: 62 file sizes/checksums and 31 CSV/Parquet row/format comparisons passed using `python scripts/verify_sources.py`.
- Organizer semantic checker: all 11 accounting, key, exposure, lag and DST invariants passed.
- Pipeline: {len(D['checks'])} executable checks passed (see pipeline-checks.md).
- Analytical/planner tests: `npm test` checks independent totals, filters, payout flags, cost horizons, quantities, conflicts, relocation constraints, unpriced inspections, overlap caps, guest net and frozen forecasts.
- Independent audit: `npm run audit:algorithms` reads original CSV.gz tables without importing the production pipeline. ALGORITHM_AUDIT.json records 16 checks, peer/variance/closure/move/loyalty sensitivity and frozen model diagnostics. Original headline accounting metrics and holdout predictions are unchanged; recommendation metadata has been updated by the comprehensive pass below. See PARAMETER_REGISTER.md.
- Copilot regressions: allowlisted read-only retrieval, context/argument validation, malformed tools, unknown IDs, prompt injection, rejected generated prose/citations, rate/size/origin/method limits, API errors/timeouts, exact planner math, honest offline mode, per-page entry, explicit navigation, latest plan context and stale-filter handling. Mocked API protocol success is not a live-account check; GEMINI_LIVE_CHECK.json records that separately.
- Component interactions: `npm run test:ui` uses a simulated DOM to exercise all sections, applicable filters, machine dossier, guest groups, planner incompatibility and persistence, and loading failure. Help checks cover entry/return, preserved selections, scroll/focus, contextual explanations, glossary search and interactive examples. Operational regressions cover cursor-centered zoom, drag/pinch, dated placements, retired-machine selection, synchronized table/dossier focus, scoped JSON exports, visible loyalty trends, demand-series controls and investigation-to-planner navigation. CSS assertions check 34px controls, 16px toolbar icons and the narrow-screen layout rules. This does not prove chart layout, screen-reader behavior or physical touch interaction in an actual browser.
- Production: `npm run build` type-checks TypeScript and emits static dist assets. HTTP smoke checks are recorded separately in HTTP_CHECKS.json when run.
- Dependencies: npm reported no known vulnerabilities after updating Vite/Recharts; lockfile pins the tested install. Re-audit after future dependency changes.
- Upstream `check_release.py`: expected failure due to draft version, absent calibration approver/report/manifest binding, LVCVA and Missouri evidence. These organizer-level issues were not changed or presented as passing.
- Browser verification: blocked by no available browser or native connection in Computer Use. No screenshot or manual visual pass is claimed.
''')

notices=[]
for package in ['react','react-dom','recharts','lucide-react','@fontsource-variable/dm-sans','@fontsource-variable/manrope']:
    license_path=ROOT/'node_modules'/package/'LICENSE'
    if license_path.exists():
        notices.append(f'## {package}\n\n'+license_path.read_text(encoding='utf-8'))
doc('FRONTEND_NOTICES.md','# Frontend third-party notices\n\n'+'\n\n'.join(notices))
public = ROOT/'public/docs'
public.mkdir(exist_ok=True)
for path in DOC.iterdir():
    if path.is_file():
        shutil.copyfile(path, public/path.name)
print(f'Generated judge documentation. Write-up: {len(writeup.split())} words.')
decision_file=ROOT/'public/data/decision.json'
if decision_file.exists():
    decision=json.loads(decision_file.read_text(encoding='utf-8'))
    if decision.get('sourceManifestSha256')==D.get('sourceManifestSha256') and decision.get('recommendation'):
        import runpy
        runpy.run_path(str(ROOT/'scripts/write_scientific_report.py'),run_name='__main__')
