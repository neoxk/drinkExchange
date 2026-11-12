import { NavLink, Outlet } from "react-router-dom";

export function Layout() {
  return (
    <>
      <header className="topbar">
        <NavLink to="/" className="brand">
          Drink<span>Exchange</span>
        </NavLink>
        <nav>
          <NavLink to="/" end>Cenik</NavLink>
        </nav>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </>
  );
}
