import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const drinks = [
  { name: "Pivo Laško 0,5 l", category: "Pivo", basePrice: 3.5, minPrice: 2.5, maxPrice: 5 },
  { name: "Pivo Union 0,5 l", category: "Pivo", basePrice: 3.4, minPrice: 2.4, maxPrice: 4.9 },
  { name: "Craft IPA 0,33 l", category: "Pivo", basePrice: 4.5, minPrice: 3.5, maxPrice: 6.5 },
  { name: "Gin tonic", category: "Koktajli", basePrice: 7, minPrice: 5, maxPrice: 10 },
  { name: "Aperol spritz", category: "Koktajli", basePrice: 6.5, minPrice: 4.5, maxPrice: 9 },
  { name: "Mojito", category: "Koktajli", basePrice: 7.5, minPrice: 5.5, maxPrice: 10.5 },
  { name: "Coca-Cola 0,25 l", category: "Brezalkoholne", basePrice: 2.8, minPrice: 2, maxPrice: 4 },
  { name: "Limonada", category: "Brezalkoholne", basePrice: 2.5, minPrice: 1.8, maxPrice: 3.5 },
];

async function main() {
  if ((await prisma.drink.count()) > 0) {
    console.log("Pijače že obstajajo, seed preskočen.");
    return;
  }
  await prisma.drink.createMany({
    data: drinks.map((d) => ({ ...d, currentPrice: d.basePrice })),
  });
  console.log(`Dodanih ${drinks.length} pijač.`);
}

main().finally(() => prisma.$disconnect());
