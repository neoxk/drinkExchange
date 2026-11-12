import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { PriceListPage } from "./pages/PriceListPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<PriceListPage />} />
          <Route path="*" element={<p>Stran ne obstaja.</p>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
