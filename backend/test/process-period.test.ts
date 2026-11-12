import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/db.js";
import { processPeriod } from "../src/pricing/process-period.js";
import { createDrink, createUser, resetDb } from "./helpers.js";

const PERIOD = new Date("2026-11-11T10:00:00Z");
const IN_PERIOD = new Date("2026-11-11T10:15:00Z");

async function sell(
  drinkId: string,
  quantity: number,
  status: "OPEN" | "COMPLETED" | "CANCELLED" = "COMPLETED",
  completedAt: Date | null = IN_PERIOD,
) {
  const waiter = await createUser();
  await prisma.order.create({
    data: {
      waiterId: waiter.id,
      status,
      completedAt: status === "COMPLETED" ? completedAt : null,
      items: { create: { drinkId, quantity, unitPrice: 3 } },
    },
  });
}

const priceOf = async (id: string) =>
  (await prisma.drink.findUniqueOrThrow({ where: { id } })).currentPrice.toFixed(2);

describe("processPeriod", () => {
  beforeEach(resetDb);

  it("zviša ceno pri visokem povpraševanju, zniža brez prodaje in zapiše zgodovino", async () => {
    const popular = await createDrink({ name: "Popularna", basePrice: 4 });
    const unsold = await createDrink({ name: "Neprodana", basePrice: 4 });
    const some = await createDrink({ name: "Malo", basePrice: 4 });
    await sell(popular.id, 3);
    await sell(popular.id, 2);
    await sell(some.id, 2);

    const result = await processPeriod(PERIOD);

    expect(result).toMatchObject({ status: "processed", drinks: 3 });
    expect(await priceOf(popular.id)).toBe("4.20");
    expect(await priceOf(unsold.id)).toBe("3.80");
    expect(await priceOf(some.id)).toBe("4.00");
    const history = await prisma.priceHistory.findFirstOrThrow({ where: { drinkId: popular.id } });
    expect(history).toMatchObject({ periodStart: PERIOD, unitsSold: 5 });
    expect(history.oldPrice.toFixed(2)).toBe("4.00");
    expect(history.newPrice.toFixed(2)).toBe("4.20");
  });

  it("ne šteje odprtih in preklicanih naročil", async () => {
    const drink = await createDrink({ basePrice: 4 });
    await sell(drink.id, 10, "OPEN");
    await sell(drink.id, 10, "CANCELLED");

    await processPeriod(PERIOD);

    expect(await priceOf(drink.id)).toBe("3.80");
    expect((await prisma.priceHistory.findFirstOrThrow({ where: { drinkId: drink.id } })).unitsSold).toBe(0);
  });

  it("šteje samo naročila, zaključena znotraj obdobja", async () => {
    const drink = await createDrink({ basePrice: 4 });
    await sell(drink.id, 10, "COMPLETED", new Date("2026-11-11T09:59:59Z"));
    await sell(drink.id, 10, "COMPLETED", new Date("2026-11-11T10:30:00Z"));
    await sell(drink.id, 2, "COMPLETED", new Date("2026-11-11T10:00:00Z"));

    await processPeriod(PERIOD);

    expect((await prisma.priceHistory.findFirstOrThrow({ where: { drinkId: drink.id } })).unitsSold).toBe(2);
    expect(await priceOf(drink.id)).toBe("4.00");
  });

  it("isto obdobje obdela največ enkrat", async () => {
    const drink = await createDrink({ basePrice: 4 });
    await sell(drink.id, 5);

    const first = await processPeriod(PERIOD);
    const second = await processPeriod(new Date("2026-11-11T10:20:00Z"));

    expect(first.status).toBe("processed");
    expect(second.status).toBe("skipped");
    expect(await priceOf(drink.id)).toBe("4.20");
    expect(await prisma.priceHistory.count()).toBe(1);
  });

  it("hkratna zagona istega obdobja spremenita ceno samo enkrat", async () => {
    const drink = await createDrink({ basePrice: 4 });
    await sell(drink.id, 5);

    const results = await Promise.all([processPeriod(PERIOD), processPeriod(PERIOD)]);

    expect(results.map((r) => r.status).sort()).toEqual(["processed", "skipped"]);
    expect(await priceOf(drink.id)).toBe("4.20");
    expect(await prisma.priceHistory.count()).toBe(1);
  });

  it("upošteva cenovne meje in preskoči neaktivne pijače", async () => {
    const capped = await createDrink({ basePrice: 4, currentPrice: 4.9, maxPrice: 5 });
    const inactive = await createDrink({ basePrice: 4, active: false });
    await sell(capped.id, 5);

    await processPeriod(PERIOD);

    expect(await priceOf(capped.id)).toBe("5.00");
    expect(await priceOf(inactive.id)).toBe("4.00");
    expect(await prisma.priceHistory.count({ where: { drinkId: inactive.id } })).toBe(0);
  });

  it("zaporedna obdobja se seštevajo", async () => {
    const drink = await createDrink({ basePrice: 4 });

    await processPeriod(PERIOD);
    await processPeriod(new Date("2026-11-11T10:30:00Z"));

    expect(await priceOf(drink.id)).toBe("3.61"); // 4 → 3,80 → 3,61
  });
});
