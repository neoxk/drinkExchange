import type { Role, User } from "@prisma/client";
import type { Request, RequestHandler } from "express";
import { prisma } from "../db.js";
import { HttpError } from "../lib/http-error.js";

declare module "express-serve-static-core" {
  interface Request {
    user?: User;
  }
}

/** Zahteva veljavno sejo aktivnega uporabnika (401). Uporabnika vedno prebere iz baze. */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const user = req.session.userId
    ? await prisma.user.findUnique({ where: { id: req.session.userId } })
    : null;
  if (!user || !user.active) throw new HttpError(401, "Niste prijavljeni");
  req.user = user;
  next();
};

/** Zahteva eno od navedenih vlog (403). Uporabi za requireAuth. */
export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new HttpError(403, "Nimate dovoljenja za to dejanje");
    }
    next();
  };

/** Prijavljeni uporabnik; uporabi samo za requireAuth. */
export const currentUser = (req: Request): User => {
  if (!req.user) throw new HttpError(401, "Niste prijavljeni");
  return req.user;
};
