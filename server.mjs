import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleLookup } from "./src/lookup.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "public");

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".txt": "text/plain; charset=utf-8",
};

function filePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const rel = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const full = path.resolve(root, rel);
  const base = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (full !== root && !full.startsWith(base)) return null;
  return full;
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 100_000) throw new Error("body too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function sendLookup(req, res) {
  try {
    const body = await readBody(req);
    const request = new Request("http://price-tags.local/api/lookup", {
      method: "POST",
      headers: { "Content-Type": req.headers["content-type"] || "application/json" },
      body,
    });
    const response = await handleLookup(request);
    const payload = Buffer.from(await response.arrayBuffer());
    res.writeHead(response.status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(payload);
  } catch {
    res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Send JSON with a code." }));
  }
}

async function sendFile(res, full) {
  let info;
  try {
    info = await stat(full);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }
  if (!info.isFile()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }
  const type = types[path.extname(full).toLowerCase()] || "application/octet-stream";
  res.writeHead(200, {
    "Content-Type": type,
    "Cache-Control": "no-cache",
    "X-Content-Type-Options": "nosniff",
  });
  createReadStream(full).pipe(res);
}

export function startServer({ port = 0, host = "127.0.0.1" } = {}) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", "http://price-tags.local");
    if (url.pathname === "/api/lookup") {
      if (req.method !== "POST") {
        res.writeHead(405, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: "POST a barcode or an 8-digit number." }));
        return;
      }
      await sendLookup(req, res);
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Method not allowed");
      return;
    }
    const full = filePath(url.pathname);
    if (!full) {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Bad path");
      return;
    }
    if (req.method === "HEAD") {
      res.writeHead(200);
      res.end();
      return;
    }
    await sendFile(res, full);
  });

  return new Promise((resolve) => {
    server.listen(port, host, () => resolve(server));
  });
}

const entry = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (entry === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 8787);
  const host = process.env.HOST || "127.0.0.1";
  startServer({ port, host }).then((server) => {
    const addr = server.address();
    console.log(`Price tags at http://${host}:${addr.port}`);
  });
}
