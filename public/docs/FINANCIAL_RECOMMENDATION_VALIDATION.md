# Financial recommendation: implementation and validation

Completed November 8, 2026 against the clean local baseline `42dafcc` (the committed cleanup). No deployment infrastructure, dependencies, styling, floor-map code or underlying statistical methods were changed.

## Selected business decision

The primary financial recommendation is **$0 spending, no paid actions, and $100,000 retained**. Low/base/high incremental modeled net is **$0 / $0 / $0**. This is the result of enumerating **968 feasible portfolios from 20 generated bundles**, including cash; it is not a hardcoded cash answer. All paid candidates have negative base net under the current explicit assumptions.

The primary objective maximizes base-scenario incremental property contribution after catalog prices, eligible days, planned downtime opportunity, displacement and overlapping positive benefits. Ties favor higher low-scenario net, then lower cost. Contribution remains before unmodeled variable costs and overhead. Historical quantities price financial bases; action effects remain assumptions, not identified causal effects. There are no scenario probabilities or weighted expected-return claims. Search is exhaustive over the generated bundles, not over every conceivable target, action and quantity.

Three objectives are now separate:

1. **Financial, the default:** highest modeled base net.
2. **Risk-sensitive financial:** highest base net subject to the management-selected low-scenario downside cap. The current $20,000 cap also selects cash. Changing this cap does not change the experimental policy or edit saved work.
3. **Experimental learning:** maximize distinct registered questions under its separate $20,000 downside cap, then base net and lower spend. It remains the original $13,900 alternative, with unpriced information benefits and negative modeled base net. The low-scenario maximin and optimistic comparisons also remain available.

## Paid runners-up and replacement comparison

| Paid portfolio | Spend | Low net | Base net | High net |
| --- | ---: | ---: | ---: | ---: |
| Floor-wide point-policy change, property | $1,500 | -$2,983.78 | -$609.73 | $1,467.55 |
| Payout inspection, M-1158 | $1,200 | -$1,202.07 | -$1,202.07 | -$1,202.07 |
| Recurrent-fault inspection, M-1241 | $1,200 | -$1,203.60 | -$1,203.60 | -$1,203.60 |

The ten-active-machine lease comparator spends **$33,800** for 16 eligible days and has base net **-$32,371.48**, including its **$121.45** outage opportunity debit. Targets are M-5076, M-1158, M-1238, M-1181, M-1035, M-1179, M-1017, M-1265, M-1256 and M-1063. Ten purchases cost $220,000 and remain infeasible. These comparisons preserve catalog lead times, quantities, downtime and full costs. Low earnings alone do not establish that replacement creates incremental property contribution.

The closest cash break-even boundary is the point-policy change: positive modeled base benefits must reach **1.6848904468 times** the current assumption, holding costs, negative effects, overlap, displacement and eligible days fixed. Its financial base is June economic comp cost scaled to 27 eligible days. The assumed benefit is 3%; its cost hurdle is approximately **5.05467% of that financial base**. This does not establish that a change produces savings, customer response or uplift. At the boundary cash wins the tie-break under current low assumptions; above it a paid candidate can become preferable.

The engine exposes validated, ordered low/base/high `scenarioEffects` inputs while preserving every existing default effect. Tests demonstrate that a hypothetical change can switch the financial winner; no favorable test assumption was published as an empirical result.

## Experimental backup retained

| Action | Exact targets | Cost |
| --- | --- | ---: |
| Two inspections | M-1158 and M-1241 | $2,400 |
| Wayfinding trial | Back Forty, Z-B40 | $7,500 |
| Controlled loyalty pilot | Property | $4,000 |
| Total / retained budget | Three action types | **$13,900 / $86,100** |

Backup low/base/high nets remain **-$19,089.54 / -$10,022.96 / $1,634.08**. Zero-effect cost including outage opportunity is $13,908.64. Immediate monetary information value is not invented. This strategy can be loaded explicitly; it is not called the best financial investment.

## Operational cash plan

July monitoring is ordered by recurrent faults, payout reconciliation, Back Forty access, loyalty economics, and replacement/demand review. Use existing routine records to track faults per active machine-day, queue/meter overlap, direct costs, covered traffic, exposure-adjusted demand, comp economic cost and property contribution. A paid inspection, signage action or pilot is never counted as free work.

Approve additional funding only when a documented cause and credible property-wide contribution clears full action cost and outage opportunity within eligible days, with displacement and harm controls, or explicitly adopt the learning objective. Prepare controls/outcomes/stop rules before funding a trial. The frozen weekday forecast informs demand and work timing; it does not estimate treatment ROI. See the full monitoring/approval table in the [scientific report](COMPREHENSIVE_SCIENTIFIC_REPORT.md) and planner.

## Code and artifact changes

- `src/decisionEngine.mjs`: financial/base selection, separate maximin and constrained-financial choices, current-input selection, explicit scenario-effect validation and break-even sensitivity. Existing action pricing, scheduling and overlap calculations are preserved.
- `scripts/build_portfolios.mjs`: publishes the financial winner as `recommendation` and `planner.recommended`; publishes separate experimental/risk alternatives, runners-up and monitoring gates. `scripts/build_data.py` accepts only source-matched financial recommendation metadata when using its cache.
- `src/Views.tsx`, `DecisionViews.tsx`, `ActionPlanner.tsx`, `Workspace.tsx`: financial executive summary and planner default; separate comparison policies; saved-work label and explicit load action; correctly labeled exports. Saved arrays are preserved, including a prior $13,900 plan.
- `src/investigation.mjs` and the existing Gemini router instructions: recompute read-only financial, experimental and constrained alternatives; validate their strategy IDs; distinguish primary/backup requests. No write tools or model-authored financial answers were added.
- Help/Methods explanations, README, report generator and live/static verification scripts updated. Generated source/public documentation includes the scientific report, Claims & Evidence, parameter register, Methods supplement, AI disclosure, and **306-word submission with a two-minute walkthrough**. Report JSON is read explicitly as UTF-8 to preserve labels during regeneration.
- Regenerated `public/data/dashboard.json`, `public/data/decision.json`, and recommendation sections of `docs/SCIENTIFIC_AUDIT.json`, including its static mirror. `public/data/diagnostics.json` is unchanged.

## Preservation evidence

Regression fingerprints were taken directly from Git `42dafcc`, decoded as UTF-8. The complete non-recommendation dashboard object (including accounting totals, all rows and all frozen predictions), all original planning bases, all historical scientific fields, opportunities/measurement plans and the diagnostics artifact match that baseline. Only the intentionally changed recommendation/search metadata and added decision-policy fields are excluded.

| Protected section | SHA-256 of serialized baseline and current object |
| --- | --- |
| Dashboard excluding planner | `7ba8e33b8530a8909ad4ad4b3d1f0a5359619ff9187bb64385ee095778f5c894` |
| Original planning bases | `2dfd7f8ee13211e93e88cdb3b826deb1aaa173ddd618554c5d25c56efdd8979b` |
| Historical scientific findings and source checks | `0b2479867d516956b064660c32737321c2fe4e62a3c7a43dc672c2021994af95` |
| Independent diagnostics | `c49cb1ca4d88816de8cd3a263df3ef08a40a7ddc786334fc6531e6bc799d0d8f` |

The historical 132 source checks remain passing. No source science pipeline was rerun to manufacture new findings. `src/lib.mjs`, numerical scientific helpers, map implementation, frozen forecast, action constraints and original catalog data are unchanged.

A separate deep comparison also passed for all eight prior portfolio strategies: full action/scenario results, spending and reserves are unchanged, mapping the former `recommended` learning strategy to its new `learning` ID.

## Actual validation

Final `npm run verify` exited **0**:

| Check | Result |
| --- | --- |
| Python scientific fixtures | 11 passed; `Ran 11 tests in 0.121s`, `OK` |
| Node tests | 54 passed, 0 failed; 9138.4066 ms |
| UI | 5 files, 42 tests passed; 29.82 s |
| TypeScript and production build | Passed |
| Total | **107 passed** |

Focused tests prove known optimal results: a $30 synthetic portfolio produces independently calculated $105 base net and beats cash; its maximin choice remains cash. Setting its benefit assumptions to zero makes cash win. A separate test-only sensitivity raises the point-policy assumption from 3% to 10% and selects its $1,500 action with $1,467.55 base net; the production assumption remains 3%. Existing constraint tests remain intact. New tests cover primary/backup data parity, a real Gemini protocol mocked round-trip, read-only routing, saved-plan preservation, explicit replacement, exact UI monetary values and historical fingerprints.

The first integration run caught a duplicated `status` role on the new static saved-plan label. That role was removed; the existing operational tests then passed unchanged. Final raw verification output is at `%TEMP%\gilded-ace-financial-verify-final.log`.

Actual HTTP + configured Gemini checks passed through the local production preview: financial primary **0 / 100000**, experimental backup **13900**, and M-1241 **16 fault tickets**, with evidence links. See `SCIENTIFIC_LIVE_CHECK.json`. These are real service calls, distinct from mocked protocol tests. Privacy verification found no configured key in **5 frontend responses and 45 production files** at that point. Static HTTP checks passed for **24 resources**, including all three derived data artifacts and judging documents. The final validation record is copied into the production documentation afterward.

The final production refresh passed. All three built data files match their tracked public inputs, and this validation record is served successfully. Source/static release packages were refreshed; the credential checker passed for **173 decompressed archive entries**, with no configured key or private environment file found. The nonfatal chart-chunk size advisory remains; it was not hidden or used as a reason to change frontend architecture.

Vercel/GoDaddy configuration, lockfile and dependencies are unchanged. All derived JSON needed by the static build and function remains included. No Tiger Data, deployment, DNS change, commit or push was performed. Actual cloud deployment and real-browser rendering remain unverified; organizer draft/calibration and prospective causal-effect qualifications remain unchanged.
