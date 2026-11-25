import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Plugin } from "vite";

async function loadCandidate(directory: string, siteRoot: string) {
  const [receiptText, certificate, linksText] = await Promise.all([
    readFile(join(directory, "apk-metadata.json"), "utf8"),
    readFile(join(directory, "apk-cert.txt"), "utf8"),
    readFile(join(siteRoot, "public/.well-known/assetlinks.json"), "utf8"),
  ]);
  const receipt = JSON.parse(receiptText);
  const fingerprint = certificate.match(/^Signer #1 certificate SHA-256 digest:\s*([a-f\d]{64})\s*$/im)?.[1].toLowerCase();
  const links = JSON.parse(linksText) as { target: { package_name: string; sha256_cert_fingerprints: string[] } }[];
  const officialSigner = links.some(({ target }) => target.package_name === "com.upgraders.spawt"
    && target.sha256_cert_fingerprints.some(key => key.replaceAll(":", "").toLowerCase() === fingerprint));
  if (!officialSigner || receipt.signatureMatchesBuild25 !== true || receipt.nativePackageVerified !== true
    || !/^\d+\.\d+\.\d+$/.test(receipt.version) || !Number.isSafeInteger(receipt.build) || receipt.build < 1
    || !/^\d{4}-\d{2}-\d{2}$/.test(receipt.buildDate) || !/^[a-f0-9]{40}$/.test(receipt.sourceCommit)) {
    throw new Error("Invalid Android candidate receipt");
  }
  const fileName = `spawt-${receipt.version}-build${receipt.build}.apk`;
  // Keep the verified bytes for this development server. A replaced file on disk
  // cannot change what a second range request receives for the same manifest.
  const bytes = await readFile(join(directory, fileName));
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (sha256 !== receipt.sha256 || bytes.byteLength !== receipt.bytes) throw new Error("APK hash or length mismatch");
  const manifest = {
    schemaVersion: 1, packageName: "com.upgraders.spawt", version: receipt.version, build: receipt.build,
    buildDate: receipt.buildDate, sourceCommit: receipt.sourceCommit, sha256, bytes: bytes.byteLength,
    fileName, url: `/pilot-delivery/${fileName}`,
  };
  return { manifest, bytes };
}

function requestedBytes(value: string, size: number): [number, number] | null {
  const parts = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!parts || (!parts[1] && !parts[2])) return null;
  if (!parts[1]) {
    const length = Number(parts[2]);
    return Number.isSafeInteger(length) && length > 0 ? [Math.max(0, size - length), size - 1] : null;
  }
  const start = Number(parts[1]);
  const end = parts[2] ? Number(parts[2]) : size - 1;
  return Number.isSafeInteger(start) && Number.isSafeInteger(end) && start < size && end >= start
    ? [start, Math.min(end, size - 1)] : null;
}

export function pilotDelivery(directory: string): Plugin {
  return {
    name: "spawt-pilot-local-delivery",
    apply: "serve",
    configureServer(server) {
      let cached: ReturnType<typeof loadCandidate> | undefined;
      server.middlewares.use("/pilot-delivery", async (req, res) => {
        res.setHeader("Cache-Control", "no-store");
        if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress ?? "")) {
          res.statusCode = 403; res.end(); return;
        }
        if (req.method !== "GET" && req.method !== "HEAD") {
          res.statusCode = 405; res.setHeader("Allow", "GET, HEAD"); res.end(); return;
        }
        try {
          cached ??= loadCandidate(directory, server.config.root);
          const { manifest, bytes } = await cached;
          const path = (req.url ?? "").split("?")[0];
          if (path === "/release.json") {
            const json = JSON.stringify(manifest);
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.setHeader("Content-Length", Buffer.byteLength(json));
            res.end(req.method === "HEAD" ? undefined : json);
            return;
          }
          if (path !== "/" + manifest.fileName) { res.statusCode = 404; res.end(); return; }
          const etag = '"' + manifest.sha256 + '"';
          res.setHeader("ETag", etag);
          res.setHeader("Accept-Ranges", "bytes");
          res.setHeader("Content-Type", "application/vnd.android.package-archive");
          res.setHeader("Content-Disposition", `attachment; filename="${manifest.fileName}"`);
          const range = req.headers["if-range"] && req.headers["if-range"] !== etag ? undefined : req.headers.range;
          const bounds = range ? requestedBytes(range, bytes.length) : [0, bytes.length - 1];
          if (!bounds) {
            res.statusCode = 416; res.setHeader("Content-Range", "bytes */" + bytes.length); res.end(); return;
          }
          const [start, end] = bounds;
          if (range) {
            res.statusCode = 206;
            res.setHeader("Content-Range", `bytes ${start}-${end}/${bytes.length}`);
          }
          res.setHeader("Content-Length", end - start + 1);
          res.end(req.method === "HEAD" ? undefined : bytes.subarray(start, end + 1));
        } catch (error) {
          cached = undefined;
          server.config.logger.error(`APK de recette indisponible : ${String(error)}`);
          res.statusCode = 503; res.end();
        }
      });
    },
  };
}
