import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { OrderActions } from "../components/OrderActions";
import { api, formatEur } from "../lib/api";
import { STATUS_LABEL } from "../lib/labels";
import type { Order, OrderStatus } from "../lib/types";

const FILTERS: { value: OrderStatus | ""; label: string }[] = [
  { value: "OPEN", label: "Odprta" },
  { value: "COMPLETED", label: "Zaključena" },
  { value: "CANCELLED", label: "Preklicana" },
  { value: "", label: "Vsa" },
];

export function OrdersPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<OrderStatus | "">("OPEN");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () => api<Order[]>(`/orders${status ? `?status=${status}` : ""}`).then(setOrders, (e: Error) => setError(e.message)),
    [status],
  );

  useEffect(() => {
    load();
  }, [load]);

  async function newOrder() {
    setBusy(true);
    try {
      const order = await api<Order>("/orders", { method: "POST" });
      navigate(`/narocila/${order.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Napaka");
      setBusy(false);
    }
  }

  return (
    <>
      <div className="row">
        <h1>Moja naročila</h1>
        <span className="spacer" />
        <button className="primary" onClick={newOrder} disabled={busy}>
          + Novo naročilo
        </button>
      </div>
      <div className="row tabs" role="tablist">
        {FILTERS.map((f) => (
          <button key={f.label} role="tab" aria-selected={status === f.value} className={status === f.value ? "active" : ""} onClick={() => setStatus(f.value)}>
            {f.label}
          </button>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
      {orders && orders.length === 0 && <p className="muted">Ni naročil.</p>}
      {orders && orders.length > 0 && (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ustvarjeno</th>
                <th>Postavke</th>
                <th>Stanje</th>
                <th className="num">Znesek</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link to={`/narocila/${o.id}`}>{new Date(o.createdAt).toLocaleString("sl-SI")}</Link>
                  </td>
                  <td className="small">
                    {o.items.length === 0 ? <span className="muted">—</span> : o.items.map((i) => `${i.quantity}× ${i.drinkName}`).join(", ")}
                  </td>
                  <td>
                    <span className={`badge status-${o.status}`}>{STATUS_LABEL[o.status]}</span>
                  </td>
                  <td className="num">{formatEur(o.total)}</td>
                  <td>
                    <OrderActions order={o} onChange={() => load()} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
