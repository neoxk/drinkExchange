import { Router } from "express";
import { notFound } from "../lib/http-error.js";
import { idParam } from "../lib/validation.js";
import { getDrinkHistory, listPublicDrinks } from "../services/drinks.js";

export const drinksRouter = Router();

drinksRouter.get("/", async (_req, res) => {
  res.json(await listPublicDrinks());
});

drinksRouter.get("/:id/history", async (req, res) => {
  const parsed = idParam.safeParse(req.params);
  const result = parsed.success ? await getDrinkHistory(parsed.data.id) : null;
  if (!result) throw notFound("Pijača ne obstaja");
  res.json(result);
});
