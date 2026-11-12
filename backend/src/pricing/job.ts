import cron from "node-cron";
import { coolPrices } from "./market.js";

async function run() {
  try {
    const changed = await coolPrices();
    if (changed > 0) console.log(`[cene] ohlajanje: spremenjenih ${changed} cen`);
  } catch (e) {
    console.error("[cene] napaka pri ohlajanju cen", e);
  }
}

/**
 * Vsakih 5 sekund ohladi cene. Ob zagonu takoj nadoknadi čas, ko strežnik ni tekel.
 * Dvigi cen se ne zgodijo tukaj, ampak takoj ob zaključku naročila.
 */
export function startPriceJob() {
  const task = cron.schedule("*/5 * * * * *", run);
  void run();
  return task;
}
