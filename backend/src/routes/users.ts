import { Router } from "express";
import { z } from "zod";
import { idParam } from "../lib/validation.js";
import { currentUser, requireAuth, requireRole } from "../middleware/auth.js";
import { createUser, listUsers, updateUser } from "../services/users.js";

export const usersRouter = Router();

usersRouter.use(requireAuth, requireRole("MANAGER"));

const role = z.enum(["WAITER", "MANAGER"]);
const password = z.string().min(8, "Geslo mora imeti vsaj 8 znakov").max(200);

const createSchema = z.object({
  name: z.string().trim().min(1, "Ime je obvezno").max(100),
  email: z.string().trim().toLowerCase().pipe(z.email("Neveljaven e-poštni naslov")),
  password,
  role: role.default("WAITER"),
});

const updateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  role: role.optional(),
  active: z.boolean().optional(),
  password: password.optional(),
});

usersRouter.get("/", async (_req, res) => {
  res.json(await listUsers());
});

usersRouter.post("/", async (req, res) => {
  res.status(201).json(await createUser(createSchema.parse(req.body)));
});

usersRouter.patch("/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  res.json(await updateUser(id, currentUser(req), updateSchema.parse(req.body)));
});
