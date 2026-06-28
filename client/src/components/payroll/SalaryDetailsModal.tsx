import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";

// One salary line in the structure (a pay head + its rate/per).
export interface SalaryRow {
  pay_head_id: number | null;
  pay_head_name: string;
  rate: string;
  per: string;
  pay_head_type: string;
  calculation_type: string;
}

interface PayHead {
  pay_head_id: number;
  name: string;
  pay_head_type?: string;
  calculation_type?: string;
}

export const emptySalaryRow = (): SalaryRow => ({
  pay_head_id: null,
  pay_head_name: "",
  rate: "",
  per: "",
  pay_head_type: "",
  calculation_type: "",
});

// April 1 of the current financial year, e.g. "2026-04-01".
export function fyStartISO(): string {
  const now = new Date();
  const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}-04-01`;
}

function fmtDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" }).replace(/ /g, "-");
}

const cellCls =
  "w-full bg-transparent outline-none text-sm px-2 py-1 border border-transparent focus:bg-zinc-100 focus:border-zinc-300 rounded";
const thCls = "px-2 py-1.5 text-xs font-bold text-zinc-700 border-r border-zinc-200 last:border-r-0";

interface Props {
  name: string;
  under: string;
  companyId?: number;
  effectiveFrom?: string;
  initialRows?: SalaryRow[];
  onAccept: (rows: SalaryRow[], effectiveFrom: string) => void;
  onClose: () => void;
}

export default function SalaryDetailsModal({
  name,
  under,
  companyId,
  effectiveFrom,
  initialRows,
  onAccept,
  onClose,
}: Props) {
  const navigate = useNavigate();
  const [payHeads, setPayHeads] = useState<PayHead[]>([]);
  const [effDate, setEffDate] = useState(effectiveFrom || fyStartISO());
  const [rows, setRows] = useState<SalaryRow[]>(
    initialRows && initialRows.length > 0 ? [...initialRows, emptySalaryRow()] : [emptySalaryRow()]
  );
  // Which row's Pay Head cell is active → drives the right-side list panel.
  const [activeRow, setActiveRow] = useState<number | null>(null);

  useEffect(() => {
    if (!companyId) return;
    window.api.payHead.getAll(companyId).then((r: any) => {
      if (r?.success) setPayHeads((r.payHeads ?? []) as PayHead[]);
    });
  }, [companyId]);

  const filledRows = useMemo(() => rows.filter((r) => r.pay_head_id != null), [rows]);

  const updateRow = (i: number, patch: Partial<SalaryRow>) =>
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const pickPayHead = (i: number, ph: PayHead) => {
    setRows((prev) => {
      const next = prev.map((r, j) =>
        j === i
          ? {
              ...r,
              pay_head_id: ph.pay_head_id,
              pay_head_name: ph.name,
              pay_head_type: ph.pay_head_type || "",
              calculation_type: ph.calculation_type || "",
            }
          : r
      );
      // Keep a trailing empty row for the next entry.
      if (i === next.length - 1) next.push(emptySalaryRow());
      return next;
    });
    setActiveRow(null);
  };

  const removeRow = (i: number) =>
    setRows((prev) => {
      const next = prev.filter((_, j) => j !== i);
      return next.length === 0 ? [emptySalaryRow()] : next;
    });

  const accept = () => onAccept(filledRows, effDate);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (activeRow !== null) { setActiveRow(null); return; }
        onClose();
      }
      if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        accept();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRow, filledRows, effDate]);

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col select-none text-zinc-950">
      {/* Title bar */}
      <div className="bg-black text-white px-4 py-2 flex items-center justify-between shrink-0">
        <span className="text-sm font-bold tracking-wide">Salary Details Creation</span>
        <button onClick={onClose} className="text-zinc-300 hover:text-white text-lg leading-none">&times;</button>
      </div>

      <div className="flex-1 flex min-h-0 relative">
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Name / Under header */}
          <div className="px-6 py-3 border-b border-zinc-200 text-sm font-mono shrink-0">
            <div className="flex gap-2">
              <span className="w-16 text-zinc-500">Name</span>
              <span className="text-zinc-400">:</span>
              <span className="font-bold text-zinc-900">{name || "—"}</span>
            </div>
            <div className="flex gap-2 mt-0.5">
              <span className="w-16 text-zinc-500">Under</span>
              <span className="text-zinc-400">:</span>
              <span className="font-bold text-zinc-900">◆ {under || "Primary"}</span>
            </div>
          </div>

          <div className="text-center text-sm font-bold text-zinc-900 py-2 border-b border-zinc-200 shrink-0">
            Salary Details
          </div>

          {/* Effective-from + table */}
          <div className="flex-1 overflow-auto min-h-0">
            <div className="px-6 pt-2 flex items-center gap-2 text-xs font-mono">
              <span className="text-zinc-500">Effective From</span>
              <span className="text-zinc-400">:</span>
              <input
                type="date"
                value={effDate}
                onChange={(e) => setEffDate(e.target.value)}
                className="border border-zinc-300 rounded px-2 py-0.5 text-xs font-mono font-bold text-zinc-900 focus:outline-none focus:border-zinc-500"
              />
              <span className="text-zinc-400">{fmtDate(effDate)}</span>
            </div>

            <table className="w-full mt-2 border-collapse text-sm font-mono">
              <thead className="sticky top-0 bg-zinc-100">
                <tr className="border-y border-zinc-300">
                  <th className={thCls + " text-left w-64"}>Pay Head</th>
                  <th className={thCls + " text-right w-28"}>Rate</th>
                  <th className={thCls + " text-left w-24"}>Per</th>
                  <th className={thCls + " text-left w-48"}>Pay Head Type</th>
                  <th className={thCls + " text-left w-48"}>Calculation Type</th>
                  <th className="w-6" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const isLastEmpty = i === rows.length - 1 && row.pay_head_id == null;
                  return (
                    <tr key={i} className={`border-b border-zinc-100 group ${activeRow === i ? "bg-zinc-100" : "hover:bg-zinc-50"}`}>
                      {/* Pay Head */}
                      <td className="border-r border-zinc-100">
                        <button
                          type="button"
                          className="w-full text-left px-2 py-1 text-sm font-bold text-zinc-900 outline-none"
                          onClick={() => setActiveRow(i)}
                        >
                          {row.pay_head_name || <span className="text-zinc-300 italic font-normal">select…</span>}
                        </button>
                      </td>
                      {/* Rate */}
                      <td className="border-r border-zinc-100">
                        <input
                          className={cellCls + " text-right"}
                          value={row.rate}
                          placeholder={isLastEmpty ? "" : "0.00"}
                          disabled={row.pay_head_id == null}
                          onChange={(e) => updateRow(i, { rate: e.target.value })}
                        />
                      </td>
                      {/* Per */}
                      <td className="border-r border-zinc-100">
                        <input
                          className={cellCls}
                          value={row.per}
                          disabled={row.pay_head_id == null}
                          onChange={(e) => updateRow(i, { per: e.target.value })}
                        />
                      </td>
                      {/* Pay Head Type (read-only) */}
                      <td className="border-r border-zinc-100 px-2 py-1 text-zinc-500">{row.pay_head_type}</td>
                      {/* Calculation Type (read-only) */}
                      <td className="border-r border-zinc-100 px-2 py-1 text-zinc-500">{row.calculation_type}</td>
                      {/* remove */}
                      <td className="px-1 text-center">
                        {!isLastEmpty && (
                          <button
                            onClick={() => removeRow(i)}
                            className="text-zinc-300 hover:text-black opacity-0 group-hover:opacity-100 text-xs"
                            tabIndex={-1}
                          >
                            ×
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="border-t border-zinc-200 flex text-xs bg-zinc-50 shrink-0">
            <button onClick={onClose} className="flex-1 py-2 border-r border-zinc-200 hover:bg-zinc-100 text-left px-4">
              <span className="font-bold">Q</span>: Quit
            </button>
            <button onClick={accept} className="flex-1 py-2 hover:bg-zinc-100 text-left px-4">
              <span className="font-bold">Alt+A</span>: Accept
            </button>
          </div>
        </div>

        {/* List of Pay Heads side panel */}
        {activeRow !== null && (
          <div className="w-72 border-l border-zinc-300 bg-white shadow-xl flex flex-col shrink-0">
            <div className="px-3 py-2 border-b border-zinc-200 flex justify-between items-center shrink-0">
              <span className="text-xs font-bold text-zinc-700 uppercase tracking-wide">List of Pay Heads</span>
              <button
                onMouseDown={(e) => { e.preventDefault(); navigate("/master/create/pay-head"); }}
                className="text-[11px] font-bold text-zinc-900 underline hover:text-black"
              >
                Create
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {payHeads.map((ph) => (
                <div
                  key={ph.pay_head_id}
                  onMouseDown={(e) => { e.preventDefault(); pickPayHead(activeRow, ph); }}
                  className={`px-3 py-1.5 text-sm font-mono cursor-pointer border-b border-zinc-50 ${
                    rows[activeRow]?.pay_head_id === ph.pay_head_id ? "bg-zinc-100 text-black font-bold" : "text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  {ph.name}
                </div>
              ))}
              <div className="px-3 py-1.5 text-sm font-mono text-zinc-400 border-t border-zinc-200">◆ End of List</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
