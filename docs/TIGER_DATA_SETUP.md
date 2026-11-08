# Hourly Operations Explorer: setup, methods and evidence

> Final TLS update (November 8): Tiger replaced its initial certificate. Fresh certificate-only checks now pass with Node bundled public CA roots and hostname verification (issuer WR1). The original extracted CA remains unauthenticated and is no longer used. Cloud reconciliation and reader permissions passed again over public trust, and the administrator password was rotated and verified. Its replacement is only in ignored .env.tiger-admin-rotated.local; .env.local is unchanged. npm run tiger:import loads that override. Windows libpq uses the ignored .env.tiger-public-roots.pem exported from Node bundled public roots. Preview and Production use the reader and standard public roots, without TIGER_CA_CERT. The owner reports the preview works; desktop public HTTPS/POST probes remain unverified due to certificate interception. This update supersedes older provisional-trust/pending-rotation statements below. Domain actions remain on hold.

Status, November 8, 2026: the feature is implemented and validated against both local TimescaleDB and the actual Tiger Cloud service `gilded-ace-hourly`, database `tsdb`, measured version 2.31.0. The owner explicitly authorized a temporary TOFU exception for this isolated development service. Cloud import, reconciliation, reader permissions and actual API queries passed with `verify-full` and hostname verification enabled. The extracted CA is **provisionally trusted, not independently authenticated**. This exception does not authorize production trust; do not disable certificate or hostname verification.

## Management question and interpretation

Use **Hourly operations** to ask when and where maintenance would interrupt less historically productive play. Choose the global month/zone/bank filters; group by zone, bank, or up to two visible machine selectors (the API permits four); choose gaming-day type and hour; then query. Changed filters invalidate displayed analytical results until the next query. Heatmap buttons select a comparison/window; Help and return retain the result and selections.

Utilization is `sum(occupied_seconds) / sum(available_seconds)`. Theo per available machine-hour is `sum(coin_in_cents × (1 − configured_rtp)) / 100 / (sum(available_seconds) / 3600)`. These are ratios of sums. No available seconds means an unknown rate, never zero opportunity cost. Wagers and payouts are distinct from expected win; the configured RTP is historical game math, not the observed payout ratio.

For a nominal one-to-four-hour clock template, sum the selected hourly theo rates to estimate the opportunity debit for one exposure-weighted representative machine. Show the least/highest debit templates and minimum support. This is not a full-bank outage price or a causal profit estimate. Check each target, available staff/parts, access, lead time, guest displacement and actual elapsed hours. Catalog relocations still start at 06:00. The explorer does not change the investment engine, effect assumptions or chosen portfolio.

## Source and temporal attribution

The official `machine_hour.parquet` contains 1,321,908 rows and 17 fields. SHA-256: `5916c0fa6b758350e8d60b188f8e4a8987868d053628a9c44bce574a6414aaf9`. Source-manifest SHA-256: `1a59c68ed4f4b2eb0f875c8e169effd5686fbc98a94a09ac170b8f22bad836e2`. Raw source files remain local, ignored and unchanged; neither Vercel nor source ZIPs contain them.

The schema preserves the source names: machine_id; hour_start_utc; hour_start_local; local_hour; utc_offset; gaming_date; location_id; active; available_seconds; occupied_seconds; paid_spins; payout_positive_spins; coin_in_cents; payout_cents; carded_coin_in_cents; carded_payout_cents; carded_spins. Monetary meters and duration meters remain integer cents/seconds; RTP and theoretical cents use exact PostgreSQL numeric arithmetic. The unique grain is `(machine_id, hour_start_utc)`.

Preprocessing performs a LEFT temporal join on machine, source location and `from <= timestamp < to`. It appends placement/configuration, game-math RTP, historical zone/bank and calendar weekend. Gaps or overlaps fail validation; rows are never silently discarded or assigned the machine's present location. UTC source timestamps are explicitly interpreted as UTC and imported as TIMESTAMPTZ. Las Vegas local timestamps remain wall-clock values. The 06:00 local gaming day determines dates and weekends; March 8's gaming day is 23 elapsed hours, and March 9 has no local 02:00. Installation/retirement bounds are checked. Queries use UTC gaming-day bounds plus explicit gaming-date predicates.

`db/tiger/001_hourly.sql` uses `create_hypertable` with seven-day `by_range` partitions, the unique time key and zone/time and bank/time indexes. A bank/hour continuous aggregate uses UTC `time_bucket('1 hour', ...)` and pre-attributed dimensions. It has no joins or timezone conversion inside the aggregate. WITH NO DATA plus one explicit, complete refresh suits this immutable historical release; there is no retention or recurring-refresh infrastructure. Zone/bank queries use this summary. Machine profiles use the indexed raw hypertable; another machine/hour aggregate would duplicate the original grain. Syntax was executed against TimescaleDB 2.31.0; the importer requires >=2.13.

## Reproduce safely

Install Python requirements with your chosen Python environment, then `npm ci`. Node loads ignored environment files and passes secrets through the child environment, never command arguments. Set `PYTHON` to a virtual-environment executable if needed.

```powershell
npm run tiger:source
# With independently authenticated trust, or the owner's documented dev-only exception:
npm run tiger:import -- --create-reader
```

Keep `TIGER_IMPORT_DATABASE_URL` only in ignored `.env.local`. Use `TIGER_SSLROOTCERT` for the CA PEM path, or `system` when the chain is publicly trusted. The current extracted CA fingerprint is `38:47:59:BA:25:A9:0B:52:CC:A7:B9:32:BB:27:6B:64:92:6B:70:6B:CF:AA:75:4D:D5:A1:D9:AC:D6:66:A3:49`; its subject alone does not authenticate it. The owner's temporary exception is limited to this development service. Its generated reader file records `TIGER_TLS_TRUST=provisional-development`; the API rejects that setting when VERCEL_ENV=production. Obtain Tiger confirmation or a publicly trusted certificate, replace/revalidate trust, and rotate the administrator password afterward. No `sslmode=require` fallback or global TLS change is used.

The importer verifies eight input file hashes/schema, stages 25,000 rows per transaction, retries safe transient failures, inserts with the source primary key/ON CONFLICT, refreshes and reconciles, and marks dataset_state verified only after success. Re-running a verified import checks reconciliation and processes zero new rows. A different source binding is rejected; use a separate schema rather than silently replacing a release.

`--create-reader` generates a separate `gilded_hourly_reader` credential in ignored `.env.tiger-reader.local`, with schema USAGE and SELECT only on machine_hour, bank_hourly and dataset_state, no superuser/create privileges, and default read-only transactions. An existing role is not silently rotated. Never paste the file into chat or deploy the administrator URL.

For local-only validation with Docker Desktop running:

```powershell
npm run tiger:local
node --env-file-if-exists=.env.tiger-test.local scripts/tiger.mjs import --create-reader --reader-output .env.tiger-local-reader.local --output docs/TIGER_LOCAL_DATABASE_VALIDATION.json
npm run test:tiger:db
node --env-file-if-exists=.env.tiger-local-reader.local scripts/tiger.mjs benchmark --output docs/TIGER_LOCAL_QUERY_BENCHMARK.json
```

This pins `timescale/timescaledb:2.31.0-pg17`, binds only loopback port 55432, and creates labeled local-validation credentials in ignored files. Its explicit non-TLS loopback allowance is rejected in Vercel and for any remote host. It is never a production setting. Keep the local reader distinct from the Cloud reader.

For the dashboard, Gemini and Cloud reader, `npm run start:local` securely loads `.env.local` and optional `.env.tiger-reader.local` only in the API process. The frontend process excludes server credentials. To test the separate local database without changing either file, start the API with the local reader environment and run Vite in another terminal:

```powershell
node --env-file-if-exists=.env.local --env-file-if-exists=.env.tiger-local-reader.local scripts/dev_api.mjs
npm run dev
node scripts/check_tiger_http.mjs http://127.0.0.1:5173 --allow-local
```

## Serverless configuration and limits

Set Vercel **server-only** `DATABASE_URL` from the Cloud reader, `TIGER_SCHEMA=dashboard_hourly`, `TIGER_SERVICE_LABEL=gilded-ace-hourly`, and, when needed, independently authenticated `TIGER_CA_CERT` as PEM text. Do not set a Windows CA path on Vercel. Do not upload TIGER_IMPORT_DATABASE_URL, test/admin/local credentials, local insecure flags, .env files or raw Parquet. Gemini's existing GEMINI_API_KEY and GEMINI_MODEL remain server-only and separate.

Current development preview configuration uses the reader and CA only in **Preview**, with TIGER_TLS_TRUST=provisional-development. `scripts/configure_vercel_tiger.mjs` sends five explicit values through stdin without printing them and cannot target Production. Production retains the tested core deployment and Gemini configuration; no database administrator URI or provisional database trust is deployed there. Promote the hourly feature only after preview testing and independently authenticated trust.

`/api/hourly` accepts only bounded POST JSON and same-origin browser requests. It validates known months/zone/bank/machines/projections and uses bound SQL values, a validated schema identifier, a read-only transaction, 8-second SQL timeout, 10-second client query timeout, 6,000-row and 1.8MB limits, four-machine limit, and at most January–June 2025. A global pg Pool has max 2, five-second idle/connect timeouts, release in finally and Vercel attachDatabasePool lifecycle support. Connection-string SSL overrides cannot disable verification. Provider errors and credentials never reach clients or logs. Unavailable service yields honest 503; the original dashboard still uses its existing derived JSON.

A warm-instance cache holds at most 64 results for five minutes; clients remain `no-store`. The limiter is 20/client/minute per warm instance, not a durable global quota. Configure appropriate Vercel firewall controls and provider-side connection/resource limits for public exposure. Gemini retains its separate existing limiter; set Google project quota and billing alerts, and a supported project spend limit/stop mechanism rather than treating alerts as a hard cap. No account-wide quota change is claimed.

## Actual reconciliation and benchmark results

See TIGER_SOURCE_VALIDATION.json (22 checks), TIGER_LOCAL_DATABASE_VALIDATION.json, TIGER_LOCAL_REPEAT_VALIDATION.json and TIGER_LOCAL_HTTP_CHECK.json. Local import: 1,321,908 rows; 55,092 active machine-days. Maximum differences in scheduled/available/occupied seconds, wagers/payout cents and theoretical cents were all **zero**. Integer meters require exact equality; theoretical cents tolerance is 0.000001 cent to accommodate cross-engine decimal representation. Raw/CAGG outputs matched exactly across 2,448 bank/hour/day-type cells. HTTP conversion/summation permits 0.000001 USD and 0.000001 hours; complete all-zone totals and selected-machine raw queries passed through the actual local endpoint.

Five alternating measured runs after one warm-up per equivalent query used EXPLAIN ANALYZE database execution times, not HTTP cache latency. Results from the actual local instance:

| Scope | Raw records / aggregate rows | Result rows | Raw median ms | CAGG median ms | Ratio |
|---|---:|---:|---:|---:|---:|
| Jan–Jun all zones | 1,321,908 / 219,526 | 336 | 165.438 | 30.217 | 5.475× |
| Jan–Jun Back Forty | 204,937 / 34,744 | 48 | 44.548 | 14.394 | 3.095× |
| March weekends | 72,084 / 11,998 | 168 | 21.882 | 7.173 | 3.051× |

All complete result sets were equal. TIGER_LOCAL_QUERY_BENCHMARK.json contains every local run. The same actual five-run benchmark on the development Tiger Cloud service, using its separate reader, also passed complete output equality:

| Scope | Raw median ms | CAGG median ms | Observed ratio |
|---|---:|---:|---:|
| Jan–Jun all zones | 524.682 | 73.853 | 7.104× |
| Jan–Jun Back Forty | 124.790 | 20.733 | 6.019× |
| March weekends | 40.444 | 11.535 | 3.506× |

Scope/record/result counts match the local table. TIGER_QUERY_BENCHMARK.json records all Cloud runs. These are observed database execution times under this development workload/cache, not HTTP latency, a controlled hardware comparison or a guaranteed speedup.

TIGER_DATABASE_VALIDATION.json records the Cloud import of 1,321,908 rows in 86.630 seconds and zero daily meter differences with the same tolerances; TIGER_REPEAT_VALIDATION.json processes zero new rows. TIGER_READER_CHECK.json confirms the actual Cloud role is non-admin, can SELECT and receives SQLSTATE 42501 for a no-op UPDATE even in a read-write transaction. TIGER_HTTP_CHECK.json records successful all-zone and machine queries through a local HTTP API backed by Cloud: 336 aggregate result cells and exact source binding. The response visibly labels provisional development trust. This is actual Cloud-backed API evidence, not a successful public Vercel endpoint claim.

Automated coverage includes independent Parquet DST/06:00/placement fixtures and rejected gaps/overlaps/checksum tampering, actual isolated TimescaleDB migration/CAGG/reader-denial fixtures, parameterization/hostile filters/TLS guards/HTTP failures/cache/rate checks, and UI query/Help/stale/failure behavior. Simulated DOM tests are not a browser visual sign-off. Gemini does not query Tiger SQL and cannot invent an hourly result.

Official references: [Tiger hypertables](https://www.tigerdata.com/docs/api/latest/hypertable/create_hypertable/), [continuous aggregates](https://www.tigerdata.com/docs/use-timescale/latest/continuous-aggregates/create-a-continuous-aggregate/), [refresh](https://www.tigerdata.com/docs/api/latest/continuous-aggregates/refresh_continuous_aggregate/), [strict SSL](https://d1ovb29l12vjqm.cloudfront.net/use-timescale/latest/security/strict-ssl/), [Vercel pooling](https://vercel.com/kb/guide/connection-pooling-with-functions). Consult actual service version and independently authenticated trust material before deployment.
