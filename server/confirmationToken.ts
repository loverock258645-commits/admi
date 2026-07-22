import { createHmac, timingSafeEqual } from "node:crypto";
import { getJwtSecret } from "./auth.js";

const CONFIRMATION_TOKEN_TTL_MS = 20 * 60 * 1000;

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function hashText(text: string) {
  return createHmac("sha256", getJwtSecret()).update(text).digest("base64url");
}

function signPayload(encodedPayload: string) {
  return createHmac("sha256", getJwtSecret()).update(encodedPayload).digest("base64url");
}

export function createConfirmationToken(text: string) {
  const expiresAt = Date.now() + CONFIRMATION_TOKEN_TTL_MS;
  const payload = base64UrlEncode(JSON.stringify({ hash: hashText(text), expiresAt }));
  const signature = signPayload(payload);
  return {
    confirmationToken: `${payload}.${signature}`,
    confirmationExpiresAt: new Date(expiresAt).toISOString()
  };
}

export function verifyConfirmationToken(text: string, token: string | undefined) {
  if (!token) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expectedSignature = signPayload(payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (actualBuffer.length !== expectedBuffer.length) return false;
  if (!timingSafeEqual(actualBuffer, expectedBuffer)) return false;

  try {
    const data = JSON.parse(base64UrlDecode(payload)) as {
      hash?: string;
      expiresAt?: number;
    };
    return (
      typeof data.hash === "string" &&
      typeof data.expiresAt === "number" &&
      data.expiresAt >= Date.now() &&
      data.hash === hashText(text)
    );
  } catch {
    return false;
  }
}
