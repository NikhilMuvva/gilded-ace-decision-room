import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { randomBytes } from "node:crypto";
import { Client } from "pg";
import { databaseConfig, queryHourly } from "../server/hourly-db.mjs";
import { normalizeHourlyRequest, buildHourlyQuery } from "../server/hourly-query.mjs";

test("real TimescaleDB fixtures: continuous aggregate equality, DST, temporal placement, read-only role", { skip: !process.env.TIGER_TEST_DATABASE_URL }, async () => {
  const suffix = randomBytes(6).toString("hex"), schema = "gilded_hourly_test_" + suffix, role = "gilded_reader_test_" + suffix;
  const client = new Client(databaseConfig({ ...process.env, DATABASE_URL: process.env.TIGER_TEST_DATABASE_URL, TIGER_ALLOW_INSECURE_LOCALHOST: "true" }));
  await client.connect();let roleCreated = false;
  try {
    const version = (await client.query("SELECT extversion FROM pg_extension WHERE extname='timescaledb'")).rows[0]?.extversion;
    assert.ok(version);await client.query(fs.readFileSync(new URL("../db/tiger/001_hourly.sql", import.meta.url), "utf8").replaceAll("__SCHEMA__", schema));
    const rows = [
      ["m1", "2025-03-09T09:00:00Z", "2025-03-09 01:00:00", 1, "-08:00", "2025-03-08", "l1", 3600, 1800, 10000, "z1", "b1", true],
      ["m1", "2025-03-09T10:00:00Z", "2025-03-09 03:00:00", 3, "-07:00", "2025-03-08", "l1", 1800, 900, 20000, "z1", "b1", true],
      ["m1", "2025-03-09T13:00:00Z", "2025-03-09 06:00:00", 6, "-07:00", "2025-03-09", "l2", 0, 0, 0, "z2", "b2", true],
      ["m2", "2025-03-09T09:00:00Z", "2025-03-09 01:00:00", 1, "-08:00", "2025-03-08", "l1", 3600, 3600, 5000, "z1", "b1", true],
      ["m2", "2025-03-10T13:00:00Z", "2025-03-10 06:00:00", 6, "-07:00", "2025-03-10", "l1", 3600, 900, 10000, "z1", "b1", false],
    ];
    for (const r of rows) await client.query(`INSERT INTO ${schema}.machine_hour(machine_id,hour_start_utc,hour_start_local,local_hour,utc_offset,gaming_date,location_id,available_seconds,occupied_seconds,coin_in_cents,zone_id,bank_id,is_weekend,active,paid_spins,payout_positive_spins,payout_cents,carded_coin_in_cents,carded_payout_cents,carded_spins,placement_id,config_id,configured_rtp)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,true,1,0,0,0,0,0,'placement','g',0.9)`, r);
    await client.query(`CALL refresh_continuous_aggregate('${schema}.bank_hourly','2025-03-01'::timestamptz,'2025-04-01'::timestamptz)`);
    await client.query(`INSERT INTO ${schema}.dataset_state(singleton,schema_version,source_version,manifest_sha256,machine_hour_sha256,expected_rows,imported_rows,verified) VALUES(true,1,'fixture','fixture','fixture',5,5,true)`);
    const data = { months: ["2025-03"], zones: [{ zone_id: "z1" }, { zone_id: "z2" }], locations: [{ bank_id: "b1" }, { bank_id: "b2" }], machines: [{ id: "m1" }, { id: "m2" }], sourceManifestSha256: "fixture" };
    const filters = normalizeHourlyRequest({ start: "2025-03", end: "2025-03" }, data);
    const raw = await client.query(buildHourlyQuery(filters, { schema, raw: true }));
    const agg = await client.query(buildHourlyQuery(filters, { schema }));
    // COUNT (bigint) and SUM(bigint) (numeric) have different pg JS decoders.
    const normalized = (rs) => rs.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, ["entity_id", "is_weekend"].includes(k) ? v : Number(v)])));
    assert.deepEqual(normalized(raw.rows), normalized(agg.rows));
    assert.equal(raw.rows.some((r) => r.local_hour === 2), false);
    const profile = await client.query(buildHourlyQuery({ ...filters, groupBy: "machine", machineIds: ["m1"] }, { schema }));
    assert.equal(profile.rows.length, 3);
    const historical = await client.query(`SELECT zone_id FROM ${schema}.machine_hour WHERE machine_id='m1' ORDER BY hour_start_utc`);
    assert.deepEqual(historical.rows.map((r) => r.zone_id), ["z1", "z1", "z2"]);
    await client.query(`CREATE ROLE ${role} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE`);roleCreated = true;
    await client.query(`GRANT USAGE ON SCHEMA ${schema} TO ${role}`);
    await client.query(`GRANT SELECT ON ALL TABLES IN SCHEMA ${schema} TO ${role}`);
    await client.query(`SET ROLE ${role}`);
    await assert.rejects(() => client.query(`UPDATE ${schema}.machine_hour SET coin_in_cents=0`), (e) => e.code === "42501");
    const result = await queryHourly(filters, data, { env: { TIGER_SCHEMA: schema }, pool: { connect: async () => ({ query: (...args) => client.query(...args), release() {} }) } });
    assert.equal(result.rows.reduce((s, r) => s + r.records, 0), 5);
    assert.equal(result.rows.reduce((s, r) => s + r.coinInUsd, 0), 450);
    assert.equal(result.rows.find((r) => r.entity === "z2").theoPerAvailableHour, null);
    await client.query("RESET ROLE");
  } finally {
    try { await client.query("ROLLBACK"); await client.query("RESET ROLE");
      if (!/^gilded_hourly_test_[a-f0-9]{12}$/.test(schema)) throw Error("Unsafe fixture cleanup target");
      await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      if (roleCreated) await client.query(`DROP ROLE ${role}`);
    } finally { await client.end(); }
  }
});
