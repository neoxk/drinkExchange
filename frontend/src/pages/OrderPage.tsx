import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, formatEur } from "../lib/api";
import type { Order, PublicDrink } from "../lib/types";
import { usePolling } from "../lib/usePolling";

const STATUS_LABEL = { OPEN: "odprto", COMPLETED: "zaključeno", CANCELLED: "preklicano" } as const;

export function OrderPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const loadDrinks = useCallback(() => api<PublicDrink[]>("/drinks"), []);
  const { data: drinks } = usePolling(loadDrinks, 60_000);

  useEffect(() => {
    api<Order>(`/orders/${id}`).then(setOrder, (e: Error) => setError(e.message));
  }, [id]);

  async function addItem(drinkId: string) {
    setError(null);
    try {
      const updated = await api<Order>(`/orders/${id}/items`, {
        method: "POST",
        body: JSON.stringify({ drinkId, quantity: quantities[drinkId] ?? 1 }),
      });
      setOrder(updated);
      setQuantities((q) => ({ ...q, [drinkId]: 1 }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Napaka");
    }
  }

  if (!order) return error ? <p className="error">{error}</p> : <p className="muted">Nalaganje …</p>;
  const editable = order.status === "OPEN";

  return (
    <>
      <Link to="/narocila">← Vsa naročila</Link>
      <div className="row" style={{ marginTop: "1rem" }}>
        <h1>Naročilo</h1>
        <span className={`badge status-${order.status}`}>{STATUS_LABEL[order.status]}</span>
        <span className="spacer" />
        <span className="muted small">
          {order.waiter.name} · {new Date(order.createdAt).toLocaleString("sl-SI")}
        </span>
      </div>
      {error && <p className="error" role="alert">{error}</p>}

      <div className="order-layout">
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Postavke</h2>
          {order.items.length === 0 ? (
            <p className="muted">Naročilo še nima postavk.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Pijača</th>
                    <th className="num">Količina</th>
                    <th className="num">Cena</th>
                    <th className="num">Znesek</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((i) => (
                    <tr key={i.id}>
                      <td>{i.drinkName}</td>
                      <td className="num">{i.quantity}</td>
                      <td className="num">{formatEur(i.unitPrice)}</td>
                      <td className="num">{formatEur(i.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="order-total">
            Skupaj <strong>{formatEur(order.total)}</strong>
          </div>
        </section>

        {editable && (
          <section className="card">
            <h2 style={{ marginTop: 0 }}>Dodaj pijačo</h2>
            <p className="muted small">Cena se zaklene ob dodajanju postavke.</p>
            <ul className="drink-picker">
              {drinks?.map((d) => (
                <li key={d.id}>
                  <div>
                    <div>{d.name}</div>
                    <div className="muted small">{formatEur(d.currentPrice)}</div>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    aria-label={`Količina ${d.name}`}
                    value={quantities[d.id] ?? 1}
                    onChange={(e) => setQuantities((q) => ({ ...q, [d.id]: Number(e.target.value) }))}
                  />
                  <button onClick={() => addItem(d.id)}>Dodaj</button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
