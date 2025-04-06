import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import { fileURLToPath } from "url";

// Obtenir le chemin du répertoire actuel
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const viteLogger = createLogger();

/**
 * Log a message with timestamp
 * @param {string} message - Message to log
 * @param {string} source - Source of the log
 */
export function log(message: string, source = "express") {
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
export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as true,
  };

  const vite = await createViteServer({
    configFile: path.resolve(__dirname, "../vite.config.ts"),
    server: serverOptions,
    appType: "custom",
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
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

/**
 * Serve static files in production
 * @param {import("express").Express} app - Express app
 */
export function serveStatic(app: Express) {
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
