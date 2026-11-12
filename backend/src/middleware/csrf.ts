import { randomBytes, timingSafeEqual } from "node:crypto";
import type { Request, RequestHandler } from "express";
import { HttpError } from "../lib/http-error.js";

export const CSRF_HEADER = "x-csrf-token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
// Prijava še nima seje; ob uspehu se ustvari nova seja z novim žetonom.
const EXEMPT_PATHS = new Set(["/api/auth/login"]);

/** Vrne CSRF žeton seje in ga po potrebi ustvari. */
export function ensureCsrfToken(req: Request): string {
  req.session.csrfToken ??= randomBytes(32).toString("base64url");
  return req.session.csrfToken;
}

const equal = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Synchronizer token: zahteve, ki spreminjajo podatke, morajo poslati žeton seje v glavi. */
export const csrfProtection: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method) || EXEMPT_PATHS.has(req.originalUrl.split("?")[0])) {
    next();
    return;
  }
  const expected = req.session.csrfToken;
  const received = req.get(CSRF_HEADER);
  if (!expected || !received || !equal(expected, received)) {
    throw new HttpError(403, "Neveljaven CSRF žeton");
  }
  next();
};
