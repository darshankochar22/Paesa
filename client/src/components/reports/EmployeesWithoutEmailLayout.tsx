import * as React from "react";
import { useCompany } from "@/context/CompanyContext";

interface EmpRow {
  id: number;
  emp_name: string;
  emp_code: string;
  designation: string;
  department: string;
}

export default function EmployeesWithoutEmailLayout() {
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;
  const periodLabel = activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : "";

  const [rows, setRows] = React.useState<EmpRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [focusedIdx, setFocusedIdx] = React.useState(0);

  React.useEffect(() => {
    if (!companyId || !fyId) return;
    setLoading(true);
    setError(null);
    (window as any).api.report
      .employeesWithoutEmail(companyId, fyId)
      .then((res: any) => {
        if (res.success) { setRows(res.rows || []); setFocusedIdx(0); }
        else setError(res.error || "Failed to load report");
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, [companyId, fyId]);

  React.useEffect(() => {
    if (!rows.length) return;
    const onKey = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT") return;
      if (e.key === "ArrowDown") { e.preventDefault(); setFocusedIdx(p => Math.min(rows.length - 1, p + 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setFocusedIdx(p => Math.max(0, p - 1)); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rows]);

  if (loading) return <div className="flex-1 flex items-center justify-center text-zinc-400 font-mono text-xs">Loading...</div>;
  if (error) return <div className="flex-1 flex items-center justify-center text-zinc-600 font-mono text-xs px-8 text-center">{error}</div>;

  return (
    <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono select-none">
          <thead className="sticky top-0 bg-[#f4f4f5] border-b border-zinc-300 z-10">
            <tr>
              <th colSpan={3} className="px-3 py-0.5 text-left font-normal italic text-zinc-500">Employees with no e-mail ID on record</th>
              <th className="px-3 py-0.5 text-right font-normal text-zinc-500">{periodLabel}</th>
            </tr>
            <tr className="border-t border-zinc-200 text-zinc-900">
              <th className="px-3 py-1.5 text-left font-bold">Name</th>
              <th className="px-3 py-1.5 text-left font-bold w-32">Employee Code</th>
              <th className="px-3 py-1.5 text-left font-bold w-36">Designation</th>
              <th className="px-3 py-1.5 text-left font-bold w-36">Department</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-400 italic">All employees have e-mail IDs on record.</td></tr>
            ) : rows.map((row, idx) => {
              const focused = idx === focusedIdx;
              return (
                <tr key={row.id} onClick={() => setFocusedIdx(idx)}
                  className={`border-b border-zinc-100 cursor-pointer transition-colors ${focused ? "bg-[#e4e4e7] text-zinc-950 font-bold" : "hover:bg-zinc-50 text-zinc-800"}`}>
                  <td className="px-3 py-1.5">{row.emp_name}</td>
                  <td className="px-3 py-1.5">{row.emp_code || "—"}</td>
                  <td className="px-3 py-1.5">{row.designation || "—"}</td>
                  <td className="px-3 py-1.5">{row.department || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-zinc-300 bg-[#f4f4f5] shrink-0 px-3 py-1 text-[10px] text-zinc-500 font-mono">
        {rows.length} employee{rows.length !== 1 ? "s" : ""} without e-mail ID
      </div>
    </div>
  );
}
