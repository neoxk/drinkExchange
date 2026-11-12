import type { Drink, PriceHistory } from "@prisma/client";
import { prisma } from "../db.js";
import { Money, money } from "../lib/money.js";

/** Okno, v katerem cenik prikazuje trend cene. */
export const TREND_WINDOW_MS = 5 * 60 * 1000;

/**
 * Pijača za javni cenik s spremembo v zadnjih 5 minutah.
 * `firstChange` je prva sprememba v tem oknu; njena stara cena je cena na začetku okna.
 */
export function toPublicDrink(drink: Drink, firstChange?: Pick<PriceHistory, "oldPrice"> | null) {
  const previous = firstChange?.oldPrice ?? drink.currentPrice;
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

export async function listPublicDrinks(now = new Date()) {
  const trendStart = new Date(now.getTime() - TREND_WINDOW_MS);
  const drinks = await prisma.drink.findMany({
    where: { active: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: { priceHistory: { where: { changedAt: { gte: trendStart } }, orderBy: { changedAt: "asc" }, take: 1 } },
  });
  return drinks.map((d) => toPublicDrink(d, d.priceHistory[0]));
}

const HISTORY_WINDOW_MS = 60 * 60 * 1000;

/** Zgodovina cen aktivne pijače za zadnjo uro ali null, če pijača ni na voljo. */
export async function getDrinkHistory(id: string, now = new Date()) {
  const drink = await prisma.drink.findFirst({ where: { id, active: true } });
  if (!drink) return null;
  const history = await prisma.priceHistory.findMany({
    where: { drinkId: id, changedAt: { gte: new Date(now.getTime() - HISTORY_WINDOW_MS) } },
    orderBy: { changedAt: "asc" },
  });
  const trendStart = now.getTime() - TREND_WINDOW_MS;
  return {
    drink: toPublicDrink(drink, history.find((h) => h.changedAt.getTime() >= trendStart)),
    history: history.map((h) => ({
      changedAt: h.changedAt.toISOString(),
      oldPrice: money(h.oldPrice),
      price: money(h.newPrice),
      unitsSold: h.unitsSold,
    })),
  };
}
