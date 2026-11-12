import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { calculateNewPrice } from "./calculate.js";
import { periodEnd, periodStartOf } from "./period.js";

export type ProcessResult =
  | { status: "processed"; periodStart: Date; drinks: number }
  | { status: "skipped"; periodStart: Date; reason: string };

/**
 * Preračuna cene vseh aktivnih pijač za podano 30-sekundno obdobje.
 * Upošteva samo naročila, zaključena v obdobju. Vse spremembe so v eni transakciji;
 * enolični ključ (drink_id, period_start) zagotavlja, da se obdobje obdela največ enkrat.
 */
export async function processPeriod(start: Date): Promise<ProcessResult> {
  const periodStart = periodStartOf(start);
  try {
    return await prisma.$transaction(async (tx) => {
      const alreadyDone = await tx.priceHistory.findFirst({ where: { periodStart } });
      if (alreadyDone) return { status: "skipped", periodStart, reason: "obdobje je že obdelano" };

      const sold = await tx.orderItem.groupBy({
        by: ["drinkId"],
        where: { order: { status: "COMPLETED", completedAt: { gte: periodStart, lt: periodEnd(periodStart) } } },
        _sum: { quantity: true },
      });
      const unitsByDrink = new Map(sold.map((s) => [s.drinkId, s._sum.quantity ?? 0]));

      const drinks = await tx.drink.findMany({ where: { active: true } });
      for (const drink of drinks) {
        const unitsSold = unitsByDrink.get(drink.id) ?? 0;
        const newPrice = calculateNewPrice({ ...drink, unitsSold });
        await tx.priceHistory.create({
          data: { drinkId: drink.id, periodStart, oldPrice: drink.currentPrice, newPrice, unitsSold },
        });
        if (!newPrice.equals(drink.currentPrice)) {
          await tx.drink.update({ where: { id: drink.id }, data: { currentPrice: newPrice } });
        }
      }
      return { status: "processed", periodStart, drinks: drinks.length };
    });
  } catch (e) {
    // Hkratni zagon je obdobje že zapisal – transakcija je razveljavljena.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { status: "skipped", periodStart, reason: "obdobje je že obdelano" };
    }
    throw e;
  }
}
