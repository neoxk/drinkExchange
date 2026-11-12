import { useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { PriceChange } from "../components/PriceChange";
import { PriceChart } from "../components/PriceChart";
import { api, formatEur } from "../lib/api";
import type { DrinkHistory } from "../lib/types";
import { usePolling } from "../lib/usePolling";

export function DrinkDetailPage() {
  const { id } = useParams();
  const load = useCallback(() => api<DrinkHistory>(`/drinks/${id}/history`), [id]);
  const { data, error } = usePolling(load, 5_000);

  if (error) {
    return (
      <>
        <p className="error">{error}</p>
        <Link to="/">← Nazaj na cenik</Link>
      </>
    );
  }
  if (!data) return <p className="muted">Nalaganje …</p>;
  const { drink, history } = data;

  return (
    <>
      <Link to="/">← Nazaj na cenik</Link>
      <div className="row" style={{ marginTop: "1rem" }}>
        <h1>{drink.name}</h1>
        <span className="badge">{drink.category}</span>
      </div>
      <div className="row">
        <span className="ticker-price">{formatEur(drink.currentPrice)}</span>
        <PriceChange change={drink.change} percent={drink.changePercent} />
        <span className="muted">Osnovna cena {formatEur(drink.basePrice)}</span>
      </div>
      <h2>Gibanje cene v zadnji uri</h2>
      <div className="card">
        {history.length === 0 ? (
          <p className="muted">Za to pijačo v zadnji uri še ni zabeleženih sprememb cene.</p>
        ) : (
          <PriceChart history={history} />
        )}
      </div>
    </>
  );
}
