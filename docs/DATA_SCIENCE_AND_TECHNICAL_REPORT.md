# Dashboard Royale: data science, metrics, and technical implementation

> Current analytical supplement: [Comprehensive scientific audit and investment report](COMPREHENSIVE_SCIENTIFIC_REPORT.md) controls the new diagnostic, shift-pool, quiet-scheduling and bounded-learning portfolio methods. Original frozen forecast and accounting metrics are retained.

## Purpose and how to read this report

The Gilded Ace dashboard helps casino management decide whether poorly earning machines should be replaced, investigated, moved, or left alone. It also explains demand, downtime, tracked guest outcomes, loyalty costs, and a proposed 30-day action budget.

This report describes **what the current implementation actually computes**. It is organized around the decisions a manager needs to make, followed by the programming architecture and a function-by-function guide. The source of truth for the calculations is [`scripts/build_data.py`](../scripts/build_data.py) and [`src/lib.mjs`](../src/lib.mjs). The interface starts in [`src/main.tsx`](../src/main.tsx), with application state in `src/Workspace.tsx` and page composition in `src/Views.tsx`. The [operational redesign report](OPERATIONAL_REDESIGN.md) documents the current frontend modules and map geometry functions; the analytical methods below remain unchanged.

The casino, machines, and guests are **fictional**, and their operational data is synthetic. The six-month results below describe the supplied `0.9.0-draft` dataset for January through June 2025. NOAA weather data shown for context is real and is identified separately. Results and algorithms can change if the organizers release different data or the code is updated. The source release is marked draft and lacks final organizer calibration approval.

The dashboard uses five different kinds of numbers:

1. **Measured or supplied values:** wagers, payouts, available hours, repair timestamps, and recorded comp costs. These are measurements within the synthetic challenge dataset.
2. **Derived accounting values:** for example, wagers minus payouts, or available hours divided by scheduled hours.
3. **Retrospective estimates and comparisons:** for example, peer-adjusted performance and the opportunity associated with downtime. These rely on an explicit comparison and are not directly observed alternate histories.
4. **Statistical tests and forecasts:** payout anomaly scores and the weekday forecast, each with stated assumptions and validation.
5. **Scenario assumptions:** the action planner applies user-selected hypothetical improvements to historical baselines. It does not know what a proposed action will actually cause.

## 1. Data preparation and measurement rules

### What records are used

The main analysis starts with one row per machine per gaming day from `prepared_daily_view`. It joins the corresponding `machine_day` record by machine and date to obtain scheduled seconds and the sum of squared bets, then joins `game_math` by game configuration to obtain payout variance. Additional tables cover floor positions, traffic, walkway closures, machine placements, repairs, tracked guests, loyalty redemptions, food and beverage transactions, events, and the official action catalog. The optional hourly machine table is used for the timing audit. The exact file and column definitions are documented in the supplied official data dictionary.

The raw prepared view contains **56,110 machine-day rows**. Of these, **1,018 are off-floor** because the machine was not yet installed or had already been retired. The pipeline excludes those rows from machine performance comparisons, leaving **55,092 active machine-day rows**. Treating the excluded rows as zero performance would unfairly penalize machines with shorter exposure.

### Time and money conventions

- A casino gaming day runs **6 a.m. to 6 a.m. Las Vegas local time**. Timestamps for traffic and loyalty redemptions are converted from UTC to local wall time, then shifted by six hours to obtain the gaming date.
- Scheduled hours use the supplied elapsed seconds. This matters on March 8, 2025, which has a **23-hour** gaming day because of daylight saving time. A machine's own scheduled time can also differ from the calendar day when it is installed or retired.
- Raw amounts ending in `_cents` are divided by 100 to get dollars. Variance calculated from squared cents is divided by **10,000** to get squared dollars.
- Ratios such as availability and hold use a **ratio of sums**, not a simple average of individual daily percentages. This gives more weight to days with greater relevant exposure.
- The period selector works in **whole months**. Machine and floor metrics respond to month, zone, and bank filters. Guest and loyalty metrics respond to months but do not become zone- or bank-specific. The app labels full-window audits, the fixed forecast holdout, and the fixed July planner separately.

**Why this matters to the user:** Decisions are based on the time a machine actually had to operate and on comparable money units. The same guest is also combined across the selected months before person-level outcomes are calculated.

## 2. Core financial and utilization metrics

| Metric | Calculation | What management learns | Important qualification |
| --- | --- | --- | --- |
| **Coin-in / wagers** | Sum of recorded wagers. | The amount of play flowing through a machine, zone, or floor. | Coin-in includes winnings wagered again; it is not the money guests originally brought to the casino and is not casino revenue. |
| **Payout** | Sum of game payouts returned to players. | How much play was returned through game outcomes. | A payout alone is not player profit; the original wagers must be subtracted. |
| **House win** | Coin-in − payout. | The actual gaming result for the casino. | It can be negative, especially over short periods or volatile games. It is not full business profit. |
| **Player gaming net** | Payout − coin-in. | The same gaming outcome from the player's perspective. | Guest-level results include carded play only. |
| **Observed hold** | Total house win ÷ total coin-in. | The fraction of wagers retained by the house over the selected scope. | Actual hold fluctuates with chance; it is not necessarily the configured long-run house edge. |
| **Theoretical house win, or theo** | Sum of wager × (1 − configured return-to-player). | A long-run expected gaming result for the observed amount and mix of play, less affected by realized payout luck. | It is a mathematical expectation, not guaranteed income or a forecast of a person's exact loss. |
| **Availability** | Sum of available hours ÷ sum of scheduled hours. | The proportion of scheduled machine time during which the machine was available. | A highly available machine may still attract little play. |
| **Occupied hours** | Sum of the recorded time machines had a player seated. | An exposure measure available in the underlying data. | Occupancy is distinct from availability and does not itself measure revenue. |
| **Theo per available hour** | Total theo ÷ total available hours. | Expected gaming contribution per hour the machine was available. | Location, game mix, and guest demand still matter. |
| **Supplied machine costs** | Sum of lease, service, power, and direct repair cost fields. | The machine-related costs supplied by the challenge. | These omit other business expenses; subtracting them does not produce complete net profit. |

For the full six-month synthetic dataset, the floor recorded approximately **$248.91 million in wagers**, **$23.64 million in actual house win**, and **$23.55 million in theo**. These figures answer different questions: volume of play, the realized result, and the result expected from configured game mathematics.

## 3. Machine performance: separating exposure, location, and luck

### Management's raw bottom ten

The pipeline sums actual `house_win_usd` for each machine over active days and sorts the totals from lowest to highest. The resulting first ten reproduce management's proposed replacement list. It then looks at each machine's **last recorded in-window zone**. Nine of those ten were last recorded in Back Forty.

**Why use this metric:** It directly answers what management originally asked and provides an understandable starting point for the investigation.

**What it does not establish:** The last observed zone does not mean the machine spent every day in that zone. Raw totals are affected by time on the floor, availability, location, amount wagered, game configuration, and random payouts. A low rank is a reason to investigate, not by itself evidence that a machine should be replaced.

### Matched peer benchmark and performance index

For every active machine-day, the pipeline builds a peer group with the same:

1. Zone.
2. Game configuration.
3. Month.
4. Day of the week.

It removes **all rows belonging to the target machine** from that comparison group. It then calculates:

```text
peer theo per available hour
    = other machines' total theo / other machines' total available hours

target expected peer theo
    = peer theo per available hour × target's available hours

machine peer index
    = target's total theo / total target expected peer theo
```

If the original group has fewer than **24 peer available hours**, the code falls back to peers matching configuration, month, and weekday across all zones. The target machine is still excluded. Because the reference is built from data across the whole month, it is a **retrospective comparison**. It is not a forecast that would have been available at the beginning of that month.

An index of **1.00** means the machine's theo equals the matched benchmark; **0.80** means it generated 80% of benchmark theo for its actual available hours. The uncalibrated below-0.80 classification has been removed from the interface. Continuous scores, scope-relative ranks/percentiles, active exposure and peer fallback support now describe the comparison. A low percentile is not a probability of failure. For this dataset the six-month minimum is 0.834334; the 5th percentile is 0.903966. See [parameter decisions](PARAMETER_REGISTER.md) and independently recomputed [audit output](ALGORITHM_AUDIT.json).

**Why this method was chosen:** Theo removes the direct effect of the observed payout outcome, available hours account for downtime and differing time on the floor, and matching reduces differences associated with location, configuration, weekday, and month. Leaving out the target prevents its own performance from directly defining its benchmark.

**What it cannot prove:** Matching on zone intentionally compares machines against others in similar locations; it does not reveal what the same machine would have earned in another location. Remaining within-zone placement differences, unmeasured machine characteristics, sparse peer groups, and guest behavior can still influence the index. The 0.80 threshold has no separately estimated confidence interval, and the result does not prove that every machine is performing well.

### Payout luck residual, z-score, and multiple testing

The dashboard separately examines whether a machine's **actual house win** is unusually different from its theo, considering the game's supplied volatility and the wagers placed.

For each machine-day, it estimates payout-result variance using:

```text
daily result variance in dollars²
    = sum of squared bets in cents² × game payout multiplier variance / 10,000

machine residual z-score
    = (total actual house win − total theo)
      / square root of summed daily result variance
```

The square root converts variance into a **standard deviation**. A negative z-score means observed house win was below theo. The larger its magnitude, the more unusual the difference is under the model's assumptions. The pipeline converts the z-score into an approximate **two-sided normal-distribution p-value**. It then applies the **Benjamini–Hochberg procedure** to the p-values for all machines in the selected months, producing adjusted values commonly called q-values. A negative residual with q below **0.05** becomes an inspection flag.

This adjustment matters because examining hundreds of machines makes some unusual-looking results likely even if every machine follows its configured mathematics. The two-sided test allows unusually positive and negative residuals to contribute to the multiple-testing correction; the display flags the negative side for inspection. The testing family is computed across all machines in the selected months before the user drills into a zone or bank.

In the supplied full-window results, **M-1158** has approximately **z = −4.57** and **q = 0.00151**, and it is the one negative residual flagged at the 5% threshold. Its June theo per day is about **1.02 times** its matched June peer expectation, so weak demand and an unusual realized payout outcome are different questions here.

**Why this method was chosen:** Game-specific payout variance and the actual distribution of bet sizes provide a fairer measure of surprise than comparing hold percentages alone. Adjusting across machines reduces the risk of overreacting to random extremes.

**Limitations:** The normal approximation may be inaccurate for rare, heavy-tailed jackpot outcomes. The calculation assumes the supplied configured game mathematics are correct and relies on assumptions about game outcomes and dependence. The stated false-discovery interpretation is therefore approximate. A flag is a reason to check settings and meters; it is **not proof of a broken machine, fraud, or wrongdoing**.

## 4. Demand, floor location, traffic, and events

### Zone demand per available hour

For each zone and month, the dashboard calculates:

```text
zone demand rate = total zone coin-in / total zone available machine-hours
```

The rate is plotted across the selected months and can be restricted by zone or bank. Dividing by available hours makes comparisons less dependent on the number of machines and hours available in each zone.

**Management use:** Identify where play per available machine-hour is increasing or decreasing and select locations for further investigation. This is an intensity measure, not a count of unique visitors or a causal location effect.

### Back Forty walkway closure comparison

The `floor_walkways` table records a closure from March 3 through April 6, with April 7 as the reopening date for the phase grouping. The analysis calculates wager per available hour in Back Forty and in all other zones before, during, and after that period. The main comparison is:

```text
relative change
    = (Back Forty during / Back Forty before)
      / (other floor during / other floor before) − 1
```

Back Forty's rate was approximately **$134.55/hour before** and **$96.25/hour during** the closure; the rest of the floor was approximately **$203.92/hour before** and **$210.71/hour during**. The resulting relative change is **−30.77%**. After reopening, the rates were approximately **$124.14/hour** and **$195.61/hour**, respectively.

**Why use the rest of the floor:** It provides a contemporaneous comparison for changes that might affect the whole property, instead of attributing every change in Back Forty to its walkway.

**What the result means:** Back Forty's rate fell relative to the rest of the floor during the closure. It is an observational ratio comparison, not proof that the closure caused a 30.77% loss. The zones may have had different pre-existing trends, game mix, events, or other changes; the analysis does not establish the parallel-trends assumption needed for a causal difference-in-differences conclusion.

### Traffic sensors

The traffic table supplies counts of sensor crossings and the minutes each sensor was covered. The dashboard calculates:

```text
crossings per covered sensor-hour
    = observed entries / (covered minutes / 60)
```

It does not deliberately replace missing counts with zero. A person can cross a sensor multiple times, and not every guest movement is necessarily captured. Thus the metric is **sensor crossings per covered hour**, not unique visitors.

**Management use:** Check whether a demand pattern is accompanied by a movement pattern, while considering sensor coverage. Traffic remains contextual evidence; it does not establish that a particular guest visited a particular machine.

### Event-day comparison

For each event day, the pipeline finds non-event property days with the same **month and weekday**. It calculates their pooled coin-in per available machine-hour and applies that reference rate to the event day's available hours. The reported comparison is:

```text
event relative rate = summed event-day actual coin-in
                      / summed matched expected coin-in − 1
```

For example, the supplied event audit shows approximately **+22.52%** for Super Bowl weekend relative to its matched non-event comparison. This is a descriptive association, not a return on an event or proof that the event caused extra play. Samples are small, events may overlap, and other differences may exist.

### Machine relocations

For each recorded placement change, the pipeline compares up to **28 days before** and **28 days after** the move. It reports theo per available hour, peer index, zone, and the number of observed days in each period. There are four observed moves in the supplied release; the last has only 21 post-move days.

For example, M-1152's theo per available hour rises from about **$14.00** in Back Forty to **$31.72** in Main Entrance, while its peer index changes from roughly **0.96** to **1.05**. This helps show why the raw change and the matched comparison answer different questions. Four non-random moves do not establish a general relocation effect.

### Weather context

The dashboard summarizes real NOAA airport observations by calendar month: mean daily maximum temperature and total recorded precipitation. These values provide external context and are **not inputs to the forecast**. Calendar weather dates and 6 a.m.–6 a.m. gaming dates do not align exactly. The app does not claim the weather caused casino demand changes.

## 5. Availability, repair operations, and lost-play opportunity

### Measured downtime

The primary downtime calculation is:

```text
unavailable machine-hours = scheduled machine-hours − available machine-hours
```

The full-window total is approximately **5,021.08 machine-hours**. It uses the actual supplied scheduled seconds, including partial operating days and daylight-saving effects. The optional hourly machine table is grouped by local clock hour to show when unavailable time accumulated. In the supplied data, hourly and daily totals reconcile.

**Management use:** Decide when and where availability is poor, and schedule inspections or maintenance when the operational disruption is expected to be lower. The chart by hour is a fixed full-window audit, while the daily and zone charts respond to the selected floor and month filters.

### Opportunity proxy

The pipeline uses the leave-machine-out matched peers described earlier to estimate how much the unavailable time might have produced at a comparable rate:

```text
forgone coin-in proxy = unavailable hours × peer coin-in per available hour
forgone theo proxy    = unavailable hours × peer theo per available hour
```

The full-period proxies are about **$1,012,675 in wagers** and **$94,331 in theo**. The dashboard also displays a **50%–150% peer-rate sensitivity range**, about **$47,166–$141,497** in theo for the full dataset. That range is a manually chosen scenario, **not a statistical confidence interval**.

**Why this method was chosen:** It combines the directly observed amount of downtime with a comparable play rate, producing an interpretable estimate that can be compared with the price of an operational action.

**Limitation:** This is not an observed counterfactual. A guest may play another machine, return later, or not play at all. Downtime may occur at unusually busy or quiet times. The estimated wagers are not profits, and the theo proxy is not guaranteed incremental property revenue; actual incremental benefit could be lower, including zero.

### Repair queue and work duration

For `fault_repair` tickets, the pipeline computes:

```text
queue wait  = work-start timestamp − ticket-open timestamp
repair time = available-again timestamp − work-start timestamp
```

The supplied data has **1,207 fault-repair tickets**, approximately **1,377.82 queued ticket-hours**, **3,556.26 hands-on ticket-hours**, and a **zero-hour median queue wait**. Ticket durations may overlap, so they are not added to the meter-based downtime total. For the technician scenario, each ticket's wait is multiplied by that machine's average matched peer-theo rate; the resulting historical queue opportunity is about **$23,937** over 181 days.

**Management use:** Determine whether a staffing proposal can plausibly affect the queue rather than assuming it prevents all machine downtime. A zero median wait also warns that many tickets already start immediately. The queue opportunity remains an estimate and is not proof that another technician can recover it.

## 6. Tracked guest outcomes and concentration

The `player_period` input covers loyalty-card activity. Before calculating guest results, the pipeline combines all records belonging to the same player across the selected contiguous month range. It prepares all **21 possible contiguous month ranges** in the six-month window. Users can select all tracked guests or one home-region or opening-tier group. Personal player identifiers are used during aggregation but are not published in the dashboard artifact.

| Metric | Calculation | Decision value and qualification |
| --- | --- | --- |
| **Tracked wagers** | Sum of carded coin-in for the selected group and period. | Measures recorded play, including replayed winnings; excludes uncarded play. |
| **Tracked payouts** | Sum of recorded carded game payouts. | Shows returns to tracked players, not their profit. |
| **Tracked player net** | Tracked payouts − tracked wagers. | Communicates the actual recorded outcome from the player side. |
| **Tracked gamblers** | Unique accounts whose combined tracked wager is greater than zero. | Defines the denominator for ahead-rate and concentration statistics. |
| **Accounts with recorded activity** | Unique accounts with a player-period record in scope. | Includes accounts that had non-gaming activity and no positive tracked wager. |
| **Ahead rate** | Tracked gamblers with total player net > 0 ÷ tracked gamblers. | Shows how many tracked players ended the period ahead; exactly zero is not counted as ahead. |
| **Median player net** | Middle value of the selected tracked gamblers' combined net outcomes. | Describes the midpoint of the recorded distribution and is less dominated by extreme outcomes than an average. |
| **Wager concentration** | Sort gamblers by total tracked wagers; calculate cumulative shares for the top 1%, 5%, 10%, 20%, 50%, and 100%. Each count is rounded up to a whole person. | Shows how much recorded play is concentrated among the highest-wagering accounts. |
| **Positive-loss concentration** | For each tracked gambler, take `max(−net, 0)`; rank these nonnegative losses and divide the top 10% total by all positive losses. | Shows concentration of tracked losses. Winners do not offset the denominator, so this differs from a share of net casino win. |
| **Tracked contribution** | Tracked house gaming win + linked POS cash − linked POS cost of goods. | Provides a partial contribution measure. Comp cost is already inside POS costs and is not subtracted a second time. |

For all six months, **96,559** tracked gamblers wagered **$163.80 million**, received **$148.22 million** in game payouts, and had a combined player gaming net of **−$15.59 million**. **15,504**, or approximately **16.06%**, finished ahead on tracked play. The top 10% by wagering accounted for **63.97%** of tracked wagers. Ranked separately by positive loss, the top 10% accounted for **56.10%** of positive tracked losses.

**Management use and responsible interpretation:** These results make the player side of casino accounting visible and show concentration in recorded activity. Carded data does not capture a guest's uncarded play, so the figures do not describe complete individual outcomes or every visitor. The system should not use loss concentration to encourage vulnerable or high-loss guests to gamble more.

## 7. Loyalty economics and the point-price change

### Cost, face value, and reinvestment

The loyalty ledger is joined one-to-one to food and beverage transactions using the linked POS transaction ID. For the supplied release, every redemption links to one POS record, the ledger economic cost equals the linked POS cost of goods, and the total reconciles to property comp cost.

| Metric | Calculation | Meaning |
| --- | --- | --- |
| **Redeemed economic cost** | Sum of ledger economic cost or the matching comp-related POS cost of goods. | The supplied cost incurred to provide redeemed benefits. |
| **Redeemed face value** | Sum of the menu or face value of redeemed benefits. | The listed value of the benefits; not cash revenue or the casino's economic cost. |
| **Comp reinvestment** | Redeemed economic cost ÷ all-play property theo for the same period. | A ratio of benefit cost to expected gaming win. The denominator includes uncarded play, so it is a property-level ratio. |
| **Redemption count** | Count of redemption ledger events. | Activity volume; count alone does not measure economic cost or causal success. |

For the full six months, supplied comp economic cost is approximately **$190,669.30**. It is already included in POS cost of goods. Subtracting both total POS cost of goods and comp cost again would double-count the same expense. The available costs still omit broader overhead and do not establish complete profit.

### Realized points per face-value dollar

The monthly realized point price is:

```text
points per benefit dollar = total points redeemed / total redeemed face value
```

It declined from approximately **13.85 points per dollar in January** to **5.71 in June**. This is a weighted ratio of totals, not an average of each transaction's ratio.

The pipeline also tests whether a changing mix of items or loyalty tiers could explain the shift. It divides redemptions into **item × tier-before-redemption cells**, retains cells with at least 20 redemptions in every month, calculates each cell's monthly points-per-dollar rate, and combines those cell rates using **January face-value weights**. There are **22 qualifying cells**. The standardized value changes from approximately **13.90 in January** to **6.51 in June**, with the break appearing in May.

**Why this method was chosen:** Holding the mixture fixed helps test whether the overall change is solely an artifact of more expensive items or different tiers being redeemed. It is understandable without fitting a complex model.

**Limitations:** The standardized analysis represents only the qualifying cells. It does not establish why the point price changed, how guests responded, whether a policy caused more activity, or the liability associated with unused points. A controlled pilot would be needed before attributing behavioral or financial effects to a policy change.

## 8. Forecasting demand and validating the model

### Purpose

The dashboard forecasts **daily whole-floor wagers** as a planning aid, such as identifying historically busier days when non-urgent maintenance may be more disruptive. It does not forecast profit, the effect of an action, or individual guest behavior.

### Model choices

Two simple time-series specifications are considered:

1. **Weekday mean:** predict a future Monday using the mean of training-period Mondays, a Tuesday using the mean of training Tuesdays, and so on.
2. **Recent eight-week weekday mean:** use the same approach, but compute each weekday's mean using only the most recent 56 days of the training period.

The comparison baseline predicts the **same overall training-period daily mean for every day**, without considering weekday.

**Why these methods:** Casino demand often has strong day-of-week patterns. A weekday mean is easy to explain, uses information available before the forecast, and can be evaluated against a meaningful simpler reference. The recent-window alternative asks whether newer history is more useful without introducing a complex model.

### Time-based validation and leakage prevention

The model selection and test sequence is:

1. Train the two weekday candidates on **January–March 2025**.
2. Compare their mean absolute errors on **April 2025**. The full-training weekday mean wins: approximately **$40,715/day** versus **$55,887/day** for the recent-eight-week version.
3. Refit the chosen model using **January–April**, totaling 120 days.
4. Freeze its predictions and the constant baseline before testing on **May–June**, totaling 61 days.
5. Compare both methods against the actual held-out daily wagers.

```text
mean absolute error (MAE)
    = average of |actual daily wagers − predicted daily wagers|

relative MAE reduction
    = 1 − model MAE / baseline MAE
```

The holdout MAE is approximately **$68,699/day** for the weekday model versus **$218,258/day** for the constant baseline, a **68.52% reduction**. Lower MAE is better, but both quantities are errors in wager dollars, not gains in profit. The model does not update itself using May or June results. It does not use later-published tourism revisions, weather, future repair information, or holdout-day lag values.

### Uncertainty around the model comparison

The pipeline calculates each holdout day's **baseline absolute error minus model absolute error**. It resamples these paired differences using **2,000 circular seven-day block-bootstrap draws**, with a fixed random seed of 2026. A block contains seven consecutive daily differences, wrapping around the 61-day test period when necessary; blocks are sampled until enough days are collected, then truncated to the test length. The 2.5th and 97.5th percentiles of the resampled mean differences give a 95% interval of approximately **$125,072–$172,698 per day** for the average MAE improvement.

**Why use blocks:** Adjacent days may have related errors, and seven-day blocks retain some short-term and weekly dependence that independent daily resampling would discard.

**Interpretation limits:** This interval describes uncertainty in the **difference in average errors** under the resampling method. It is not a 95% interval for next week's wager forecast, future profit, or an action's return. There is only one synthetic property and one future holdout. Performance can change in July or under unusual events, and a weekday average does not explicitly model event spikes.

## 9. Action planner: prices, assumptions, and tradeoffs

### Budget and catalog pricing

The planner uses the official action catalog and a fixed **July 1–30, 2025** horizon, with up to **$100,000** and **three paid action types**. It includes the option of preserving funds. Each action has a one-time price, possible daily recurring charges, a lead time, required downtime, a quantity limit, and possibly an incompatibility group.

```text
operating / benefit days = max(0, 30 − lead days)

30-day unit price = one-time unit price
                    + recurring price per day × operating days

plan budget = sum of (quantity × 30-day unit price)
              + any explicitly entered additional comp budget
```

For example, a replacement lease has a **$2,500** upfront cost, **$55/day** recurring charge, and **14-day** lead. The 30-day planner charges **$2,500 + 16 × $55 = $3,380** for one unit. A purchased machine is charged at its full catalog purchase price, and a fixed technician package is charged in full. The comparison covers only this horizon; longer lease commitments and purchased-asset lifetime value are not modeled.

### Feasibility rules

`validatePlan` checks the action count, recognized action types, integer quantities, quantity limits, valid distinct targets, budget, the 5–20 points-per-comp-dollar limit for a floor-wide policy, and the catalog incompatibilities. It checks that the same machine is not assigned conflicting move or replacement actions, and it prevents a comp policy pilot and a floor-wide comp change from being combined.

For a move, the implementation requires a distinct **currently vacant destination slot** for each affected machine; a whole-bank move must keep the affected bank together in one destination bank. This is a conservative implementation choice: the official catalog also mentions swaps, but the current planner does **not** implement swap-based moves. It assumes the June 30 layout for July planning; a real plan still needs physical and operational confirmation.

### How hypothetical benefits are calculated

All action effect sliders begin at **0%**. The user can test hypothetical percentages; they are not estimated treatment effects and are not promises made by the action catalog.

| Action | Historical base used by the planner | Hypothetical benefit calculation and important limitation |
| --- | --- | --- |
| **Inspect a machine** | June target theo per available hour is used to price the required two hours of disruption. | Information benefit is left unpriced. The planner reports cost and an estimated theo debit, not a predicted inspection discovery. |
| **Add technician shifts** | Full-window estimated queue opportunity divided by 181 days, multiplied by remaining benefit days. | The selected effect is applied per shift; total recovered opportunity is capped at 100% of the shared modeled pool. This does not prove a technician will eliminate the queue. |
| **Preventive maintenance** | June downtime-theo proxy per day for machines of the selected manufacturer(s), times remaining benefit days. | The selected recovery percentage is applied to that base. The catalog's 90-minute interruption is debited for each affected machine. |
| **Wayfinding / signage** | Sum of June theo per day for machines in the selected zone(s), times remaining benefit days. | The selected uplift percentage is applied to this zone baseline. Displacement from other zones and a causal signage effect are not established. |
| **Move a machine or bank** | June theo per day of selected machines, times remaining benefit days. | The selected uplift applies to the target machines' own baseline; the model does not automatically infer improvement from the chosen destination. Required downtime is debited. Bank downtime is conservatively treated as 480 minutes per affected machine. |
| **Lease or buy a replacement** | June theo per day of selected target machines, times remaining benefit days. | A selected uplift is applied to the old target's baseline. The actual new title's performance and long-term value are unknown. |
| **Floor-wide comp change** | June property comp economic cost per day, times remaining benefit days. | The selected cost-saving percentage is hypothetical. The user-entered points rate is checked against the catalog's allowed range, but changing that rate does **not** automatically estimate a behavioral response or savings percentage. |
| **Promotion weekend** | June total daily theo for the active planning machines × two days × number of events. | A selected percentage is treated as incremental; the two-day weekend is a modeling assumption and spillovers are not measured. |
| **Comp pilot or guest survey** | Catalog cost and any separately entered incremental comp budget. | Information value is not assigned a dollar benefit. |
| **Preserve budget** | No action cost. | Cash remains available; this is a valid comparison. |

For an action with an affected machine, the planner estimates a required downtime debit using that machine's **June theo per available hour × required downtime hours**. The basic action-level arithmetic is:

```text
scenario net = assumed gross gain − estimated downtime theo − catalog/action cost
```

For most quantified action types, **break-even effect** is `(cost + downtime debit) / historical benefit base`. For technician shifts, the denominator also accounts for the number of shifts because each shift's slider effect contributes to a shared capped pool. If the required effect is outside the slider's range or exceeds the shared pool's maximum recoverable value, the scenario cannot actually break even within those modeled constraints. Break-even values do not incorporate information value or a causal response estimate.

To avoid simply adding potentially overlapping gains, the portfolio calculation retains the larger modeled benefit of technician and preventive-maintenance actions if both are present. It also retains only the largest modeled gain among the configured demand actions—moves, replacements, wayfinding, and promotions. These are conservative rules, not empirically estimated overlap percentages; they can understate combined benefits when actions truly affect separate demand.

### How the subset comparator works

The **Compare configured subsets** button checks every subset of the user's configured actions, including preserving the budget. With at most three action types, there are at most **2³ = 8 subsets**. It discards subsets failing the feasibility checks and selects the one with the highest **quantified scenario net**, with zero as the preserve-cash comparison.

It does **not** search every catalog action, target, quantity, or slider value. Those are chosen by the user before the comparison. It also does not monetize information from inspection, surveys, or pilots, so an information-gathering action may be recommended even when the highest quantified short-term net is simply preserving cash.

### Current recommendation and measurement plan

The app's initial recommendation is one inspection of **M-1158**, priced at **$1,200**, preserving **$98,800** of the budget. The catalog specifies a one-day lead and two hours of machine downtime. Based on its June theo rate, the estimated downtime debit is approximately **$21.93**, so the modeled immediate net is approximately **−$1,221.93** before the unknown value of information.

The purpose is to check the paytable, configuration, and meters—not to assume the inspection will discover a defect. Management should document findings, retain the machine if its settings are correct, and only fund broader changes with evidence. For a subsequent location or policy test, pre-register a control group, expected outcome, observation period, and stop rule. Track theo per available hour, availability, property-wide displacement, and economic comp cost. Safeguard guests and avoid interventions designed to intensify losses among vulnerable players.

## 10. Technical and programming implementation

### End-to-end data flow

1. **Original sources:** The supplied official repository is stored locally under `sources/dashboard-royale-main`. The starter folder is reference material. The original inputs are not edited by the pipeline.
2. **Offline Python processing:** `scripts/build_data.py` reads selected Parquet tables with pandas and PyArrow, performs joins, aggregations, peer matching, model validation, and checks with pandas/NumPy, and creates the output artifact. It also inventories the source tables and records hashes.
3. **Static data artifact:** `public/data/dashboard.json` stores prepared machine-day rows, metadata, aggregate guest groups, model results, catalog actions, planning baselines, and quality checks. Machine-day records use compact arrays with a fixed column map. Player-level identities are not included.
4. **Interactive frontend:** React and TypeScript in `src/Workspace.tsx` fetch the JSON once. `src/lib.mjs` filters rows, recalculates machine and floor aggregates, calculates browser-side payout test values, and evaluates action plans. Recharts renders charts in `src/Views.tsx`; `src/OperationalMap.tsx` renders an SVG using supplied floor coordinates and explicit active placements for a selected layout date. That layout date controls placement, while the month filters control machine metric scope.
5. **Static build and optional API:** Vite packages the frontend and local fonts into `dist/`. Core analytics and explicitly labeled offline evidence require only static hosting; no runtime Python, database or authentication service is required. Optional `api/chat.mjs` uses a Node server-side Gemini REST integration to select read-only evidence from the same deterministic functions. The key never enters the frontend. A static-only deployment remains offline; live integration needs the source/serverless package and private configuration.
6. **Documentation and packaging:** `scripts/write_deliverables.py` generates competition documents from the computed artifact. `scripts/package_submission.py` produces allowlisted source and static-site ZIPs that exclude the original source folders and raw publisher tables.

### Python functions and processing blocks

| Function or block | What it does | Why it exists |
| --- | --- | --- |
| `check(name, passed)` | Records a named invariant and raises an error immediately when it fails. | Prevents silently publishing data after a failed accounting or consistency check. |
| `load(name)` | Finds the named Parquet table under the supplied source, requires exactly one match, reads it, and converts suitable non-string object values to numeric. | Centralizes source loading and detects missing or ambiguous inputs. |
| `clean(obj)` | Recursively converts dictionaries, lists, NumPy scalars, timestamps, missing values, and finite numbers into JSON-compatible values; rounds floating values to five decimals. | Makes the output portable and prevents invalid JSON numeric values. |
| `records(df)` | Converts a pandas DataFrame into record dictionaries and passes them through `clean`. | Prepares small tables for the frontend. |
| `write(path, data)` | Writes compact JSON with non-finite values disallowed. | Produces a portable static artifact and makes serialization failures visible. |
| Active-row preparation and validated merges | Removes off-floor rows; joins machine-day on machine/date and game math on configuration using one-to-one or many-to-one checks. | Enforces the intended grain and guards against duplicated rows from an accidental join. |
| Peer-reference block | Computes peer sums by matching keys, subtracts each target machine's contributions, uses a fallback for sparse groups, and computes expected theo and downtime proxies. | Produces interpretable matched comparisons without allowing a machine to define its own reference. |
| `predict(training, future, recent=False)` | Calculates weekday means from all training rows or the most recent 56 days, then maps each future date's weekday to its training mean. | Implements both candidate time-series models without test-period features. |
| Inner validation, holdout, and bootstrap blocks | Select a weekday specification using April, refit through April, score May–June against a constant baseline, and resample paired error differences in seven-day blocks. | Separates model selection from the later performance test and estimates uncertainty in the comparison. |
| Guest aggregation loops | Iterate over all contiguous month ranges and supported guest groups, regroup monthly rows by player, and compute outcomes and concentration. | Enables correct period/group drilldowns without publishing individual identities. |
| Ledger/POS and standardization blocks | Convert event timestamps to gaming dates, reconcile redemptions to POS, calculate monthly costs and point prices, and standardize qualifying item/tier cells using January weights. | Avoids comp double counting and checks a competing mix explanation. |
| Context and operations blocks | Calculate weather/event summaries, walkway phases, traffic coverage rates, move comparisons, fault queue and repair durations, and hourly timing totals. | Adds useful competing explanations and operational context without implying causality. |
| Scoring and planner-baseline blocks | Calculate full-window z/p/q values and bottom-ten findings; build June target baselines and the initial recommendation. | Supplies auditable machine diagnostics and observed bases for explicit planning assumptions. |
| Inventory and artifact blocks | Record source table metadata and SHA-256 hashes, write JSON and the machine audit, copy the upstream license, and write pipeline checks. | Supports reproduction, review, and traceability. |

### Browser-side functions

| Function | What it does |
| --- | --- |
| `selectRows(data, start, end, zone, bank)` | Filters machine-day rows to inclusive selected months and, when specified, zone and bank. |
| `aggregate(rows)` | Sums wager, win, theo, hours, costs, variance, peer expectations, and opportunity proxies; derives downtime, theo/hour, peer index, availability, and hold with zero-denominator protection. |
| `normalP(z)` | Uses an Abramowitz–Stegun approximation to calculate a two-sided normal-tail probability for a z-score. The independent Python pipeline uses `math.erfc` for its full-window audit. |
| `machineScores(data, rows)` | Groups rows by machine, calls `aggregate`, calculates z and p, performs the Benjamini–Hochberg adjustment, associates machine metadata and last in-scope location, and sorts by actual win. |
| `unitCost(action)` | Converts catalog cents to dollars and includes recurring charges for the days remaining after lead time. |
| `targetOptions(data, action)` | Returns valid planning targets for the action's unit: machines, banks, zones, manufacturers, shifts, event slots, or the property. |
| `affectedMachines(data, action, entry)` | Expands machine, bank, or manufacturer targets into the affected machine IDs. This is used for conflict and downtime checks. |
| `validatePlan(data, entries)` | Checks budget, action and quantity limits, targets, comp rate, incompatibilities, and relocation destination rules; returns cost, remaining budget, and validation errors. |
| `estimateAction(data, entry)` | Applies the entered assumption to the appropriate historical base, computes catalog cost and downtime debit, and returns estimated gain, scenario net, and break-even effect. |
| `estimatePlan(data, entries)` | Combines action estimates and applies the conservative overlap rules for downtime and demand interventions. |

The React `App` component in `Workspace.tsx` manages data loading, navigation, filters, machine/guest selection and Help return state. Its `useMemo` calculations recompute derived rows and scores when relevant filters change. `Floor` in `OperationalMap.tsx` draws the coordinate-based, keyboard-selectable SVG; pure functions in `floorGeometry.mjs` implement bounded cursor-centered zoom, hit testing and dated snapshots. `Planner` in `ActionPlanner.tsx` manages action entries, stores the plan in local browser storage, and contains the configured-subset comparison `optimize` function. `MethodsView` displays forecast validation, checks and evidence links before `MethodReference` exposes detailed derivations. `Help.tsx` and `helpContent.ts` implement the separate beginner learning center and glossary. Shared `Kpi`, `Panel`, `Note`, and `Chart` components live in `ui.tsx`; `app.css` owns the responsive style layer.

`scripts/audit_algorithms.py` independently reads CSV.gz sources and calculates support, payout/variance diagnostics, closure and relocation sensitivity, loyalty coverage and validation-only candidate diagnostics. It never imports the production pipeline or reselects from the already-examined holdout. `AuditDiagnostics.tsx` presents aggregate results in Methods. `rankPeers` and `peerSupport` in `diagnostics.mjs` calculate descriptive rank/percentile and exposure/fallback counts, without changing peer expectations or payout flags.

`Copilot.tsx` displays the optional investigation panel. `investigation.mjs` validates context and implements nine narrow read-only retrieval functions by calling existing analytical/planner helpers. `server/chat.mjs` runs bounded Gemini function calling and accepts only returned evidence IDs in its final structured output; application templates supply all displayed numbers, explanations, caveats and links. `server/handler.mjs` handles origin/body/method limits, server-only environment secrets and basic per-instance rate control. No chat response edits plans or navigates without a button click; stale filter context invalidates navigation. See [setup, privacy, safeguards and actual verification status](GEMINI_SETUP.md). Mocked protocol tests are not a successful live account test.

### Tests, reproducibility, and practical limits

- The pipeline's named invariants check source grain, monetary identities, daily rollups, the DST day, nonnegative repair durations, loyalty reconciliation, hourly/daily downtime reconciliation, theo calculation, and the strict forecast split.
- `npm test` exercises analytical totals, filter partitioning, independent Python/JavaScript payout-flag agreement, catalog pricing, feasibility rules, downtime debits, overlapping benefits, guest accounting, and the frozen holdout.
- `npm run test:ui` exercises the components in a simulated DOM, including navigation, filters, machine selection, guest groups, planner conflicts, persistence, and loading failures.
- The original build passed TypeScript compilation, production build, and HTTP resource checks. A real browser and native Computer Use connection were unavailable during the original implementation, so those checks do **not** establish visual or accessibility correctness on real desktop/mobile browsers.
- The developer can regenerate the analysis with `python scripts/build_data.py`, regenerate the judging documents with `python scripts/write_deliverables.py`, and run `npm run verify`. Full setup and deployment instructions are in [`README.md`](../README.md) and [`docs/DEPLOYMENT.md`](DEPLOYMENT.md).

The synthetic dataset supports a decision process and a reproducible demonstration. The peer comparisons, statistical tests, and planner scenarios are aids to inspection and controlled experimentation; none substitutes for validating a real intervention in the operating environment.
