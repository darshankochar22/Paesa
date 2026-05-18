import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useCompany } from "../../context/CompanyContext";
import type { VoucherType } from "../../types/api";

export default function Daybook() {
  const { selectedCompany, activeFY } = useCompany();
  const [entries, setEntries] = useState<VoucherType[]>([]);

  useEffect(() => {
    if (!selectedCompany?.company_id || !activeFY?.fy_id) return;
    async function fetchDaybook() {
      try {
        const data = await window.api.voucher.getDaybook(
          selectedCompany!.company_id!,
          activeFY!.fy_id!
        );
        const vouchers = (data as any)?.vouchers || data || [];
        const list = Array.isArray(vouchers) ? vouchers : [];
        setEntries(list);
      } catch (err) {
        console.error("Failed to fetch daybook:", err);
      }
    }
    fetchDaybook();
  }, [selectedCompany, activeFY]);

  return (
    <div className="min-h-screen p-6">
      <Link to="/" className="px-4 py-2">
        ← Back
      </Link>

      <div className="mt-4 bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h1 className="text-lg font-semibold text-gray-800">Day Book</h1>
          <div className="text-right">
            <p className="text-xs ">Date</p>
            <p className="text-sm font-medium text-gray-700">11-May-2026</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase">
                <th className="px-4 py-2 text-left border ">Date</th>
                <th className="px-4 py-2 text-left border ">Vch Type</th>
                <th className="px-4 py-2 text-left border ">Vch No.</th>
                <th className="px-4 py-2 text-left border ">Party</th>
                <th className="px-4 py-2 text-left border ">Narration</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.voucher_id}>
                  <td className="px-4 py-3 border ">{entry.date}</td>
                  <td className="px-4 py-3 border ">{entry.voucher_type}</td>
                  <td className="px-4 py-3 border ">{entry.voucher_number}</td>
                  <td className="px-4 py-3 border ">{entry.party_name || "—"}</td>
                  <td className="px-4 py-3 border text-gray-500">{entry.narration || "—"}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    No vouchers found for this financial year
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