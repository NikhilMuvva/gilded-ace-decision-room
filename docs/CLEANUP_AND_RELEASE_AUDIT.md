# Cleanup and release audit

> Current November 8 deployment, Cloud development trust, API/benchmark evidence and remaining checks are recorded in [Sponsor evidence](SPONSOR_EVIDENCE.md) and [release audit](SPONSOR_RELEASE_AUDIT.md). Earlier pass-specific statements below retain their historical scope.

Audited November 8, 2026. Project: `gilded-ace-decision-room`. This is a maintenance and deployment review; it does not revise the scientific analysis or investment policy.

## Repository baseline and prior cleanup

- Local branch: `master`; origin: `https://github.com/NikhilMuvva/gilded-ace-decision-room.git`.
- `git fetch origin master` succeeded. Both `HEAD` and `origin/master` were `8bf2d9671b94d15a0041df6f61b257a96040a919` (`Initial Dashboard Royale project`).
- Before edits, `git status --short` and `git diff HEAD` were empty. There were 122 tracked paths, one commit across available refs, and no existing cleanup audit or cleanup commit. Reflogs also referenced that initial commit.
- Existing formatting, shared analytical modules, read-only copilot safeguards, and Vite vendor chunk splitting were already in the commit. These were retained. Git cannot establish whether a separate cleanup occurred before the initial import; no earlier cleanup was assumed or repeated.
- This audit leaves the commit and remote branch unchanged. Maintenance patches and this report are local working-tree changes; they have not been committed, pushed, or deployed.

## Verification before edits

`npm run verify` completed with exit **0** before any tracked file was changed. Environment: Windows, Node **v26.13.0**, npm **11.20.0**, Python **3.11.9**.

| Check | Exact baseline result |
| --- | --- |
| Python scientific fixtures | `Ran 11 tests in 0.175s`; `OK` |
| Node analytical, planner, map and copilot tests | 47 tests; 47 pass; 0 fail; duration 4210.7358 ms |
| Simulated-DOM UI | 5 files passed; 41 tests passed; duration 19.13 s |
| TypeScript | Passed (`tsc -b`) |
| Production build | Passed; Vite reported `built in 818ms` |
| Combined tests | **99 passed** |

The baseline already emitted a nonfatal chart-chunk warning: 552.74 kB before gzip, above Vite's 500 kB advisory threshold. Existing code splitting was not redone, and the warning was not hidden. Layout-free Recharts size warnings in UI tests are not visual-browser verification. Full local output was captured at `%TEMP%\gilded-ace-cleanup-baseline.log`.

## Demonstrated issues and exact changes

| Files | Evidence and maintenance change |
| --- | --- |
| `src/ActionPlanner.tsx`, `AuditDiagnostics.tsx`, `Copilot.tsx`, `DecisionViews.tsx`, `Guidance.tsx`, `Help.tsx`, `Views.tsx`, `Workspace.tsx` | An explicit TypeScript unused-symbol check reported 11 diagnostics. Removed seven unused default React imports, unused `useState`, `HelpCircle` and `Note` imports; renamed an unused filter callback parameter to `_z`. Imports needed for React namespace types remain. |
| `tsconfig.json` | Enabled `noUnusedLocals` and `noUnusedParameters` so the ordinary production type check detects recurrence. No types, runtime data shapes or numerical code were rewritten. |
| `server/handler.mjs` | A controlled fixture made `loadData()` reject with `SyntaxError`. Before the fix, a valid client request returned HTTP **400** because the JSON-body error handler also caught server-data parsing failures. Separated request-body parsing from service execution: malformed client JSON remains **400**; invalid server data returns generic **503**, with `no-store` and no internal details. Successful requests, tool routing, credentials, limits and analytical results are unchanged. |
| `tests/copilot.test.mjs` | Added one regression test distinguishing client JSON failure from server-data JSON failure, including the exact generic response and cache header. |
| `.gitignore` | Removed duplicate rules and redundant environment-file patterns; organized the existing protections. `.env`, `.env.*`, source data, dependencies, Python/npm caches, builds, logs and archives remain ignored. `.env.example` remains the deliberate exception. Added `.vercel/` for local deployment state. The required `public/data/` derivatives remain trackable. |
| `README.md`, this report and its `public/docs/` mirror | Added a discoverable audit link and recorded the actual results. The mirror permits the report to ship with the static documentation. |

There are no calculation corrections in this cleanup. The only behavior correction concerns HTTP failure classification.

## Code, types, duplicate logic and dependencies

The review covered frontend imports, analytical-module consumers, server modules, development launchers, package manifests, tests, and deployment scripts. Financial calculations remain shared through `src/lib.mjs`; scheduling remains in `src/scheduling.mjs`; portfolio selection remains in `src/decisionEngine.mjs`; evidence retrieval remains read-only in `src/investigation.mjs`. Independent Python and JavaScript numerical implementations are deliberate audit/reference implementations, not duplicates to collapse during cleanup. Source and `public/docs/` copies likewise serve separate repository and static-site audiences.

No dependency or export removal was justified by this review. All direct packages have runtime, build, font, type or test consumers. `npm ls --depth=0` succeeded, and `npm audit --json` reported **0 vulnerabilities** in every severity category. A fresh isolated `npm ci` installed 111 packages, audited 112, and reported 0 vulnerabilities. `package.json` and `package-lock.json` are unchanged. Broad legacy `Data = any` typing remains technical debt; replacing it across working analytics would exceed this controlled cleanup.

## Scientific and interface preservation

Before edits, a snapshot captured SHA-256 hashes of 15 protected files: all three public data artifacts; both numerical audit JSON files; `lib`, `decisionEngine`, `machineDiagnostics`, `diagnostics`, `scheduling`, `floorGeometry`; and the four data/scientific build modules. All **15 hashes remain identical**. Complete deep comparisons of `facts`, the frozen `model` including every prediction, `recommendation`, and `search` also passed. The source manifest binding remains `1a59c68ed4f4b2eb0f875c8e169effd5686fbc98a94a09ac170b8f22bad836e2`.

| Critical output | Before and after |
| --- | --- |
| Coin-in | $248,905,219.25 |
| Actual house win | $23,638,155.10 |
| Theoretical win | $23,545,364.4785 |
| Meter downtime | 5,021.07889 hours |
| Downtime theoretical-win proxy | $94,331.15734 |
| Payout flag family result | One flag: M-1158 |
| Frozen weekday forecast MAE | $68,698.5517 |
| Frozen constant-baseline MAE | $218,258.09693 |
| Candidate bundles / feasible portfolios | 20 / 968 |
| Learning-policy spend / reserve | $13,900 / $86,100 |
| Low / base / high scenario net | −$19,089.539388592857 / −$10,022.957255592855 / +$1,634.0769154071459 |

All statistical parameters, periods, resampling seeds, peer definitions, action prices, lead times, scheduling constraints, conflicts and budget limits are unchanged. The $20,000 modeled-downside learning policy and preserve-cash financial comparator remain intact; the negative base result has not been improved cosmetically.

All **12 compiled frontend assets are byte-for-byte identical** between the baseline build and the cleaned isolated build. No CSS, component markup, map behavior, Opportunity Register, Help content, navigation, or planner interaction was changed. The UI suite separately passed the operational and Help regressions. No real-browser visual or physical-touch sign-off was performed in this audit.

## Secrets and tracked-file audit

- Scanned all available commits, fetched remote refs and reflogs: **one commit, 93 unique file blobs**. Duplicate documentation shares Git blobs. Compared the actual privately configured Gemini key and checked common Google, GitHub, AWS, private-key, service-token and credential-assignment patterns. **No matches were found.** No secret values, upstream bodies, environment contents or credential-bearing headers were printed.
- All 122 initially tracked paths were checked. No private environment files, raw `sources/` tables, dependency directories, private key files, compiled `dist/`, release archives or original CSV.gz/Parquet datasets were tracked. `.env.example` contains empty credentials, not a real key.
- `git check-ignore --no-index --stdin -z` passed **17 protection cases** and **5 release-path exceptions**, including nested secret/dependency paths, `.vercel/`, `.env.example`, `/api/chat` source and the three public data files. Protection was not weakened.
- The live privacy check passed: **5 frontend responses and 44 production files** scanned at that point, with no configured key found. It also verified an actual Gemini answer containing the correct M-1158 statistic and evidence link. The report itself is added to the final build afterward and scanned with the remaining release files.
- The final scan covered **124 working release/source files**, all **45 final production files**, and the owned local server logs, with no key or credential-pattern findings. Allowlisted source/static packages were rebuilt; the archive checker scanned **169 decompressed file entries** and found neither the configured key nor a private environment file.
- This is a scan of the locally available Git objects and release files, using patterns plus exact-key comparison; it is not a claim about inaccessible remote forks, provider account settings or server logs outside this workspace.

## Production data and Vercel review

`vercel.json`, `api/chat.mjs`, Vite build configuration and the package lock were reviewed and retained. Their existing configuration is appropriate for this application:

- Framework `vite`, build `npm run build`, static output `dist`.
- `api/chat.mjs` re-exports the Node handler. Native `.mjs` handlers are supported by [Vercel's Node runtime](https://vercel.com/docs/functions/runtimes/node-js). There is no browser Gemini SDK or direct browser-to-provider request.
- The handler reads `public/data/dashboard.json`, `decision.json` and `diagnostics.json` relative to its module. The existing function `includeFiles: public/data/*.json` covers all three; `maxDuration: 30` exceeds the application's shared 18-second Gemini timeout. [Vercel documents explicit function file inclusion](https://vercel.com/docs/project-configuration/vercel-json#functions).
- Browser data paths are root-relative `/data/...`; document paths are `/docs/...`. Navigation is application state, so a broad SPA rewrite is unnecessary and could obscure `/api/chat`. [Vite copies `public/` into the production output](https://vite.dev/guide/assets#the-public-directory).
- `GEMINI_API_KEY` and `GEMINI_MODEL` are read on the server. The local API loads ignored `.env.local`; the development launcher removes the API key from the frontend child's inherited environment. Vite exposes `VITE_*` variables by default, so a secret must never use that prefix. The build has no blanket environment injection. See [Vite environment handling](https://vite.dev/guide/env-and-mode).
- Requests use same-origin POST JSON, bounded bodies, ID/context/tool validation, no-store responses, generic service errors and explicit deterministic offline fallback. Read-only retrieval cannot purchase actions or edit plans. Existing mocked tests cover API errors, timeouts, missing credentials and limits; real Gemini calls were also tested here.
- `.gitignore` protects Git; `.vercelignore` separately excludes private env files, raw sources, local dependencies/caches and release artifacts from CLI uploads. Original data is not needed on the host.

A fresh isolated checkout was constructed from Git-tracked files plus the reviewed maintenance patches. It contained **no `sources/`, `.env.local` or preexisting `node_modules/`**. `npm ci` and `npm run build` both exited **0** without Python or raw-data preparation.

The following files are tracked, parseable and byte-identical in the source, baseline build, cleaned workspace build and isolated build:

| Included data | Bytes | SHA-256 |
| --- | ---: | --- |
| `public/data/dashboard.json` → `dist/data/dashboard.json` | 5,163,425 | `d2c9318e1257bd2d33a123ad3f2f4c762a1444dea87755e6e02286678e5df1aa` |
| `public/data/decision.json` → `dist/data/decision.json` | 3,137,189 | `95659fe91de7fe5ef4f0ebfa895eba4b46d155944f8024d209d078d29e6f2e3a` |
| `public/data/diagnostics.json` → `dist/data/diagnostics.json` | 12,007 | `d48cf6346a9e903b194afcc6947dffb387a2c6957724457ce91e149fe63c92bf` |

The actual API entry point was also exercised from that source-free isolated checkout. Its secret was supplied only to the server process from the privately held local configuration. A production Vite preview proxied to this isolated handler for the live/privacy checks. Successful live evidence reconciled **$13,900 spend, $86,100 reserve, and 16 fault tickets for M-1241**, with supporting report links. HTTP checks also confirmed GET 405, unknown-machine 400, cross-origin 403 and no-store responses. This proves local production-preview/runtime flow; a Vercel cloud deployment has not been executed.

## Publication and redistribution review

Reviewed the supplied `GUIDE.md`, `README.md`, `LICENSE`, `reference/DATASET.md`, `reference/SOURCE_TERMS.md`, `reference/SOURCES.md` and release metadata. The challenge requires a public/openable result and traceable evidence; it does not override publisher restrictions.

| Material | Guidance and release treatment |
| --- | --- |
| Original challenge documentation, scripts and fictional synthetic casino data | The supplied MIT license explicitly covers these. Preserve its copyright and license notice (`docs/UPSTREAM-LICENSE.txt`). Current derived machine, operational, accounting, model and portfolio data are from these synthetic records. Original raw tables remain local; guest outputs are anonymous aggregates. |
| NOAA weather | The included monthly temperature/rain summaries retain NOAA attribution and source inventory/provenance. NOAA-produced environmental data are public domain in the US under [NCEI's Open Data Policy](https://www.ncei.noaa.gov/sites/default/files/2023-12/NCEI%20PD-10-2-02%20-%20Open%20Data%20Policy%20Signed.pdf); the policy distinguishes third-party holdings. No NOAA endorsement is claimed. |
| LVCVA visitation/survey workbooks and visitor-profile PDF/tables | Upstream records permission as blocked. The [publisher terms](https://www.visitlasvegas.com/privacy-policy/) restrict copying beyond personal noncommercial use without permission. These rows/workbooks/PDFs and derived displays of their restricted tables are not included in the current public payload or tracked repository. |
| Missouri Gaming Commission financial workbooks and normalized benchmark tables | Upstream records no established redistribution grant. They are excluded from the tracked/public app. Public availability alone was not treated as permission. |
| Third-party code and fonts | Existing dependency and font notices remain in `docs/FRONTEND_NOTICES.md`; no new packages/assets were introduced. |

Hashes, table names and row counts in source inventories are provenance metadata, not copies of restricted tables. Generating a derivative would not automatically clear restrictions on a blocked input; review rights before adding future third-party-derived displays. The release remains **0.9.0-draft** with organizer calibration and publisher-evidence gaps. This cleanup neither alters those qualifications nor claims organizer release approval.

## Verification after cleanup

The second full `npm run verify` exited **0**:

| Check | Exact post-cleanup result |
| --- | --- |
| Python scientific fixtures | `Ran 11 tests in 0.105s`; `OK` |
| Node tests | 48 tests; 48 pass; 0 fail; duration 2761.7342 ms |
| Simulated-DOM UI | 5 files passed; 41 tests passed; duration 18.65 s |
| TypeScript, including unused checks | Passed |
| Production build | Passed; `built in 531ms`; same advisory chunk warning |
| Combined tests | **100 passed**; one added HTTP regression |

Full post-cleanup output: `%TEMP%\gilded-ace-cleanup-final.log`. Scientific source pipelines were not regenerated: byte-identical prepared data and analytical modules are the preservation check, and the complete scientific, Node, UI and build suites were rerun. Live HTTP/Gemini checks are separate from mocked protocol tests and the existing historical scientific audit records.

After copying this report to `public/docs/`, a final production build also passed (`built in 502ms`). HTTP smoke verification passed for **24 existing resources**, including all three data artifacts and judge-facing documents, plus this report as **resource 25**. Report copies in `docs/`, `public/docs/` and `dist/docs/` match. The final protected hashes and all 12 frontend assets were compared again and remain identical. `git diff --check` passed. Only owned verification servers were stopped; existing user servers were retained.

## Deployment decision and remaining work

**Code/configuration decision: the current commit is technically deployable to Vercel, and the cleaned working tree passes the same checks plus the HTTP regression.** The current GitHub commit does not yet contain these local maintenance patches. Commit/push the reviewed changes before expecting GitHub-triggered deployment to include them. No Vercel deployment, Git push, domain change or Tiger Data integration was performed.

For deployment:

1. Import `NikhilMuvva/gilded-ace-decision-room`; choose production branch `master`, root directory `.`, Vite, Install `npm ci`, Build `npm run build`, Output `dist`.
2. Select Node **26.x**, matching this audit. Vercel currently supports 26.x, 24.x and 22.x; see [supported versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions). No Python build step or `npm run data` belongs in this deployment.
3. Set `GEMINI_API_KEY` privately for the intended Vercel environments; optionally set the existing compatible `GEMINI_MODEL`. Redeploy after changing environment settings. Do not upload `.env.local` or create a `VITE_*` credential.
4. Verify the Vercel preview first, including `node scripts/check_copilot_http.mjs https://YOUR-DEPLOYMENT --expect-live`, machine/map selection, Opportunity Register, Help return, portfolio constraints and document links. An offline answer does not prove the production key works.
5. Before wide public exposure, configure provider quotas/spend controls and appropriate Vercel edge rate controls. The existing six/client/minute and 100/day limiter is **per warm instance** and resets on restart; it is not a durable global cost cap. Same-origin checks are not authentication.
6. Add the GoDaddy-managed domain to Vercel afterward. Keep GoDaddy DNS: use the exact apex A and/or subdomain CNAME records Vercel shows, plus a verification TXT record if requested. Preserve email MX/TXT records. Wait for verification/TLS, then test the custom domain and live API again. Follow [Vercel's domain instructions](https://vercel.com/docs/domains/working-with-domains/add-a-domain) and [GoDaddy's CNAME instructions](https://www.godaddy.com/help/add-a-cname-record-19236); no universal DNS destination is assumed.

Remaining qualifications: actual Vercel/cloud-function and custom-domain checks, real desktop/mobile/keyboard rendering, public cost-control configuration, organizer draft/calibration clearance, and any publisher permissions required for future restricted material. The nonfatal chart bundle advisory remains. Prospective causal effects, operational pilot feasibility and uncertainty remain as documented in the scientific report; maintenance has not changed those conclusions.
