import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";
import { createDrink, resetDb } from "./helpers.js";

const app = createApp();
const ago = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000);

describe("GET /api/drinks", () => {
  beforeEach(resetDb);

  it("vrne samo aktivne pijače", async () => {
    await createDrink({ name: "Pivo" });
    await createDrink({ name: "Skrita", active: false });

    const res = await request(app).get("/api/drinks");

    expect(res.status).toBe(200);
    expect(res.body.map((d: { name: string }) => d.name)).toEqual(["Pivo"]);
  });

  it("vrne trenutno in osnovno ceno ter ničelno spremembo brez zgodovine", async () => {
    await createDrink({ name: "Pivo", category: "Pivo", basePrice: 3.5 });

    const [drink] = (await request(app).get("/api/drinks")).body;

    expect(drink).toMatchObject({
      name: "Pivo",
      category: "Pivo",
      currentPrice: "3.50",
      basePrice: "3.50",
      change: "0.00",
      changePercent: 0,
    });
  });

  it("izračuna spremembo glede na ceno pred 5 minutami", async () => {
    const drink = await createDrink({ basePrice: 4, currentPrice: 4.2 });
    await prisma.priceHistory.createMany({
      data: [
        { drinkId: drink.id, changedAt: ago(10), oldPrice: 3.8, newPrice: 4, unitsSold: 6 },
        { drinkId: drink.id, changedAt: ago(2), oldPrice: 4, newPrice: 4.1, unitsSold: 2 },
        { drinkId: drink.id, changedAt: ago(1), oldPrice: 4.1, newPrice: 4.2, unitsSold: 5 },
      ],
    });

    const [result] = (await request(app).get("/api/drinks")).body;

    expect(result).toMatchObject({ currentPrice: "4.20", previousPrice: "4.00", change: "0.20", changePercent: 5 });
  });

  it("pri padcu cene vrne negativno spremembo", async () => {
    const drink = await createDrink({ basePrice: 4, currentPrice: 3.8 });
    await prisma.priceHistory.create({
      data: { drinkId: drink.id, changedAt: ago(1), oldPrice: 4, newPrice: 3.8, unitsSold: 0 },
    });

    const [result] = (await request(app).get("/api/drinks")).body;

    expect(result).toMatchObject({ change: "-0.20", changePercent: -5 });
  });

  it("spremembe, starejše od 5 minut, ne štejejo v trend", async () => {
    const drink = await createDrink({ basePrice: 4, currentPrice: 4.2 });
    await prisma.priceHistory.create({
      data: { drinkId: drink.id, changedAt: ago(6), oldPrice: 4, newPrice: 4.2, unitsSold: 5 },
    });

    const [result] = (await request(app).get("/api/drinks")).body;

    expect(result).toMatchObject({ previousPrice: "4.20", change: "0.00", changePercent: 0 });
  });
});
