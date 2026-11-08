import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";
import { safeSchema, buildHourlyQuery } from "./hourly-query.mjs";
import { hourlyMetrics, HOURLY_LIMIT } from "../src/hourly.mjs";
let pool;
export function databaseConfig(env) {
  if (!env.DATABASE_URL) throw Error("not_configured");
  if (env.TIGER_TLS_TRUST === "provisional-development" && env.VERCEL_ENV === "production") throw Error("development_trust_not_allowed_in_production");
  const url = new URL(env.DATABASE_URL);
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname) throw Error("invalid_database_configuration");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const testOnly = local && env.TIGER_ALLOW_INSECURE_LOCALHOST === "true" && !env.VERCEL;
  // pg connection-string SSL options can otherwise override rejectUnauthorized.
  for (const key of ["sslmode", "sslrootcert", "sslcert", "sslkey", "ssl", "uselibpqcompat"]) url.searchParams.delete(key);
  const file = env.TIGER_CA_CERT_FILE || (env.TIGER_SSLROOTCERT !== "system" ? env.TIGER_SSLROOTCERT : null);
  const ca = env.TIGER_CA_CERT?.replace(/\\n/g, "\n") || (file ? readFileSync(file, "utf8") : undefined);
  return { connectionString: url.toString(), ssl: testOnly ? false : { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
    max: 2, idleTimeoutMillis: 5000, connectionTimeoutMillis: 5000,
    statement_timeout: 8000, query_timeout: 10000, application_name: "gilded-ace-hourly-reader" };
}
export function getHourlyPool(env = process.env) {
  if (!pool) {
    pool = new Pool(databaseConfig(env));
    pool.on("error", () => {}); // Never log provider messages or connection details.
    if (env.VERCEL) attachDatabasePool(pool);
  }
  return pool;
}
export async function queryHourly(filters, data, { env = process.env, pool: injected } = {}) {
  const schema = safeSchema(env.TIGER_SCHEMA), query = buildHourlyQuery(filters, { schema });
  const client = await (injected || getHourlyPool(env)).connect();
  const started = performance.now();
  try {
    await client.query("BEGIN READ ONLY");
    await client.query("SET LOCAL statement_timeout='8000ms'");
    const state = (await client.query(`SELECT source_version,manifest_sha256,expected_rows,imported_rows,verified,verified_at FROM ${schema}.dataset_state WHERE singleton`)).rows[0];
    if (!state?.verified || state.manifest_sha256 !== data.sourceManifestSha256 || String(state.expected_rows) !== String(state.imported_rows)) throw Error("unverified_dataset");
    const result = await client.query(query);
    if (result.rows.length > HOURLY_LIMIT) throw Error("result_limit");
    const rows = result.rows.map(hourlyMetrics);
    await client.query("COMMIT");
    const host = env.DATABASE_URL ? new URL(env.DATABASE_URL).hostname : "";
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(host);
    const cloud = host.endsWith(".tsdb.cloud.timescale.com") || host.endsWith(".timescale.cloud");
    const label = env.TIGER_SERVICE_LABEL || (local ? "Local TimescaleDB validation" : "Configured time-series service");
    return { mode: "database", source: cloud ? "Tiger Data" : "TimescaleDB", historical: true,
      service: /^[a-zA-Z0-9 ()_.-]{1,100}$/.test(label) ? label : "Configured hourly service",
      environment: local ? "local-validation" : cloud ? "Tiger Cloud" : "TimescaleDB service",
      tlsTrust: local ? "local-validation" : env.TIGER_TLS_TRUST === "provisional-development" ? "provisional-development" : "configured-trust",
      sourceVersion: state.source_version, manifestSha256: state.manifest_sha256,
      importedRows: Number(state.imported_rows), verifiedAt: state.verified_at,
      queryRelation: query.relation, queriedAt: new Date().toISOString(), queryElapsedMs: Math.round(performance.now() - started),
      filters, rows, rowCount: rows.length,
      units: { currency: "USD", utilization: "occupied seconds / available seconds", theoRate: "theoretical USD / available machine-hour" },
      limitations: "January–June 2025 historical synthetic data, not live casino telemetry. Weekend follows the 06:00 gaming date. Quiet windows are descriptive opportunity proxies; validate crews, access, actual elapsed time and catalog constraints. Lower estimated disruption is not incremental causal profit." };
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    throw e;
  } finally { client.release(); }
}
