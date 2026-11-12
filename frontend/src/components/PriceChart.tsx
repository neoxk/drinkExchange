import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatEur } from "../lib/api";
import type { HistoryPoint } from "../lib/types";

const time = (ms: number) =>
  new Date(ms).toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit" });

interface ChartPoint {
  time: number;
  price: number;
  unitsSold: number;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: ChartPoint }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="card small">
      <div>{new Date(p.time).toLocaleTimeString("sl-SI")}</div>
      <strong>{formatEur(p.price)}</strong>
      {p.unitsSold > 0 && <div className="up">Prodano: {p.unitsSold}</div>}
    </div>
  );
}

/** Prodaje so označene s piko, ohlajanje cene med njimi je samo črta. */
function SaleDot({ cx, cy, payload }: { cx?: number; cy?: number; payload?: ChartPoint }) {
  if (!payload || payload.unitsSold === 0 || cx == null || cy == null) return null;
  return <circle cx={cx} cy={cy} r={4} fill="var(--up)" stroke="var(--surface)" />;
}

export function PriceChart({ history, now }: { history: HistoryPoint[]; now: Date }) {
  const data: ChartPoint[] = history.map((h) => ({
    time: new Date(h.changedAt).getTime(),
    price: Number(h.price),
    unitsSold: h.unitsSold,
  }));
  // Črta sega do sedanjosti, tudi če se cena nekaj časa ni spremenila.
  const last = data.at(-1);
  if (last && now.getTime() > last.time) data.push({ time: now.getTime(), price: last.price, unitsSold: 0 });
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={time}
            stroke="var(--muted)"
            minTickGap={24}
          />
          <YAxis
            domain={["auto", "auto"]}
            stroke="var(--muted)"
            tickFormatter={(v: number) => v.toFixed(2)}
            width={48}
          />
          <Tooltip content={<ChartTooltip />} />
          <Line
            type="stepAfter"
            dataKey="price"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={(props) => <SaleDot key={props.index} {...props} />}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
