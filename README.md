# The Gilded Ace — Decision Room

**Luck, location, or a leak?** An interactive Dashboard Royale submission built from the supplied challenge records. All casino data is synthetic. The source release remains `0.9.0-draft`.

## Open the application

Dependencies and derived data have already been prepared in this workspace.

```powershell
npm run start:local
```

Open the Vite URL printed in the terminal (normally **http://127.0.0.1:5173**). This starts both the dashboard and its private Gemini endpoint, loading `.env.local` on the server. For a clean install use `npm ci` first. Node 22.12+ is required; tested with Node 26.13. `npm run build` produces deployable `dist/`; `npm run preview -- --port 4173` serves that build.

## What works

- A header **? Help** button opens the separate beginner learning center from every analytical page. It includes ten topics, a searchable glossary, interactive learning examples and a return action that retains the analysis selections.
- **Ask about this data** opens the optional grounded Gemini investigation copilot. It selects verified read-only evidence and clearly labels deterministic offline mode. See [Gemini setup and limits](docs/GEMINI_SETUP.md); live verification requires a privately configured server key.
- The compact executive overview links to operational investigations and the existing planner. Page-specific filters state their scope. Detailed explanations remain in Help, chart calculation details and the technical reference.
- The floor map uses an explicit layout date, cursor-centered wheel zoom, direct drag/pinch navigation and a compact three-button toolbar. Machine/table/dossier selection stays synchronized; selecting a historical machine can focus its last active in-period layout. Positions are the supplied coordinates.
- Operational sections cover the briefing, machine performance, demand/location, downtime, tracked guests, loyalty, opportunities, budget portfolios and validation.
- Inclusive month ranges, zone and bank filters; searchable, sortable, paginated machine comparisons; keyboard-selectable floor positions; scope-aware JSON exports. Loyalty trends and forecast validation are visible by default.
- Leave-machine-out peer comparisons, game-math payout variance and false-discovery adjustment, exact scheduled downtime, coverage-aware traffic, relocation and event audits.
- Continuous peer ranks/percentiles with exposure and support, plus independently recomputed robustness diagnostics in Methods. See [parameter register](docs/PARAMETER_REGISTER.md); run `npm run audit:algorithms` with local source tables to reproduce.
- Player outcomes regrouped over the selected period, anonymous guest-group drilldowns, loyalty/POS reconciliation and fixed item/tier standardization.
- A frozen Jan–Apr / May–Jun weekday forecast with inner validation, constant baseline and paired block-bootstrap error comparison.
- All paid official actions, three-type limit, unit/recurring/lead-time costs, quantities, comp-rate limits, conflicts, vacant move destinations, downtime debits and explicit effect assumptions. The portfolio comparator evaluates subsets of configured actions, not a claimed global causal optimum.

The decision engine compares 968 feasible portfolios from 20 evidence-based bundles. Its primary objective maximizes modeled base-scenario incremental property contribution after costs, downtime, displacement and overlap; it currently selects $0 spend and $100,000 retained. A separate financial alternative adds a management downside cap. The optional experimental strategy retains the original $13,900 plan under its $20,000 downside cap: two inspections, Back Forty wayfinding and a controlled loyalty pilot, leaving $86,100. July monitoring, approval gates and break-even sensitivity make the cash recommendation actionable. Effects are assumptions and information value is unpriced. See the [comprehensive report](docs/COMPREHENSIVE_SCIENTIFIC_REPORT.md), [Claims & Evidence](docs/CLAIMS_AND_EVIDENCE.md) and [recommendation validation](docs/FINANCIAL_RECOMMENDATION_VALIDATION.md).

## Rebuild the analysis

Original archives were expanded into `sources/dashboard-royale-main` and `sources/dashboard-royale-entry`, without changing or deleting their contents. Those folders are local-only and ignored. The starter's instructions were evaluated as reference, not copied into the application architecture.

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\Activate.ps1
npm run data
.venv\Scripts\python scripts/write_deliverables.py
npm run verify
```

Alternative source location: `python scripts/build_data.py --source "C:\path\to\dashboard-royale-main"`. Data artifacts are included, so the frontend can build without Python or publisher files. `python scripts/verify_sources.py` runs the upstream integrity checker with Windows path normalization in memory; it also supports the workspace-local `.python-deps` DuckDB installation used during this task. Original source files remain unchanged.

## Checks and limits

The [cleanup and release audit](docs/CLEANUP_AND_RELEASE_AUDIT.md) records the Git baseline, before/after verification, unchanged analytical outputs, secret-history review and Vercel handoff.

`npm test` runs analytical/planner and floor-geometry tests. `npm run test:ui` runs simulated-DOM interactions and selected production CSS checks. `npm run verify` runs those checks, the independent Python scientific fixtures, TypeScript and the production build. See the [operational redesign report](docs/OPERATIONAL_REDESIGN.md), [validation](docs/VALIDATION.md) and [limitations](docs/LIMITATIONS.md).

The environment's Computer Use browser/native connection was unavailable, so a real browser visual pass remains outstanding. The upstream release-readiness checker also reports missing organizer calibration and publisher evidence. The app explicitly labels these issues. Correlations, downtime opportunity and effect sliders are not causal earnings promises.

## Deliverables and deployment

- [Analytical methodology](docs/METHODOLOGY.md)
- [Comprehensive scientific audit and investment report](docs/COMPREHENSIVE_SCIENTIFIC_REPORT.md)
- [Opportunity Register](docs/OPPORTUNITY_REGISTER.md)
- [Claims & Evidence](docs/CLAIMS_AND_EVIDENCE.md)
- [Under-400-word write-up and under-two-minute script](docs/SUBMISSION.md)
- [AI-use disclosure](docs/AI_DISCLOSURE.md)
- [Vercel and GoDaddy deployment steps](docs/DEPLOYMENT.md)
- [Remaining risks](docs/LIMITATIONS.md)

Run `python scripts/package_submission.py` after building for a sanitized source ZIP and a ready-to-host static ZIP in `artifacts/`. Neither includes original datasets, publisher tables, player identities, dependency folders or credentials. The app contains derived synthetic aggregates and attributed NOAA monthly summaries. The upstream MIT license is retained in `docs/UPSTREAM-LICENSE.txt`; third-party publisher terms do not transfer through it. Self-hosted font license notices are included with the artifact.

The static ZIP supports offline evidence. Deploy the source project to include the serverless Gemini endpoint. For local live development, privately configure `.env.local` and run `npm run start:local`; open the Vite URL printed in the terminal. The live-check scripts are described in [setup](docs/GEMINI_SETUP.md). No secret belongs in a `VITE_*` variable.

The core release is deployed at **https://gilded-ace-decision-room.vercel.app**; the owner confirms the immutable deployment opens on cellular HTTPS. Production Gemini remains unverified pending a trusted-HTTPS POST. Tiger Cloud development import/reconciliation/API/benchmarks passed under an explicitly authorized provisional CA; the hourly feature stays separate from the core production release. Domain actions are on hold with the owner. See [sponsor evidence](docs/SPONSOR_EVIDENCE.md), [hourly setup](docs/TIGER_DATA_SETUP.md), [release audit](docs/SPONSOR_RELEASE_AUDIT.md) and [Devpost checklist](docs/DEVPOST_CHECKLIST.md). The walkthrough remains a script, not a recorded video.

## Hourly operations

The new explorer queries a server-only, read-only Tiger Cloud endpoint for historical heatmaps, weekday/weekend and machine comparisons, and low/high-disruption maintenance templates. It preserves global month/zone/bank filters and Help return, labels missing support and service failures honestly, and never changes the financial portfolio. `npm run start:local` loads the generated ignored `.env.tiger-reader.local` in the API process alongside `.env.local`. No secret belongs in VITE_*. See [setup and measurements](docs/TIGER_DATA_SETUP.md).

Current release update: Tiger now uses verified public CA roots; its reader and reconciliation passed after administrator rotation. Original .env.local is preserved, and npm run start:local loads the generated reader configuration. See docs/SPONSOR_RELEASE_AUDIT.md for the deadline checkpoint and remaining desktop-network limitations.
