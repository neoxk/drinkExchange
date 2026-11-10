export function PriceChange({ change, percent }: { change: string; percent: number }) {
  const value = Number(change);
  const cls = value > 0 ? "up" : value < 0 ? "down" : "muted";
  const arrow = value > 0 ? "▲" : value < 0 ? "▼" : "■";
  const sign = value > 0 ? "+" : "";
  return (
    <span className={cls} aria-label={value > 0 ? "rast" : value < 0 ? "padec" : "brez spremembe"}>
      {arrow} {sign}{value.toFixed(2)} € ({sign}{percent.toFixed(2)} %)
    </span>
  );
}
