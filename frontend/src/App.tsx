import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AuthProvider } from "./lib/auth";
import { DrinkDetailPage } from "./pages/DrinkDetailPage";
import { LoginPage } from "./pages/LoginPage";
import { PriceListPage } from "./pages/PriceListPage";

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<PriceListPage />} />
            <Route path="pijace/:id" element={<DrinkDetailPage />} />
            <Route path="prijava" element={<LoginPage />} />
            <Route path="*" element={<p>Stran ne obstaja.</p>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
