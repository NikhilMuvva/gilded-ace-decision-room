// Certificate-only PostgreSQL SSLRequest. Never send an authentication message.
import net from "node:net";
import tls from "node:tls";
import { once } from "node:events";
import { readFileSync, writeFileSync } from "node:fs";
import { X509Certificate } from "node:crypto";
const url = new URL(process.env.DATABASE_URL || process.env.TIGER_IMPORT_DATABASE_URL);
const ca = readFileSync(process.argv[2] || process.env.TIGER_SSLROOTCERT, "utf8");
const results = [];
for (const [name, certificate] of [["default-public-roots", undefined], ["configured-development-ca", ca]]) {
  let socket;
  try {
    socket = net.connect({ host: url.hostname, port: Number(url.port || 5432), timeout: 5000 });
    socket.on("timeout", () => socket.destroy(Error("timeout")));
    await once(socket, "connect"); socket.write(Buffer.from([0, 0, 0, 8, 4, 210, 22, 47]));
    const [reply] = await once(socket, "data"); if (reply[0] !== 83) throw Error("SSLRequest rejected");
    socket = tls.connect({ socket, servername: url.hostname, rejectUnauthorized: true, ...(certificate ? { ca: certificate } : {}) });
    await once(socket, "secureConnect");
    const peer = socket.getPeerCertificate();
    results.push({ trust: name, verified: socket.authorized, issuer: peer.issuer?.CN, leafFingerprint: peer.fingerprint256 });
  } catch (e) { results.push({ trust: name, verified: false, reason: ["UNABLE_TO_GET_ISSUER_CERT_LOCALLY", "SELF_SIGNED_CERT_IN_CHAIN", "UNABLE_TO_VERIFY_LEAF_SIGNATURE"].includes(e.code) ? e.code : "TLS_check_failed" }); }
  finally { socket?.destroy(); }
}
const report = { checkedAt: new Date().toISOString(), developmentCaFingerprint: new X509Certificate(ca).fingerprint256, authenticationSent: false, results };
writeFileSync(new URL("../docs/TIGER_TLS_CHECK.json", import.meta.url), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report));
