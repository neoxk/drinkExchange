import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { priceAfterIdle, priceAfterSale } from "./calculate.js";

/**
 * Takoj zviša cene pijač iz pravkar zaključenega naročila in zapiše zgodovino.
 * Teče v transakciji zaključka naročila; vrstice pijač zaklene, da se hkratne prodaje seštejejo.
 * Neaktivne pijače se preskočijo.
 */
export async function applySale(
  tx: Prisma.TransactionClient,
  items: { drinkId: string; quantity: number }[],
  now: Date,
) {
  const unitsByDrink = new Map<string, number>();
  for (const item of items) unitsByDrink.set(item.drinkId, (unitsByDrink.get(item.drinkId) ?? 0) + item.quantity);
  if (unitsByDrink.size === 0) return;

  const ids = [...unitsByDrink.keys()].map((id) => Prisma.sql`${id}::uuid`);
  await tx.$queryRaw`SELECT id FROM drinks WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`;

  const drinks = await tx.drink.findMany({ where: { id: { in: [...unitsByDrink.keys()] }, active: true } });
  for (const drink of drinks) {
    const unitsSold = unitsByDrink.get(drink.id)!;
    // Najprej poračunamo ohlajanje do tega trenutka, nato prištejemo skok.
    const cooled = priceAfterIdle(drink, now.getTime() - drink.priceUpdatedAt.getTime());
    const newPrice = priceAfterSale({ ...drink, currentPrice: cooled }, unitsSold);
    await tx.drink.update({ where: { id: drink.id }, data: { currentPrice: newPrice, priceUpdatedAt: now } });
    await tx.priceHistory.create({
      data: { drinkId: drink.id, changedAt: now, oldPrice: drink.currentPrice, newPrice, unitsSold },
    });
  }
}

/**
 * Ohladi cene vseh aktivnih pijač glede na čas od njihove zadnje spremembe.
 * Izračun je odvisen samo od pretečenega časa, zato ponovni ali zamujeni zagon ne pokvari cen.
 * Vrne število pijač, ki se jim je cena spremenila.
 */
export async function coolPrices(now = new Date()): Promise<number> {
  const drinks = await prisma.drink.findMany({ where: { active: true } });
  let changed = 0;
  for (const drink of drinks) {
    const newPrice = priceAfterIdle(drink, now.getTime() - drink.priceUpdatedAt.getTime());
    if (newPrice.equals(drink.currentPrice)) continue;
    await prisma.$transaction(async (tx) => {
      // Pogojna posodobitev: če je cena vmes skočila zaradi prodaje, ohlajanje počaka na naslednji zagon.
      const { count } = await tx.drink.updateMany({
        where: { id: drink.id, currentPrice: drink.currentPrice, priceUpdatedAt: drink.priceUpdatedAt },
        data: { currentPrice: newPrice, priceUpdatedAt: now },
      });
      if (count === 0) return;
      await tx.priceHistory.create({
        data: { drinkId: drink.id, changedAt: now, oldPrice: drink.currentPrice, newPrice, unitsSold: 0 },
      });
      changed++;
    });
  }
  return changed;
}
