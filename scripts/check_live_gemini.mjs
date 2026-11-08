// Run with node --env-file-if-exists=.env.local scripts/check_live_gemini.mjs.
// Never prints credentials or upstream error bodies. One live query uses two bounded API calls.
import { readFile, writeFile } from "node:fs/promises";
import { answerQuestion } from "../server/chat.mjs";
import { attachDecision } from "../src/machineDiagnostics.mjs";
const primary = JSON.parse(
  await readFile(
    new URL("../public/data/dashboard.json", import.meta.url),
    "utf8",
  ),
);
const data = attachDecision(
  primary,
  JSON.parse(
    await readFile(
      new URL("../public/data/decision.json", import.meta.url),
      "utf8",
    ),
  ),
);
const key = process.env.GEMINI_API_KEY;
if (!key) {
  await writeFile(
    new URL("../docs/GEMINI_LIVE_CHECK.json", import.meta.url),
    JSON.stringify(
      {
        status: "blocked",
        reason:
          "GEMINI_API_KEY is not configured in server environment. No live request made.",
      },
      null,
      2,
    ) + "\n",
  );
  process.stdout.write(
    "BLOCKED: configure GEMINI_API_KEY privately in .env.local or server environment. No live API request made.\n",
  );
  process.exitCode = 2;
} else {
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
  const result = await answerQuestion(
    data,
    {
      requestId: "live-check",
      question: "Why is M-1158 flagged, and should it be replaced?",
      context,
    },
    { key, model: process.env.GEMINI_MODEL },
  );
  const record = {
    status: result.mode === "live" ? "passed" : "failed",
    mode: result.mode,
    model: result.model || process.env.GEMINI_MODEL || "default",
    evidenceIds: result.cards.map((c) => c.id),
    reason: result.reason,
  };
  await writeFile(
    new URL("../docs/GEMINI_LIVE_CHECK.json", import.meta.url),
    JSON.stringify(record, null, 2) + "\n",
  );
  process.stdout.write(JSON.stringify(record) + "\n");
  process.exitCode = result.mode === "live" ? 0 : 1;
}
