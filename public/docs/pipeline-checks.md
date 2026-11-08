# Pipeline verification

- PASS: 56,110 unique machine-day keys
- PASS: 1,018 off-floor rows excluded
- PASS: Integer machine accounting
- PASS: Prepared monetary accounting
- PASS: Property contribution counts POS cogs once
- PASS: Daily rollup matches property
- PASS: DST gaming day is 23 hours
- PASS: Availability respects scheduled time
- PASS: Every active row has a valid peer reference
- PASS: Forecast split is strictly chronological
- PASS: Tracked player net has player sign
- PASS: Tracked contribution includes comp cost once
- PASS: Every redeemed comp links to one POS ticket
- PASS: Ledger cost equals POS cogs: subtract once
- PASS: Redeemed comp cost reconciles to property
- PASS: Operations have nonnegative wait and repair time
- PASS: Hourly downtime reconciles to exact daily scheduled downtime
- PASS: Configured RTP reproduces theo
- PASS: Planner starts with machines active on June 30

Hourly full-hour downtime minus scheduled meter downtime: 0.000000 hours. Hourly timing is descriptive; daily loss estimates always use exact meter scheduled time.
