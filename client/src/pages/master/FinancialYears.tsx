import { Link } from "react-router-dom";
import { useState } from "react";
import { useCompany } from "../../context/CompanyContext";
import type { FYType } from "../../types/api";

const FY_YEARS = Array.from({ length: 26 }, (_, i) => 2001 + i);

export default function FinancialYears() {
  const { selectedCompany, activeFY, availableFYs, switchFY } = useCompany();
  const [showCreate, setShowCreate] = useState(false);
  const [newStartDate, setNewStartDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const companyId = selectedCompany?.company_id;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const handleCreate = async () => {
    if (!newStartDate || !companyId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.fy.create({
        company_id: companyId,
        start_date: newStartDate,
      });
      if (!result.success) {
        setError(result.error || "Failed to create financial year");
      } else {
        setNewStartDate("");
        setShowCreate(false);
        window.dispatchEvent(new Event("fy-reload"));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (fy: FYType) => {
    if (!fy.fy_id) return;
    if (fy.is_active === 1) {
      setError("Cannot delete the active financial year");
      return;
    }
    if (fy.is_closed === 1) {
      setError("Cannot delete a closed financial year");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.fy.delete(fy.fy_id);
      if (!result.success) {
        setError(result.error || "Failed to delete financial year");
      } else {
        window.dispatchEvent(new Event("fy-reload"));
        if (activeFY?.fy_id === fy.fy_id) {
          const remaining = availableFYs.filter((f) => f.fy_id !== fy.fy_id);
          if (remaining.length > 0) {
            switchFY(remaining[0]);
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  const handleSetActive = async (fy: FYType) => {
    if (!fy.fy_id || fy.fy_id === activeFY?.fy_id) return;
    if (fy.is_closed === 1) {
      setError("Cannot activate a closed financial year");
      return;
    }
    await switchFY(fy);
  };

  const sortedFYs = [...availableFYs].sort((a, b) =>
    a.start_date.localeCompare(b.start_date)
  );

  return (
    <div className="min-h-screen p-6">
      <Link to="/" className="px-4 py-2">
        ← Back
      </Link>

      <div className="mt-4 bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h1 className="text-lg font-semibold text-gray-800">
            Financial Years
          </h1>
          <button
            onClick={() => {
              setShowCreate(!showCreate);
              setError(null);
            }}
            className="text-sm px-4 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors"
          >
            {showCreate ? "Cancel" : "+ New Year"}
          </button>
        </div>

        {showCreate && (
          <div className="px-6 py-4 border-b bg-blue-50">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">
                Financial Year:
              </label>
              <select
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
                className="border rounded px-3 py-1.5 text-sm"
              >
                <option value="">— Select —</option>
                {FY_YEARS.map((y) => (
                  <option key={y} value={`${y}-04-01`}>
                    1 Apr {y} — 31 Mar {y + 1}
                  </option>
                ))}
              </select>
              <button
                onClick={handleCreate}
                disabled={loading || !newStartDate}
                className="text-sm px-4 py-1.5 rounded bg-green-600 text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="px-6 py-2 bg-red-50 border-b border-red-200 text-red-700 text-sm flex justify-between items-center">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700 text-xs"
            >
              dismiss
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase text-gray-500 bg-gray-50">
                <th className="px-4 py-2 text-left border">#</th>
                <th className="px-4 py-2 text-left border">Start Date</th>
                <th className="px-4 py-2 text-left border">End Date</th>
                <th className="px-4 py-2 text-center border">Status</th>
                <th className="px-4 py-2 text-right border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedFYs.map((fy, idx) => {
                const isActive = activeFY?.fy_id === fy.fy_id;
                const isClosed = fy.is_closed === 1;
                return (
                  <tr
                    key={fy.fy_id}
                    className={
                      isActive ? "bg-blue-50" : "hover:bg-gray-50"
                    }
                  >
                    <td className="px-4 py-2 border text-gray-400">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-2 border font-medium">
                      {formatDate(fy.start_date)}
                    </td>
                    <td className="px-4 py-2 border">
                      {formatDate(fy.end_date)}
                    </td>
                    <td className="px-4 py-2 border text-center">
                      <span className="flex items-center justify-center gap-2">
                        {isActive && (
                          <span className="text-xs px-2 py-0.5 rounded bg-blue-600 text-white">
                            Active
                          </span>
                        )}
                        {isClosed && (
                          <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                            Closed
                          </span>
                        )}
                        {!isActive && !isClosed && (
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500">
                            Inactive
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-2 border text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!isActive && !isClosed && (
                          <button
                            onClick={() => handleSetActive(fy)}
                            className="text-xs px-2 py-1 rounded border border-blue-300 text-blue-600 hover:bg-blue-100 transition-colors"
                          >
                            Set Active
                          </button>
                        )}
                        {!isActive && !isClosed && (
                          <button
                            onClick={() => handleDelete(fy)}
                            className="text-xs px-2 py-1 rounded border border-red-300 text-red-600 hover:bg-red-100 transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {sortedFYs.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    No financial years found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
