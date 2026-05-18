import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import type { CompanyType } from "../types/api";
import CompanyCreate from "./CompanyCreate";

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
  };

const handleCreateSuccess = () => {
  fetchCompanies().then(setCompanies);
  setActiveAction(null);
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
                  ? "bg-blue-600 text-white"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
        ) : (
          <div className="px-6 py-6 flex flex-col gap-4 overflow-y-auto">
            <div className="text-xl font-semibold">List of Companies</div>

            {companies.length === 0 ? (
              <div className="text-sm text-zinc-500">No companies found.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {companies.map((company) => (
                  <div
                    key={company.company_id || company.name}
                    className="px-4 py-3 rounded cursor-pointer border hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    {company.name}
                  </div>
                ))}
              </div>
            )}

            <Link to="/" className="text-sm text-zinc-500 hover:text-zinc-300 mt-2 w-fit">
              ← Back
            </Link>
          </div>
        )}

      </section>
    </div>
  );
}