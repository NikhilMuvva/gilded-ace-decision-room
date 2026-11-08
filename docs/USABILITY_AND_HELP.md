# Beginner Help and usability update

The application opens with a compact executive briefing: decision summary, key metrics, three qualified findings and direct investigation links. Fixed Jan–Jun findings are labeled separately from filter-responsive KPIs and charts. See [operational redesign](OPERATIONAL_REDESIGN.md) for the product assessment, architecture and verification details.

## Beginner learning center

The sticky application header contains **? Help** on every analytical page. Help is a separate page from **Methods & evidence**. It teaches purpose, navigation, filters, casino metrics, chart and map interpretation, machine comparisons, forecasting, planning, and interpretation of evidence in ten labeled sections. Its glossary searches names, explanations and aliases, handles no results and offers a clear reset. It includes descriptive peer rank/support and the optional copilot/offline evidence concepts. Three interactive examples teach wagers/payouts/expected win, availability versus occupancy, and lead time/break-even planning. Illustrative inputs are explicitly labeled and do not modify actual analysis data.

Question-mark controls beside KPIs, difficult table headings, chart titles and planner metrics open concise explanations. They support keyboard focus, Escape to dismiss, a close action and a link to the relevant Help topic. The explanation is rendered outside clipping containers and positioned within the viewport. A plain-language explanation accompanies the more detailed statistical check in a machine dossier.

Opening Help preserves the App-level selected months, zone, bank, machine, search query, sort, guest group and map view. Planner entries remain in existing local browser storage, including targets, quantities and assumptions. Top and bottom Help return buttons, plus a header return control, restore the prior analytical page. The main return also restores the recorded scroll position and focuses the page heading. Help topic navigation moves keyboard focus to the selected section. Leaving Help through a page shortcut intentionally opens that selected page without resetting analysis filters.

## Other usability improvements

- Historical floor pages show clearly labeled month, zone and bank controls, a visible current scope and a reset action. Guest/loyalty pages show applicable month controls only; their group/property scopes are stated. Help, Methods and the July planner do not display inapplicable historical filters.
- Exported historical results now match the current view: guest cohort results, property loyalty records, or scoped floor totals and machines.
- Relevant investigations link to the single planner with explicit origin context and a return action. Repetitive introductory blocks have been replaced by operational evidence and concise qualifications.
- Monthly loyalty cost and point-price trends are visible by default. Technical derivations and detailed machine payout checks use progressive disclosure.
- The existing Methods page now includes expandable technical topics covering metrics, peer comparisons, payout tests, location/context, downtime, tracked/loyalty accounting, composition adjustment, forecast validation and planner limitations. Source and Claims & Evidence links remain available.
- The coordinate-based floor map uses three compact controls (zoom in/out and fit), cursor-centered wheel zoom, pointer dragging, touch pinch and double-click zoom. Keyboard controls use arrows, +/− and Home; individual symbols support Enter/Space selection. Explicit dated snapshots show only active machines at their supplied positions. Table/map/dossier selection stays synchronized. The map date, view and selected machine remain when visiting Help.
- Bank outlines, zone labels, walkway details, different machine shapes, text legends, selection rings and hover/focus feedback reduce dependence on color. The dashed route denotes a historical recorded closure, not a live assertion about access.

## Analytical scope preserved

Core source accounting, matched-peer expectations, payout z/p/q policy and original chronological forecast are preserved. The comprehensive pass adds independent diagnostics, an Opportunity Register, a catalog-constrained candidate search, shift-specific metered queue pools and qualified quiet-hour planning debits. Recommendation amounts and newly added controls are described in COMPREHENSIVE_SCIENTIFIC_REPORT.md. Help return also retains the opportunity selection, portfolio selection and learning cap. No diagnostic dimension is a combined badness score or a causal treatment estimate.

## Validation and remaining manual checks

Regression coverage includes all analytical sections, Help from every main page and return behavior, retained machine and cohort state, retained planner effects/targets, contextual explanations and Escape/focus behavior, glossary search, all ten Help topics, interactive examples, map zoom/pan/fit, pointer drag, pinch gestures, and executive/investigation-to-planner workflows. Analytical tests continue checking money totals, forecast holdout, payout flags and planner constraints.

These tests verify component behavior and selected production CSS rules, not real browser layout or physical touch interaction. Computer Use again reported no browser/native connection, so a real desktop/mobile, screen-reader and touch-device pass remains outstanding. The source dataset remains a draft. Deployment and DNS are outside this update.
