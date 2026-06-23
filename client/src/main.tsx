import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import './index.css';
import { CompanyProvider } from "./context/CompanyContext";
import StartupGuard from "./context/StartupGuard";
import Layout from "./Layout.tsx";
import { APP_ROUTES } from "./routes.tsx";
import VoucherView from "./pages/transactions/VoucherView.tsx";
import Daybook from "./pages/transactions/Daybook.tsx";
import Vouchers from "./pages/transactions/Vouchers.tsx";
import VoucherList from "./pages/transactions/VoucherList.tsx";

const FULLSCREEN_PATHS = [
  "/transactions/voucher/:id",
  "/transactions/vouchers",
  "/transactions/voucher-list",
  "/transactions/daybook",
    "/reports/accounts/daybook",
];

const layoutRoutes = APP_ROUTES.filter(
  r => !FULLSCREEN_PATHS.includes(r.path)
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <HashRouter>
    <CompanyProvider>
      <StartupGuard>
        <Routes>
          <Route path="/transactions/voucher/:id" element={<VoucherView />} />
          <Route path="/transactions/vouchers" element={<Vouchers />} />
          <Route path="/transactions/voucher-list" element={<VoucherList />} />
          <Route path="/transactions/daybook" element={<Daybook />} />
          <Route path="/reports/accounts/daybook" element={<Daybook />} />
          <Route element={<Layout />}>
            {layoutRoutes.map(route => (
              <Route key={route.path} path={route.path} element={route.element} />
            ))}
          </Route>
        </Routes>
      </StartupGuard>
    </CompanyProvider>
  </HashRouter>
);