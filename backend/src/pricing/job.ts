import cron from "node-cron";
import { processPeriod } from "./process-period.js";
import { previousPeriodStart } from "./period.js";

async function runForPreviousPeriod() {
  try {
    const result = await processPeriod(previousPeriodStart(new Date()));
    const label = result.periodStart.toISOString();
    if (result.status === "processed") console.log(`[cene] obdobje ${label}: preračunanih ${result.drinks} pijač`);
    else console.log(`[cene] obdobje ${label} preskočeno: ${result.reason}`);
  } catch (e) {
    console.error("[cene] napaka pri izračunu cen", e);
  }
}

/**
 * Ob vsaki polni in pol minute (UTC) obdela pravkar zaključeno obdobje.
 * Ob zagonu nadoknadi zadnje obdobje, če ga strežnik ni obdelal (npr. zaradi ponovnega zagona).
 */
export function startPriceJob() {
  const task = cron.schedule("*/30 * * * * *", runForPreviousPeriod, { timezone: "Etc/UTC" });
  void runForPreviousPeriod();
  return task;
}
