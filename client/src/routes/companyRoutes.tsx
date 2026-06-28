import { useNavigate } from "react-router-dom";
import App from "../App.tsx";
import Company from "../pages/company/Company.tsx";
import CompanyAlter from "../pages/company/AlterCompany.tsx";
import CompanyCreate from "../pages/company/CompanyCreate.tsx";
import type { RouteConfig } from "./types";

export const companyRoutes: RouteConfig[] = [
  { path: "/", element: <App /> },
  { path: "/company", element: <Company /> },
  { path: "/company/alter", element: <CompanyAlter /> },
  { path: "/company/create", element: <CompanyCreatePage /> },
];

function CompanyCreatePage() {
  const navigate = useNavigate();
  return (
    <CompanyCreate
      onSuccess={() => navigate("/company")}
      onCancel={() => navigate(-1)}
    />
  );
}

export { CompanyCreate };
