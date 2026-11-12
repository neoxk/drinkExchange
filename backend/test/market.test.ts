import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/db.js";
import { coolPrices } from "../src/pricing/market.js";
import { createDrink, createUser, loginAs, resetDb } from "./helpers.js";

const app = createApp();
const MINUTE = 60 * 1000;
const T0 = new Date("2026-11-11T10:00:00Z");

async function session() {
  const { agent, csrf } = await loginAs(app, await createUser());
  return {
    post: (url: string, body: object = {}) => agent.post(url).set("X-CSRF-Token", csrf).send(body),
    patch: (url: string, body: object) => agent.patch(url).set("X-CSRF-Token", csrf).send(body),
  };
}

/** Odda naročilo s podanimi postavkami in ga zaključi ali prekliče. */
async function order(items: [drinkId: string, quantity: number][], status: "COMPLETED" | "CANCELLED" = "COMPLETED") {
  const s = await session();
  const { id } = (await s.post("/api/orders")).body;
  for (const [drinkId, quantity] of items) await s.post(`/api/orders/${id}/items`, { drinkId, quantity });
  const res = await s.patch(`/api/orders/${id}/status`, { status });
  expect(res.status).toBe(200);
}

const priceOf = async (id: string) =>
  (await prisma.drink.findUniqueOrThrow({ where: { id } })).currentPrice.toFixed(2);

describe("takojšen dvig cene ob prodaji", () => {
  beforeEach(resetDb);

  it("zaključek naročila takoj zviša ceno prodane pijače in zapiše zgodovino", async () => {
    const sold = await createDrink({ name: "Prodana", basePrice: 4 });
    const other = await createDrink({ name: "Druga", basePrice: 4 });

    await order([[sold.id, 5]]);

    expect(await priceOf(sold.id)).toBe("4.14");
    expect(await priceOf(other.id)).toBe("4.00");
    const history = await prisma.priceHistory.findMany();
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ drinkId: sold.id, unitsSold: 5 });
    expect(history[0].oldPrice.toFixed(2)).toBe("4.00");
    expect(history[0].newPrice.toFixed(2)).toBe("4.14");
  });

  it("sešteje postavke iste pijače v naročilu", async () => {
    const drink = await createDrink({ basePrice: 4 });

    await order([[drink.id, 3], [drink.id, 2]]);

    expect(await priceOf(drink.id)).toBe("4.14");
    expect((await prisma.priceHistory.findFirstOrThrow()).unitsSold).toBe(5);
  });

  it("zaporedna naročila se seštevajo", async () => {
    const drink = await createDrink({ basePrice: 4 });

    await order([[drink.id, 1]]);
    await order([[drink.id, 1]]);

    expect(await priceOf(drink.id)).toBe("4.12"); // 4 → 4,06 → 4,12
  });

  it("preklicano naročilo cene ne spremeni", async () => {
    const drink = await createDrink({ basePrice: 4 });

    await order([[drink.id, 10]], "CANCELLED");

    expect(await priceOf(drink.id)).toBe("4.00");
    expect(await prisma.priceHistory.count()).toBe(0);
  });

  it("upošteva max_price in preskoči pijačo, ki je medtem postala neaktivna", async () => {
    const capped = await createDrink({ basePrice: 4, currentPrice: 4.9, maxPrice: 5 });
    const retired = await createDrink({ basePrice: 4 });
    const s = await session();
    const { id } = (await s.post("/api/orders")).body;
    await s.post(`/api/orders/${id}/items`, { drinkId: capped.id, quantity: 10 });
    await s.post(`/api/orders/${id}/items`, { drinkId: retired.id, quantity: 10 });
    await prisma.drink.update({ where: { id: retired.id }, data: { active: false } });

    await s.patch(`/api/orders/${id}/status`, { status: "COMPLETED" });

    expect(await priceOf(capped.id)).toBe("5.00");
    expect(await priceOf(retired.id)).toBe("4.00");
    expect(await prisma.priceHistory.count({ where: { drinkId: retired.id } })).toBe(0);
  });

  it("pred skokom poračuna ohlajanje od zadnje spremembe", async () => {
    const drink = await createDrink({ basePrice: 4, currentPrice: 5, maxPrice: 6, priceUpdatedAt: new Date(Date.now() - 3 * MINUTE) });

    await order([[drink.id, 1]]);

    expect(await priceOf(drink.id)).toBe("4.56"); // 5 → 4,50 (ohlajanje) → 4,56
    expect((await prisma.priceHistory.findFirstOrThrow()).oldPrice.toFixed(2)).toBe("5.00");
  });
});

describe("coolPrices", () => {
  beforeEach(resetDb);

  it("ohladi cene glede na čas od zadnje spremembe in zapiše zgodovino", async () => {
    const hot = await createDrink({ name: "Vroča", basePrice: 4, currentPrice: 5, maxPrice: 6, priceUpdatedAt: T0 });
    const idle = await createDrink({ name: "Mirna", basePrice: 4, priceUpdatedAt: T0 });
    const now = new Date(T0.getTime() + 3 * MINUTE);

    expect(await coolPrices(now)).toBe(2);

    expect(await priceOf(hot.id)).toBe("4.50");
    expect(await priceOf(idle.id)).toBe("3.87"); // proti min_price 2 € z razpolovnim časom 30 min
    const history = await prisma.priceHistory.findFirstOrThrow({ where: { drinkId: hot.id } });
    expect(history).toMatchObject({ changedAt: now, unitsSold: 0 });
    expect(history.oldPrice.toFixed(2)).toBe("5.00");
    expect(history.newPrice.toFixed(2)).toBe("4.50");
  });

  it("ponovni zagon v istem trenutku cene ne zniža dvakrat", async () => {
    const drink = await createDrink({ basePrice: 4, currentPrice: 5, maxPrice: 6, priceUpdatedAt: T0 });
    const now = new Date(T0.getTime() + 3 * MINUTE);

    await coolPrices(now);
    expect(await coolPrices(now)).toBe(0);

    expect(await priceOf(drink.id)).toBe("4.50");
    expect(await prisma.priceHistory.count()).toBe(1);
  });

  it("ne zapiše zgodovine, dokler se cena ne premakne za cent", async () => {
    const drink = await createDrink({ basePrice: 4, priceUpdatedAt: T0 });

    expect(await coolPrices(new Date(T0.getTime() + 5_000))).toBe(0);

    expect(await priceOf(drink.id)).toBe("4.00");
    expect(await prisma.priceHistory.count()).toBe(0);
  });

  it("preskoči neaktivne pijače in spoštuje min_price", async () => {
    const inactive = await createDrink({ basePrice: 4, currentPrice: 5, active: false, priceUpdatedAt: T0 });
    const floor = await createDrink({ basePrice: 4, currentPrice: 2.01, priceUpdatedAt: T0 });

    await coolPrices(new Date(T0.getTime() + 24 * 60 * MINUTE));

    expect(await priceOf(inactive.id)).toBe("5.00");
    expect(await priceOf(floor.id)).toBe("2.00");
  });
});
