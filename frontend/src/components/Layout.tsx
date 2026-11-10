import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

const ROLE_LABEL = { WAITER: "natakar", MANAGER: "upravitelj" } as const;

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function onLogout() {
    await logout();
    navigate("/");
  }

  return (
    <>
      <header className="topbar">
        <NavLink to="/" className="brand">
          Drink<span>Exchange</span>
        </NavLink>
        <nav>
          <NavLink to="/" end>Cenik</NavLink>
          {user ? (
            <>
              <span className="muted small">
                {user.name} ({ROLE_LABEL[user.role]})
              </span>
              <button onClick={onLogout}>Odjava</button>
            </>
          ) : (
            <NavLink to="/prijava">Prijava</NavLink>
          )}
        </nav>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </>
  );
}
