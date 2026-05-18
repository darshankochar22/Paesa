import { useState, useEffect, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import type { CompanyType } from "../types/api";
import { useCompany } from "./CompanyContext";

function StartupSelect() {
  const { setSelectedCompany } = useCompany();
  const [companies, setCompanies] = useState<CompanyType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const result = await window.api.company.getAll();
        const list: CompanyType[] = Array.isArray(result?.companies)
          ? result.companies
          : Array.isArray(result)
            ? result
            : [];
        setCompanies(list);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSelect = (company: CompanyType) => {
    setSelectedCompany(company);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-lg flex flex-col gap-8">

        <div className="text-center">
          <div className="text-2xl font-semibold mb-2">Select Company</div>
          <div className="text-sm text-zinc-500">
            Choose a company to continue
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-zinc-500 text-center py-8">Loading...</div>
        ) : companies.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="text-sm text-zinc-500">No companies found.</div>
            <Link
              to="/company"
              className="text-sm px-4 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors"
            >
              Create a Company
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {companies.map((company) => (
              <button
                key={company.company_id || company.name}
                onClick={() => handleSelect(company)}
                className="w-full text-left px-5 py-4 rounded border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-colors"
              >
                <div className="font-medium text-lg">{company.name}</div>
                {company.mailing_name && company.mailing_name !== company.name && (
                  <div className="text-sm text-zinc-500 mt-1">{company.mailing_name}</div>
                )}
                {company.address1 && (
                  <div className="text-xs text-zinc-600 mt-1 truncate">{company.address1}</div>
                )}
              </button>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

export default function StartupGuard({ children }: { children: ReactNode }) {
  const { selectedCompany } = useCompany();
  const location = useLocation();

  if (!selectedCompany && location.pathname !== "/company") {
    return <StartupSelect />;
  }

  return <>{children}</>;
}
