// Actual API-backed reconciliation; no database credentials are read by this client.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
const base = process.argv[2] || "http://127.0.0.1:5173";
const allowLocal = process.argv.includes("--allow-local");
const data = JSON.parse(await readFile(new URL("../public/data/dashboard.json", import.meta.url), "utf8"));
const source = JSON.parse(await readFile(new URL("../docs/TIGER_SOURCE_VALIDATION.json", import.meta.url), "utf8"));
const filters = { start: "2025-01", end: "2025-06", zone: "all", bank: "all", machineIds: [], groupBy: "zone", dayType: "all", hour: "all" };
const send = async (body) => {
  const response = await fetch(base + "/api/hourly", { method: "POST", headers: { "Content-Type": "application/json", Origin: new URL(base).origin }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200);return response.json();
};
try {
  const result = await send(filters);
  assert.equal(result.mode, "database");assert.equal(result.manifestSha256, data.sourceManifestSha256);
  if (!allowLocal) assert.equal(result.environment, "Tiger Cloud", "A local TimescaleDB result is not Tiger Cloud deployment proof.");
  assert.equal(result.importedRows, 1321908);
  const sum = (key) => result.rows.reduce((s, r) => s + r[key], 0);
  assert.equal(sum("records"), Number(source.totals.records));
  for (const [key, expected, tolerance] of [["coinInUsd", Number(source.totals.coinInCents) / 100, 1e-6], ["theoUsd", Number(source.totals.theoCents) / 100, 1e-6], ["payoutUsd", Number(source.totals.payoutCents) / 100, 1e-6], ["availableHours", Number(source.totals.availableSeconds) / 3600, 1e-6], ["occupiedHours", Number(source.totals.occupiedSeconds) / 3600, 1e-6], ["downtimeHours", Number(source.totals.downtimeSeconds) / 3600, 1e-6]]) assert.ok(Math.abs(sum(key) - expected) <= tolerance, key);
  const machines = await send({ ...filters, groupBy: "machine", machineIds: ["M-1158", "M-1241"] });
  assert.equal(machines.queryRelation, "raw hypertable");assert.deepEqual([...new Set(machines.rows.map((r) => r.entity))].sort(), ["M-1158", "M-1241"]);
  const report = { status: "passed", base, environment: result.environment, source: result.source, service: result.service, tlsTrust: result.tlsTrust,
    importedRows: result.importedRows, resultCells: result.rows.length, sourceManifestSha256: result.manifestSha256,
    totals: { coinInUsd: sum("coinInUsd"), theoUsd: sum("theoUsd"), availableHours: sum("availableHours"), occupiedHours: sum("occupiedHours"), downtimeHours: sum("downtimeHours") },
    monetaryToleranceUsd: 1e-6, durationToleranceHours: 1e-6, machineComparisonVerified: true,
    qualification: "Actual HTTP/database queries. Local validation is separately labeled; no browser/rendering or causal-ROI claim." };
  await writeFile(new URL(allowLocal ? "../docs/TIGER_LOCAL_HTTP_CHECK.json" : "../docs/TIGER_HTTP_CHECK.json", import.meta.url), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report));
} catch { console.log("FAIL: Tiger HTTP/database reconciliation did not pass; no provider details or credentials returned.");process.exitCode = 1; }
