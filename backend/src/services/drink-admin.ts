import type { Drink } from "@prisma/client";
import { prisma } from "../db.js";
import { badRequest, notFound } from "../lib/http-error.js";
import { Money, money } from "../lib/money.js";

export interface DrinkInput {
  name: string;
  category: string;
  basePrice: number;
  minPrice: number;
  maxPrice: number;
  active?: boolean;
}

export const toAdminDrink = (d: Drink) => ({
  id: d.id,
  name: d.name,
  category: d.category,
  basePrice: money(d.basePrice),
  currentPrice: money(d.currentPrice),
  minPrice: money(d.minPrice),
  maxPrice: money(d.maxPrice),
  active: d.active,
  createdAt: d.createdAt.toISOString(),
});

/** Velja 0 < min_price ≤ base_price ≤ max_price. */
function assertPriceLimits({ basePrice, minPrice, maxPrice }: Pick<DrinkInput, "basePrice" | "minPrice" | "maxPrice">) {
  const issues = [];
  if (minPrice > basePrice) issues.push({ path: "minPrice", message: "Najnižja cena ne sme biti višja od osnovne" });
  if (basePrice > maxPrice) issues.push({ path: "maxPrice", message: "Najvišja cena ne sme biti nižja od osnovne" });
  if (issues.length) throw badRequest("Neveljavne cenovne omejitve", issues);
}

export async function listAllDrinks() {
  const drinks = await prisma.drink.findMany({ orderBy: [{ active: "desc" }, { category: "asc" }, { name: "asc" }] });
  return drinks.map(toAdminDrink);
}

export async function createDrink(input: DrinkInput) {
  assertPriceLimits(input);
  const drink = await prisma.drink.create({ data: { ...input, currentPrice: input.basePrice } });
  return toAdminDrink(drink);
}

/**
 * Posodobi pijačo. Trenutna cena se ohrani, po potrebi pa se premakne v nove meje;
 * ohlajanje cene začne teči na novo.
 * Zaklenjene cene na postavkah in zgodovina cen se ne spreminjajo.
 */
export async function updateDrink(id: string, patch: Partial<DrinkInput>) {
  const drink = await prisma.drink.findUnique({ where: { id } });
  if (!drink) throw notFound("Pijača ne obstaja");
  const limits = {
    basePrice: patch.basePrice ?? drink.basePrice.toNumber(),
    minPrice: patch.minPrice ?? drink.minPrice.toNumber(),
    maxPrice: patch.maxPrice ?? drink.maxPrice.toNumber(),
  };
  assertPriceLimits(limits);
  const currentPrice = Money.min(Money.max(drink.currentPrice, limits.minPrice), limits.maxPrice);
  const updated = await prisma.drink.update({ where: { id }, data: { ...patch, currentPrice, priceUpdatedAt: new Date() } });
  return toAdminDrink(updated);
}
