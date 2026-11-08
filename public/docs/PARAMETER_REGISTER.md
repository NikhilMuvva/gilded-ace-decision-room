# Parameter register and change decisions

This register distinguishes challenge requirements, statistical policies, validation-selected settings and hypothetical sensitivity assumptions. Reproduce the independent audit with `npm run audit:algorithms`; its implementation reads CSV.gz sources and does not import the production pipeline. `ALGORITHM_AUDIT.json` records input hashes, checks and aggregate results. The production `dashboard.json` was not rebuilt: verified base calculations and frozen predictions are unchanged.

Local manifest and upstream dataset reference were checked on November 7, 2026: both identify `0.9.0-draft`. No newer source version was observed. This does not certify that every remote file has an unchanged hash or resolve organizer calibration/publication issues. See the [official dataset reference](https://raw.githubusercontent.com/tamu-datathon-org/dashboard-royale/main/reference/DATASET.md).

| Parameter | Classification | Original value / evaluation period | Evidence and decision |
| --- | --- | --- | --- |
| Source period and fictional scope | Challenge-fixed | Jan 1–Jun 30, 2025, draft 0.9.0 | Keep. 56,110 machine-days; exclude 1,018 off-floor rows. All 55,092 active rows retained. |
| Gaming day, units, exposure | Challenge-fixed | 06:00 Los Angeles; integer cents / displayed USD; actual meter seconds | Keep. DST gaming date March 8 is 23 elapsed hours. Ratio-of-sums and carded/all-play separation unchanged. |
| Peer matching | Statistical modeling policy | Zone, game configuration, month, weekday; target machine excluded | Keep as a retrospective comparison, not a relocation counterfactual. |
| Minimum local peer support | Statistical modeling policy with sensitivity check | 24 available peer-hours, selected months | Keep. 307/55,092 rows (0.557%) use cross-zone fallback. At 96h: 359 (0.652%). Whole-window minimum and quantiles unchanged. A nominal 0h cutoff still needs fallback for zero denominators: 307 rows have no zone-peer exposure. |
| Low-performance threshold | Uncalibrated descriptive policy, retired from UI classification | Index <0.80 | Remove failure/review classification based on this cutoff. Whole-window minimum 0.834334; p05 0.903966; p10 0.920658. Show score, scope-relative rank/percentile, active exposure and support instead. Percentiles are descriptive and never force a fixed number of defective machines. Historical documents retain the original screen result with qualification. |
| Map bands | Descriptive presentation policy | <0.95× / 0.95–1.05× / >1.05× | Keep as visual relative-demand bands only; no statistical decision boundary. |
| Payout statistical family | Statistical policy | Two-sided normal tails from supplied bet² × variance; BH q<0.05 and negative residual; all machines in selected months before floor filters | Keep. M-1158 z −4.570146, q 0.001510895 independently reproduced. Normal approximation and independence are assumptions. Full-window flag accumulates six months; Jan–Mar, April and May–June subsets are not separately significant after adjustment. |
| Payout uncertainty | Sensitivity assumption, not calibrated model | Variance multipliers 1, 1.25, 1.5 and 2 | Add diagnostics without changing flags/policy. Multipliers explore how extra variance weakens evidence; they do not fit heavy tails or serial dependence. Supplied second moments alone do not identify tail distributions. Volatility-group z means/SDs are descriptive and not held-out calibration. |
| Walkway comparison | Retrospective design policy | Broad pre-period; closure Mar 3–Apr 7, exclusive end | Keep −30.7719%; add adjacent 35-day pre-period −30.5088%. Neither identifies causality or establishes parallel trends. |
| Relocation comparison window | Retrospective design policy with sensitivity | 28 days before and after | Keep primary 28d; add 14/21/28d for all four moves. M-1152 ratios: 2.310× / 2.162× / 2.266×. No general causal uplift inferred. |
| Downtime rate band | Sensitivity assumption | 50–150% of matched-peer opportunity rate | Keep labeled hypothetical. It is not a confidence interval or proven recoverable loss. Zero incremental property benefit remains possible. |
| Downtime proxy resampling | Descriptive resampling policy | Circular seven-day blocks; 5,000 draws; seed 2026, fixed Jan–Jun | Add separately: approximately $83,234–$106,400 for historical proxy total variability. Small difference from the external audit's interval reflects resampling choices/seed. Neither interval measures incremental profit or causal recovery. |
| Loyalty supported cells | Statistical modeling policy with sensitivity | ≥20 redemptions per item × tier in every month; January face-dollar weights | Keep. 22 cells cover 98.9256% of January face value; standardized points/$ 13.903953 → 6.513178. Minimum counts 1/5/10/20/30/50/100 retain June/Jan ratio near 0.468. Cost reconciles one-to-one to POS cogs, counted once. |
| Forecast candidates and selection | Empirically selected on allowed validation | Jan–Mar train, April select: weekday mean versus recent-56d weekday mean | Keep weekday mean: April MAE $40,715 versus $55,887. Later diagnostic candidates (constant $203,431; weekday median $44,016; five-pseudo-day shrinkage $50,636) do not change the original rule. |
| Forecast final evaluation | Fixed chronological validation policy | Refit Jan–Apr; freeze 61 May–Jun predictions | Keep original MAE $68,699 vs $218,258 baseline (68.52% reduction). This holdout has already been examined; new candidates cannot call it pristine. Do not switch to a median based on its later test performance. Future reselection needs new untouched data. |
| Forecast interval | Resampling policy | Paired circular seven-day blocks, 2,000 draws, seed 2026 | Keep. Interval covers MAE difference, not prediction outcomes, action effects or ROI. |
| Budget, types, quantities, lead and downtime costs | Challenge-fixed | $100,000; July 1–30; ≤3 action types; catalog limits and incompatibilities | Keep financial functions and validation unchanged. No chat action can edit entries, buy anything or apply navigation without a user click. |
| Planner benefit and zero effect | Sensitivity assumption | User-controlled effect, initially 0%; June bases | Show break-even and explicit zero-effect net for every configured action. Inspection information value remains unknown: $1,200 plus about $22 expected downtime must be covered by improved future decisions, not fabricated earnings. |
| Planner subset comparison | Engineering scope / decision rule | Up to eight subsets of current ≤3 configured entries | Keep; explicitly not globally optimal catalog/target/location search. Overlap caps unchanged. Pre-register pilot/control, stop rules and floor-wide displacement checks. |

## Risk-ranked change list

1. High interpretation risk: remove the uncalibrated low-performance classification; qualify six-month payout accumulation and observed holdout reuse. No numeric model change.
2. Medium interpretation risk: expose support, loyalty coverage, adjacent closure and move-window diagnostics; keep downtime scenario and resampling meanings separate.
3. Decision support: show zero-effect net and information-value break-even condition; offer quieter-weekday maintenance timing only as a scheduling heuristic.
4. Optional Gemini layer: restrict it to bounded evidence selection over tested read-only calculations. API/physical-browser/public deployment checks remain distinct from numerical verification.

## Reproduction limits

The independent audit uses source CSVs; the production pipeline uses Parquet. Previous source-integrity checks compare both formats. No player identifiers, redemption rows or restricted real-source tables are published in audit output. There is no inferred causal ROI. The seed and exact resampling scheme are recorded so displayed intervals can be reproduced rather than matched by tuning.

## Comprehensive decision-engine additions

| Parameter | Type | Decision / reason |
| --- | --- | --- |
| Persistence/history | Management screening policy | 56 active days, ≥2 months; ceil(2M/3) below-comparison months, min 2; 28/56/84-day support sensitivity; not a failure-probability calibration |
| Contribution burden | Descriptive cohort comparison | Above current-scope median cost/theo plus persistent lower matched contribution; retain positive absolute contribution separately |
| Conditional uncertainty | Resampling policy | Month-stratified circular 7-day blocks, 1,200 source /600 interactive draws, deterministic seed; pointwise conditional intervals only |
| Fault Poisson q | Statistical screening convention | BH .05 across selected-month machines; recurrent/dependent events can invalidate calibration; no defect diagnosis |
| Manufacturer association | Model specification | Offset Poisson; config/zone/month/weekday adjustment; quasi-Poisson covariance; 1e−7 numerical stabilization, not tuned prediction regularization |
| Comparative closure covariance | Weekly dependence convention | Newey–West lag 7 and pre/during/after trend sensitivities; no causal claim |
| Calendar ridge research | Inner validation selected | α=.1/1/10/100 using earlier 14-day folds; default1 for short February training; preserve original frozen model |
| Candidate effects / displacement | Unidentified sensitivity assumptions | Low/base/high specified by action; base retains50%, high75% of positive demand; all negative effects count; no probability weights |
| Learning downside cap | Management policy | Default $20,000; frontier0/5k/10k/20k/30k. Maximize distinct registered questions, then base net/lower cost. Not data-estimated expected utility |
| Quiet work capacity | Operational planning assumption | At most one target quiet job per eligible day; broader jobs use all-hour debit until capacity verified; relocation boundary fixed06:00 |

This section supersedes earlier descriptions of inspection-only seeding and all-floor technician pools. Full register and sensitivity results: COMPREHENSIVE_SCIENTIFIC_REPORT.md.
