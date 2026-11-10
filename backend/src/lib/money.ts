import { Prisma } from "@prisma/client";

export type Money = Prisma.Decimal;
export const Money = Prisma.Decimal;

/** Decimalni znesek kot niz z dvema decimalkama (za JSON). */
export const money = (value: Prisma.Decimal | number | string) =>
  new Prisma.Decimal(value).toFixed(2);
