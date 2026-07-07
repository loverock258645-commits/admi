import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export type AuthPayload = {
  username: string;
  loginTime: string;
};

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

const COOKIE_NAME = "hospital_summary_session";

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters long.");
  }
  return secret;
}

export function createSessionToken(payload: AuthPayload) {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: "8h",
    issuer: "hospital-record-summary-tool"
  });
}

export function setSessionCookie(response: Response, token: string) {
  response.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 8 * 60 * 60 * 1000,
    path: "/"
  });
}

export function clearSessionCookie(response: Response) {
  response.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/"
  });
}

export function optionalAuth(request: Request, _response: Response, next: NextFunction) {
  const token = request.cookies?.[COOKIE_NAME];
  if (!token) {
    next();
    return;
  }

  try {
    request.auth = jwt.verify(token, getJwtSecret(), {
      issuer: "hospital-record-summary-tool"
    }) as AuthPayload;
  } catch {
    request.auth = undefined;
  }

  next();
}

export function requireAuth(request: Request, response: Response, next: NextFunction) {
  if (!request.auth) {
    response.status(401).json({ message: "unauthorized" });
    return;
  }
  next();
}
