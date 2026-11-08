import http from "node:http";
import handler from "../server/handler.mjs";
import hourlyHandler from "../server/hourly-handler.mjs";
const server = http.createServer((req, res) => {
  const path = req.url?.split("?")[0];
  if (path !== "/api/chat" && path !== "/api/hourly") {
    res.statusCode = 404;
    res.end();
    return;
  }
  (path === "/api/hourly" ? hourlyHandler : handler)(req, res);
});
server.requestTimeout = 25000;
const port=Number(process.env.DASHBOARD_API_PORT||8787);
server.on('error',()=>{process.stderr.write('Investigation API could not bind its local port. Stop the other copy or set DASHBOARD_API_PORT.\n');process.exitCode=1});
server.listen(port, "127.0.0.1", () =>
  process.stdout.write(
    `Investigation API: http://127.0.0.1:${port} (secret values are never logged)\n`,
  ),
);
