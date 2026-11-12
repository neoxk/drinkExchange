import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";
import { createDrink, createUser, loginAs, resetDb } from "./helpers.js";

const app = createApp();

async function session(role: "WAITER" | "MANAGER" = "MANAGER") {
  const { agent, csrf } = await loginAs(app, await createUser({ role }));
  return {
    agent,
    post: (url: string, body: object) => agent.post(url).set("X-CSRF-Token", csrf).send(body),
    patch: (url: string, body: object) => agent.patch(url).set("X-CSRF-Token", csrf).send(body),
  };
}

const valid = { name: "Radler", category: "Pivo", basePrice: 3.2, minPrice: 2.5, maxPrice: 4.5 };

describe("upravljanje pijač", () => {
  beforeEach(resetDb);

  it("upravitelj doda pijačo; trenutna cena je osnovna cena", async () => {
    const m = await session();

    const res = await m.post("/api/drinks", valid);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: "Radler", basePrice: "3.20", currentPrice: "3.20", minPrice: "2.50", maxPrice: "4.50", active: true });
    expect((await request(app).get("/api/drinks")).body).toHaveLength(1);
  });

  it.each([
    [{ minPrice: 3.5 }, "minPrice"],
    [{ maxPrice: 3 }, "maxPrice"],
    [{ basePrice: 0 }, "basePrice"],
    [{ minPrice: -1 }, "minPrice"],
    [{ basePrice: 3.333 }, "basePrice"],
    [{ name: "  " }, "name"],
  ])("zavrne neveljavne podatke %o z opisom napake", async (override, field) => {
    const m = await session();

    const res = await m.post("/api/drinks", { ...valid, ...override });

    expect(res.status).toBe(400);
    expect(res.body.details.map((d: { path: string }) => d.path)).toContain(field);
  });

  it("deaktivirana pijača izgine iz cenika, ponovna aktivacija jo vrne", async () => {
    const m = await session();
    const drink = await createDrink();

    expect((await m.patch(`/api/drinks/${drink.id}`, { active: false })).body.active).toBe(false);
    expect((await request(app).get("/api/drinks")).body).toHaveLength(0);
    expect((await m.agent.get("/api/drinks/admin")).body).toHaveLength(1);

    await m.patch(`/api/drinks/${drink.id}`, { active: true });
    expect((await request(app).get("/api/drinks")).body).toHaveLength(1);
  });

  it("delna posodobitev preveri meje skupaj z obstoječimi vrednostmi", async () => {
    const m = await session();
    const drink = await createDrink({ basePrice: 3, minPrice: 2, maxPrice: 5 });

    expect((await m.patch(`/api/drinks/${drink.id}`, { maxPrice: 2.5 })).status).toBe(400);
    expect((await m.patch(`/api/drinks/${drink.id}`, { maxPrice: 4, name: "Novo ime" })).body).toMatchObject({ maxPrice: "4.00", name: "Novo ime" });
  });

  it("trenutna cena se premakne v nove meje, zaklenjene cene in zgodovina ostanejo", async () => {
    const m = await session();
    const waiter = await createUser();
    const drink = await createDrink({ basePrice: 4, currentPrice: 4.8, minPrice: 3, maxPrice: 5 });
    await prisma.order.create({ data: { waiterId: waiter.id, items: { create: { drinkId: drink.id, quantity: 1, unitPrice: 4.8 } } } });
    await prisma.priceHistory.create({ data: { drinkId: drink.id, changedAt: new Date("2026-01-01T10:00:00Z"), oldPrice: 4.57, newPrice: 4.8, unitsSold: 5 } });

    const res = await m.patch(`/api/drinks/${drink.id}`, { maxPrice: 4.5 });

    expect(res.body.currentPrice).toBe("4.50");
    expect((await prisma.orderItem.findFirstOrThrow()).unitPrice.toFixed(2)).toBe("4.80");
    expect((await prisma.priceHistory.findFirstOrThrow()).newPrice.toFixed(2)).toBe("4.80");
  });

  it("natakar in gost ne moreta upravljati pijač", async () => {
    const w = await session("WAITER");
    const drink = await createDrink();

    expect((await w.post("/api/drinks", valid)).status).toBe(403);
    expect((await w.patch(`/api/drinks/${drink.id}`, { active: false })).status).toBe(403);
    expect((await w.agent.get("/api/drinks/admin")).status).toBe(403);
    expect((await request(app).post("/api/drinks").send(valid)).status).toBe(401);
  });

  it("vrne 404 za neobstoječo pijačo", async () => {
    const m = await session();
    expect((await m.patch("/api/drinks/00000000-0000-4000-8000-000000000000", { active: false })).status).toBe(404);
  });
});
