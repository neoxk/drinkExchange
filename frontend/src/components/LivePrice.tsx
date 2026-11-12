import { useState } from "react";
import { formatEur } from "../lib/api";

/** Cena, ki ob spremembi za hip zasveti zeleno (rast) ali rdeče (padec). */
export function LivePrice({ price }: { price: string }) {
  const [shown, setShown] = useState(price);
  const [direction, setDirection] = useState<"up" | "down" | null>(null);
  if (price !== shown) {
    setShown(price);
    setDirection(Number(price) > Number(shown) ? "up" : "down");
  }
  return (
    <span key={price} className={`ticker-price${direction ? ` flash-${direction}` : ""}`}>
      {formatEur(price)}
    </span>
  );
}
