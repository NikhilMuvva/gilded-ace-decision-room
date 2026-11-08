// Trusted-HTTPS public probes. Never relax TLS or read API/database secrets.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
const base = (process.argv[2] || "https://gilded-ace-decision-room.vercel.app").replace(/\/$/, "");
const data = JSON.parse(await readFile(new URL("../public/data/dashboard.json", import.meta.url), "utf8"));
const context = { page: "machines", start: "2025-01", end: "2025-06", zone: "all", bank: "all", machine: "M-1158", group: "all|All tracked guests", sourceVersion: data.version, plan: data.planner.recommended };
const checks = [];
for (const [name, path, body] of [["frontend", "/", null], ["Gemini", "/api/chat", { requestId: "vercel-public-check", question: "Why is M-1158 flagged? Retrieve its machine summary and supporting uncertainty.", context }],
  ["hourly", "/api/hourly", { start: "2025-01", end: "2025-06", zone: "all", bank: "all", machineIds: [], groupBy: "zone", dayType: "all", hour: "all" }]]) {
  try {
    const response = await fetch(base + path, { ...(body ? { method: "POST", headers: { "Content-Type": "application/json", Origin: new URL(base).origin }, body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(25000) });
    if (!response.ok) { checks.push({ name, path, method: body ? "POST" : "GET", status: response.status, passed: false }); continue; }
    if (body) {
      const result = await response.json();
      if (name === "Gemini") { assert.equal(result.mode, "live"); assert.ok(result.cards.some((c) => c.metrics.some((m) => ["Actual house win", "House win"].includes(m.label) && Math.abs(m.value - 15796.25) < .01))); }
      else { assert.equal(result.mode, "database"); assert.equal(result.environment, "Tiger Cloud"); assert.equal(result.importedRows, 1321908); assert.equal(result.manifestSha256, data.sourceManifestSha256); }
    } else assert.match(await response.text(), /<html/i);
    checks.push({ name, path, method: body ? "POST" : "GET", status: response.status, passed: true });
  } catch (e) {
    const code = e?.cause?.code || e?.code || e?.name;
    const safe = ["UNABLE_TO_GET_ISSUER_CERT_LOCALLY", "SELF_SIGNED_CERT_IN_CHAIN", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "CERT_HAS_EXPIRED", "ERR_TLS_CERT_ALTNAME_INVALID", "TimeoutError", "AssertionError", "ERR_ASSERTION"].includes(code) ? code : "request_or_evidence_check_failed";
    checks.push({ name, path, method: body ? "POST" : "GET", passed: false, reason: safe });
  }
}
const report = { status: checks.every((c) => c.passed) ? "passed" : "not_verified", base, checks, qualification: "Real HTTPS GET/POST attempts with default certificate verification. A failed TLS handshake is not an API success. No credentials or response text are logged. All three checks are needed to verify the hourly preview; core production does not yet include hourly." };
await writeFile(new URL("../docs/VERCEL_HTTP_STATUS.json", import.meta.url), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report));
if (report.status !== "passed") process.exitCode = 1;
