import { readFile } from "node:fs/promises";
import { answerQuestion, createLimiter } from "./chat.mjs";
import { attachDecision } from "../src/machineDiagnostics.mjs";
const limit = createLimiter();
let loaded;
async function load() {
  loaded ??= Promise.all([
    readFile(
      new URL("../public/data/dashboard.json", import.meta.url),
      "utf8",
    ).then(JSON.parse),
    readFile(
      new URL("../public/data/decision.json", import.meta.url),
      "utf8",
    ).then(JSON.parse),
    readFile(
      new URL("../public/data/diagnostics.json", import.meta.url),
      "utf8",
    ).then(JSON.parse),
  ]).then(([data, decision, audit]) => [attachDecision(data, decision), audit]);
  return loaded;
}
export function makeHandler({
  answer = answerQuestion,
  loadData = load,
  limiter = limit,
  env = process.env,
} = {}) {
  return async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const send = (status, value) => {
      res.statusCode = status;
      res.end(JSON.stringify(value));
    };
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return send(405, { error: "Use POST." });
    }
    const host = req.headers.host;
    if (req.headers.origin) {
      try {
        if (new URL(req.headers.origin).host !== host)
          return send(403, { error: "Cross-origin requests are not allowed." });
      } catch {
        return send(403, { error: "Invalid origin." });
      }
    }
    const ip = env.VERCEL
      ? String(req.headers["x-forwarded-for"] || "unknown")
          .split(",")[0]
          .trim()
      : req.socket?.remoteAddress || "local";
    if (!limiter(ip)) {
      res.setHeader("Retry-After", "60");
      return send(429, {
        error:
          "Request limit reached. Try again later; offline evidence remains available.",
      });
    }
    if (
      !String(req.headers["content-type"] || "").startsWith("application/json")
    )
      return send(415, { error: "Use application/json." });
    try {
      let body;
      if (req.body !== undefined) {
        if (Buffer.byteLength(JSON.stringify(req.body), "utf8") > 24000)
          return send(413, { error: "Request too large." });
        body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      } else {
        const chunks = [];
        let length = 0;
        for await (const chunk of req) {
          length += Buffer.byteLength(chunk);
          if (length > 24000) return send(413, { error: "Request too large." });
          chunks.push(chunk);
        }
        body = JSON.parse(
          Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf8"),
        );
      }
      const [data, audit] = await loadData();
      const result = await answer(data, body, {
        key: env.GEMINI_API_KEY || "",
        model: env.GEMINI_MODEL || undefined,
        audit,
      });
      return send(200, result);
    } catch (e) {
      if (
        e instanceof SyntaxError ||
        e.code === "invalid_request" ||
        /Unknown machine|Question must|no active rows/.test(e.message)
      )
        return send(400, {
          error:
            e.code === "invalid_request"
              ? e.message
              : "Invalid question or JSON. Check the current scope and machine ID.",
        });
      return send(503, {
        error: "Investigation service is unavailable. Use offline evidence.",
      });
    }
  };
}
export default makeHandler();
