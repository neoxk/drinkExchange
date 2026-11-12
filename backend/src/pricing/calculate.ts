import { Prisma } from "@prisma/client";

type DecimalLike = Prisma.Decimal | number | string;

/** Skok ob prodaji: 2 % × ln(1 + prodane enote), največ 6 %. */
export const SALE_IMPACT = 0.02;
export const MAX_SALE_JUMP = 0.06;
/** Razpolovni čas ohlajanja: nad osnovno ceno proti osnovni, pri ali pod njo proti min_price. */
export const HALF_LIFE_ABOVE_BASE_MS = 3 * 60 * 1000;
export const HALF_LIFE_BELOW_BASE_MS = 30 * 60 * 1000;
/** Najmanjši skok ob prodaji, da zaokroževanje ne zamrzne poceni pijač. */
export const MIN_STEP = new Prisma.Decimal("0.01");

export interface PriceState {
  currentPrice: DecimalLike;
  basePrice: DecimalLike;
  minPrice: DecimalLike;
  maxPrice: DecimalLike;
}

const toCents = (value: number, { minPrice, maxPrice }: Pick<PriceState, "minPrice" | "maxPrice">) => {
  const rounded = new Prisma.Decimal(value).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  return Prisma.Decimal.min(Prisma.Decimal.max(rounded, minPrice), maxPrice);
};

/**
 * Cena takoj po prodaji: skok za 2 % × ln(1 + enote) (padajoči donos, največ +6 %),
 * vsaj za 0,01 € in največ do max_price.
 */
export function priceAfterSale(state: PriceState, unitsSold: number): Prisma.Decimal {
  const current = new Prisma.Decimal(state.currentPrice);
  const jump = Math.min(SALE_IMPACT * Math.log1p(unitsSold), MAX_SALE_JUMP);
  const next = toCents(current.toNumber() * (1 + jump), state);
  return next.gt(current) ? next : Prisma.Decimal.min(current.plus(MIN_STEP), state.maxPrice);
}

/**
 * Cena po `idleMs` brez prodaje. Odmik se razpolavlja: nad osnovno ceno vsake 3 minute
 * proti osnovni ceni (skok se hitro ohladi), pri ali pod njo vsakih 30 minut proti min_price
 * (pijača brez povpraševanja se počasi ceni). Padec je zato sprva hiter in se nato umirja.
 */
export function priceAfterIdle(state: PriceState, idleMs: number): Prisma.Decimal {
  const base = new Prisma.Decimal(state.basePrice).toNumber();
  const min = new Prisma.Decimal(state.minPrice).toNumber();
  let price = new Prisma.Decimal(state.currentPrice).toNumber();
  let ms = Math.max(idleMs, 0);

  if (price > base) {
    const gap = price - base;
    // Odmik pod pol centa se zaokroži na osnovno ceno; preostali čas teče že pod njo.
    const msToBase = HALF_LIFE_ABOVE_BASE_MS * Math.log2(gap / 0.005);
    if (ms < msToBase) return toCents(base + gap * 0.5 ** (ms / HALF_LIFE_ABOVE_BASE_MS), state);
    price = base;
    ms -= msToBase;
  }
  return toCents(min + (price - min) * 0.5 ** (ms / HALF_LIFE_BELOW_BASE_MS), state);
}
