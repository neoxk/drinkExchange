import { Router } from "express";
import { z } from "zod";
import { notFound } from "../lib/http-error.js";
import { idParam, price } from "../lib/validation.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { createDrink, listAllDrinks, updateDrink } from "../services/drink-admin.js";
import { getDrinkHistory, listPublicDrinks } from "../services/drinks.js";

export const drinksRouter = Router();

const manager = [requireAuth, requireRole("MANAGER")];

const drinkSchema = z.object({
  name: z.string().trim().min(1, "Ime je obvezno").max(100),
  category: z.string().trim().min(1, "Kategorija je obvezna").max(50),
  basePrice: price,
  minPrice: price,
  maxPrice: price,
  active: z.boolean().optional(),
});

drinksRouter.get("/", async (_req, res) => {
  res.json(await listPublicDrinks());
});

// Vse pijače (tudi neaktivne) z omejitvami – za upravitelja
drinksRouter.get("/admin", ...manager, async (_req, res) => {
  res.json(await listAllDrinks());
});

drinksRouter.post("/", ...manager, async (req, res) => {
  res.status(201).json(await createDrink(drinkSchema.parse(req.body)));
});

drinksRouter.patch("/:id", ...manager, async (req, res) => {
  const { id } = idParam.parse(req.params);
  res.json(await updateDrink(id, drinkSchema.partial().parse(req.body)));
});

drinksRouter.get("/:id/history", async (req, res) => {
  const parsed = idParam.safeParse(req.params);
  const result = parsed.success ? await getDrinkHistory(parsed.data.id) : null;
  if (!result) throw notFound("Pijača ne obstaja");
  res.json(result);
});
