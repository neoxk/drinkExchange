import type { OrderStatus } from "./types";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  OPEN: "odprto",
  COMPLETED: "zaključeno",
  CANCELLED: "preklicano",
};
