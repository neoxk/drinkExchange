import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";
import { createDrink, resetDb } from "./helpers.js";

const app = createApp();
const MINUTE = 60 * 1000;

describe("GET /api/drinks/:id/history", () => {
  beforeEach(resetDb);

  it("vrne zapise zadnje ure v časovnem vrstnem redu", async () => {
    const drink = await createDrink({ basePrice: 3, currentPrice: 3.15 });
    const now = Date.now();
    await prisma.priceHistory.createMany({
      data: [
        { drinkId: drink.id, changedAt: new Date(now - 61 * MINUTE), oldPrice: 2.9, newPrice: 3, unitsSold: 1 },
        { drinkId: drink.id, changedAt: new Date(now - 1 * MINUTE), oldPrice: 3, newPrice: 3.15, unitsSold: 7 },
        { drinkId: drink.id, changedAt: new Date(now - 2 * MINUTE), oldPrice: 3, newPrice: 3, unitsSold: 2 },
      ],
    });

    const res = await request(app).get(`/api/drinks/${drink.id}/history`);

    expect(res.status).toBe(200);
    expect(res.body.history.map((h: { price: string; unitsSold: number }) => [h.price, h.unitsSold])).toEqual([
      ["3.00", 2],
      ["3.15", 7],
    ]);
    expect(res.body.drink).toMatchObject({ id: drink.id, currentPrice: "3.15", change: "0.15" });
  });

  it("vrne prazno zgodovino za novo pijačo", async () => {
    const drink = await createDrink();
    const res = await request(app).get(`/api/drinks/${drink.id}/history`);
    expect(res.status).toBe(200);
    expect(res.body.history).toEqual([]);
  });

  it("vrne 404 za neaktivno pijačo", async () => {
    const drink = await createDrink({ active: false });
    expect((await request(app).get(`/api/drinks/${drink.id}/history`)).status).toBe(404);
  });

  it("vrne 404 za neobstoječo pijačo in neveljaven id", async () => {
    expect((await request(app).get("/api/drinks/00000000-0000-4000-8000-000000000000/history")).status).toBe(404);
    expect((await request(app).get("/api/drinks/ni-uuid/history")).status).toBe(404);
  });
});
