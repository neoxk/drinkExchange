import { NavLink, Outlet } from "react-router-dom";

export function ManagerPage() {
  return (
    <>
      <h1>Upravljanje</h1>
      <nav className="row tabs">
        <NavLink to="/upravljanje/pijace" className="button">Pijače</NavLink>
      </nav>
      <Outlet />
    </>
  );
}
