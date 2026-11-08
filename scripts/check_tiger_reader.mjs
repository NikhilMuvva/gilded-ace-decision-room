// Actual reader privileges check: the attempted no-op UPDATE must be denied.
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { Pool } from "pg";
import { databaseConfig } from "../server/hourly-db.mjs";
import { safeSchema } from "../server/hourly-query.mjs";
const schema = safeSchema(process.env.TIGER_SCHEMA), pool = new Pool(databaseConfig(process.env));
try {
  const client = await pool.connect();
  try {
    const role = (await client.query("SELECT r.rolsuper,r.rolcreatedb,r.rolcreaterole FROM pg_roles r WHERE rolname=current_user")).rows[0];
    assert.equal(role.rolsuper, false); assert.equal(role.rolcreatedb, false); assert.equal(role.rolcreaterole, false);
    const grants = (await client.query("SELECT has_table_privilege(current_user,$1,'SELECT') AS read,has_table_privilege(current_user,$1,'INSERT,UPDATE,DELETE,TRUNCATE') AS write", [schema + ".machine_hour"])).rows[0];
    assert.equal(grants.read, true); assert.equal(grants.write, false);
    await client.query("BEGIN READ WRITE"); let denied = false;
    try { await client.query(`UPDATE ${schema}.machine_hour SET coin_in_cents=coin_in_cents WHERE false`); }
    catch (e) { denied = e?.code === "42501"; }
    finally { await client.query("ROLLBACK"); }
    assert.ok(denied, "Reader must be denied a write by privileges, even in a read-write transaction.");
    const count = Number((await client.query(`SELECT count(*) AS n FROM ${schema}.machine_hour`)).rows[0].n);
    const local = ["127.0.0.1", "localhost", "[::1]"].includes(new URL(process.env.DATABASE_URL).hostname);
    const report = { status: "passed", environment: local ? "local-validation" : "Tiger Cloud development service", tlsTrust: process.env.TIGER_TLS_TRUST || "configured-trust", schema, importedRows: count, nonAdminRole: true, selectAllowed: true, writeDeniedSqlstate: "42501", dataModified: false };
    await writeFile(new URL(local ? "../docs/TIGER_LOCAL_READER_CHECK.json" : "../docs/TIGER_READER_CHECK.json", import.meta.url), JSON.stringify(report, null, 2) + "\n");
    console.log(JSON.stringify(report));
  } finally { client.release(); }
} catch { console.log("FAIL: reader privilege verification did not pass; no provider details or credentials displayed."); process.exitCode = 1; }
finally { await pool.end(); }
