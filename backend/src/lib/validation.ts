import { z } from "zod";

export const idParam = z.object({ id: z.uuid() });

/** Denarni znesek > 0 z največ dvema decimalkama (število ali niz). */
export const price = z
  .union([z.number(), z.string().trim().regex(/^\d+(\.\d+)?$/, "Neveljaven znesek")])
  .transform((v) => Number(v))
  .pipe(
    z
      .number()
      .positive("Cena mora biti večja od 0")
      .max(99_999_999, "Cena je prevelika")
      .refine((v) => Math.round(v * 100) === Number((v * 100).toFixed(6)), "Cena ima lahko največ dve decimalki"),
  );
