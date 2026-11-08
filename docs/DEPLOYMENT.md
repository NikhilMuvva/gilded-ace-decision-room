# Deployment and GoDaddy domain

This is a static Vite frontend with an optional Node Gemini function. Deploy the sanitized app project, never the `sources/` directory or complete upstream ZIP. The precomputed `public/data/dashboard.json` permits a frontend build without Python or original datasets on the host. Node 22.12+ (tested here with 26.13) and `npm ci` are sufficient. The lockfile is included. Deploying only `dist/` provides offline evidence; live Gemini needs `api/`, `server/`, source modules, included aggregate JSON, and a privately configured server key. See GEMINI_SETUP.md for local/API/Vercel instructions and verification blockers.

## Local production check

```powershell
npm ci
npm run verify
npm run preview -- --port 4173
```

Open `http://127.0.0.1:4173`. The dev equivalent is `npm run dev -- --port 5173`. Opening dist/index.html directly from disk will not load fetch/module assets correctly; use the server. `npm run verify` runs analytical tests, simulated-DOM interactions and the production build. It does not launch a real browser.

## Vercel, with your account

1. From the sanitized project root, run `npx vercel login` and complete sign-in yourself.
2. Run `npx vercel`. Confirm the project root, Vite, build command `npm run build`, output `dist`. This creates the preview deployment; review it.
3. Run `npx vercel --prod` when ready to publish. Alternatively import a repository containing only the sanitized app, with Install `npm ci`, Build `npm run build`, Output `dist`. `vercel.json` describes the static build, data caching and Node function's included JSON files. Set GEMINI_API_KEY privately on the server, never as VITE_*, and verify a real mode=live answer after deployment. Configure durable public rate controls; the built-in limiter is per instance.
4. Copy the returned HTTPS URL and test it in a private browser window, including machine selection, filters, all sections, docs and planner export. Public competition access requires a public production URL without authentication protection.

Current core production alias: https://gilded-ace-decision-room.vercel.app (Vercel READY; owner confirms the immutable URL on cellular). Correct repository and master production branch are connected. GEMINI_API_KEY and GEMINI_MODEL are configured for Preview/Production; live deployed Gemini is still pending. Preview-only hourly variables are DATABASE_URL (reader), TIGER_CA_CERT, TIGER_SCHEMA, TIGER_SERVICE_LABEL and TIGER_TLS_TRUST=provisional-development. No admin database URL or .env file was uploaded. The provisional label is rejected in production. Keep core production unchanged until independently authenticated DB trust and preview checks pass. See SPONSOR_EVIDENCE.md and TIGER_DATA_SETUP.md. Domain actions are on hold; do not purchase, redeem a code or change DNS.

## Keep GoDaddy as DNS provider

1. Vercel project → Settings → Domains → add `yourdomain.com` and `www.yourdomain.com`, or a chosen subdomain such as `dashboard.yourdomain.com`.
2. GoDaddy Domain Portfolio → select the domain → DNS → DNS Records. Use the authoritative DNS provider if the domain's nameservers point elsewhere.
3. For an apex domain, edit/add an **A** record with Name **@**, Value **the IP Vercel shows for this project**, TTL **default**.
4. For `www` or `dashboard`, edit/add a **CNAME** with Name **www** or **dashboard**, Value **the exact CNAME target Vercel shows**, TTL **default**. Do not paste a URL scheme or path. Do not guess a legacy universal Vercel target: current projects may receive unique CNAME destinations.
5. If Vercel requests ownership verification, add its exact **TXT** Name and Value. Choose the canonical domain and redirect the alternative in Vercel.
6. Preserve unrelated email MX/TXT records. Resolve conflicts only at the exact web record being replaced. Wait for Vercel's domain verification and HTTPS certificate provisioning, then recheck the custom domain in a private window.

Official references checked November 7, 2026:

- [Vite static deployment](https://vite.dev/guide/static-deploy.html)
- [Vercel custom domains](https://vercel.com/docs/domains/working-with-domains/add-a-domain)
- [GoDaddy CNAME records](https://www.godaddy.com/en-in/help/add-a-cname-record-19236?locale=en)
- [GoDaddy DNS management](https://help-center.dc-aws.godaddy.com/help/manage-dns-records-680)

## Reproducible source refresh

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python scripts/build_data.py --source "sources/dashboard-royale-main"
.venv\Scripts\python scripts/build_decision_evidence.py
node scripts/build_portfolios.mjs
.venv\Scripts\python scripts/write_deliverables.py
npm run verify
python scripts/package_submission.py
```

On macOS/Linux replace `.venv\Scripts\python` with `.venv/bin/python`. Place the locally supplied upstream archive's contents at the indicated source path first. Rebuilding data requires locally held publisher files; distributing the app does not grant rights to distribute those inputs. The organizer's release-readiness check remains separate from a successful app build.

## Hourly feature release

Deploy the source tree including `api/`, `server/`, `src/` and all three `public/data/*.json` files; the hourly function includes dashboard metadata and uses only the reader connection. SQL migrations/importers remain offline tools, never request-time writes. Production builds require no raw sources or Python. Reader pooling, TLS, limits, exact source binding and setup are documented in TIGER_DATA_SETUP.md. Keep `TIGER_IMPORT_DATABASE_URL` and all local test/admin files out of Vercel. Revalidate the provisional CA independently and rotate the admin password before establishing production trust. New env settings require a new preview build; only promote after trusted HTTPS frontend and both API checks.
