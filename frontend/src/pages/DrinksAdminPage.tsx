import { useCallback, useEffect, useState, type FormEvent } from "react";
import { FieldErrors } from "../components/FieldErrors";
import { api, formatEur } from "../lib/api";
import type { AdminDrink } from "../lib/types";

interface DrinkForm {
  name: string;
  category: string;
  basePrice: string;
  minPrice: string;
  maxPrice: string;
}

const EMPTY: DrinkForm = { name: "", category: "", basePrice: "", minPrice: "", maxPrice: "" };

const toForm = (d: AdminDrink): DrinkForm => ({
  name: d.name,
  category: d.category,
  basePrice: d.basePrice,
  minPrice: d.minPrice,
  maxPrice: d.maxPrice,
});

// Sprejme tudi decimalno vejico
const toPayload = (f: DrinkForm) => ({
  ...f,
  basePrice: f.basePrice.replace(",", "."),
  minPrice: f.minPrice.replace(",", "."),
  maxPrice: f.maxPrice.replace(",", "."),
});

function DrinkFields({ form, onChange }: { form: DrinkForm; onChange: (f: DrinkForm) => void }) {
  const field = (key: keyof DrinkForm, label: string, inputMode?: "decimal") => (
    <label>
      {label}
      <input required inputMode={inputMode} value={form[key]} onChange={(e) => onChange({ ...form, [key]: e.target.value })} />
    </label>
  );
  return (
    <>
      {field("name", "Ime")}
      {field("category", "Kategorija")}
      {field("basePrice", "Osnovna cena (€)", "decimal")}
      {field("minPrice", "Najnižja cena (€)", "decimal")}
      {field("maxPrice", "Najvišja cena (€)", "decimal")}
    </>
  );
}

export function DrinksAdminPage() {
  const [drinks, setDrinks] = useState<AdminDrink[] | null>(null);
  const [form, setForm] = useState<DrinkForm>(EMPTY);
  const [formError, setFormError] = useState<unknown>(null);
  const [editing, setEditing] = useState<{ id: string; form: DrinkForm } | null>(null);
  const [editError, setEditError] = useState<unknown>(null);

  const load = useCallback(() => api<AdminDrink[]>("/drinks/admin").then(setDrinks, setFormError), []);
  useEffect(() => {
    load();
  }, [load]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      await api("/drinks", { method: "POST", body: JSON.stringify(toPayload(form)) });
      setForm(EMPTY);
      load();
    } catch (err) {
      setFormError(err);
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setEditError(null);
    try {
      await api(`/drinks/${editing.id}`, { method: "PATCH", body: JSON.stringify(toPayload(editing.form)) });
      setEditing(null);
      load();
    } catch (err) {
      setEditError(err);
    }
  }

  async function toggle(d: AdminDrink) {
    await api(`/drinks/${d.id}`, { method: "PATCH", body: JSON.stringify({ active: !d.active }) }).catch(setFormError);
    load();
  }

  return (
    <>
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Nova pijača</h2>
        <form className="form-grid" onSubmit={create}>
          <DrinkFields form={form} onChange={setForm} />
          <button className="primary" type="submit">Dodaj</button>
        </form>
        <FieldErrors error={formError} />
      </section>

      <h2>Katalog</h2>
      {editing && (
        <section className="card" style={{ marginBottom: "1rem" }}>
          <h2 style={{ marginTop: 0 }}>Urejanje pijače</h2>
          <form className="form-grid" onSubmit={save}>
            <DrinkFields form={editing.form} onChange={(f) => setEditing({ ...editing, form: f })} />
            <span className="row">
              <button className="primary" type="submit">Shrani</button>
              <button type="button" onClick={() => setEditing(null)}>Prekliči</button>
            </span>
          </form>
          <FieldErrors error={editError} />
        </section>
      )}
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Pijača</th>
              <th>Kategorija</th>
              <th className="num">Trenutna</th>
              <th className="num">Osnovna</th>
              <th className="num">Min</th>
              <th className="num">Max</th>
              <th>Stanje</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {drinks?.map((d) => (
              <tr key={d.id} className={d.active ? "" : "muted"}>
                <td>{d.name}</td>
                <td>{d.category}</td>
                <td className="num">{formatEur(d.currentPrice)}</td>
                <td className="num">{formatEur(d.basePrice)}</td>
                <td className="num">{formatEur(d.minPrice)}</td>
                <td className="num">{formatEur(d.maxPrice)}</td>
                <td>{d.active ? <span className="badge up">aktivna</span> : <span className="badge">neaktivna</span>}</td>
                <td className="row">
                  <button onClick={() => { setEditError(null); setEditing({ id: d.id, form: toForm(d) }); }}>Uredi</button>
                  <button onClick={() => toggle(d)}>{d.active ? "Deaktiviraj" : "Aktiviraj"}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
