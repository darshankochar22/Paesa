import { useState, useEffect } from "react";
import type { CompanyType } from "../types/api";
import { useCompany } from "../context/CompanyContext";

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function SelectCompany({ onSuccess, onCancel }: Props) {
  const { selectedCompany, setSelectedCompany } = useCompany();
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
    onSuccess();
  };

  return (
    <div className="flex flex-col h-full">

      <div className="px-6 py-3 border-b border-blue-800 flex items-center justify-between shrink-0">
        <span className="font-semibold text-base">Select Company</span>
        <span className="text-xs text-zinc-600">Esc to cancel</span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
        {loading ? (
          <div className="text-sm text-zinc-500 text-center py-8">Loading...</div>
        ) : companies.length === 0 ? (
          <div className="text-sm text-zinc-500 text-center py-8">No companies found.</div>
        ) : (
          <>
            <div className="text-xs uppercase tracking-widest text-zinc-600 mb-1">
              List of Companies
            </div>
            <div className="flex flex-col gap-2">
              {companies.map((company) => {
                const isSelected =
                  selectedCompany?.company_id === company.company_id;
                return (
                  <div
                    key={company.company_id || company.name}
                    onClick={() => handleSelect(company)}
                    className={`px-4 py-3 rounded cursor-pointer border transition-colors ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-blue-200 hover:bg-blue-100 hover:border-blue-300"
                    }`}
                  >
                    <div className="font-medium">{company.name}</div>
                    {company.mailing_name && company.mailing_name !== company.name && (
                      <div className="text-xs text-zinc-500 mt-0.5">{company.mailing_name}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="px-6 py-3 border-t border-blue-800 flex justify-end gap-3 shrink-0">
        <button
          onClick={onCancel}
          className="text-sm px-4 py-1.5 rounded border border-blue-300 text-blue-600 hover:bg-blue-100 hover:border-blue-400 hover:text-blue-800 transition-colors"
        >
          Cancel
        </button>
      </div>

    </div>
  );
}
