import { Router, type Request } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { HttpError } from "../lib/http-error.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { SESSION_COOKIE } from "../session.js";
import { toPublicUser } from "../services/users.js";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1),
});

// Hash za primerjavo, ko uporabnik ne obstaja, da se odzivni čas ne razlikuje.
const dummyHash = hashPassword("ni-uporabnika");

const promisify = (fn: (cb: (err: unknown) => void) => void) =>
  new Promise<void>((resolve, reject) => fn((err) => (err ? reject(err) : resolve())));

authRouter.post("/login", async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });
  const valid = await verifyPassword(user?.passwordHash ?? (await dummyHash), password);
  if (!user || !user.active || !valid) {
    throw new HttpError(401, "Napačna e-pošta ali geslo");
  }
  // Nova seja ob prijavi prepreči fiksacijo seje.
  await promisify((cb) => req.session.regenerate(cb));
  req.session.userId = user.id;
  await promisify((cb) => req.session.save(cb));
  res.json(toPublicUser(user));
});

authRouter.post("/logout", async (req: Request, res) => {
  await promisify((cb) => req.session.destroy(cb));
  res.clearCookie(SESSION_COOKIE);
  res.status(204).end();
});

authRouter.get("/me", async (req, res) => {
  const user = req.session.userId
    ? await prisma.user.findUnique({ where: { id: req.session.userId } })
    : null;
  if (!user || !user.active) throw new HttpError(401, "Niste prijavljeni");
  res.json(toPublicUser(user));
});
