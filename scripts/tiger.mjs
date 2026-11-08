// Load ignored local environment in the parent Node process; never pass secrets on argv.
import { spawnSync } from "node:child_process";
const commands = { source: "tiger_source.py", import: "tiger_import.py", benchmark: "tiger_benchmark.py", local: "tiger_local.py" };
const command = commands[process.argv[2]];
if (!command) { console.error("Choose source, import, benchmark or local."); process.exit(1); }
const child = spawnSync(process.env.PYTHON || "python", ["scripts/" + command, ...process.argv.slice(3)], { env: process.env, stdio: "inherit" });
if (child.error) console.error("Python could not be started; install requirements.txt and set PYTHON if needed.");
process.exitCode = child.status ?? 1;
