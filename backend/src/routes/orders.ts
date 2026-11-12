import { Router } from "express";
import { z } from "zod";
import { idParam } from "../lib/validation.js";
import { currentUser, requireAuth, requireRole } from "../middleware/auth.js";
import { addItem, createOrder, getOrder } from "../services/orders.js";

export const ordersRouter = Router();

ordersRouter.use(requireAuth, requireRole("WAITER", "MANAGER"));

// Cena ni del vhoda – določi jo strežnik.
const addItemSchema = z.object({
  drinkId: z.uuid(),
  quantity: z.number().int().positive().max(100),
});

ordersRouter.post("/", async (req, res) => {
  res.status(201).json(await createOrder(currentUser(req)));
});

ordersRouter.get("/:id", async (req, res) => {
  const { id } = idParam.parse(req.params);
  res.json(await getOrder(id, currentUser(req)));
});

ordersRouter.post("/:id/items", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const input = addItemSchema.parse(req.body);
  res.status(201).json(await addItem(id, currentUser(req), input));
});
