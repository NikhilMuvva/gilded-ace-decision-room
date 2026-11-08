import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
const base = process.argv[2] || "http://127.0.0.1:5173";
const data = JSON.parse(
  await readFile(
    new URL("../public/data/dashboard.json", import.meta.url),
    "utf8",
  ),
);
const context = {
  page: "machines",
  start: "2025-01",
  end: "2025-06",
  zone: "all",
  bank: "all",
  machine: "M-1158",
  group: "all|All tracked guests",
  sourceVersion: data.version,
  plan: data.planner.recommended.map((e) => ({
    ...e,
    effect: 0,
    extraCost: 0,
  })),
};
const request = {
  requestId: "http-check",
  question: "Why is M-1158 flagged?",
  context,
};
const checks = [];
async function send(body, origin = base) {
  return fetch(base + "/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(body),
  });
}
const method = await fetch(base + "/api/chat");
assert.equal(method.status, 405);
checks.push("GET rejected with 405");
const valid = await send(request);
assert.equal(valid.status, 200);
assert.equal(valid.headers.get("cache-control"), "no-store");
const result = await valid.json();
assert.ok(["live", "offline"].includes(result.mode));
if (process.argv.includes("--expect-live"))
  assert.equal(
    result.mode,
    "live",
    "Expected real Gemini; received offline fallback.",
  );
assert.equal(result.context.start, context.start);
assert.ok(
  result.cards.some((c) =>
    c.metrics.some(
      (m) =>
        ["Actual house win", "House win"].includes(m.label) &&
        Math.abs(m.value - 15796.25) < 0.01,
    ),
  ),
);
checks.push(
  "Same-origin POST through Vite proxy returns scoped exact evidence",
);
const bad = await send({ ...request, question: "Explain M-9999" });
assert.equal(bad.status, 400);
checks.push("Unknown machine rejected with 400");
const cross = await send(request, "https://untrusted.example");
assert.equal(cross.status, 403);
checks.push("Cross-origin request rejected with 403");
const record = {
  base,
  mode: result.mode,
  checks,
  qualification:
    result.mode === "live"
      ? "Live Gemini verified through this HTTP origin; a local result does not verify a deployed runtime."
      : "Offline HTTP evidence is not live Gemini or deployed-runtime verification.",
};
await writeFile(
  new URL("../docs/COPILOT_HTTP_CHECKS.json", import.meta.url),
  JSON.stringify(record, null, 2) + "\n",
);
process.stdout.write(JSON.stringify(record) + "\n");
