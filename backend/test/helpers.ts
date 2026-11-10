import { prisma } from "../src/db.js";

export async function resetDb() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "order_items", "orders", "price_history", "drinks", "users", "session" CASCADE',
  );
}

export async function createDrink(overrides: Partial<{
  name: string; category: string; basePrice: number; currentPrice: number;
  minPrice: number; maxPrice: number; active: boolean;
}> = {}) {
  const basePrice = overrides.basePrice ?? 3;
  return prisma.drink.create({
    data: {
      name: "Testna pijača",
      category: "Pivo",
      minPrice: 2,
      maxPrice: 5,
      currentPrice: basePrice,
      ...overrides,
      basePrice,
    },
  });
}
