"""Judge-facing reports generated from executed scientific evidence and portfolio search."""
from pathlib import Path
import json,shutil
ROOT=Path(__file__).resolve().parents[1];DOC=ROOT/'docs'
a=json.loads((ROOT/'public/data/decision.json').read_text(encoding='utf-8'));d=json.loads((ROOT/'public/data/dashboard.json').read_text(encoding='utf-8'))
usd=lambda x:f'{"-" if x<0 else ""}${abs(x):,.2f}'
pct=lambda x:f'{x*100:.2f}%'
rec=a['recommendation'];learning=a['experimentalRecommendation'];mfr=next(m for m in a['manufacturer'] if m['manufacturer']=='Ridgeline')
replacement=next(p for p in a['strategies'] if p['id']=='replacement')
primary_reason='No paid candidate improves on preserving cash under the base objective.' if not rec['entries'] else 'This feasible portfolio has the highest base-scenario net among the generated combinations.'
runner_rows=[[', '.join(p['keys']),usd(p['cost']),usd(p['scenarios']['low']['net']),usd(p['scenarios']['base']['net']),usd(p['scenarios']['high']['net'])] for p in a['search']['financialRunnerUps']]
monitor_rows=[[str(p['priority'])+'. '+p['target'],p['monitor'],p['trigger']] for p in a['monitoringPlan']]
def write(name,text):(DOC/name).write_text(text.strip()+'\n',encoding='utf-8')
def table(headers,rows):return '| '+' | '.join(headers)+' |\n| '+' | '.join(['---']*len(headers))+' |\n'+'\n'.join('| '+' | '.join(str(v).replace('|',' / ').replace('\n',' ') for v in row)+' |' for row in rows)
audit_rows=[[name,v['rows'],v['sha256']] for name,v in a['sourceTables'].items()]
algorithms=[
 ['Accounting and ratios','Exact cents; USD conversion /100; hold=Σwin/Σwagers; observed RTP=Σpayout/Σwagers','Raw meters, property, sessions and POS','No fitted parameter; denominators explicitly positive','Raw/prepared/property rollup and controlled zero-denominator tests','Observed accounting; not profit or a future guarantee'],
 ['Exposure and placements','Raw scheduled/available/occupied seconds; effective_from ≤ UTC gaming-day start < effective_to','Calendar, machine_day, machine_hour, placements','06:00 Los Angeles; DST actual elapsed time','Every active row joins exactly one placement; daily/hourly and install/retire checks','Do not treat off-floor rows as zero demand'],
 ['Exact matched peers','Rate=(cell total−target total)/(cell hours−target hours); expected=rate×target available hours','Zone/configuration/month/weekday','24 local peer-hours, otherwise cross-zone same config/month/weekday; target excluded','Independent source reconstruction; 0/24/96 support sensitivity','Retrospective and conditional on location; no relocation counterfactual'],
 ['Benchmark alternatives','Cross-zone reference; support-weighted blend λ=H/(H+k)','Same source; k=24,96,384 equivalent hours','Sensitivity grid, not learned intrinsic-quality prior','Rank correlations, changes and first/second-half rank stability','Different geographic conditioning answers different questions; no forced consensus'],
 ['Conditional peer intervals','Resample paired day outcomes and fitted expectations in circular 7-day blocks within month; ratio of resampled sums','Theo, fitted expectation, occupied hours and supplied-cost contribution','1,200 source draws; seed 20261108; 600 deterministic interactive dossier draws','Ratio-identity, strata preservation and reproducibility fixtures','Pointwise conditional intervals; not simultaneous coverage or causal defect probabilities; fitted peer uncertainty omitted'],
 ['Demand persistence','Below-peer months plus pointwise upper ratio bound <1; keep continuous values','Machine-month theo/expected','At least 56 active days, ≥2 months; below in ceil(2M/3) months, minimum 2','28/56/84-day support sensitivity and temporal disagreement','Exploratory management policy; full-window equivalent is 4 of 6 months'],
 ['Economic diagnostic','Actual contribution=win−recorded supplied costs; theo less costs separately; compare matched contribution','Lease/service/power/repair, actual and theoretical win','Economic review also requires above-current-cohort median cost burden','Raw cost-rule reconstruction and independently aggregated contribution','Relative weak economics does not mean loss-making; avoidable old contracts and full overhead unknown'],
 ['Payout test','Variance=Σbet²_cents×payout_multiplier_variance/10,000; z=(win−theo)/sqrt(variance); p=erfc(|z|/sqrt2); BH reverse cumulative minimum','Raw bet² and supplied game math','Two-sided policy q<.05 and negative residual; all selected-month machines before floor drilldown','Independent exact normal calculation, known p/q fixture, uniform-null FDR and injected signal tests','Independence/normal-tail assumptions; no diagnosis of wrongdoing or malfunction'],
 ['Payout distribution sensitivity','Construct 0/a/max awards matching RTP, variance and hit probability; effective bet=Σbet²/Σbet; effective spins=(Σbet)²/Σbet²','Supplied game moments and full M-1158 wager moments','150,000 multinomial draws, seed 20261108','Moment identities and Monte Carlo interval; variance ×1/1.25/1.5/2 also retained','Constructed distribution is not identified paytable and may not match increments; simulation tail is not a replacement calibrated p-value'],
 ['Fault screen and manufacturer association','Machine Poisson upper tail vs leave-target-out floor exposure rate; BH .05. Manufacturer offset Poisson with quasi-Poisson covariance','Fault operation counts; active machine-days; manufacturer/config/zone/month/weekday','Weekly/seasonal adjustment features; numerical ridge 1e−7 only; no effect threshold tuning','Known rate-ratio fixture; design rank and dispersion recorded','Repeated tickets/dependence can invalidate Poisson FDR calibration; manufacturer association is not causal'],
 ['Comparative closure design','Available-hour-weighted log wager rate; zone×configuration and date fixed effects; Back Forty during/after indicators; optional differential trend','Daily meters, placements, walkways','Newey–West date-score covariance lag 7; recorded closure dates','Known fixed-effect fixture; broad/adjacent windows, trend and pre-trend sensitivity','Local confounding, nonparallel trends and spillovers preclude a causal closure or signage estimate'],
 ['Relocation audit','Theo/hour and matched-index after/before ratios','All four actual placement transitions','14/21/28-day windows; effective gaming-day dates','Each width retains actual observed before/after exposure','Nonrandom moves and one conspicuous effect cannot establish general uplift'],
 ['Queue versus meter opportunity','Union [opened,work-started) intervals per machine; intersect with unavailable meter seconds; multiply matched theo rate; aggregate actual shifts','Operations, machine_hour, shift_roster','Full Jan–Jun queue baseline /181 days; 23 eligible technician days','No overlap double count; queue bounded by metered downtime; selected-shift pool test','Queue proxy is not recoverable profit; hands-on repairs not assumed avoidable by staffing'],
 ['Planned outage debit','June machine-hour theo/available-hour profile; exact required duration; catalog relocations start 06:00','Hourly wagers, configured RTP and catalog minutes','Quiet job proxy only when ≤1 target task per eligible day; broader sweeps use all-hour debit if capacity unverified','Independent fractional/wraparound and catalog-boundary/crew-capacity fixtures','Scheduling proxy, not observed savings; feasibility and July demand require operational confirmation'],
 ['Loyalty economics','One-to-one ledger redemption → POS; economic cost=cogs once; fixed January face-value item×tier weights','Ledger, POS, tracked months','≥20 redemptions in every month; thresholds 1–100 sensitivity','98.93% January face coverage; economic totals reconcile','Menu value is not cost; causal guest response and unused point liability unknown'],
 ['Original forecast','Weekday means selected Jan–Mar→April; refit Jan–Apr; freeze May–Jun','Property wagers only; no future lags or revised context','Original selection rule and 61-day predictions unchanged; paired 7-day block interval','Independent frozen-prediction/MAE equality, chronological fixture and segment diagnostics','Holdout has been examined; cannot be reused as pristine for a new model'],
 ['Additional forecast research','Feb/Mar/Apr month-origin forecasts: constant, weekday mean/median, seasonal-naive frozen cycle, recent56 and calendar ridge','Only dates/wagers before each origin','Ridge α=.1/1/10/100 via earlier 14-day inner folds; February defaults to 1','Equal origins/horizons; MAE/RMSE/WAPE/MASE; paired retrospective difference interval','Exploratory historical procedure; no new untouched final test or action ROI model'],
 ['Candidate portfolio search','Exhaustive 0–3 distinct-action-type combinations of evidence-generated bundles; deterministic source catalog constraints','Opportunity Register, June active targets/vacancies/swaps, action catalog','20 bundles; exact costs, limits, lead times, destinations and conflicts','Known optimal small fixture and independent exhaustive enumeration; every returned solution revalidated','Search is exhaustive only over declared bundles, not all quantities/targets/causal investments'],
 ['Scenarios and overlap','Effect×historical eligible base×retained share; subtract exact cost and planned debit; cap positive gains within demand/recovery pools; count all negative effects','Catalog and historical exposure','Explicit low/base/high rates; base retains 50%, high 75% of positive demand uplift','Zero-effect, negative effect, recurring, purchase, overlap and shift-cap fixtures','No effect probabilities or empirically identified treatment returns; unmodeled variable costs/overhead remain'],
 ['Learning decision policy','Maximize number of distinct pre-registered questions under modeled-downside cap; tie-break higher base net then lower cash spend','Feasible candidate results and registered questions','Default $20,000 cap; display $0/$5k/$10k/$20k/$30k frontier','Selected solution satisfies cap and all official constraints; pure financial objectives displayed separately','Policy is not learned utility, expected profit or monetized information value; risk tolerance requires management judgment'],
 ['Grounded copilot','Read-only deterministic retrieval; Gemini chooses allowlisted tools and verified evidence IDs','Current scope, configured plan, source-matched evidence','Bounded requests/tokens/time; source/argument validation; explicit navigation click','Injection, stale scope, tool, evidence-ID, API failure and exact-money tests; live checks separately recorded','No autonomous budget changes, raw identities or generated financial substitutes'],
]
portfolio_rows=[[p['name'],usd(p['cost']),usd(p['remaining']),usd(p['scenarios']['low']['net']),usd(p['scenarios']['base']['net']),usd(p['scenarios']['high']['net'])] for p in a['strategies']]
opp_rows=[[o['title'],o['target'],usd(o['scale'])+' '+o['scaleLabel'],o['priority']] for o in a['opportunities']]
diagnostic_counts={}
for m in a['machines']:
    for label in m['categories'].split('|'):diagnostic_counts[label]=diagnostic_counts.get(label,0)+1
ranked=sorted(a['machines'],key=lambda m:m['lostTheo'],reverse=True)[:15]
findings='\n\n'.join(f"### {i+1}. {o['title']}\n\n**Question:** {o['priority']}. **Target:** {o['target']}.\n\n**Observed evidence:** {o['evidence']}\n\n**Scale:** {usd(o['scale'])}; {o['scaleLabel']}. **Source tables:** {', '.join(o['sources'])}.\n\n**Method / trace:** See the corresponding algorithm register entry and `build_decision_evidence.py` source calculation; each result and input hash is in SCIENTIFIC_AUDIT.json.\n\n**Alternative explanation / uncertainty:** {o['uncertainty']} {o['causal']}\n\n**Action and measurement:** {o['measurement'].get('primary','')}. {o['measurement'].get('period','')}. {o['measurement'].get('stop','')}" for i,o in enumerate(a['opportunities'][:5]))
details=[]
for p in a['strategies']:
    action_rows=[]
    for x in p['scenarios']['base']['actions']:
        action_rows.append([x['id']+' × '+str(x['quantity']),', '.join(x['targets'])+(' → '+', '.join(x['destinations']) if x['destinations'] else ''),usd(x['oneTimeCost']),usd(x['recurringCost']),str(x['leadDays'])+' / '+str(x['days']),f"{x['requiredMachineDowntimeHours']:.1f} h; {usd(x['plannedDebit'])} debit; "+x['scheduleMode'],('Unpriced information' if x['breakevenNetEffect'] is None else pct(x['breakevenNetEffect'])+' net property effect')])
    details.append('### '+p['name']+'\n\n'+(table(['Action','Exact targets / destinations','One-time','Recurring','Lead / eligible days','Downtime / schedule','Break-even'],action_rows) if action_rows else 'No catalog spend. Retain $100,000; quantified incremental net is zero.')+f"\n\nZero-effect net: {usd(-p['cost']-p['scenarios']['base']['debit'])}. Low/base/high net: {usd(p['scenarios']['low']['net'])} / {usd(p['scenarios']['base']['net'])} / {usd(p['scenarios']['high']['net'])}. At the base assumptions, additional unpriced information/decision benefits must cover {usd(p['informationValueRequired'])} to offset the quantified shortfall. These are scenarios, not expected results.")
folds=table(['Origin','Model','Training days','Test days','MAE','RMSE','WAPE','MASE','Ridge α'],[[f['origin'],f['model'],f['trainDays'],f['testDays'],usd(f['mae']),usd(f['rmse']),pct(f['wape']),f"{f['mase']:.3f}",f['ridgeAlpha'] if f['ridgeAlpha'] is not None else '—'] for f in a['forecastResearch']['folds']])
portfolio_details='\n\n'.join(details)
report=f'''# Dashboard Royale: comprehensive scientific audit and investment decision report

## Decision and scientific conclusion

The inspection-only recommendation was a useful diagnostic response, but it was not a comprehensive investment optimum. The expanded analysis separates demand, supplied-cost economics, payout behavior, faults, location and insufficient evidence. It discovers actionable reliability concentration and validates low-demand scheduling, while retaining the original frozen forecast.

The decision engine searches **{a['search']['feasiblePortfolios']} feasible portfolios** from **{a['search']['candidateBundles']} evidence-based bundles**, including all paid catalog action types and preserving cash. The **primary financial recommendation spends {usd(rec['cost'])}, retaining {usd(rec['remaining'])}**. {primary_reason} Its objective is to maximize modeled base-scenario incremental property contribution after catalog costs, lead time, planned downtime, displacement and overlap. Ties favor higher low-scenario net, then lower spend. These are assumed effects applied to historical financial bases, not learned causal returns. The amount and targets are recomputed; neither cash nor the experimental plan is hardwired as the financial answer.

Primary low/base/high net is **{usd(rec['scenarios']['low']['net'])} / {usd(rec['scenarios']['base']['net'])} / {usd(rec['scenarios']['high']['net'])}**. Retained budget is not an earned return. A separate **risk-sensitive financial** objective maximizes the same base net subject to a stated low-scenario downside cap, a management preference. The low-scenario maximin comparison remains available. No scenario probabilities or arbitrary weighted expected return are assigned.

The **experimental backup** deliberately buys learning: **{usd(learning['cost'])}**, leaving **{usd(learning['remaining'])}**, for two targeted inspections, Back Forty wayfinding and a controlled loyalty pilot under a **{usd(learning['riskCap'])} modeled-downside cap**. Its low/base/high nets remain **{usd(learning['scenarios']['low']['net'])} / {usd(learning['scenarios']['base']['net'])} / {usd(learning['scenarios']['high']['net'])}**; zero-effect cost including debit is **{usd(learning['cost']+learning['scenarios']['base']['debit'])}**. Information value is unpriced. It is selectable as a separate management objective, not the primary financial optimum.

## A. Data verification and accounting

Dataset: `{a['sourceVersion']}`, fictional casino, January–June 2025. Manifest SHA-256: `{a['sourceManifestSha256']}`. Original inputs are read-only. Source integrity independently passed **62 file checksums/sizes and 31 CSV/Parquet row/format comparisons**. The expanded executed audit passes **{len(a['checks'])} source-to-display checks**; every numerical tolerance is recorded in SCIENTIFIC_AUDIT.json.

Raw all-play meters reconcile to prepared and property totals: wagers **{usd(a['totals']['wagers'])}**, payouts **{usd(a['totals']['payout'])}**, actual house win **{usd(a['totals']['houseWin'])}**, theoretical win **{usd(a['totals']['theo'])}**. Observed hold is **{pct(a['totals']['hold'])}**, observed return-to-player **{pct(a['totals']['observedRtp'])}**, availability **{pct(a['totals']['availability'])}**, occupancy **{pct(a['totals']['occupancy'])}**. Use ratios of sums and separate configured long-run RTP from observed payout/wager ratio.

There are 56,110 machine-day keys, 55,092 active and 1,018 off-floor. Each active row joins exactly one effective placement/configuration at the 06:00 Los Angeles gaming boundary; no two active machines share a daily slot. March 8 has 23 elapsed hours. Hourly currency, spins, availability and occupied seconds reconcile independently to daily meters; inactive rows are not zero-performance observations.

Recorded supplied machine costs total **{usd(a['totals']['suppliedMachineCosts'])}**; machine contribution after those costs **{usd(a['totals']['machineContribution'])}**. Property contribution after supplied costs is **{usd(a['totals']['propertyContribution'])}**, including POS cash/cogs and actual technician labor. Neither is complete profit. Lease-fixed $45/day, positive-house-win revenue-share 20%, manufacturer service and power rates, and opened-gaming-day direct repairs are independently reconstructed. Actual worked technician headcount, not planned headcount, reproduces property labor cost.

Tracked sessions reconcile to carded meter subsets, trip identity/cardinality and player-month accounting. Session end boundaries are tested. Whole-period guests are deduplicated before ahead rates and separate wager/positive-loss concentration rankings. POS cash/cogs and every redemption reconcile one-to-one; economic comp cost is inside cogs and counted once. Traffic uses observed crossings per covered sensor-hour with missing counts retained as missing, not converted to zero. No player identities or restricted third-party rows are exported.

### Corrections and shortcomings addressed

1. **Recommendation scope:** the default now publishes the candidate search's financial winner. The former learning default remains a separately labeled experimental strategy. Inspection-only is a paid-information comparator. Saved user plans are labeled and preserved until explicitly replaced.
2. **Valid swaps:** the previous planner rejected every occupied destination, even when its occupant was also moving. Catalog-valid paired/whole-bank swaps are now allowed only when every occupant vacates, destinations are unique and no move is a no-op; unvacated occupied destinations remain invalid.
3. **Technician opportunity:** the new engine/custom planner uses the chosen shift's unioned queue/meter intersection rather than treating all-floor queue opportunity as a shift-specific baseline. Hands-on repair time is not assumed recoverable by adding a technician.
4. **Planned downtime:** quiet-hour debits are measured planning proxies. Relocations obey the 06:00 catalog boundary. Broad sweeps fall back to all-hour rates when quiet-task capacity is not established; multiple simultaneous quiet crews are not silently assumed.
5. **Machine definition:** a below-0.80 rule cannot define intrinsic underperformance. Continuous ranks, support, conditional intervals, persistence and separate economic/operational dimensions now explain concerns; contradictory benchmark results are visible.
6. **Inference and prediction:** pointwise intervals do not imply 310-machine simultaneous certainty. Poisson fault screens and moment-matched payout simulations are explicitly assumption-sensitive. The examined May–June period is not relabeled pristine for new research.

## B. Algorithm register

{table(['Algorithm','Mathematical specification','Inputs','Parameters / selection','Validation','Limitations'],algorithms)}

## C. Machine diagnostics and rankings

{table(['Dimension','Machines (overlap allowed)'],diagnostic_counts.items())}

These are concerns to investigate, not definitive defects. No category is forced to contain a percentile quota. A machine may be both location-exposed and below its zone-matched benchmark; low utilization and unfavorable cost burden are distinct from a payout flag. All six-month actual and theoretical-minus-recorded-cost contributions are positive, so “weak relative economics” must not be read as “unprofitable machine.”

The following list ranks historical downtime exposure, not a combined badness score or recoverable profit. The interactive dossier recomputes applicable financial/exposure metrics and diagnostic dimensions for selected months/zone/bank. Full-window reference context is labeled. Original raw win ranking remains available for comparison.

{table(['Machine','Manufacturer','Index / conditional interval','Faults','Unavailable hours','Theo downtime proxy','Recorded costs','Diagnostic dimensions'],[[m['machine_id'],m['manufacturer'],f"{m['index']:.3f} ({m['indexLo']:.3f}–{m['indexHi']:.3f})",int(m['faults']),f"{m['down']:.2f}",usd(m['lostTheo']),usd(m['cost']),m['categories']] for m in ranked])}

Exact versus cross-zone rank Spearman correlation is **{a['benchmarkValidation']['exactVsCrossZoneSpearman']:.3f}**; first versus second half is **{a['benchmarkValidation']['firstVsSecondHalfSpearman']:.3f}**. This is meaningful disagreement: geographic conditioning changes the comparison and rankings are not immutable machine qualities. At 24/96/384 equivalent-hour pooling sensitivities, rank correlations are **{', '.join(f"{p['spearmanWithExact']:.3f}" for p in a['benchmarkValidation']['partialPoolingSensitivity'])}**. No alternative was selected merely because it creates a dramatic flag.

{table(['Machine','Exact index','Cross-zone index','Absolute rank difference'],[[m['machine_id'],f"{m['index']:.3f}",f"{m['wideIndex']:.3f}",f"{m['rankDifference']:.0f}"] for m in a['benchmarkValidation']['rankDisagreements']])}

## D. Most consequential reproducible findings

{findings}

### Additional operational checks

The adjusted Ridgeline/Halcyon fault-rate ratio is **{mfr['adjustedRateRatio']:.3f}** with quasi-Poisson interval **{mfr['adjustedInterval'][0]:.3f}–{mfr['adjustedInterval'][1]:.3f}**. Design rank is {a['manufacturerModel']['rank']}/{a['manufacturerModel']['columns']}; dispersion {a['manufacturerModel']['dispersion']:.3f}. Repeated tickets and unmeasured condition are still limitations. {a['repeatRepairs']['repeatWithin7Days']} tickets occur within seven days of a previous recorded repair; that is descriptive recurrence, not evidence preventive maintenance caused or prevented a fault.

{table(['Shift','Unioned queued meter hours','Historical queue theo proxy','Daily planning proxy'],[[q['shift'],f"{q['queueHours']:.2f}",usd(q['queueTheo']),usd(q['dailyOpportunity'])] for q in a['queueByShift']])}

Back Forty’s weighted fixed-effect closure association is **{pct(a['closureDesign']['models'][0]['duringAssociation'])}**, versus **{pct(a['closureDesign']['models'][1]['duringAssociation'])}** with a differential trend. Its pre-period differential monthly trend is **{pct(a['closureDesign']['preDifferentialTrendPerMonth'])}**; parallel trends cannot simply be assumed. Shared gaming-date effects account for weekday/calendar/common-event variation; configuration×zone strata reduce mix confounding. Local events and spillovers remain.

{table(['Machine / move','Window','Raw theo/hour ratio','Matched-index ratio'],[[m['machine']+' / '+m['date'],w['days'],f"{w['rawRateRatio']:.3f}",f"{w['peerIndexRatio']:.3f}"] for m in a['moves'] for w in m['windows']])}

M-1158’s normal-tail p is {a['payoutSensitivity']['normalP']:.8f}; BH q {a['payoutSensitivity']['normalBHq']:.7f}. The constructed moment-matched simulation tail frequency is {a['payoutSensitivity']['simulationTailFrequency']:.8f}, with Monte Carlo interval {a['payoutSensitivity']['monteCarloInterval'][0]:.8f}–{a['payoutSensitivity']['monteCarloInterval'][1]:.8f}. This is one assumed distribution, not the known generating paytable. Daily standardized lag-one median correlation {a['payoutSensitivity']['dailyLag1CorrelationMedian']:.3f} does not prove spin-level independence. Keep the inspection flag and caveats, not a defect diagnosis.

## E. Forecast evaluation and operational decision

The original Jan–Mar→April choice, Jan–Apr refit and frozen 61-day May–June predictions are unchanged. Headline MAE **{usd(d['model']['mae'])}** versus frozen constant **{usd(d['model']['baselineMae'])}**; reduction **{pct(d['model']['improvement'])}**. No post-test median switch occurs.

Additional models were evaluated at equal February, March and April monthly origins, with no within-test-month lags. Ridge uses only prior-data inner 14-day folds; α∈{{0.1,1,10,100}}, default 1 when February has no eligible inner fold. The median's retrospective rolling-origin MAE is slightly lower, while its RMSE is worse than the mean. The paired mean-minus-median MAE difference is **{usd(a['forecastResearch']['medianVsMeanMaeDifference']['meanMinusMedian'])}**, conditional 95% block interval **{usd(a['forecastResearch']['medianVsMeanMaeDifference']['conditionalBlockInterval'][0])}–{usd(a['forecastResearch']['medianVsMeanMaeDifference']['conditionalBlockInterval'][1])}**. This research does not justify relabeling the observed holdout as unseen.

{folds}

{table(['Original frozen segment','Days','Model MAE','Constant MAE'],[[f['segment'],f['days'],usd(f['mae']),usd(f['baselineMae'])] for f in a['forecastResearch']['frozenBreakdowns']])}

Operational connection: the quiet two-hour rule from Jan–Apr starts at **{a['hourValidation']['twoHourWindowStart']}:00 local**. In the later diagnostic, its per-machine debit is **{usd(a['hourValidation']['frozenWindowTestDebitPerMachine'])}**, versus **{usd(a['hourValidation']['allHourTestDebitPerMachine'])}** at the all-hour rate. This supports when to plan work; it does not predict whether signage, replacements or a promotion will produce incremental revenue.

## F. Opportunity Register and feasible investment strategies

{table(['Opportunity','Target','Historical scale (not treatment benefit)','Management priority'],opp_rows)}

{table(['Feasible strategy','Cash spend','Retained','Low net','Base net','High net'],portfolio_rows)}

The ten-machine purchase interpretation costs $220,000 and violates the budget. The feasible replacement comparator uses ten low-earning machines still active on June 30, not retired machines or fictitious available targets. New-title effects and old-contract termination savings are unknown. Full purchase costs and all lease recurring eligible days are charged; no lifetime asset credit is invented within 30 days.

{portfolio_details}

### Why the financial choice beats the replacement proposal

The ten-active-machine lease comparator spends **{usd(replacement['cost'])}** for 16 eligible days and has modeled base net **{usd(replacement['scenarios']['base']['net'])}**, after planned downtime and displacement. Ten outright purchases exceed the budget. Raw earnings do not establish that replacement will improve property contribution; location, exposure, reliability and luck remain competing explanations. The paid financial runners-up are:

{table(['Portfolio keys','Spend','Low net','Base net','High net'],runner_rows)}

The first cash break-even boundary across portfolios with positive base benefits is **{a['search']['firstSpendingBoundary']['positiveBenefitMultiplier']:.6f}×** the existing positive benefit assumptions, for **{', '.join(a['search']['firstSpendingBoundary']['keys'])}**. Hold action costs, negative effects, opportunity debits, eligible days, displacement and overlap fixed while scaling all positive base benefits together. At equality the cost tie-break favors cash; above it a paid portfolio can become preferable. This is a sensitivity boundary, not a treatment-effect estimate. Individual action details above show exact financial bases and net-effect hurdles; surveys and inspections have no invented monetary information value.

### July monitoring and approval gates

{table(['Priority / target','Monitor using existing routine records','Condition for additional paid spending'],monitor_rows)}

Use weekly operational reviews and pre-register any subsequently funded pilot. Forecasts inform calendar/scheduling context, not intervention ROI. Do not count catalog inspections or pilots as free work in the cash plan. Approval requires credible incremental property contribution above full cost plus outage opportunity, viable eligible days, displacement/harm checks and the catalog constraints, or an explicit decision to fund the separate learning objective.

### Candidate generation and optimization audit

Bundles include the payout target, persistent recurrent-fault targets with ≥84 active days, Back Forty access trial, a controlled comp pilot, floor-wide comp scenario, highest-fault manufacturer sweep, one/two/three distinct technician shifts, one/three/ten eligible leased replacements, one purchase, a vacancy move, matched-configuration pair swap, equal-size whole-bank swap, a promotion and survey. A broad survey is compared but not treated as a substitute for a controlled causal policy test. Candidate target selection is documented rather than pretending all machine/action/location possibilities were optimized.

Enumerate every combination with ≤3 distinct action types, then validate budget, quantity, all target membership, same-machine conflicts, comp incompatibility, unique destinations, vacated occupancy, complete-bank destination grouping, lead/downtime and recurring costs. Preserve cash is a candidate. Independent exhaustive enumeration over the same bundles and a controlled small fixture with a known optimum validate the search.

The financial default maximizes base-scenario net; the risk-sensitive financial option adds the user-selected low-scenario downside limit. Experimental learning separately maximizes covered pre-registered questions, then base net and lower spend, under its $20,000 cap. Equal question coverage and that cap are explicit policies, not learned utility or safety guarantees. The following is **experimental learning-policy sensitivity**, not the financial recommendation:

{table(['Modeled-downside cap','Spend','Low-scenario downside','Questions'],[[usd(f['riskCap']),usd(f['cost']),usd(f['worstDownside']),', '.join(f['channels']) or 'Preserve cash'] for f in a['search']['frontier']])}

## G. Statistical and economic limitations

- No action-specific causal effect is identified from these records. Prospective pilots require controls, pre-registered outcomes and property-wide displacement measurement. Signage has only 20 eligible days; an inconclusive small-effect test is plausible and is not proof of zero.
- Demand and contribution uncertainty are conditional on fitted peer expectations and observed data, not intrinsic quality. Pointwise intervals do not adjust all machine screens simultaneously. History and persistence settings are transparent policies with sensitivity checks.
- The fault-count Poisson policy can be anti-conservative under dependence; quasi-Poisson manufacturer covariance addresses count dispersion only within its model. A source-derived rate association is not a brand defect.
- All supplied costs are partial. Theoretical win minus recorded costs still contains observed-win sensitivity through revenue-share charges; it is not a completely luck-free profitability estimate. Scenario contribution omits unknown marginal cost, tax and overhead; old contract savings are not credited without contractual evidence. High scenarios are not expected returns.
- The 50–150% downtime band is a hypothetical rate sensitivity; the separate historical block-bootstrap interval measures variability, not incremental recoverable profit. Queue, repair and meter durations are not added together.
- Synthetic casino data and draft organizer calibration limit external validity. NOAA/LVCVA/Missouri are separate context, not casino guest facts or features available at the historical prediction origin. Restricted raw source tables and individual identities remain local.
- No July outcomes are present in the challenge data. Proposed actions are evaluated from the June 30 planning origin, regardless of today's calendar date.

## H. Two-minute demonstration plan

0:00-0:15: Open briefing: original ten-low-earner replacement proposal; distinguish exposure, location, cost and luck.\n\n0:15-0:35: Drill into a bank and M-1158; show separate dimensions, support and payout qualifications.\n\n0:35-0:55: Opportunities: recurring manufacturer faults, the noncausal closure association and loyalty pricing; explain why they do not identify an action ROI.\n\n0:55-1:10: Methods: frozen weekday forecast versus constant baseline; demand scheduling context, not treatment profit.\n\n1:10-1:35: Planner: primary {usd(rec['cost'])} spend and {usd(rec['remaining'])} retained, exact base-contribution objective and low/base/high results. Compare the costly ten-lease strategy and paid runners-up. Show the break-even boundary.\n\n1:35-1:50: Select the separate experimental backup: {usd(learning['cost'])}, {usd(learning['remaining'])} retained, $20,000 management downside cap, negative base net and unpriced information. Explain the risk-sensitive financial alternative separately.\n\n1:50-2:00: Open July monitoring/approval gates; demonstrate evidence-backed Gemini retrieval. Disclose synthetic draft data and prospective causal uncertainty. This is a rehearsal plan, not a recorded video.

## I. Reproduction, source register and unresolved risks

Run `npm run data` with the local original sources, `python scripts/write_deliverables.py`, then `npm run verify`. The data command executes base preparation, independent source evidence and catalog-constrained portfolio construction. `npm run start:local` runs the static app and private Gemini endpoint; no hosting or Tiger Data changes were made. Gemini can retrieve new diagnostics/opportunities/portfolios but cannot invent values or override plans.

Required remaining checks are live browser/touch/rendering sign-off where Computer Use is unavailable, deployed-runtime confirmation, prospective effect/power/operational validation, organizer calibration and applicable publisher evidence. A passing build is not proof of causal economics. Historical source-audit status is in SCIENTIFIC_VALIDATION.json. Current recommendation regression and service checks are recorded in FINANCIAL_RECOMMENDATION_VALIDATION.md.

{table(['Source table','Rows read','Parquet SHA-256'],audit_rows)}

### Method references

The multiple-testing policy follows the independence-qualified [Benjamini–Hochberg procedure](https://rss.onlinelibrary.wiley.com/doi/10.1111/j.2517-6161.1995.tb02031.x). Block resampling requires dependence/stability assumptions; see [Politis and Romano, The Stationary Bootstrap](https://doi.org/10.1080/01621459.1994.10476870) for the role of weak dependence (our implementation uses fixed circular blocks, not their random-length algorithm). Chronological evaluation principles are described in the [Alan Turing Institute rolling-origin reference](https://alan-turing-institute.github.io/tea-techniques/techniques/rolling-origin-evaluation/). These references support method definitions, not this property's intervention effects.
'''
write('COMPREHENSIVE_SCIENTIFIC_REPORT.md',report)
write('OPPORTUNITY_REGISTER.md','# Opportunity Register\n\n'+table(['Opportunity','Target','Historical scale','Decision'],opp_rows)+'\n\n'+findings+'\n\nFull algorithms, portfolios and uncertainties: COMPREHENSIVE_SCIENTIFIC_REPORT.md. All financial exposures are historical scales, not causal recoverable values.')

writeup=f'''Management proposes replacing ten low earners. Our expanded Dashboard Royale audit separates utilization, supplied-cost economics, payout behavior, reliability and location before funding a response.

We independently reconcile raw daily/hourly meters, effective placements, sessions, tracked outcomes, loyalty/POS costs and the official catalog. Wagers are {usd(a['totals']['wagers'])}; observed and theoretical win remain distinct. Contribution includes only supplied costs.

Ridgeline accounts for 680 fault tickets; its adjusted fault-rate ratio is {mfr['adjustedRateRatio']:.2f} versus Halcyon. Back Forty's closure-period demand association remains near −31% after game-mix/calendar adjustment, but differing pre-trends prevent a causal claim. The loyalty point-price shift survives composition adjustment. M-1158 is a separately priced inspection candidate after variance and multiple-testing checks; a payout flag is not a defect diagnosis.

The original April-selected weekday forecast remains frozen for May–June: daily-wager MAE {usd(d['model']['mae'])}, versus {usd(d['model']['baselineMae'])} for the constant baseline. Additional rolling-origin models are retrospective research, not a fresh untouched test. Tiger Cloud's hourly explorer reconciles 1,321,908 historical observations for maintenance scheduling; current development CA trust is provisional.

The engine compares {a['search']['feasiblePortfolios']} feasible portfolios from {a['search']['candidateBundles']} declared bundles. The primary financial objective maximizes base-scenario property contribution after catalog cost, eligible days, downtime, displacement and overlap. It selects {usd(rec['cost'])} spending, retaining {usd(rec['remaining'])}; low/base/high net is {usd(rec['scenarios']['low']['net'])}/{usd(rec['scenarios']['base']['net'])}/{usd(rec['scenarios']['high']['net'])}. Effects are assumptions, not probabilities or causal ROI. The downside-constrained financial option adds a management cap. The separate experimental backup spends {usd(learning['cost'])} on two inspections, wayfinding and a controlled loyalty pilot, retaining {usd(learning['remaining'])}, under its {usd(learning['riskCap'])} downside cap. Backup low/base/high nets are {usd(learning['scenarios']['low']['net'])}/{usd(learning['scenarios']['base']['net'])}/{usd(learning['scenarios']['high']['net'])}; information value is unpriced.

Monitor faults, reconciliation, access, loyalty cost and property contribution weekly; approve spending only above documented break-even gates or explicitly fund learning. Pre-register controls, displacement and harm/stop rules; no July outcome is observed. Judges can change periods, investigate banks/guest groups, inspect model validation and trace each proposed action. The grounded Gemini assistant selects deterministic evidence without generating substitute financial values. Reproducible code, independent fixtures, source hashes, methods and limitations accompany the synthetic draft-data application.'''
count=len(writeup.split());assert count<=400,count
write('SUBMISSION.md',f'# Submission draft\n\n## Main write-up\n\n{writeup}\n\nWord count: {count}; maximum 400.\n\n## Two-minute demonstration\n\n'+report.split('## H. Two-minute demonstration plan\n\n')[1].split('\n\n## I.')[0])

claims_path=DOC/'CLAIMS_AND_EVIDENCE.md'
claims=claims_path.read_text(encoding='utf-8').replace('## C8. Preserve cash while buying targeted information','## C8. Historical inspection-only paid-information comparator')
claims=claims.split('\n\n## C10.')[0]+'\n\n## C10. Expanded reliability, benchmark and portfolio audit\n\n'+table(['Claim','Source / exact method','Result','Qualification / decision'],[
 ['Reliability concentration','operations count / active machine-day exposure; config/zone/month/weekday offset Poisson',f'Ridgeline adjusted ratio {mfr["adjustedRateRatio"]:.3f}; 680 tickets','Association, not manufacturer causality; inspect recurrence before broad sweep'],
 ['Closure association survives adjustment','Weighted log wager/hour; date and zone×configuration FE; weekly HAC',pct(a['closureDesign']['models'][0]['duringAssociation']),'Differing pre-trend; no causal signage uplift booked'],
 ['Ranks depend on benchmark question','Exact vs cross-zone and half-window rank correlations',f'{a["benchmarkValidation"]["exactVsCrossZoneSpearman"]:.3f}; {a["benchmarkValidation"]["firstVsSecondHalfSpearman"]:.3f}','Display disagreement and pointwise conditional intervals'],
 ['Portfolio recommendation is policy-conditioned','20 bundles, exhaustive valid ≤3-type combinations; exact catalog constraints',f'{a["search"]["feasiblePortfolios"]} feasible; {usd(rec["cost"])} spend; {usd(rec["remaining"])} retained','Primary maximizes base net; separate experimental backup $13,900 under $20k cap; effects and information value not identified'],
 ['Scheduling respects physical scope','June hourly profiles; relocations 06:00; all-hour fallback if task capacity unverified','Quiet two-hour rule remains 05:00 in later diagnostic','Planning proxy, not causal profit'],
 ])+'\n\nComplete claim/source/formula/result/benchmark/assumption/alternative/sensitivity/limitation/action trace: [comprehensive report](COMPREHENSIVE_SCIENTIFIC_REPORT.md) and [machine-readable audit](SCIENTIFIC_AUDIT.json).\n'
claims_path.write_text(claims,encoding='utf-8')

parameter_path=DOC/'PARAMETER_REGISTER.md';parameters=parameter_path.read_text(encoding='utf-8');marker='\n## Comprehensive decision-engine additions'
parameters=parameters.split(marker)[0]+marker+'\n\n'+table(['Parameter','Type','Decision / reason'],[
 ['Persistence/history','Management screening policy','56 active days, ≥2 months; ceil(2M/3) below-comparison months, min 2; 28/56/84-day support sensitivity; not a failure-probability calibration'],
 ['Contribution burden','Descriptive cohort comparison','Above current-scope median cost/theo plus persistent lower matched contribution; retain positive absolute contribution separately'],
 ['Conditional uncertainty','Resampling policy','Month-stratified circular 7-day blocks, 1,200 source /600 interactive draws, deterministic seed; pointwise conditional intervals only'],
 ['Fault Poisson q','Statistical screening convention','BH .05 across selected-month machines; recurrent/dependent events can invalidate calibration; no defect diagnosis'],
 ['Manufacturer association','Model specification','Offset Poisson; config/zone/month/weekday adjustment; quasi-Poisson covariance; 1e−7 numerical stabilization, not tuned prediction regularization'],
 ['Comparative closure covariance','Weekly dependence convention','Newey–West lag 7 and pre/during/after trend sensitivities; no causal claim'],
 ['Calendar ridge research','Inner validation selected','α=.1/1/10/100 using earlier 14-day folds; default1 for short February training; preserve original frozen model'],
 ['Candidate effects / displacement','Unidentified sensitivity assumptions','Low/base/high specified by action; base retains50%, high75% of positive demand; all negative effects count; no probability weights'],
 ['Experimental downside cap','Management policy','Default $20,000; frontier0/5k/10k/20k/30k. Maximize distinct registered questions, then base net/lower cost. Not data-estimated expected utility'],
 ['Financial selection','Explicit scenario objective','Maximize base property contribution net; tie-break by low net then lower spend. Risk-sensitive alternative imposes management downside cap. No scenario probabilities.'],
 ['Quiet work capacity','Operational planning assumption','At most one target quiet job per eligible day; broader jobs use all-hour debit until capacity verified; relocation boundary fixed06:00'],
 ])+'\n\nThis section supersedes earlier descriptions of inspection-only seeding and all-floor technician pools. Full register and sensitivity results: COMPREHENSIVE_SCIENTIFIC_REPORT.md.\n'
parameter_path.write_text(parameters,encoding='utf-8')

for file in ['METHODOLOGY.md','DATA_SCIENCE_AND_TECHNICAL_REPORT.md']:
    path=DOC/file;text=path.read_text(encoding='utf-8')
    old_notice='> Current analytical supplement: [Comprehensive scientific audit and investment report](COMPREHENSIVE_SCIENTIFIC_REPORT.md) controls the new diagnostic, shift-pool, quiet-scheduling and bounded-learning portfolio methods. Original frozen forecast and accounting metrics are retained.\n\n'
    notice='> Current analytical supplement: [Comprehensive scientific audit and investment report](COMPREHENSIVE_SCIENTIFIC_REPORT.md) covers diagnostics, shift pools, quiet scheduling, primary financial selection and separate experimental learning. Original frozen forecast and accounting metrics are retained.\n\n'
    text=text.replace(old_notice,notice)
    if notice not in text:text=text.split('\n',1)[0]+'\n\n'+notice+text.split('\n',1)[1].lstrip()
    path.write_text(text,encoding='utf-8')
disclosure=DOC/'AI_DISCLOSURE.md';text=disclosure.read_text(encoding='utf-8');extra='\n\nThe comprehensive pass used Codex to implement independent Parquet-source auditing, numerical fixtures, conditional resampling, comparative/Poisson models, retrospective nested forecast diagnostics, catalog-constrained bundle search and the written learning policy. No original records were altered to create signals. Candidate effect percentages and the downside cap are stated assumptions, not AI-estimated causal effects. Gemini only selects verified read-only evidence and cannot override the engine.\n'
if extra not in text:disclosure.write_text(text+extra,encoding='utf-8')
validation_path=DOC/'VALIDATION.md'
validation=validation_path.read_text(encoding='utf-8')
validation=validation.split('\n## Comprehensive scientific verification')[0]
validation+='\n## Comprehensive scientific verification\n\nThe original comprehensive pass completed 132 independent source-to-display checks and 99 automated tests (11 Python, 47 Node, 41 simulated-DOM UI). TypeScript and the production build passed. The original headline facts and complete frozen forecast equal the pre-change archive. Real Gemini HTTP requests retrieved the new portfolio and machine diagnostics with evidence; key-exposure checks passed. See [SCIENTIFIC_VALIDATION.json](SCIENTIFIC_VALIDATION.json), [SCIENTIFIC_LIVE_CHECK.json](SCIENTIFIC_LIVE_CHECK.json) and the [comprehensive report](COMPREHENSIVE_SCIENTIFIC_REPORT.md). For the subsequent financial-default change and current tests, see FINANCIAL_RECOMMENDATION_VALIDATION.md. HTTP_CHECKS.json separately records static-resource smoke tests. Real browser rendering/touch and public deployment remain unverified.\n'
validation_path.write_text(validation,encoding='utf-8')
historical_path=DOC/'ANALYTICS_AND_COPILOT_VALIDATION.md'
historical=historical_path.read_text(encoding='utf-8')
historical_notice='> This records the earlier targeted pass. Current scientific and live-service verification: [SCIENTIFIC_VALIDATION.json](SCIENTIFIC_VALIDATION.json) and [comprehensive report](COMPREHENSIVE_SCIENTIFIC_REPORT.md).\n\n'
if historical_notice not in historical:
    historical=historical.split('\n',1)[0]+'\n\n'+historical_notice+historical.split('\n',1)[1].lstrip()
    historical_path.write_text(historical,encoding='utf-8')
financial_disclosure='\n\nThe financial-default revision used Codex to separate the base-contribution financial objective, management downside constraint and experimental-learning objective; add break-even/monitoring gates; preserve saved plans; and test selection with known-optimum fixtures. Existing effect assumptions, action prices, forecasts and historical numerical findings were preserved. No scenario probabilities or causal treatment estimates were invented.\n'
text=disclosure.read_text(encoding='utf-8')
if financial_disclosure not in text:disclosure.write_text(text+financial_disclosure,encoding='utf-8')
import runpy
runpy.run_path(str(ROOT/'scripts/sync_sponsor_docs.py'),run_name='__main__')
for path in DOC.iterdir():
    if path.is_file():shutil.copyfile(path,ROOT/'public/docs'/path.name)
print(f'Scientific report generated; {len(a["checks"])} checks; submission {count} words; recommended spend {usd(rec["cost"])}.')
