import { Prisma } from "@prisma/client";

type DecimalLike = Prisma.Decimal | number | string;

export const HIGH_DEMAND_UNITS = 5;
export const INCREASE_FACTOR = new Prisma.Decimal("1.05");
export const DECREASE_FACTOR = new Prisma.Decimal("0.95");

export interface PriceInput {
  currentPrice: DecimalLike;
  minPrice: DecimalLike;
  maxPrice: DecimalLike;
  unitsSold: number;
}

/**
 * Nova cena za eno obdobje:
 * ≥ 5 prodanih enot → × 1,05, 0 enot → × 0,95, sicer enako.
 * Rezultat je zaokrožen na 0,01 € in omejen na [min_price, max_price].
 */
export function calculateNewPrice({ currentPrice, minPrice, maxPrice, unitsSold }: PriceInput): Prisma.Decimal {
  const current = new Prisma.Decimal(currentPrice);
  let next = current;
  if (unitsSold >= HIGH_DEMAND_UNITS) next = current.mul(INCREASE_FACTOR);
  else if (unitsSold === 0) next = current.mul(DECREASE_FACTOR);

  const rounded = next.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  return Prisma.Decimal.min(Prisma.Decimal.max(rounded, minPrice), maxPrice);
}
