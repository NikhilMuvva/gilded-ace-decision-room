import test from "node:test";
import assert from "node:assert/strict";
import { normalizeHourlyRequest, buildHourlyQuery, safeSchema } from "../server/hourly-query.mjs";
import { databaseConfig, queryHourly } from "../server/hourly-db.mjs";
import { makeHourlyHandler } from "../server/hourly-handler.mjs";
import { hourlyMetrics, hourProfile, maintenanceWindows } from "../src/hourly.mjs";
const data = { months: ["2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06"], zones: [{ zone_id: "z" }], locations: [{ bank_id: "b" }], machines: [{ id: "m" }], sourceManifestSha256: "fixture" };
const body = { start: "2025-01", end: "2025-06", groupBy: "zone" };
const cell = { entity_id: "z", local_hour: 3, is_weekend: true, records: "2", available_seconds: "7200", occupied_seconds: "1800", coin_in_cents: "10000", payout_cents: "9000", theo_cents: "1000" };
test("hourly filters strictly bound period, identifiers, projection and request shape", () => {
  assert.equal(normalizeHourlyRequest(body, data).hour, "all");
  for (const patch of [{ end: "2025-07" }, { start: "2025-06", end: "2025-01" }, { zone: "z';DROP TABLE x;--" }, { bank: "other" }, { machineIds: ["missing"] }, { machineIds: ["m", "m"] }, { hour: 24 }, { dayType: "holiday" }, { groupBy: "machine" }, { sql: "SELECT 1" }])
    assert.throws(() => normalizeHourlyRequest({ ...body, ...patch }, data));
  assert.throws(() => safeSchema("public;DROP SCHEMA public"));
});
test("SQL uses bound values, UTC bounds with a 06:00 Los Angeles boundary and effective pre-attribution", () => {
  const filters = normalizeHourlyRequest({ ...body, zone: "z", bank: "b" }, data);
  const query = buildHourlyQuery(filters);
  assert.match(query.text, /bank_hourly/); assert.match(query.text, /TIME '06:00'.*AT TIME ZONE 'America\/Los_Angeles'/);
  assert.equal(query.values[1], "2025-07-01"); assert.equal(query.values[2], "z");
  const raw = buildHourlyQuery({ ...filters, machineIds: ["m';DROP TABLE x;--"], groupBy: "machine" });
  assert.match(raw.text, /machine_hour/);assert.match(raw.text, /machine_id=ANY\(\$5::text\[\]\)/);
  assert.equal(raw.text.includes("DROP TABLE"), false);assert.equal(raw.values[4][0], "m';DROP TABLE x;--");
  assert.match(raw.text, /LIMIT 6001/);
});
test("remote TLS verification cannot be disabled with URL parameters or the local-test flag", () => {
  const c = databaseConfig({ DATABASE_URL: "postgresql://reader:fixture@service.tsdb.cloud.timescale.com/tsdb?sslmode=disable&ssl=false", TIGER_ALLOW_INSECURE_LOCALHOST: "true" });
  assert.equal(c.ssl.rejectUnauthorized, true);assert.equal(c.connectionString.includes("sslmode"), false);assert.equal(c.max, 2);
  assert.equal(databaseConfig({ DATABASE_URL: "postgresql://reader:fixture@127.0.0.1/test", TIGER_ALLOW_INSECURE_LOCALHOST: "true" }).ssl, false);
  assert.equal(databaseConfig({ DATABASE_URL: "postgresql://reader:fixture@127.0.0.1/test", TIGER_ALLOW_INSECURE_LOCALHOST: "true", VERCEL: "1" }).ssl.rejectUnauthorized, true);
  assert.throws(() => databaseConfig({ DATABASE_URL: "postgresql://reader:fixture@database.example/test", TIGER_TLS_TRUST: "provisional-development", VERCEL_ENV: "production" }), /development_trust_not_allowed/);
});
test("hourly metrics use cents and ratio-of-sums; zero availability is unknown, not free work", () => {
  const a = hourlyMetrics(cell);assert.equal(a.theoUsd, 10);assert.equal(a.theoPerAvailableHour, 5);assert.equal(a.utilization, 0.25);
  assert.equal(hourlyMetrics({ ...cell, available_seconds: 0, occupied_seconds: 0 }).theoPerAvailableHour, null);
  const rows = [{ entity: "z", hour: 3, records: 1, availableHours: 1, occupiedHours: 0.5, theoUsd: 10 }, { entity: "z", hour: 3, records: 9, availableHours: 9, occupiedHours: 1, theoUsd: 90 }];
  assert.equal(hourProfile(rows, "z")[3].utilization, 0.15);
  assert.equal(hourProfile(rows, "z")[2].theoPerAvailableHour, null);
});
test("maintenance templates wrap midnight and refuse windows without available-time support", () => {
  const rows = Array.from({ length: 24 }, (_, hour) => ({ entity: "m", hour, records: 30, availableHours: 30, occupiedHours: 10, theoUsd: 30 * (hour === 23 ? 1 : hour === 0 ? 2 : 10) }));
  assert.equal(maintenanceWindows(rows, "m", 2).low.start, 23);
  assert.equal(maintenanceWindows(rows, "m", 2).low.theoDebitPerRepresentativeMachine, 3);
  assert.equal(maintenanceWindows([], "m", 2).low, null);assert.throws(() => maintenanceWindows(rows, "m", 5));
});
test("database queries enforce read-only transactions, source binding, bounds and connection release", async () => {
  const calls = [];let released = false;
  const client = { query: async (q) => { calls.push(q);return { rows: typeof q === "string" && q.startsWith("SELECT source_version") ? [{ verified: true, manifest_sha256: "fixture", expected_rows: 2, imported_rows: 2, source_version: "test" }] : typeof q === "object" ? [cell] : [] }; }, release: () => { released = true; } };
  const result = await queryHourly(normalizeHourlyRequest(body, data), data, { env: {}, pool: { connect: async () => client } });
  assert.equal(calls[0], "BEGIN READ ONLY");assert.ok(calls.includes("SET LOCAL statement_timeout='8000ms'"));assert.ok(calls.includes("COMMIT"));assert.ok(released);assert.equal(result.rows[0].theoUsd, 10);
  client.query = async (q) => ({ rows: typeof q === "string" && q.startsWith("SELECT source_version") ? [{ verified: false }] : [] });
  await assert.rejects(() => queryHourly(normalizeHourlyRequest(body, data), data, { env: {}, pool: { connect: async () => client } }), /unverified_dataset/);
});
const invoke = async (h, patch = {}) => {
  const req = { method: "POST", headers: { host: "test.local", origin: "https://test.local", "content-type": "application/json" }, socket: { remoteAddress: "local" }, body, ...patch };
  const r = { statusCode: 0, headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = JSON.parse(b); } };
  await h(req, r);return r;
};
test("hourly HTTP boundary rejects malformed/hostile requests and labels failure honestly", async () => {
  const h = makeHourlyHandler({ loadData: async () => data, query: async () => { throw Error("postgresql://private:do-not-return@host/db"); }, env: {} });
  assert.equal((await invoke(h, { method: "GET" })).statusCode, 405);
  assert.equal((await invoke(h, { headers: { host: "test.local", origin: "https://evil.test" } })).statusCode, 403);
  assert.equal((await invoke(h, { body: "invalid" })).statusCode, 400);
  assert.equal((await invoke(h, { body: { ...body, x: "x".repeat(5000) } })).statusCode, 413);
  assert.equal((await invoke(h, { body: { ...body, sql: "DELETE" } })).statusCode, 400);
  const failed = await invoke(h);assert.equal(failed.statusCode, 503);assert.equal(failed.body.mode, "unavailable");assert.equal(JSON.stringify(failed.body).includes("do-not-return"), false);
  assert.equal(failed.headers["Cache-Control"], "no-store");
  const oversized = makeHourlyHandler({ loadData: async () => data, query: async () => ({ mode: "database", rows: [], unsafeSize: "x".repeat(1800000) }), env: {} });
  assert.equal((await invoke(oversized)).statusCode, 503);
});
test("hourly cache and rate bounds never create database-looking fallback results", async () => {
  let queried = 0;
  const h = makeHourlyHandler({ loadData: async () => data, query: async () => { queried++; return { mode: "database", rows: [cell] }; }, env: {} });
  assert.equal((await invoke(h)).body.cached, false);assert.equal((await invoke(h)).body.cached, true);assert.equal(queried, 1);
  for (let i = 0; i < 18; i++) await invoke(h);
  assert.equal((await invoke(h)).statusCode, 429);
});
