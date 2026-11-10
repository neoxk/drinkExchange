import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import type { Order } from "../lib/types";

export function OrdersPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
        <h1>Naročila</h1>
        <span className="spacer" />
        <button className="primary" onClick={newOrder} disabled={busy}>
          + Novo naročilo
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </>
  );
}
