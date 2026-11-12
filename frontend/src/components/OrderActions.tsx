import { useState } from "react";
import { api } from "../lib/api";
import type { Order } from "../lib/types";

type Action = "COMPLETED" | "CANCELLED";
const LABEL: Record<Action, string> = { COMPLETED: "Zaključi", CANCELLED: "Prekliči" };

/** Gumba za zaključek in preklic odprtega naročila z dvostopenjsko potrditvijo. */
export function OrderActions({ order, onChange }: { order: Order; onChange: (o: Order) => void }) {
  const [pending, setPending] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (order.status !== "OPEN") return null;

  async function confirm(status: Action) {
    setBusy(true);
    setError(null);
    try {
      onChange(await api<Order>(`/orders/${order.id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Napaka");
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  if (pending) {
    return (
      <span className="row">
        <span className="small">{LABEL[pending]} naročilo?</span>
        <button className={pending === "COMPLETED" ? "primary" : "danger"} disabled={busy} onClick={() => confirm(pending)}>
          Da
        </button>
        <button disabled={busy} onClick={() => setPending(null)}>Ne</button>
      </span>
    );
  }

  return (
    <span className="row">
      <button className="primary" disabled={order.items.length === 0} title={order.items.length === 0 ? "Naročilo nima postavk" : undefined} onClick={() => setPending("COMPLETED")}>
        Zaključi
      </button>
      <button className="danger" onClick={() => setPending("CANCELLED")}>Prekliči</button>
      {error && <span className="error small">{error}</span>}
    </span>
  );
}
