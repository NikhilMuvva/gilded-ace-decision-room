# Claims & Evidence

All casino results describe The Gilded Ace, a fictional property. Dataset: `0.9.0-draft`, January–June 2025. These are computed outputs, not results about a real casino. Reproduce with `python scripts/build_data.py` then `python scripts/write_deliverables.py`. The upstream table hashes are in `source-inventory.json`; machine calculations are in `machine-audit.csv`.

## C1. Raw earnings are an inadequate replacement rule

- **Tables / calculation:** `prepared_daily_view`, active rows; group by machine and sum `house_win_usd`, ascending. Join the last in-window effective zone. `9/10` last appear in Back Forty. IDs: M-5076, M-1158, M-1120, M-1118, M-1238, M-1181, M-1035, M-1179, M-1017, M-1265.
- **Result:** No machine has whole-window theo below 80% of its leave-machine-out matched peer benchmark. That is a descriptive screen, not proof that every machine is good. Exposure includes active scheduled time and availability, and theo removes observed payout luck from the demand metric.
- **Competing explanation tested:** Game configuration, month, weekday and zone are matched; the target machine is excluded from its peer reference. Replacement and retired machine exposure is handled by active rows and hours. `game_math` supplies the payout variance instead of assuming low hold implies a fault.
- **Limitation:** Zone matching deliberately conditions on location. It cannot separate a machine's intrinsic demand from all unrecorded within-zone position effects. A low index is not a causal replacement estimate. Rare game/zone cells fall back to configuration/month/weekday peers below 24 peer-hours.
- **Decision:** Do not replace ten machines based on raw win.

## C2. Back Forty weakened during the access disruption

- **Tables / calculation:** `floor_walkways` closure interval March 3–April 7, exclusive end. `prepared_daily_view`: ratio of summed coin-in to available hours in Back Forty vs the remaining floor, before and during closure. `(Back_during/Back_before)/(Other_during/Other_before)-1`.
- **Result:** Relative wager-rate change -30.77%. Before: Back Forty $134.55/hour, other floor $203.92/hour. During: $96.25 vs $210.71. After reopening: $124.14 vs $195.61.
- **Competing explanations tested:** Contemporaneous other-floor rates adjust for shared seasonality. Optional event-day comparisons match non-event month/weekday demand. Zone counters use coverage, never missing-as-zero. Four observed moves are audited with pre/post rates and matched indices; they do not provide a randomized relocation trial.
- **Limitation:** A ratio-of-ratios association is not causal difference-in-differences identification. Parallel trends are not established. Local game mix, events, and within-zone traffic can differ.
- **Decision:** Consider a controlled access/wayfinding experiment rather than assuming a replacement will fix location.

## C3. One negative payout exception supports an inspection

- **Tables / calculation:** `machine_day.sum_bet_squared` (cents²) × `game_math.payout_multiplier_variance` / 10,000 gives dollar² variance, summed by machine. `z = (sum house win - sum theo)/sqrt(sum variance)`. Two-sided normal-tail p-values; Benjamini–Hochberg adjustment across all 310 machines for the whole-window result.
- **Result:** M-1158 has z = -4.570, q = 0.00151. There are 1 negative residual flags at 5% FDR. June demand index is approximately 1.021× peers, so low observed win does not also establish weak play demand.
- **Competing explanation tested:** Supplied game volatility and actual bet sizes; multiple testing adjustment. The app recomputes the family across all machines in selected months before floor drilldowns.
- **Limitation:** The normal approximation is imperfect for rare, heavy-tailed payouts; independence and correct configured game mathematics are assumptions. FDR is approximate under these assumptions. No finding of malfunction or wrongdoing is established.
- **Decision:** Spend $1,200 on one inspection of M-1158. Debit two hours of expected opportunity, $21.93; do not book its information value as earnings.

## C4. Downtime represents opportunity, not guaranteed incremental win

- **Tables / calculation:** Active `machine_day.scheduled_seconds - available_seconds`, divided by 3,600. Multiply by leave-machine-out peer coin or theo rate, matching zone/configuration/month/weekday, with the same sparse-cell fallback.
- **Result:** 5,021.08 unavailable machine-hours, $1,012,675.50 forgone wager proxy and $94,331.16 forgone theo proxy. Optional hourly meters reconcile exactly to the daily scheduled downtime. Repair tickets contain 1,377.82 queued hours and 3,556.26 hands-on hours; ticket time is not added to meter downtime.
- **Competing explanation tested:** Separating queued vs repair duration avoids treating every unavailable hour as preventable by staffing. DST uses actual elapsed hours, not 24 × days. Sparse peers are disclosed.
- **Limitation:** Outage timing is not random; guests can switch machines. The peer-rate proxy need not be incremental property demand. A 50–150% rate sensitivity is a scenario, not a statistical confidence interval; zero incremental gain remains possible.
- **Decision:** Compare marginal recoverable theo with catalog costs before adding technicians or maintenance sweeps.

## C5. Tracked outcomes are concentrated and have the player sign

- **Tables / calculation:** `player_period`; regroup by player across the selected contiguous months before summing, ranking, or computing ahead rates. Only gamblers with positive tracked wagers are in ahead/concentration denominators; other accounts stay in activity counts.
- **Result:** 96,559 tracked gamblers wagered $163,804,869.65, received $148,219,409.05, and netted -$15,585,460.60. 15,504 (16.06%) finished ahead. Top 10% by wagers account for 63.97% of tracked wagers. Separately, the top 10% by positive gaming loss account for 56.10% of positive losses.
- **Competing explanation tested:** Do not equate wagers with deposits or payouts with profits. Repeated monthly identities are deduplicated across the period. Wager and loss rankings use separate denominators.
- **Limitation:** Tracked carded play excludes uncarded gaming, including possible uncarded activity by card holders. Person-level outcomes are incomplete.
- **Decision:** Report outcomes honestly; do not target high-loss or vulnerable players to increase their play.

## C6. Loyalty economics changed even after an item/tier mix check

- **Tables / calculation:** Each `loyalty_ledger` redemption joins one-to-one to `fnb_transactions` via `redeemed_pos_id`. Ledger economic cost equals linked POS cogs. UTC redemption timestamps convert to Los Angeles wall time, subtract six hours, then group by gaming month.
- **Result:** Economic cost $190,669.30, face value $682,749.50. Weighted realized points per face dollar decline from 13.851 in January to 5.710 in June. With January face-dollar weights fixed across 22 item × tier cells having at least 20 redemptions every month, the corresponding standardized rates are 13.904 and 6.513. The break occurs in May.
- **Competing explanation tested:** Holding item and tier mix fixed retains the shift. Every ledger redemption and cost reconciles to POS. Subtracting economic comp cost again would double-count cogs.
- **Limitation:** Standardized cells are a supported subset. This does not identify the effect on guest behavior, explain all points liability, or establish that lower point prices caused more redemptions.
- **Decision:** Use a controlled comp-policy pilot before a broad change; preserve current funds until its value is justified.

## C7. A simple time-series forecast improves calendar planning

- **Tables / calculation:** `property_day.coin_in_usd` only. Inner training Jan–Mar / validation April selects weekday mean vs trailing-eight-week weekday mean. Refit Jan–Apr and freeze all May–June predictions. Compare constant Jan–Apr mean; metric is daily wager MAE.
- **Result:** Weekday mean MAE $68,698.55; constant baseline $218,258.10; reduction 68.52% over 61 future gaming days. Paired seven-day circular block bootstrap, 2,000 repetitions, seed 2026: 95% interval for MAE improvement $125,071.79–$172,698.13 per day.
- **Competing explanation tested:** Inner validation rejects choosing a recent-only weekday pattern; the baseline uses the same frozen training window. No test-day lags or later external revisions are features.
- **Limitation:** One synthetic series, one holdout, no independently validated July performance. The interval describes error improvement, not a prediction interval. Forecasts concern wagers, not net contribution or staffing response.
- **Decision:** Schedule non-urgent work around predictable weekday peaks; do not treat a quiet day as evidence that a promotion is profitable.

## C8. Historical inspection-only paid-information comparator

- **Calculation / source:** `action_catalog`; cost = quantity × [one-time cost + recurring/day × max(0,30−lead)] + explicit incremental comp budget. Full fixed package and purchase costs are charged. Inspect M-1158: $1,200, one-day lead, 29 eligible days, 120 minutes downtime. Preserve $98,800. Scenario net after the inspection and downtime debit is -$1,221.93, before unpriced information value.
- **Alternatives:** The interactive planner includes every paid catalog action, ≤3 action types, distinct valid targets, quantities, same-machine conflicts, comp-policy incompatibility, 5–20 comp points/dollar, vacant relocation destinations, and whole-bank grouping. Technician benefit is capped by the shared historical queue pool. Bank downtime is conservatively treated as 480 minutes per affected machine. Demand benefits are not stacked; only the largest assumed demand-action gain is retained. Overlapping technician/preventive recovery also uses the larger gain.
- **Uncertainty:** All effect sliders start at zero. Their rates are user assumptions applied to observed bases, not estimated treatment effects. The subset comparator exhaustively evaluates the ≤8 subsets of the configured actions at their configured quantities/targets; it is not a global causal optimizer. Information value, displacement, long-term lease commitments and lifetime asset value are not identified.
- **Measurement:** Pre-register primary theo per available hour and machine availability; log inspection findings, settings and meter reconciliation. Use matched controls or randomization, watch floor-wide spillover and economic comp cost, set safety/guest-protection constraints, and stop if no supported improvement in 30 days. Do not remove a correct machine simply because a 30-day luck residual remains negative.

## C9. Independent parameter review supports stable methods, not extra flags

- **Source / reproduction:** `scripts/audit_algorithms.py` reads original CSV.gz tables independently of the Parquet production pipeline. `ALGORITHM_AUDIT.json` records input SHA-256 and 16 executed checks; `PARAMETER_REGISTER.md` identifies policies, fixed requirements and sensitivity assumptions.
- **Result:** The 24h peer rule falls back on 307/55,092 active machine-days; minimum whole-window index is 0.834334. Loyalty common cells cover 98.9256% of January face value. Adjacent 35-day closure comparison is −30.5088%. These support keeping the current peer, loyalty and forecast methods.
- **Change:** Replace the uncalibrated 0.80 failure label with continuous score, scope-relative rank/percentile and exposure/support; retain the 5% payout policy. Add descriptive robustness diagnostics without changing primary metrics or the frozen forecast. Every configured action now shows zero-effect net and break-even conditions; information benefits remain unpriced.
- **Limitation:** Variance multipliers are hypothetical, descriptive resampling is not causal recovery, and later candidate comparisons do not make the already-examined May–June holdout pristine. No tail distribution can be identified from supplied second moments alone.


## C10. Expanded reliability, benchmark and portfolio audit

| Claim | Source / exact method | Result | Qualification / decision |
| --- | --- | --- | --- |
| Reliability concentration | operations count / active machine-day exposure; config/zone/month/weekday offset Poisson | Ridgeline adjusted ratio 3.563; 680 tickets | Association, not manufacturer causality; inspect recurrence before broad sweep |
| Closure association survives adjustment | Weighted log wager/hour; date and zone×configuration FE; weekly HAC | -31.51% | Differing pre-trend; no causal signage uplift booked |
| Ranks depend on benchmark question | Exact vs cross-zone and half-window rank correlations | 0.337; 0.745 | Display disagreement and pointwise conditional intervals |
| Portfolio recommendation is policy-conditioned | 20 bundles, exhaustive valid ≤3-type combinations; exact catalog constraints | 968 feasible; $0.00 spend; $100,000.00 retained | Primary maximizes base net; separate experimental backup $13,900 under $20k cap; effects and information value not identified |
| Scheduling respects physical scope | June hourly profiles; relocations 06:00; all-hour fallback if task capacity unverified | Quiet two-hour rule remains 05:00 in later diagnostic | Planning proxy, not causal profit |

Complete claim/source/formula/result/benchmark/assumption/alternative/sensitivity/limitation/action trace: [comprehensive report](COMPREHENSIVE_SCIENTIFIC_REPORT.md) and [machine-readable audit](SCIENTIFIC_AUDIT.json).

## C11. Historical hourly operations and sponsor evidence

**Executed development result:** Tiger Cloud 2.31.0 contains 1,321,908 source-bound historical hours. All 55,092 active machine-days reconcile with zero meter differences; source/daily theo tolerance is 0.000001 cent, integer cents/seconds exact. Historical zone/configuration comes from effective placements, not current machine location. Actual reader privileges deny UPDATE (42501), and Cloud-backed local HTTP queries pass. CAGG output equals raw output; observed five-run Cloud median ratios are 7.104× / 6.019× / 3.506× across full property / Back Forty / March weekends. See TIGER_DATA_SETUP.md and the TIGER_* JSON records. This is a maintenance-disruption proxy, not an action ROI estimate. The owner authorized provisional development CA trust; independent confirmation and public endpoint checks remain separate. No production Gemini or domain-prize completion is inferred.
