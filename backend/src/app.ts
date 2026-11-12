import express from "express";
import { config } from "./config.js";
import { csrfProtection } from "./middleware/csrf.js";
import { errorHandler } from "./middleware/error.js";
import { authRouter } from "./routes/auth.js";
import { drinksRouter } from "./routes/drinks.js";
import { ordersRouter } from "./routes/orders.js";
import { createSessionMiddleware } from "./session.js";

export function createApp() {
  const app = express();
  if (config.isProduction) app.set("trust proxy", 1);
  app.use(express.json());
  app.use(createSessionMiddleware());
  app.use("/api", csrfProtection);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/drinks", drinksRouter);
  app.use("/api/orders", ordersRouter);

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Ni najdeno" });
  });
  app.use(errorHandler);
  return app;
}
