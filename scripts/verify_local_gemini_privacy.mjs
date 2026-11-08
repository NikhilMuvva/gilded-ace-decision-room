// Run with: node --env-file-if-exists=.env.local scripts/verify_local_gemini_privacy.mjs http://127.0.0.1:5173
// Reports only pass/fail metadata. Never print the key, fetched content, or request headers.
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const key = process.env.GEMINI_API_KEY;
const base = new URL(process.argv[2] || "http://127.0.0.1:5173");
if (!key || !key.trim()) {
  process.stdout.write("FAIL: GEMINI_API_KEY is not configured.\n");
  process.exit(2);
}
if (!["127.0.0.1", "localhost", "[::1]"].includes(base.hostname)) {
  process.stdout.write(
    "FAIL: this check only accepts a local development URL.\n",
  );
  process.exit(2);
}
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const path = join(dir, entry.name);
        return entry.isDirectory() ? files(path) : [path];
      }),
    )
  ).flat();
}
try {
  const secret = Buffer.from(key);
  const built = await files("dist");
  for (const file of built) {
    if ((await readFile(file)).includes(secret)) throw Error("build");
  }
  for (const route of [
    "/",
    "/.env.local",
    "/@vite/env",
    "/src/main.tsx",
    "/src/Copilot.tsx",
  ]) {
    const response = await fetch(new URL(route, base), {
      signal: AbortSignal.timeout(10000),
    });
    if (Buffer.from(await response.arrayBuffer()).includes(secret))
      throw Error("frontend");
  }
  const data = JSON.parse(await readFile("public/data/dashboard.json", "utf8"));
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
  const response = await fetch(new URL("/api/chat", base), {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base.origin },
    body: JSON.stringify({
      requestId: "privacy-check",
      question: "Why is M-1158 flagged?",
      context,
    }),
    signal: AbortSignal.timeout(25000),
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.includes(secret)) throw Error("response");
  if (!response.ok) throw Error("request");
  const result = JSON.parse(bytes.toString("utf8"));
  if (result.mode !== "live") throw Error("offline");
  if (
    !result.cards?.some(
      (card) =>
        card.metrics?.some(
          (metric) =>
            ["Actual house win", "House win"].includes(metric.label) &&
            Math.abs(metric.value - 15796.25) < 0.01,
        ) &&
        card.evidence?.some(
          (source) => source.href === "/docs/CLAIMS_AND_EVIDENCE.md",
        ),
    )
  )
    throw Error("evidence");
  process.stdout.write(
    JSON.stringify({
      live: true,
      verifiedStatistic: true,
      evidenceLink: true,
      frontendResponsesScanned: 5,
      productionFilesScanned: built.length,
      secretFound: false,
    }) + "\n",
  );
} catch (error) {
  const code = [
    "build",
    "frontend",
    "response",
    "request",
    "offline",
    "evidence",
  ].includes(error.message)
    ? error.message
    : "unavailable";
  process.stdout.write(`FAIL: local Gemini privacy verification (${code}).\n`);
  process.exitCode = 1;
}
