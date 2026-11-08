// Explicitly preview-only. Never copy .env.local or the administrator connection.
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
const url = process.env.DATABASE_URL;
if (!url || decodeURIComponent(new URL(url).username) !== "gilded_hourly_reader") throw Error("A separately verified reader connection is required.");
const ca = process.env.TIGER_CA_CERT || readFileSync(process.env.TIGER_SSLROOTCERT, "utf8");
const variables = [["DATABASE_URL", url], ["TIGER_CA_CERT", ca], ["TIGER_SCHEMA", "dashboard_hourly"], ["TIGER_SERVICE_LABEL", "gilded-ace-hourly"], ["TIGER_TLS_TRUST", "provisional-development"]];
for (const [name, value] of variables) {
  const command = `npx --yes vercel env add ${name} --environment preview --sensitive --yes`;
  const child = spawn(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", command], { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
  // Drain but never display provider output, which could contain entered values.
  child.stdout.resume(); child.stderr.resume(); child.stdin.on("error", () => {}); child.stdin.end(value + "\n");
  const code = await new Promise((resolve) => { child.on("error", () => resolve(1)); child.on("close", resolve); });
  console.log(JSON.stringify({ variable: name, environment: "preview", configured: code === 0 }));
  if (code !== 0) { process.exitCode = 1; break; }
}
