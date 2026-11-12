import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatEur } from "../lib/api";
import type { HistoryPoint } from "../lib/types";

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit" });

interface ChartPoint {
  periodStart: string;
  price: number;
  unitsSold: number;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: ChartPoint }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="card small">
      <div>{new Date(p.periodStart).toLocaleString("sl-SI")}</div>
      <strong>{formatEur(p.price)}</strong>
      <div className="muted">Prodano: {p.unitsSold}</div>
    </div>
  );
}

export function PriceChart({ history }: { history: HistoryPoint[] }) {
  const data: ChartPoint[] = history.map((h) => ({
    periodStart: h.periodStart,
    price: Number(h.price),
    unitsSold: h.unitsSold,
  }));
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis dataKey="periodStart" tickFormatter={time} stroke="var(--muted)" minTickGap={24} />
          <YAxis
            domain={["auto", "auto"]}
            stroke="var(--muted)"
            tickFormatter={(v: number) => v.toFixed(2)}
            width={48}
          />
          <Tooltip content={<ChartTooltip />} />
          <Line type="stepAfter" dataKey="price" stroke="var(--accent)" strokeWidth={2} dot={data.length <= 30 ? { r: 3 } : false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
