import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FieldErrors } from "../components/FieldErrors";
import { api, formatEur } from "../lib/api";
import { STATUS_LABEL } from "../lib/labels";
import type { Order, OrderStatus, User } from "../lib/types";

interface Filters {
  status: OrderStatus | "";
  waiterId: string;
  date: string;
}

/** Začetek in konec lokalnega dne kot ISO časa. */
function dayRange(date: string) {
  const from = new Date(`${date}T00:00:00`);
  const to = new Date(from);
  to.setDate(to.getDate() + 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function OrdersAdminPage() {
  const [filters, setFilters] = useState<Filters>({ status: "", waiterId: "", date: "" });
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    api<User[]>("/users").then(setUsers, setError);
  }, []);

  const query = useMemo(() => {
    const q = new URLSearchParams();
    if (filters.status) q.set("status", filters.status);
    if (filters.waiterId) q.set("waiterId", filters.waiterId);
    if (filters.date) {
      const { from, to } = dayRange(filters.date);
      q.set("from", from);
      q.set("to", to);
    }
    return q.toString();
  }, [filters]);

  useEffect(() => {
    api<Order[]>(`/orders?${query}`).then(setOrders, setError);
  }, [query]);

  const completedTotal = orders
    ?.filter((o) => o.status === "COMPLETED")
    .reduce((sum, o) => sum + Number(o.total), 0);

  return (
    <>
      <div className="card form-grid">
        <label>
          Stanje
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value as OrderStatus | "" })}>
            <option value="">vsa</option>
            <option value="OPEN">odprta</option>
            <option value="COMPLETED">zaključena</option>
            <option value="CANCELLED">preklicana</option>
          </select>
        </label>
        <label>
          Natakar
          <select value={filters.waiterId} onChange={(e) => setFilters({ ...filters, waiterId: e.target.value })}>
            <option value="">vsi</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </label>
        <label>
          Datum
          <input type="date" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} />
        </label>
        <button onClick={() => setFilters({ status: "", waiterId: "", date: "" })}>Počisti filtre</button>
      </div>
      <FieldErrors error={error} />
      {orders && (
        <p className="muted">
          {orders.length} naročil · zaključeno skupaj {formatEur(completedTotal ?? 0)}
        </p>
      )}
      {orders && orders.length > 0 && (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ustvarjeno</th>
                <th>Natakar</th>
                <th>Postavke</th>
                <th>Stanje</th>
                <th className="num">Znesek</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link to={`/narocila/${o.id}`}>{new Date(o.createdAt).toLocaleString("sl-SI")}</Link>
                  </td>
                  <td>{o.waiter.name}</td>
                  <td className="small">{o.items.map((i) => `${i.quantity}× ${i.drinkName}`).join(", ") || "—"}</td>
                  <td>
                    <span className={`badge status-${o.status}`}>{STATUS_LABEL[o.status]}</span>
                  </td>
                  <td className="num">{formatEur(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
