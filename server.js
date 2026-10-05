const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { URL } = require("node:url");

const { HOST, OPEN_BROWSER, PORT, STATIC_DIR } = require("./config/env");
const { initDb, openDb } = require("./config/db");
const { sendJson } = require("./middleware/httpMiddleware");
const { routeApi } = require("./routes");
const { hashPassword, verifyPassword } = require("./controllers/authController");
const { stockPublic } = require("./models/portfolioModel");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function serveStatic(req, res, url) {
  const publicRoutes = new Set(["/global-investing", "/terminal", "/stock"]);
  const requestedPath = url.pathname === "/" || publicRoutes.has(url.pathname) ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(STATIC_DIR, requestedPath));

  if (!filePath.startsWith(STATIC_DIR)) {
    return sendJson(res, 403, { error: "Forbidden." });
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendJson(res, 404, { error: "File not found." });
      return;
    }

    res.writeHead(200, {
      "Content-Type": MIME_TYPES[path.extname(filePath)] || "application/octet-stream",
      "Content-Length": content.length,
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    });
    res.end(content);
  });
}

function createServer(db) {
  if (!db) {
    throw new Error("createServer requires a database connection. Use run() to start the app.");
  }

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    try {
      if (url.pathname.startsWith("/api/")) {
        await routeApi({ db, req, res, url });
      } else {
        serveStatic(req, res, url);
      }
    } catch (error) {
      if (error.code === 11000 || String(error.message || "").includes("duplicate key error")) {
        sendJson(res, 409, { error: "Email is already registered." });
        return;
      }
      const status = error.status || 500;
      sendJson(res, status, { error: status === 500 ? "Internal server error." : error.message });
      if (status === 500) console.error(error);
    }
  });
}

function listenOnce(server, host, port) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const onListening = () => {
      cleanup();
      resolve(server.address());
    };
    const cleanup = () => {
      server.off("error", onError);
      server.off("listening", onListening);
    };

    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, host);
  });
}

async function listenWithPortFallback(server, host, port, log = console.log) {
  let currentPort = port;
  while (true) {
    try {
      await listenOnce(server, host, currentPort);
      log(`Stock Portfolio Management System running at http://${host}:${currentPort}`);
      return currentPort;
    } catch (error) {
      if (error.code === "EADDRINUSE") {
        log(`Port ${currentPort} is in use, trying ${currentPort + 1}...`);
        currentPort += 1;
        continue;
      }
      throw error;
    }
  }
}

function getBrowserUrl(host, port) {
  const browserHost = host === "0.0.0.0" ? "127.0.0.1" : host;
  return `http://${browserHost}:${port}`;
}

function openUrlExternally(url, log = console.warn) {
  const commands = {
    win32: { command: "cmd", args: ["/c", "start", "", url], options: { windowsHide: true } },
    darwin: { command: "open", args: [url], options: {} },
    linux: { command: "xdg-open", args: [url], options: {} },
  };

  const target = commands[process.platform];
  if (!target) {
    log(`Automatic browser opening is not supported on platform: ${process.platform}`);
    return;
  }

  const child = spawn(target.command, target.args, {
    detached: true,
    stdio: "ignore",
    ...target.options,
  });

  child.on("error", (error) => {
    log(`Unable to open browser automatically: ${error.message}`);
  });
  child.unref();
}

async function run(host = HOST, port = PORT, { openBrowser = false } = {}) {
  const db = await initDb(await openDb());
  const server = createServer(db);
  const currentPort = await listenWithPortFallback(server, host, port);
  if (openBrowser) {
    openUrlExternally(getBrowserUrl(host, currentPort));
  }
  return server;
}

if (require.main === module) {
  run(HOST, PORT, { openBrowser: OPEN_BROWSER }).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  createServer,
  getBrowserUrl,
  hashPassword,
  initDb,
  listenWithPortFallback,
  openUrlExternally,
  openDb,
  run,
  stockPublic,
  verifyPassword,
};
