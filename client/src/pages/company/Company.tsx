import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import type { CompanyType } from "@/types/api";
import { useCompany } from "@/context/CompanyContext";
import CompanyCreate from "./CompanyCreate";
import AlterCompany from "./AlterCompany";
import ShutCompany from "./components/ShutCompany";
import SelectCompany from "./components/SelectCompany";

type ActiveAction = "Create Company" | "Alter Company" | "Select Company" | "Shut Company" | null;

export default function Company() {
  const companyActions: ActiveAction[] = [
    "Create Company",
    "Alter Company",
    "Select Company",
    "Shut Company",
  ];

  const [companies, setCompanies] = useState<CompanyType[]>([]);
  const [activeAction, setActiveAction] = useState<ActiveAction>(null);
  const [selectedCompany, setSelectedCompany] = useState<CompanyType | null>(null);
  const { setSelectedCompany: setGlobalCompany } = useCompany();

  const fetchCompanies = async (): Promise<CompanyType[]> => {
    try {
      const result = await window.api.company.getAll();
      if (Array.isArray(result)) return result;
      if (Array.isArray(result?.companies)) return result.companies;
      return [];
    } catch (err) {
      console.error("Failed to fetch companies:", err);
      return [];
    }
  };

  useEffect(() => {
    fetchCompanies().then(setCompanies);
  }, []);

  const handleActionClick = (action: ActiveAction) => {
    setActiveAction((prev) => (prev === action ? null : action));
    setSelectedCompany(null);
  };

  const handleCreateSuccess = () => {
    fetchCompanies().then((list) => {
      setCompanies(list);
      if (list.length === 1) {
        setGlobalCompany(list[0]);
      }
    });
    setActiveAction(null);
  };

  const handleAlterSuccess = () => {
    fetchCompanies().then(setCompanies);
    setActiveAction(null);
    setSelectedCompany(null);
  };

  const handleAlterCancel = () => {
    setSelectedCompany(null);
  };

  const handleShutSuccess = () => {
    fetchCompanies().then(setCompanies);
    setActiveAction(null);
    setSelectedCompany(null);
  };

  const handleShutCancel = () => {
    setSelectedCompany(null);
  };

  const handleSelectSuccess = () => {
    setActiveAction(null);
  };

  const handleCompanyClick = (company: CompanyType) => {
    if (activeAction === "Alter Company" || activeAction === "Shut Company") {
      setSelectedCompany(company);
    }
  };

  return (
    <div className="flex min-h-[500px] w-full">
      <aside className="w-[35%] border-r flex flex-col px-6 py-6 gap-6 shrink-0">
        <div className="text-2xl font-semibold">Company</div>

        <div className="flex flex-col gap-2">
          {companyActions.map((item) => (
            <button
              key={item}
              onClick={() => handleActionClick(item)}
              className={`text-left px-3 py-2 rounded transition-colors ${
                activeAction === item
                  ? "bg-black text-white"
                  : "hover:bg-black hover:text-white"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </aside>

      <section className="flex-1 flex flex-col overflow-hidden">

        {activeAction === "Create Company" ? (
          <CompanyCreate
            onSuccess={handleCreateSuccess}
            onCancel={() => setActiveAction(null)}
          />
        ) : activeAction === "Alter Company" && selectedCompany ? (
          <AlterCompany
            key={selectedCompany.company_id}
            company={selectedCompany}
            onSuccess={handleAlterSuccess}
            onCancel={handleAlterCancel}
          />
        ) : activeAction === "Shut Company" && selectedCompany ? (
          <ShutCompany
            key={selectedCompany.company_id}
            company={selectedCompany}
            onSuccess={handleShutSuccess}
            onCancel={handleShutCancel}
          />
        ) : activeAction === "Select Company" ? (
          <SelectCompany
            onSuccess={handleSelectSuccess}
            onCancel={() => setActiveAction(null)}
          />
        ) : (
          <div className="px-6 py-6 flex flex-col gap-4 overflow-y-auto">
            <div className="text-xl font-semibold">
              {activeAction === "Alter Company"
                ? "Select a company to alter"
                : activeAction === "Shut Company"
                ? "Select a company to delete"
                : "List of Companies"}
            </div>

            {companies.length === 0 ? (
              <div className="text-sm text-zinc-500">No companies found.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {companies.map((company) => (
                  <div
                    key={company.company_id || company.name}
                    onClick={() => handleCompanyClick(company)}
                    className={`px-4 py-3 rounded cursor-pointer border transition-colors ${
                      activeAction === "Shut Company"
                        ? "border-zinc-200 hover:bg-red-600 hover:text-white hover:border-red-600"
                        : "border-zinc-200 hover:bg-black hover:text-white hover:border-black"
                    }`}
                  >
                    {company.name}
                  </div>
                ))}
              </div>
            )}

            <Link
              to="/"
              className="text-sm text-zinc-500 hover:bg-black hover:text-white px-2 py-1 rounded mt-2 w-fit transition-colors"
            >
              ← Back
            </Link>
          </div>
        )}

      </section>
    </div>
  );
}