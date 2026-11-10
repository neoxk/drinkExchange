import { Router } from "express";
import { listPublicDrinks } from "../services/drinks.js";

export const drinksRouter = Router();

drinksRouter.get("/", async (_req, res) => {
  res.json(await listPublicDrinks());
});
