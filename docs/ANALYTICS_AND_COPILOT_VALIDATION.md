# Analytics and copilot implementation status

> This records the earlier targeted pass. Current scientific and live-service verification: [SCIENTIFIC_VALIDATION.json](SCIENTIFIC_VALIDATION.json) and [comprehensive report](COMPREHENSIVE_SCIENTIFIC_REPORT.md).

Initial audit verified November 7, 2026 in the local Windows workspace. The known-good pre-change source archive was preserved as `artifacts/baseline-before-copilot.zip`; the directory has no existing Git repository. Source tables and the primary `dashboard.json` were not rewritten.

On November 8, 2026, after private key configuration, the backend completed a live Gemini tool call and an HTTP request through the Vite proxy, returning the expected M-1158 statistic and evidence link. The new `npm run start:local` command was used to launch both services, tested with a live request, and stopped successfully. A fresh production build, five frontend responses (including the `.env.local` route), startup/request logs and the refreshed submission archives were scanned against the configured key without displaying it; no match was found. All 34 Node tests and 34 simulated-DOM UI tests passed. These local checks do not verify a deployed runtime or real browser rendering.

## Completed

- Independent CSV-source audit: 16 checks, with source hashes and aggregate results in `ALGORITHM_AUDIT.json`. Totals, exposure, payout q, closure comparisons, chronological model selection and loyalty reconciliation match the supplied audit. Exact downtime proxy resampling endpoints differ slightly by seed/scheme and are disclosed rather than tuned to match.
- Parameter register: challenge-fixed, statistical-policy, validation-selected and sensitivity settings documented with retain/change decisions. The weekday forecast, 24h fallback, 5% BH policy, 20-event loyalty support and financial functions remain unchanged.
- Operational improvements: descriptive continuous peer scores/ranks/percentiles and sample/support, fixed-context robustness diagnostics, quieter-weekday maintenance heuristic, explicit action break-even and zero-effect net. No new calibrated failure probability or causal ROI claim.
- Optional copilot: nine allowlisted read-only tools; small current context; real Gemini REST function-calling and structured evidence selection implementation; scoped exact data, units, caveats and links; explicit click to apply navigation; no plan edits. Honest deterministic fallback works on static-only hosting.
- Server controls: private environment key, same-origin browser checks, POST JSON, UTF-8 byte-size cap, input/tool validation, bounded calls/tokens/time, per-instance burst/day limits and safe errors. Durable public controls remain a deployment requirement.
- Submission: all six questions and four judge exploration workflows preserved; evidence appendix updated; 335-word write-up and a 1:58 walkthrough plan including conditional live/offline copilot demonstration. AI disclosure distinguishes implementation, mock tests and absent live verification.

## Executed verification

| Check | Result |
| --- | --- |
| Pre-change `npm run verify` | 46 tests and production build passed |
| Independent `python scripts/audit_algorithms.py` | 16 checks passed from CSV.gz originals |
| Final `npm run verify` | 34 Node analytical/geometry/copilot tests + 34 simulated-DOM UI tests passed; TypeScript and production build passed |
| Scope and protocol review | Multibyte request cap, payout all-placement/family labels and distinct multi-period evidence IDs are covered by regression tests |
| Local real HTTP through Vite proxy | GET 405; same-origin scoped evidence 200; unknown ID 400; cross-origin 403; offline mode correctly identified |
| Production HTTP smoke | 21 resources passed; source artifact, diagnostics and evidence/setup documents available |
| Client asset scan | No Gemini transport URL, `x-goog-api-key` header or Google API-key pattern in bundled JavaScript |
| Initial live Gemini check, Nov 7 | Blocked before a key was configured; superseded by the Nov 8 live check above |
| Computer Use inventory | No browser/native connection available; no visual/touch sign-off |

Security tests include injected instructions, unknown/hallucinated IDs, invalid scope/version, malformed tools, invented evidence IDs and prose, too many calls, upstream quota/errors, timeouts, byte-size/method/origin limits, exact budget/cost calculations and unchanged plan entries. UI tests include every-page entry, explicit navigation, stale-filter invalidation, latest plan context, labeled mock live/offline modes and robustness/peer support views. Mock live tests certify protocol handling only.

Vite retains a nonblocking advisory for the approximately 553kB minified chart vendor chunk. This is not a failed build or a measured browser performance result.

## Outstanding external verification

1. Deploy the sanitized source project with its Node endpoint, included aggregate files and durable public quotas; verify the deployed runtime. No hosting, domain, credentials, registration or DNS changes were made.
2. Complete real laptop/mobile browser, keyboard/screen-reader and physical touch checks. Simulated DOM/CSS assertions cannot certify these.
3. Verify current event-specific Devpost category opt-ins/domain eligibility and supply a nonsecret Gemini project number only if required. Prize qualification is not claimed. Organizer draft-data calibration and publisher-evidence limitations still apply.

See `GEMINI_SETUP.md` for configuration and handoff, `PARAMETER_REGISTER.md` for scientific choices, and `COPILOT_HTTP_CHECKS.json` / `GEMINI_LIVE_CHECK.json` for machine-readable status. Tiger Data is a possible later historical-hourly explorer; it was not provisioned or implemented in this pass.
