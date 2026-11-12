import express from "express";
import { errorHandler } from "./middleware/error.js";

export function createApp() {
  const app = express();
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Ni najdeno" });
  });
  app.use(errorHandler);
  return app;
}
