import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { RequireRole } from "./components/RequireRole";
import { AuthProvider } from "./lib/auth";
import { DrinkDetailPage } from "./pages/DrinkDetailPage";
import { DrinksAdminPage } from "./pages/DrinksAdminPage";
import { LoginPage } from "./pages/LoginPage";
import { ManagerPage } from "./pages/ManagerPage";
import { OrderPage } from "./pages/OrderPage";
import { OrdersAdminPage } from "./pages/OrdersAdminPage";
import { OrdersPage } from "./pages/OrdersPage";
import { PriceListPage } from "./pages/PriceListPage";
import { UsersAdminPage } from "./pages/UsersAdminPage";

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<PriceListPage />} />
            <Route path="pijace/:id" element={<DrinkDetailPage />} />
            <Route path="prijava" element={<LoginPage />} />
            <Route
              path="narocila"
              element={
                <RequireRole roles={["WAITER", "MANAGER"]}>
                  <OrdersPage />
                </RequireRole>
              }
            />
            <Route
              path="narocila/:id"
              element={
                <RequireRole roles={["WAITER", "MANAGER"]}>
                  <OrderPage />
                </RequireRole>
              }
            />
            <Route
              path="upravljanje"
              element={
                <RequireRole roles={["MANAGER"]}>
                  <ManagerPage />
                </RequireRole>
              }
            >
              <Route index element={<Navigate to="pijace" replace />} />
              <Route path="pijace" element={<DrinksAdminPage />} />
              <Route path="narocila" element={<OrdersAdminPage />} />
              <Route path="uporabniki" element={<UsersAdminPage />} />
            </Route>
            <Route path="*" element={<p>Stran ne obstaja.</p>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
