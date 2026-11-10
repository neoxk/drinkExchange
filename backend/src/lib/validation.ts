import { z } from "zod";

export const idParam = z.object({ id: z.uuid() });
