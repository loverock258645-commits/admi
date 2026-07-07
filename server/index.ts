import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { z } from "zod";
import {
  clearSessionCookie,
  createSessionToken,
  optionalAuth,
  requireAuth,
  setSessionCookie
} from "./auth.js";
import { writeAuditEvent } from "./audit.js";
import { deIdentifyMedicalText } from "./deidentify.js";
import { summarizeMedicalText } from "./openai.js";
import { getModeLabel, isSummaryMode } from "./prompts/index.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === "production";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDistPath = path.resolve(__dirname, "../client");

const textSchema = z.object({
  text: z.string().trim().min(1).max(120_000)
});

const summarizeSchema = textSchema.extend({
  mode: z.unknown().optional().transform((value) => (isSummaryMode(value) ? value : "auto"))
});

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"]
      }
    },
    referrerPolicy: { policy: "no-referrer" }
  })
);

app.use((_request, response, next) => {
  response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.setHeader("Pragma", "no-cache");
  response.setHeader("Expires", "0");
  response.setHeader("Surrogate-Control", "no-store");
  next();
});

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(optionalAuth);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false
});

app.post("/api/login", loginLimiter, async (request, response) => {
  const schema = z.object({
    username: z.string().trim().min(1).max(80),
    password: z.string().min(1).max(200)
  });

  const parsed = schema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "invalid_login_payload" });
    return;
  }

  const configuredUsername = process.env.APP_USERNAME;
  const configuredPasswordHash = process.env.APP_PASSWORD_HASH;

  if (!configuredUsername || !configuredPasswordHash) {
    await writeAuditEvent({
      username: parsed.data.username,
      feature: "login",
      success: false,
      errorType: "server_auth_not_configured"
    });
    response.status(500).json({ message: "server_not_configured" });
    return;
  }

  const usernameMatches = parsed.data.username === configuredUsername;
  const passwordMatches = await bcrypt.compare(parsed.data.password, configuredPasswordHash);

  if (!usernameMatches || !passwordMatches) {
    await writeAuditEvent({
      username: parsed.data.username,
      feature: "login",
      success: false,
      errorType: "invalid_credentials"
    });
    response.status(401).json({ message: "invalid_credentials" });
    return;
  }

  const loginTime = new Date().toISOString();
  const token = createSessionToken({ username: configuredUsername, loginTime });
  setSessionCookie(response, token);
  await writeAuditEvent({
    username: configuredUsername,
    loginTime,
    feature: "login",
    success: true
  });
  response.json({ ok: true });
});

app.post("/api/logout", requireAuth, async (request, response) => {
  const username = request.auth?.username;
  const loginTime = request.auth?.loginTime;
  clearSessionCookie(response);
  await writeAuditEvent({
    username,
    loginTime,
    feature: "logout",
    success: true
  });
  response.json({ ok: true });
});

app.get("/api/me", (request, response) => {
  if (!request.auth) {
    response.status(401).json({ authenticated: false });
    return;
  }

  response.json({
    authenticated: true,
    username: request.auth.username
  });
});

app.post("/api/deidentify", requireAuth, async (request, response) => {
  const parsed = textSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "invalid_text" });
    return;
  }

  try {
    const text = deIdentifyMedicalText(parsed.data.text);
    await writeAuditEvent({
      username: request.auth?.username,
      loginTime: request.auth?.loginTime,
      feature: "deidentify",
      success: true
    });
    response.json({ text });
  } catch {
    await writeAuditEvent({
      username: request.auth?.username,
      loginTime: request.auth?.loginTime,
      feature: "deidentify",
      success: false,
      errorType: "deidentify_failed"
    });
    response.status(500).json({ message: "deidentify_failed" });
  }
});

app.post("/api/summarize", requireAuth, async (request, response) => {
  const parsed = summarizeSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: "invalid_text" });
    return;
  }

  try {
    const deidentifiedText = deIdentifyMedicalText(parsed.data.text);
    const summary = await summarizeMedicalText(deidentifiedText, parsed.data.mode);
    await writeAuditEvent({
      username: request.auth?.username,
      loginTime: request.auth?.loginTime,
      feature: "summarize",
      success: true
    });
    response.json({ summary, mode: parsed.data.mode, modeLabel: getModeLabel(parsed.data.mode) });
  } catch (error) {
    const errorType = error instanceof Error ? error.message : "summarize_failed";
    await writeAuditEvent({
      username: request.auth?.username,
      loginTime: request.auth?.loginTime,
      feature: "summarize",
      success: false,
      errorType
    });
    response.status(502).json({ message: "summarize_failed" });
  }
});

if (isProduction) {
  app.use(express.static(clientDistPath, { etag: false, maxAge: 0 }));
  app.get("*", (_request, response) => {
    response.sendFile(path.join(clientDistPath, "index.html"));
  });
}

app.listen(port, () => {
  console.info(`Hospital record summary tool is running on port ${port}.`);
});
