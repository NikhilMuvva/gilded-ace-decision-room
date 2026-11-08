import { readFile } from "node:fs/promises";
import { normalizeHourlyRequest } from "./hourly-query.mjs";
import { queryHourly } from "./hourly-db.mjs";
let metadata;
const load = () => metadata ??= readFile(new URL("../public/data/dashboard.json", import.meta.url), "utf8").then(JSON.parse);
export function makeHourlyHandler({ query = queryHourly, loadData = load, env = process.env, now = () => Date.now() } = {}) {
  const cache = new Map(), clients = new Map();
  return async (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");res.setHeader("X-Content-Type-Options", "nosniff");
    const send = (status, value) => { res.statusCode = status; res.end(JSON.stringify(value)); };
    if (req.method !== "POST") { res.setHeader("Allow", "POST"); return send(405, { error: "Use POST JSON for historical hourly queries." }); }
    try {
      if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return send(403, { error: "Cross-origin requests are not allowed." });
    } catch { return send(403, { error: "Invalid origin." }); }
    const ip = env.VERCEL ? String(req.headers["x-forwarded-for"] || "unknown").split(",")[0].trim() : req.socket?.remoteAddress || "local";
    for (const [key, b] of clients) if (b.until <= now()) clients.delete(key);
    const bucket = clients.get(ip) || { until: now() + 60000, count: 0 };
    if (bucket.count >= 20 || (clients.size >= 1000 && !clients.has(ip))) { res.setHeader("Retry-After", "60"); return send(429, { error: "Hourly query limit reached. Try again shortly." }); }
    bucket.count++; clients.set(ip, bucket);
    if (!String(req.headers["content-type"] || "").startsWith("application/json")) return send(415, { error: "Use application/json." });
    let body;
    try {
      if (req.body !== undefined) {
        if (Buffer.byteLength(JSON.stringify(req.body)) > 4000) return send(413, { error: "Hourly request too large." });
        body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      } else {
        let length = 0; const chunks = [];
        for await (const c of req) { length += Buffer.byteLength(c); if (length > 4000) return send(413, { error: "Hourly request too large." }); chunks.push(Buffer.from(c)); }
        body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      }
    } catch { return send(400, { error: "Invalid JSON." }); }
    try {
      const data = await loadData(), filters = normalizeHourlyRequest(body, data), key = JSON.stringify(filters);
      const previous = cache.get(key);
      if (previous && previous.until > now()) return send(200, { ...previous.result, cached: true });
      const result = await query(filters, data, { env });
      if (Buffer.byteLength(JSON.stringify(result)) > 1800000) throw Error("result_limit");
      if (cache.size >= 64) cache.delete(cache.keys().next().value);
      cache.set(key, { result, until: now() + 300000 });
      return send(200, { ...result, cached: false });
    } catch (e) {
      if (e?.code === "invalid_request") return send(400, { error: e.message });
      return send(503, { mode: "unavailable", source: "Tiger Data", historical: true,
        error: "Tiger Data hourly service is not configured, verified or currently reachable. The original dashboard and offline evidence remain available." });
    }
  };
}
export default makeHourlyHandler();
