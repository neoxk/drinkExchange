import type { Drink, PriceHistory } from "@prisma/client";
import { prisma } from "../db.js";
import { Money, money } from "../lib/money.js";

/** Pijača za javni cenik s spremembo glede na prejšnje obdobje. */
export function toPublicDrink(drink: Drink, lastChange?: Pick<PriceHistory, "oldPrice"> | null) {
  const previous = lastChange?.oldPrice ?? drink.currentPrice;
  const change = new Money(drink.currentPrice).minus(previous);
  const changePercent = new Money(previous).isZero()
    ? new Money(0)
    : change.div(previous).mul(100);
  return {
    id: drink.id,
    name: drink.name,
    category: drink.category,
    currentPrice: money(drink.currentPrice),
    basePrice: money(drink.basePrice),
    previousPrice: money(previous),
    change: money(change),
    changePercent: changePercent.toDecimalPlaces(2).toNumber(),
  };
}

export async function listPublicDrinks() {
  const drinks = await prisma.drink.findMany({
    where: { active: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: { priceHistory: { orderBy: { periodStart: "desc" }, take: 1 } },
  });
  return drinks.map((d) => toPublicDrink(d, d.priceHistory[0]));
}
