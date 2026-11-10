import { Router } from "express";
import { z } from "zod";
import { idParam } from "../lib/validation.js";
import { currentUser, requireAuth, requireRole } from "../middleware/auth.js";
import { addItem, changeStatus, createOrder, getOrder, listOrders } from "../services/orders.js";

export const ordersRouter = Router();

ordersRouter.use(requireAuth, requireRole("WAITER", "MANAGER"));

// Cena ni del vhoda – določi jo strežnik.
const addItemSchema = z.object({
  drinkId: z.uuid(),
  quantity: z.number().int().positive().max(100),
});

const listQuery = z.object({
  status: z.enum(["OPEN", "COMPLETED", "CANCELLED"]).optional(),
});

const statusSchema = z.object({
  status: z.enum(["COMPLETED", "CANCELLED"]),
});

ordersRouter.get("/", async (req, res) => {
  res.json(await listOrders(currentUser(req), listQuery.parse(req.query)));
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

ordersRouter.patch("/:id/status", async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { status } = statusSchema.parse(req.body);
  res.json(await changeStatus(id, currentUser(req), status));
});
