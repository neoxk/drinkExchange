-- Cena se spreminja ob dogodkih (prodaja, ohlajanje), ne več po obdobjih.
ALTER TABLE "drinks" ADD COLUMN "price_updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DROP INDEX "price_history_drink_id_period_start_key";
ALTER TABLE "price_history" RENAME COLUMN "period_start" TO "changed_at";
CREATE INDEX "price_history_drink_id_changed_at_idx" ON "price_history"("drink_id", "changed_at");
