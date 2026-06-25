import * as React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";

/* ── Formatters ────────────────────────────────────────────────────── */
const fmtDate = (d: string) => {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return `${dt.getDate()}-${dt.toLocaleString("en-IN", { month: "short" })}-${String(dt.getFullYear()).slice(-2)}`;
};

const fmt = (v: number) =>
  v === 0 ? "0.00" : new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(v));

const fmtTotal = (v: number) =>
  new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(v));

/* ── Types ─────────────────────────────────────────────────────────── */
interface LedgerMeta {
  ledger_id: number;
  name: string;
  group_name?: string;
}

interface InterestBillRow {
  party_ledger: string;
  bill_ref: string;
  bill_due_date: string;
  total_pending: number;
  interest_rate: number;
  interest_style: string;
  days: number;
  interest_amount: number;
  "0_30": number;
  "31_60": number;
  "60": number;
}

export default function InterestBillWiseLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedCompany, activeFY } = useCompany();

  /* Read ledger_id from URL search params or router state */
  const [ledgerId, setLedgerId] = React.useState<number | null>(() => {
    const p = new URLSearchParams(location.search);
    const id = p.get("ledger_id");
    return id ? Number(id) : ((location.state as any)?.ledger_id ?? null);
  });
  const [ledgerName, setLedgerName] = React.useState<string>(() => {
    const p = new URLSearchParams(location.search);
    return p.get("ledger_name") || (location.state as any)?.ledger_name || "";
  });

  /* Picker state */
  const [ledgers, setLedgers] = React.useState<LedgerMeta[]>([]);
  const [search, setSearch] = React.useState("");
  const [pickerFocus, setPickerFocus] = React.useState(0);

  /* Drill-down state */
  const [rows, setRows] = React.useState<InterestBillRow[]>([]);
  const [totalPrincipal, setTotalPrincipal] = React.useState(0);
  const [totalInterest, setTotalInterest] = React.useState(0);
  const [asOn, setAsOn] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [focusedIdx, setFocused] = React.useState(0);

  const fromDate = activeFY?.start_date || "";
  const toDate = activeFY?.end_date || "";
  const cid = selectedCompany?.company_id;
  const fyid = activeFY?.fy_id;

  /* ── Load ledger list ───────────────────────────────────────────── */
  React.useEffect(() => {
    if (!cid || ledgerId) return;
    (window as any).api.ledger.getAll(cid).then((res: any) => {
      const rawList = Array.isArray(res) ? res : (res?.ledgers ?? res?.data ?? []);
      const list: LedgerMeta[] = rawList
        .map((l: any) => ({ ledger_id: l.ledger_id, name: l.name, group_name: l.group_name || "" }))
        .sort((a: LedgerMeta, b: LedgerMeta) => a.name.localeCompare(b.name));
      setLedgers(list);
    });
  }, [cid, ledgerId]);

  /* ── Load bill-wise interest calculation data ───────────────────── */
  React.useEffect(() => {
    if (!ledgerId || !cid || !fyid) return;
    setLoading(true);
    setError(null);

    (window as any).api.report.billWiseInterest(cid, fyid, { ledger_id: ledgerId })
      .then((res: any) => {
        if (res?.success) {
          setRows(res.rows || []);
          setTotalPrincipal(res.total_principal || 0);
          setTotalInterest(res.total_interest || 0);
          setAsOn(res.to_date || "");
        } else {
          setError(res?.error || "Failed to load interest calculation.");
        }
      })
      .catch((err: any) => {
        setError(err.message || "An error occurred.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [ledgerId, cid, fyid]);

  /* ── Keyboard for picker ────────────────────────────────────────── */
  const filtered = ledgers.filter((l) => l.name.toLowerCase().includes(search.toLowerCase()));

  React.useEffect(() => {
    if (ledgerId) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") {
        if (e.key === "Escape") navigate(-1);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setPickerFocus((p) => Math.min(filtered.length - 1, p + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setPickerFocus((p) => Math.max(0, p - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const l = filtered[pickerFocus];
        if (l) {
          setLedgerId(l.ledger_id);
          setLedgerName(l.name);
        }
      } else if (e.key === "Escape" || e.key === "Backspace") {
        e.preventDefault();
        navigate(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ledgerId, filtered, pickerFocus, navigate]);

  /* ── Keyboard for detail view ───────────────────────────────────── */
  React.useEffect(() => {
    if (!ledgerId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocused((p) => Math.min(rows.length - 1, p + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocused((p) => Math.max(0, p - 1));
      } else if (e.key === "Escape" || e.key === "Backspace") {
        e.preventDefault();
        setLedgerId(null);
        setLedgerName("");
        setRows([]);
        setFocused(0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ledgerId, rows]);

  /* ── Picker View ────────────────────────────────────────────────── */
  if (!ledgerId) {
    return (
      <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden">
        <div className="bg-[#e5eff5] border-b border-zinc-300 px-3 py-1 text-[10px] font-mono text-zinc-700 flex gap-6 select-none">
          <span className="font-bold">Bill-wise Interest Calculation</span>
          <span className="ml-auto">Select a ledger to view bill-wise interest calculation</span>
        </div>
        {/* Search */}
        <div className="px-3 py-1.5 border-b border-zinc-200 bg-[#f5f9fb]">
          <input
            autoFocus
            type="text"
            placeholder="Type to search ledger..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPickerFocus(0);
            }}
            className="w-full text-[11px] font-mono border border-zinc-300 px-2 py-1 rounded outline-none focus:border-blue-400 bg-white"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          <table className="w-full border-collapse text-[11px] font-mono">
            <thead className="sticky top-0 bg-[#e5eff5] border-b border-zinc-300 z-10 select-none">
              <tr>
                <th className="px-3 py-1.5 text-left font-bold">Ledger Name</th>
                <th className="px-3 py-1.5 text-left font-bold w-48">Group</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-zinc-400 italic">
                    No ledgers found.
                  </td>
                </tr>
              ) : (
                filtered.map((l, idx) => (
                  <tr
                    key={l.ledger_id}
                    className={`border-b border-zinc-100 cursor-pointer select-none transition-colors ${
                      pickerFocus === idx ? "bg-[#ffcc00] text-zinc-950 font-bold" : "hover:bg-zinc-50 text-zinc-800"
                    }`}
                    onClick={() => {
                      setPickerFocus(idx);
                      setLedgerId(l.ledger_id);
                      setLedgerName(l.name);
                    }}
                  >
                    <td className="px-3 py-1.5">{l.name}</td>
                    <td className="px-3 py-1.5 text-zinc-500">{l.group_name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /* ── Loading / Error states ─────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400 font-mono text-xs">
        Loading Bill-wise Interest Calculation...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-500 font-mono text-xs px-8 text-center">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden">
      {/* Sub-header */}
      <div className="bg-[#e5eff5] border-b border-zinc-300 px-3 py-1 text-[10px] font-mono text-zinc-700 flex gap-6 select-none">
        <span>
          Ledger: <span className="font-bold">{ledgerName}</span>
        </span>
        <span>
          Period: <span className="font-bold">{fmtDate(fromDate)} to {fmtDate(toDate)}</span>
        </span>
        <span className="ml-auto">Interest Calculation (Bill-wise)</span>
      </div>

      {/* Opening Balance Bar */}
      <div className="bg-[#f5f9fb] border-b border-zinc-200 px-3 py-1.5 text-[10px] font-mono flex gap-8 select-none text-zinc-600">
        <span>
          <span className="font-bold text-zinc-800">Total Principal:</span> {fmtTotal(totalPrincipal)}
        </span>
        <span>
          <span className="font-bold text-zinc-800">Total Interest:</span> {fmtTotal(totalInterest)}
        </span>
        <span className="ml-auto text-zinc-400">
          {asOn ? `As on ${fmtDate(asOn)}` : ""} | Press [Esc] or [Backspace] to choose another ledger
        </span>
      </div>

      {/* Main Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono">
          <thead className="sticky top-0 bg-[#e5eff5] border-b border-zinc-300 z-10 select-none">
            <tr>
              <th className="px-3 py-1.5 text-left font-bold">Bill Reference</th>
              <th className="px-3 py-1.5 text-left font-bold w-[15%]">Due Date</th>
              <th className="px-3 py-1.5 text-left font-bold w-[20%]">Rate / Style</th>
              <th className="px-3 py-1.5 text-center font-bold w-[10%]">Days</th>
              <th className="px-3 py-1.5 text-right font-bold w-[18%]">Principal Amount</th>
              <th className="px-3 py-1.5 text-right font-bold w-[18%]">Interest</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-400 italic">
                  No interest transactions found for this ledger.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                const isFocused = focusedIdx === idx;
                return (
                  <tr
                    key={idx}
                    className={`border-b border-zinc-100 cursor-pointer select-none transition-colors ${
                      isFocused ? "bg-[#ffcc00] text-zinc-950 font-bold" : "hover:bg-zinc-50 text-zinc-800"
                    }`}
                    onClick={() => setFocused(idx)}
                  >
                    <td className="px-3 py-1.5 font-medium">{row.bill_ref}</td>
                    <td className="px-3 py-1.5">{fmtDate(row.bill_due_date)}</td>
                    <td className="px-3 py-1.5">
                      {row.interest_rate}% / {row.interest_style}
                    </td>
                    <td className="px-3 py-1.5 text-center">{row.days}</td>
                    <td className="px-3 py-1.5 text-right text-zinc-700">
                      {fmt(row.total_pending)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-bold text-red-700">
                      {fmt(row.interest_amount)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Total */}
      <div className="border-t-2 border-double border-zinc-400 bg-[#e5eff5] px-3 py-1.5 flex font-mono text-[11px] font-bold text-zinc-900 select-none">
        <span className="flex-1">Total</span>
        <span className="w-[18%] text-right pr-3">{fmtTotal(totalPrincipal)}</span>
        <span className="w-[18%] text-right pr-3 text-red-700">{fmtTotal(totalInterest)}</span>
      </div>
    </div>
  );
}
