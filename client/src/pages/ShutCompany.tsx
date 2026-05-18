import { useState } from "react";
import type { CompanyType } from "../types/api";

interface Props {
  company: CompanyType;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ShutCompany({ company, onSuccess, onCancel }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.company.delete(company.company_id!);
      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || "Failed to delete company.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">

      <div className="px-6 py-3 border-b border-blue-800 flex items-center justify-between shrink-0">
        <span className="font-semibold text-base">Shut Company</span>
        <span className="text-xs text-zinc-600">Esc to cancel</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 gap-8">

        <div className="flex flex-col items-center gap-2">
          <div className="text-2xl font-semibold text-zinc-900">{company.name}</div>
          {company.mailing_name && company.mailing_name !== company.name && (
            <div className="text-sm text-zinc-500">{company.mailing_name}</div>
          )}
        </div>

        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="text-red-400 text-lg font-medium">
            This will permanently delete this company and all its data.
          </div>
          <div className="text-sm text-zinc-500 leading-relaxed">
            All accounts, transactions, reports, and masters associated with this company will be removed. This action cannot be undone.
          </div>
        </div>

      </div>

      {error && (
        <div className="px-6 py-2 bg-red-950 border-t border-red-900 text-red-400 text-sm flex justify-between items-center shrink-0">
          <span>⚠ {error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-300 text-xs ml-4">dismiss</button>
        </div>
      )}

      <div className="px-6 py-3 border-t border-blue-800 flex justify-end gap-3 shrink-0">
        <button
          onClick={onCancel}
          className="text-sm px-4 py-1.5 rounded border border-blue-300 text-blue-600 hover:bg-blue-100 hover:border-blue-400 hover:text-blue-800 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-sm px-5 py-1.5 rounded bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {loading ? "Deleting..." : "Yes, Delete"}
        </button>
      </div>

    </div>
  );
}
