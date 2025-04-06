const express = require("express");
const fs = require("fs");
const path = require("path");
const { createServer: createViteServer, createLogger } = require("vite");
const { nanoid } = require("nanoid");

// Pas besoin de fileURLToPath en CommonJS
const viteLogger = createLogger();

/**
 * Log a message with timestamp
 * @param {string} message - Message to log
 * @param {string} source - Source of the log
 */
function log(message, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

/**
 * Setup Vite middleware for development
 * @param {import("express").Express} app - Express app
 * @param {import("http").Server} server - HTTP server
 */
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    ...serverOptions,
    configFile: path.resolve(__dirname, "../vite.config.js"),
  });

  app.use(vite.middlewares);

  // Use Vite's connect instance as middleware
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      // 1. Read index.html
      let template = fs.readFileSync(
        path.resolve(__dirname, "../client/index.html"),
        "utf-8",
      );

      // 2. Apply Vite HTML transforms
      template = await vite.transformIndexHtml(url, template);

      // 3. Serve HTML
      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}

/**
 * Serve static files in production
 * @param {import("express").Express} app - Express app
 */
function serveStatic(app) {
  const distPath = path.resolve(__dirname, "../dist/public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

module.exports = {
  log,
  setupVite,
  serveStatic
};
