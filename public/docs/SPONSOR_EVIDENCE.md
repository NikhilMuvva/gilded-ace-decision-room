# Sponsor evidence and release status — November 8, 2026

## Core application

Core commit `8cc7cfaef1618a9b8c0054d3329b79dd1bc78e41` is pushed on master and preserved by local tag `core-financial-ready-2026-11-08`. It passed all 107 baseline tests before sponsor work. It retains the financial recommendation of $0 spend / $100,000 reserve and separate $13,900 experimental backup. Vercel project `gilded-ace-decision-room` is connected to `NikhilMuvva/gilded-ace-decision-room`, production branch master. Framework Vite, npm ci, npm run build, dist, Node 26.x.

Vercel reports deployment `dpl_2s8bmX4kUgV3nqqFeX4yCkXGNP8j` READY with target production and matching gitCommitSha. Public alias: **https://gilded-ace-decision-room.vercel.app**. Immutable deployment: **https://gilded-ace-decision-room-2q854oj0m-nikhil-ee0d.vercel.app**. The owner confirms the latter opens on a phone using cellular data. This is an owner-reported public frontend check, not an automated desktop/API pass. Keep this core release while the new feature remains on a separate branch.

This desktop encounters certificate interception/filtering. Trusting the independently downloaded official Cisco root in a diagnostic client allowed verification of a Cisco Umbrella 403 block page; that was not an app success. No TLS verification was disabled for app requests, no network filter bypassed, and no live API response was obtained from the deployment. Resolve network access with its authorized administrator or use an ordinary trusted connection.

## Gemini

GEMINI_API_KEY and GEMINI_MODEL are configured as Vercel Secrets for Preview and Production; values were not displayed, logged or sent to the browser. The user's original .env.local was not overwritten. The admin Tiger URL has not been uploaded. The server uses existing read-only evidence functions; the model cannot modify portfolios or execute SQL.

Actual local HTTP/Gemini regression on the built frontend passed primary financial retrieval, the separate experimental backup and machine diagnostics; see SCIENTIFIC_LIVE_CHECK.json and COPILOT_HTTP_CHECKS.json for their exact origin and mode. **Production Gemini is pending:** do not translate local success or configured variables into a live deployed API pass. The owner will test from cellular. Accept a real trusted-HTTPS POST with mode=live and matching evidence before marking complete. Check M-1158, operational findings, $0/$100,000 financial recommendation, $13,900 alternative and uncertainty.

## Tiger Data

Actual service: `gilded-ace-hourly` / tsdb / measured TimescaleDB 2.31.0. The owner explicitly authorized temporary TOFU for this isolated development database. All 1,321,908 rows imported; all 55,092 active machine-days reconcile with zero meter differences, and raw/CAGG results are equal. Repeated validation adds no duplicates. A distinct reader role was tested: SELECT succeeds; UPDATE is denied with SQLSTATE 42501. The administrator URL stays local. Certificate and hostname verification remain enabled, but the CA fingerprint is provisionally trusted, not independently authenticated; revalidate/replace trust and rotate the administrator password after Tiger confirmation.

The feature and secure API are implemented. Actual Cloud-backed local HTTP all-zone and selected-machine queries passed. Five-run raw/CAGG Cloud median ratios were 7.104× full property, 6.019× Back Forty and 3.506× March weekends. A separate full local database also passed, with distinctly named TIGER_LOCAL_* evidence. See TIGER_DATA_SETUP.md and TIGER_* JSON records for precise scopes, counts, tolerances and timings. Preview-only Vercel reader/CA configuration carries the provisional-development label; production rejects that label. A public Vercel hourly query remains unverified. Do not claim a completed public integration from local HTTP success.

## GoDaddy Registry

The owner will register a domain manually and has placed all domain actions on hold. No code redemption, transaction, DNS/nameserver change or sponsor contact is authorized. Earlier research conditionally preferred `gildedace.design`; event eligibility/checkout terms remain unverified. No ownership or custom-domain HTTPS is claimed. GODADDY_DOMAIN.md records the research and handoff; await the owner's registered name and integration authorization.

## Submission readiness

Dashboard Royale core: implemented, baseline tested, deployed READY; owner confirms cellular frontend access. Organizer draft-data/publication constraints, desktop/mobile visual review and final judging walkthrough remain separate. Gemini prize: implemented and locally live-tested, production live check pending. Tiger prize: actual Cloud import/reconciliation/reader/API and benchmarks passed under authorized provisional development trust; public preview/API verification and production trust remain pending. Domain prize: registration/eligibility on hold with the owner. Do not claim pending checks complete from documentation alone.
