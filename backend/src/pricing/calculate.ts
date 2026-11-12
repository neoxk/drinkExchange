import { Prisma } from "@prisma/client";

type DecimalLike = Prisma.Decimal | number | string;

/** Rast na obdobje: 1 % × ln(1 + prodane enote), največ 3 %. */
export const DEMAND_SENSITIVITY = new Prisma.Decimal("0.01");
export const MAX_INCREASE = new Prisma.Decimal("0.03");
/** Padec na obdobje brez prodaje: hitrejši nad osnovno ceno, počasnejši pod njo. */
export const DECAY_ABOVE_BASE = new Prisma.Decimal("0.005");
export const DECAY_AT_OR_BELOW_BASE = new Prisma.Decimal("0.002");
/** Najmanjša sprememba, da zaokroževanje ne zamrzne poceni pijač. */
export const MIN_STEP = new Prisma.Decimal("0.01");

export interface PriceInput {
  currentPrice: DecimalLike;
  basePrice: DecimalLike;
  minPrice: DecimalLike;
  maxPrice: DecimalLike;
  unitsSold: number;
}

/**
 * Nova cena za eno obdobje.
 * Prodaja dvigne ceno sorazmerno z ln(1 + enote) (padajoči donos, največ +3 %),
 * obdobje brez prodaje jo zniža za 0,5 % nad osnovno ceno oziroma 0,2 % pri ali pod njej.
 * Rezultat je zaokrožen na 0,01 €, se premakne vsaj za 0,01 € in je omejen na [min_price, max_price].
 */
export function calculateNewPrice({ currentPrice, basePrice, minPrice, maxPrice, unitsSold }: PriceInput): Prisma.Decimal {
  const current = new Prisma.Decimal(currentPrice);
  const rate =
    unitsSold > 0
      ? Prisma.Decimal.min(new Prisma.Decimal(unitsSold).plus(1).ln().mul(DEMAND_SENSITIVITY), MAX_INCREASE)
      : (current.gt(basePrice) ? DECAY_ABOVE_BASE : DECAY_AT_OR_BELOW_BASE).neg();

  let next = current.mul(rate.plus(1)).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  if (next.equals(current)) next = rate.isNeg() ? current.minus(MIN_STEP) : current.plus(MIN_STEP);
  return Prisma.Decimal.min(Prisma.Decimal.max(next, minPrice), maxPrice);
}
