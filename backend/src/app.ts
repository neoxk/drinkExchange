import express from "express";
import { errorHandler } from "./middleware/error.js";
import { drinksRouter } from "./routes/drinks.js";

export function createApp() {
  const app = express();
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/drinks", drinksRouter);

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Ni najdeno" });
  });
  app.use(errorHandler);
  return app;
}
