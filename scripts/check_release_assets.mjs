// Validate a real built frontend without reading server secrets.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const base = (process.argv[2] || "http://127.0.0.1:4177").replace(/\/$/, ""), checks = [];
try {
  for (const path of ["/", "/data/dashboard.json", "/data/decision.json", "/data/diagnostics.json", "/docs/TIGER_DATA_SETUP.md", "/docs/SPONSOR_EVIDENCE.md"]) {
    const response = await fetch(base + path, { signal: AbortSignal.timeout(15000) }), bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(response.status, 200);
    if (path.startsWith("/data/")) assert.ok(bytes.equals(await readFile("public" + path)), "Derived data must match the tested release exactly.");
    checks.push({ path, status: response.status, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
    if (path === "/") for (const asset of bytes.toString().matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)) {
      const r = await fetch(base + asset[1]); assert.equal(r.status, 200);
      checks.push({ path: asset[1], status: r.status, bytes: (await r.arrayBuffer()).byteLength });
    }
  }
  const result = { status: "passed", base, checks, qualification: "Actual HTTP frontend assets and exact derived-data matches. A local origin does not prove deployed API behavior or real-browser rendering." };
  await writeFile(new URL("../docs/SPONSOR_BUILD_HTTP_CHECK.json", import.meta.url), JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify({ status: "passed", base, checks: checks.length }));
} catch { console.log("FAIL: release HTTP assets/data did not verify; no credentials or response text displayed."); process.exitCode = 1; }
