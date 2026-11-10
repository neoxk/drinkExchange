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

export const TEST_PASSWORD = "geslo-1234";

export async function createUser(
  overrides: Partial<{ name: string; email: string; role: "WAITER" | "MANAGER"; active: boolean }> = {},
) {
  const { hashPassword } = await import("../src/lib/password.js");
  return prisma.user.create({
    data: {
      name: "Test Natakar",
      email: `user-${Math.random().toString(36).slice(2)}@bar.si`,
      role: "WAITER",
      passwordHash: await hashPassword(TEST_PASSWORD),
      ...overrides,
    },
  });
}
