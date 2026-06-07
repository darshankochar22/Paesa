import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import './index.css';
import { CompanyProvider } from "./context/CompanyContext";
import StartupGuard from "./context/StartupGuard";
import Layout from "./Layout.tsx";
import { APP_ROUTES } from "./routes.tsx";

ReactDOM.createRoot(document.getElementById('root')!).render(
  <HashRouter>
    <CompanyProvider>
      <StartupGuard>
        <Routes>
          <Route element={<Layout />}>
            {APP_ROUTES.map(route => (
              <Route key={route.path} path={route.path} element={route.element} />
            ))}
          </Route>
        </Routes>
      </StartupGuard>
    </CompanyProvider>
  </HashRouter>
);