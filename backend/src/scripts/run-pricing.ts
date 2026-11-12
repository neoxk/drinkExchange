import { prisma } from "../db.js";
import { coolPrices } from "../pricing/market.js";

// Ročni zagon ohlajanja cen (za razvoj in demonstracijo).
// Uporaba: npm run pricing
coolPrices()
  .then((changed) => console.log(`Spremenjenih cen: ${changed}`))
  .finally(() => prisma.$disconnect());
