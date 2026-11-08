// Start the private API and Vite together; the API alone loads .env.local into its process.
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const frontendEnv = { ...process.env };
delete frontendEnv.GEMINI_API_KEY;
for (const name of Object.keys(frontendEnv)) if (name === "DATABASE_URL" || name === "VERCEL_TOKEN" || name.startsWith("TIGER_")) delete frontendEnv[name];
const services = [
  spawn(
    process.execPath,
    ["--env-file-if-exists=.env.local", "--env-file-if-exists=.env.tiger-reader.local", "scripts/dev_api.mjs"],
    {
      stdio: "inherit",
    },
  ),
  spawn(
    process.execPath,
    [resolve("node_modules/vite/bin/vite.js"), "--host", "127.0.0.1"],
    {
      stdio: "inherit",
      env: frontendEnv,
    },
  ),
];
let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  for (const service of services) if (service.exitCode === null) service.kill();
  process.exitCode = code;
}
for (const service of services) {
  service.on("error", () => {
    process.stderr.write("A local service could not start.\n");
    stop(1);
  });
  service.on("exit", (code) => {
    if (!stopping) {
      process.stderr.write(
        "A local service stopped; shutting down the other service.\n",
      );
      stop(code || 1);
    }
  });
}
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
