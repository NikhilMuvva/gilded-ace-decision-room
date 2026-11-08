# Operational redesign and verification

## Product assessment

The main obstacles were repeated introductory content ahead of evidence, oversized cards and controls, hidden loyalty trends, a difficult machine investigation flow, and a floor map that mixed historical placements. A broad SVG style also applied floor dimensions to toolbar icons, causing the enormous controls visible in the supplied screenshots. Patching individual icon sizes would have left the conflicting style layers and map interaction problems in place.

The redesign replaces those layers with one application stylesheet, separates page views from state and analytical helpers, and treats the application as an operational workspace. All six challenge questions remain accessible through the navigation. The beginner Help center and technical Methods page remain separate.

## Major decisions

| Area | Implemented behavior | Management benefit |
| --- | --- | --- |
| Executive briefing | Compact decision summary, four metrics, three qualified findings with direct investigation links, and a daily actual/expected chart | See the decision, exposure and evidence without scrolling through a presentation |
| Navigation and scope | Persistent page navigation; compact applicable filters; explicit fixed forecast/planning windows; a mobile navigation drawer | Know which records change and keep investigations in context |
| Machine investigation | Floor and dossier share a roughly 65:35 workspace; searchable, sortable table uses 12-row pages | Move between a physical position, a ranked result and the supporting evidence |
| Floor controls | Three 34px buttons with 16px icons: zoom in, zoom out and fit; cursor-centered wheel, drag, pinch, double-click and keyboard controls | Locate and inspect individual machines without oversized controls or repeated pan-button clicks |
| Selection | Spatial hit testing, chooser for tied positions, persistent selection ring, synchronized table page and dossier | Avoid silently selecting the wrong machine when symbols overlap |
| Historical layout | Explicit layout date, exact active placements and supplied coordinates; selection can move to a retired machine's last active in-period date | Avoid presenting retired machines and replacement machines as simultaneously occupying a slot |
| Demand | Direct zone-series checkboxes and visible closure comparison; traffic, relocations and event/weather context remain available | Compare demand without a crowded chart or losing important qualifications |
| Availability | Metered downtime separated from forgone opportunity estimates; zone/daily charts plus repair and hourly audits | Distinguish a measured outage from an uncertain financial scenario |
| Guests | Wagers, returned payouts, player net and ahead share, with concentration and coverage context | Interpret tracked outcomes using the player sign and the correct population |
| Loyalty | Monthly economic/menu cost and point-price trends visible by default; optional fixed-mix comparison | See both accounting cost and the change in redemption pricing |
| Investment planner | Visible Add/Remove controls, quantities and targets, local errors, separate spend/remaining/gain/debit/net summaries, assumption details and configured-subset comparison | Build a constrained plan and understand why spending is or is not justified |
| Methods | Model definition, frozen windows, validation errors and forecast chart appear before the full technical reference | Assess the model before reading formulas and implementation detail |
| Help | Header entry from every analytical page, brief contextual definitions, full learning topics, glossary and retained return state | Learn a term or workflow without abandoning the analysis |
| Exports | Explicit JSON label and page-appropriate scope metadata/results | Know what was exported and which population it describes |

The visual hierarchy uses readable sans-serif text, compact panel headings, familiar native controls and restrained color. Essential qualifications remain next to results. Longer derivations use disclosures or the Methods reference. There are no simulated account controls.

## Scope and statistical integrity

The source records, Python transformations, prepared JSON artifact and `src/lib.mjs` analytical functions were preserved. Matched peers still exclude the target machine, use the original exposure weights and sparse-cell fallback, and preserve the payout testing family before zone/bank drilldowns. Date, zone and bank filtering still applies to floor analyses. Guests and loyalty use selected months with their explicitly stated cohort/property scope. Forecast and planner windows remain fixed.

The map's layout date affects **placement only**. Machine metrics continue to describe the selected month range, stated above the map and dossier. Period table metadata uses last in-period placement. On June 30 the snapshot has 308 active machines; the six-month table can contain 310 because it also includes retired machines. Positions are neither jittered nor inferred. The walkway closure appears only on its recorded dates.

The 0.95×/1.05× map color bands describe relative peer performance only. The subsequent parameter audit replaced the uncalibrated 0.80× classification with continuous scores, scope-relative ranks/percentiles and exposure/support; see `PARAMETER_REGISTER.md`. Payout flags remain statistical inspection prompts, not diagnoses. The frozen May–June test remains isolated from model selection. Planner effects remain user assumptions, inspection value remains unpriced, and the $100,000 budget and action constraints are unchanged. The subset comparison searches combinations of the currently configured entries; it does not optimize all catalog actions, targets and assumptions. The later optional copilot is documented in `GEMINI_SETUP.md`.

No analytical correction was necessary. The dated layout corrects a presentation error: a period-wide list of last placements was previously liable to imply a single simultaneous floor state. Financial and statistical calculations were not changed by this correction.

## Frontend responsibilities

| File | Responsibility |
| --- | --- |
| `src/main.tsx` | React entry point and stylesheet import |
| `src/Workspace.tsx` | Data loading, navigation, applicable filters, derived selections, Help return state and scoped export |
| `src/Views.tsx` | Operational page composition and charts; selected-machine dossier and table |
| `src/OperationalMap.tsx` | SVG rendering, pointer capture, wheel/pinch/drag, keyboard navigation and machine selection |
| `src/floorGeometry.mjs` | Pure coordinate, bounds, zoom, snapshot and nearest-machine calculations |
| `src/ActionPlanner.tsx` | Persistent editable plan and comparison UI; delegates financial calculations to unchanged `lib.mjs` |
| `src/ui.tsx` | Shared number formatting, panels, metrics, charts and JSON download |
| `src/Help.tsx`, `src/helpContent.ts` | Beginner topics, contextual explanations, glossary and interactive learning examples |
| `src/Guidance.tsx` | Detailed technical methodology disclosures |
| `src/app.css` | Single responsive application style layer; floor canvas sizing does not apply to icon SVGs |

`floorBounds` calculates a padded extent from supplied positions. `viewBox` converts zoom/pan state to an SVG viewport. `constrainView` limits zoom to 1–14× and bounds pan. `pixelToWorld` accounts for letterboxing when converting a pointer to floor coordinates. `zoomAt` preserves the floor position under the cursor where bounds permit. `focusPoint` brings a selected machine or bank into view. `snapshotMachines` joins active rows for one explicit date to their actual locations. `nearestMachines` applies a screen-pixel hit radius and returns ambiguous ties for a visible chooser.

## Verification

`npm run verify` passed: 19 analytical/geometry tests, 27 component tests, TypeScript and the production build. The operational tests cover production CSS icon/control sizes, cursor-anchor invariance, bounded zoom, drag/pinch, exact historical placements, retired-machine focusing, machine/table/dossier synchronization, narrow-screen navigation rules, scoped JSON exports, visible loyalty trends, demand-series isolation and an end-to-end investigation-to-planner sequence. Existing Help, filters, analytics, forecast and budget/conflict/persistence regressions remain in the suite. Vite reports the existing chart vendor chunk exceeds its 500kB advisory threshold; the build succeeds.

`scripts/http_smoke.py` checks the built site, data and documentation through the preview server; `docs/HTTP_CHECKS.json` records the result. Submission packaging remains allowlisted and excludes source casino tables and local dependencies.

Computer Use reported no browser/native connection. Simulated DOM and CSS tests cannot establish real visual quality, text wrapping, physical touch behavior, screen-reader output or browser rendering performance. A real desktop/mobile browser pass remains outstanding: inspect all pages at typical laptop and phone sizes, wheel/drag/pinch into a dense bank, select an individual machine, return through Help, and exercise keyboard focus and planner errors. No screenshot sign-off or public deployment is claimed.

The upstream draft-data release limitations and organizer publication/calibration requirements remain documented in `LIMITATIONS.md`; this UI update does not resolve them.
