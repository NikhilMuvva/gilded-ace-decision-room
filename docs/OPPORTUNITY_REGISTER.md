# Opportunity Register

| Opportunity | Target | Historical scale | Decision |
| --- | --- | --- | --- |
| Manufacturer reliability concentration | Ridgeline | $118,386.72 Observed six-month direct repair cost | Investigate recurring faults before a broad sweep |
| Access and location demand opportunity | Back Forty | $259,045.20 June-based 20-day zone theo baseline (not recoverable loss) | Bounded prospective test |
| Point-price change warrants a controlled policy test | Whole-property loyalty program | $32,972.80 Observed June redeemed economic cost | Test before a floor-wide rate change |
| Accumulated payout exception | M-1158 | $36,164.75 Observed residual magnitude (not recoverable loss) | Targeted information purchase |
| Lease burden and replacement economics | M-1212 | $50,446.39 Observed six-month supplied costs | Defer replacement without stronger evidence |
| Queue opportunity is smaller than full downtime | Technician shifts | $25,964.60 Six-month queue theo proxy (not causal recovery) | Compare full-recovery ceiling with cost before staffing |
| Schedule work in lower-demand hours | Local hour 5:00 versus 20:00 peak | $30.06 Observed hourly theo-rate difference per machine | Use as a scheduling condition on every action |

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

Full algorithms, portfolios and uncertainties: COMPREHENSIVE_SCIENTIFIC_REPORT.md. All financial exposures are historical scales, not causal recoverable values.
