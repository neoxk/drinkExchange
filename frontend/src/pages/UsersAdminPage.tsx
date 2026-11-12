import { useCallback, useEffect, useState, type FormEvent } from "react";
import { FieldErrors } from "../components/FieldErrors";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Role, User } from "../lib/types";

const ROLE_LABEL: Record<Role, string> = { WAITER: "natakar", MANAGER: "upravitelj" };
const EMPTY = { name: "", email: "", password: "", role: "WAITER" as Role };

export function UsersAdminPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[] | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<unknown>(null);
  const [listError, setListError] = useState<unknown>(null);

  const load = useCallback(() => api<User[]>("/users").then(setUsers, setListError), []);
  useEffect(() => {
    load();
  }, [load]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api("/users", { method: "POST", body: JSON.stringify(form) });
      setForm(EMPTY);
      load();
    } catch (err) {
      setError(err);
    }
  }

  async function toggle(u: User) {
    setListError(null);
    await api(`/users/${u.id}`, { method: "PATCH", body: JSON.stringify({ active: !u.active }) }).catch(setListError);
    load();
  }

  return (
    <>
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Nov račun</h2>
        <form className="form-grid" onSubmit={create}>
          <label>
            Ime
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label>
            E-pošta
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label>
            Začetno geslo
            <input type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
          <label>
            Vloga
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              <option value="WAITER">natakar</option>
              <option value="MANAGER">upravitelj</option>
            </select>
          </label>
          <button className="primary" type="submit">Ustvari</button>
        </form>
        <FieldErrors error={error} />
      </section>

      <h2>Zaposleni</h2>
      <FieldErrors error={listError} />
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ime</th>
              <th>E-pošta</th>
              <th>Vloga</th>
              <th>Stanje</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users?.map((u) => (
              <tr key={u.id} className={u.active ? "" : "muted"}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{ROLE_LABEL[u.role]}</td>
                <td>{u.active ? <span className="badge up">aktiven</span> : <span className="badge">deaktiviran</span>}</td>
                <td>
                  {u.id !== me?.id && (
                    <button className={u.active ? "danger" : ""} onClick={() => toggle(u)}>
                      {u.active ? "Deaktiviraj" : "Aktiviraj"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
