export const PERIOD_MS = 30 * 60 * 1000;

/** Začetek 30-minutnega obdobja (UTC), v katerem leži trenutek. */
export const periodStartOf = (date: Date) => new Date(Math.floor(date.getTime() / PERIOD_MS) * PERIOD_MS);

/** Začetek zadnjega v celoti zaključenega obdobja. */
export const previousPeriodStart = (now: Date) => new Date(periodStartOf(now).getTime() - PERIOD_MS);

export const periodEnd = (start: Date) => new Date(start.getTime() + PERIOD_MS);
