import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";
import { requireAuth, requireRole } from "../src/middleware/auth.js";
import { csrfProtection } from "../src/middleware/csrf.js";
import { errorHandler } from "../src/middleware/error.js";
import { createSessionMiddleware } from "../src/session.js";
import { createUser, loginAs, resetDb } from "./helpers.js";

// Testna aplikacija z zaščitenimi potmi poleg pravih API poti
function appWithProtectedRoutes() {
  const app = createApp();
  const probe = express();
  probe.use(express.json(), createSessionMiddleware());
  probe.use("/api", csrfProtection);
  probe.get("/api/probe/any", requireAuth, (_req, res) => void res.json({ ok: true }));
  probe.get("/api/probe/manager", requireAuth, requireRole("MANAGER"), (_req, res) => void res.json({ ok: true }));
  probe.post("/api/probe/write", requireAuth, (_req, res) => void res.json({ ok: true }));
  probe.use(app);
  probe.use(errorHandler);
  return probe;
}

describe("dovoljenja po vlogah", () => {
  const app = appWithProtectedRoutes();
  beforeEach(resetDb);

  it("brez seje zaščitena pot vrne 401", async () => {
    expect((await request(app).get("/api/probe/any")).status).toBe(401);
  });

  it("natakar na poti za upravitelja dobi 403, upravitelj 200", async () => {
    const waiter = await createUser({ role: "WAITER" });
    const manager = await createUser({ role: "MANAGER" });

    const asWaiter = await loginAs(app, waiter);
    const asManager = await loginAs(app, manager);

    expect((await asWaiter.agent.get("/api/probe/any")).status).toBe(200);
    expect((await asWaiter.agent.get("/api/probe/manager")).status).toBe(403);
    expect((await asManager.agent.get("/api/probe/manager")).status).toBe(200);
  });

  it("deaktivacija uporabnika takoj razveljavi obstoječo sejo", async () => {
    const waiter = await createUser();
    const { agent } = await loginAs(app, waiter);
    await prisma.user.update({ where: { id: waiter.id }, data: { active: false } });

    expect((await agent.get("/api/probe/any")).status).toBe(401);
  });
});

describe("CSRF zaščita", () => {
  const app = appWithProtectedRoutes();
  beforeEach(resetDb);

  it("zavrne spreminjajočo zahtevo brez žetona ali z napačnim žetonom", async () => {
    const { agent } = await loginAs(app, await createUser());

    expect((await agent.post("/api/probe/write")).status).toBe(403);
    expect((await agent.post("/api/probe/write").set("X-CSRF-Token", "napacen")).status).toBe(403);
  });

  it("sprejme zahtevo s pravilnim žetonom seje", async () => {
    const { agent, csrf } = await loginAs(app, await createUser());
    expect((await agent.post("/api/probe/write").set("X-CSRF-Token", csrf)).status).toBe(200);
  });

  it("GET /api/auth/me vrne isti žeton kot prijava", async () => {
    const { agent, csrf } = await loginAs(app, await createUser());
    expect((await agent.get("/api/auth/me")).body.csrfToken).toBe(csrf);
  });

  it("žeton ene seje ne velja za drugo sejo", async () => {
    const a = await loginAs(app, await createUser());
    const b = await loginAs(app, await createUser());
    expect((await a.agent.post("/api/probe/write").set("X-CSRF-Token", b.csrf)).status).toBe(403);
  });
});
