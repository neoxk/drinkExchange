import { useCallback } from "react";
import { Link } from "react-router-dom";
import { PriceChange } from "../components/PriceChange";
import { api, formatEur } from "../lib/api";
import type { PublicDrink } from "../lib/types";
import { usePolling } from "../lib/usePolling";

const REFRESH_MS = 5_000;

export function PriceListPage() {
  const load = useCallback(() => api<PublicDrink[]>("/drinks"), []);
  const { data: drinks, error, updatedAt } = usePolling(load, REFRESH_MS);

  return (
    <>
      <div className="row">
        <h1>Borzni cenik</h1>
        <span className="spacer" />
        {updatedAt && (
          <span className="muted">Osveženo ob {updatedAt.toLocaleTimeString("sl-SI")}</span>
        )}
      </div>
      {error && <p className="error">{error}</p>}
      {!drinks && !error && <p className="muted">Nalaganje …</p>}
      {drinks && drinks.length === 0 && <p className="muted">Trenutno ni aktivnih pijač.</p>}
      {drinks && drinks.length > 0 && (
        <div className="ticker-grid">
          {drinks.map((d) => (
            <Link key={d.id} to={`/pijace/${d.id}`} className="card ticker">
              <div className="row">
                <strong>{d.name}</strong>
                <span className="spacer" />
                <span className="badge">{d.category}</span>
              </div>
              <div className="ticker-price">{formatEur(d.currentPrice)}</div>
              <PriceChange change={d.change} percent={d.changePercent} />
              <div className="muted small">Osnovna cena {formatEur(d.basePrice)}</div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
