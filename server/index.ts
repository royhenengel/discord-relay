import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";

// minimal logger
const log = (msg: string) => {
  console.log(new Date().toISOString(), msg);
};

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  // @ts-expect-error variadic apply to Express' res.json
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    // @ts-expect-error variadic apply to Express' res.json
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        try {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        } catch {}
      }
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("[express] error:", err);
    res.status(status).json({ message });
    // do NOT throw here; we already responded and throwing can crash the process
  });

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    { port, host: "0.0.0.0", reusePort: true },
    () => {
      log(`serving on port ${port}`);

      // Try to guess the public URL (Replit/others)
      const guessHost = (() => {
        const { REPL_SLUG, REPL_OWNER, RENDER_EXTERNAL_URL, RAILWAY_STATIC_URL } = process.env;
        if (REPL_SLUG && REPL_OWNER) return `https://${REPL_SLUG}.${REPL_OWNER}.repl.co`;
        if (RENDER_EXTERNAL_URL) return RENDER_EXTERNAL_URL;
        if (RAILWAY_STATIC_URL) return `https://${RAILWAY_STATIC_URL}`;
        return `http://localhost:${port}`;
      })();

      log(`public URL (best guess): ${guessHost}`);
      log(`POST ${guessHost}/api/bot/connect to start the Discord bot`);
    }
  );
})();