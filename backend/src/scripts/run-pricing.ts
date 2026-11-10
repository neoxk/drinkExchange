import { parseArgs } from "node:util";
import { prisma } from "../db.js";
import { previousPeriodStart } from "../pricing/period.js";
import { processPeriod } from "../pricing/process-period.js";

// Ročni zagon izračuna (za razvoj in demonstracijo).
// Uporaba: npm run pricing [-- --period 2026-11-11T10:00:00Z]
const { values } = parseArgs({ options: { period: { type: "string" } } });

const start = values.period ? new Date(values.period) : previousPeriodStart(new Date());
processPeriod(start)
  .then((r) => console.log(r))
  .finally(() => prisma.$disconnect());
