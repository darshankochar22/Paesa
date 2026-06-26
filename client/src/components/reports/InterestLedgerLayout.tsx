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

interface InterestLedgerRow {
  date_particulars: string;
  vch_type: string;
  vch_no: string;
  debit: number;
  credit: number;
  balance: number;
  start_date: string;
  end_date: string;
  rate: number;
  interest: number;
  days: number;
}

export default function InterestLedgerLayout() {
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
  const [rows, setRows] = React.useState<InterestLedgerRow[]>([]);
  const [openingBalance, setOpeningBalance] = React.useState(0);
  const [totalInterest, setTotalInterest] = React.useState(0);
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

  /* ── Load ledger interest calculation data ──────────────────────── */
  React.useEffect(() => {
    if (!ledgerId || !cid || !fyid) return;
    setLoading(true);
    setError(null);

    (window as any).api.report.ledgerInterest(cid, fyid, { ledger_id: ledgerId })
      .then((res: any) => {
        if (res?.success) {
          setRows(res.rows || []);
          setOpeningBalance(res.opening_balance || 0);
          setTotalInterest(res.total_interest || 0);
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
        <div className="bg-[#f4f4f5] border-b border-zinc-300 px-3 py-1 text-[10px] font-mono text-zinc-700 flex gap-6 select-none">
          <span className="font-bold">Ledger Interest Calculation</span>
          <span className="ml-auto">Select a ledger to view interest calculation</span>
        </div>
        {/* Search */}
        <div className="px-3 py-1.5 border-b border-zinc-200 bg-[#fafafa]">
          <input
            autoFocus
            type="text"
            placeholder="Type to search ledger..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPickerFocus(0);
            }}
            className="w-full text-[11px] font-mono border border-zinc-300 px-2 py-1 rounded outline-none focus:border-zinc-800 bg-white"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          <table className="w-full border-collapse text-[11px] font-mono">
            <thead className="sticky top-0 bg-[#f4f4f5] border-b border-zinc-300 z-10 select-none">
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
                      pickerFocus === idx ? "bg-[#e4e4e7] text-zinc-950 font-bold" : "hover:bg-zinc-50 text-zinc-800"
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
        Loading Ledger Interest Calculation...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-600 font-mono text-xs px-8 text-center">
        {error}
      </div>
    );
  }

  // Calculate totals
  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
  const finalBalance = rows.length > 0 ? rows[rows.length - 1].balance : openingBalance;

  return (
    <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden">
      {/* Sub-header */}
      <div className="bg-[#f4f4f5] border-b border-zinc-300 px-3 py-1 text-[10px] font-mono text-zinc-700 flex gap-6 select-none">
        <span>
          Ledger: <span className="font-bold">{ledgerName}</span>
        </span>
        <span>
          Period: <span className="font-bold">{fmtDate(fromDate)} to {fmtDate(toDate)}</span>
        </span>
        <span className="ml-auto">Interest Calculation (Ledger-wise)</span>
      </div>

      {/* Opening Balance Bar */}
      <div className="bg-[#fafafa] border-b border-zinc-200 px-3 py-1.5 text-[10px] font-mono flex gap-8 select-none text-zinc-600">
        <span>
          <span className="font-bold text-zinc-800">Opening Balance:</span> {fmt(openingBalance)}{" "}
          {openingBalance >= 0 ? "Dr" : "Cr"}
        </span>
        <span>
          <span className="font-bold text-zinc-800">Total Interest Calculated:</span> {fmtTotal(totalInterest)}
        </span>
        <span className="text-zinc-400 ml-auto">| Press [Esc] or [Backspace] to choose another ledger</span>
      </div>

      {/* Main Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono">
          <thead className="sticky top-0 bg-[#f4f4f5] border-b border-zinc-300 z-10 select-none">
            <tr>
              <th className="px-3 py-1.5 text-left font-bold w-[25%]">Date range</th>
              <th className="px-3 py-1.5 text-left font-bold w-[12%]">Rate / Style</th>
              <th className="px-3 py-1.5 text-center font-bold w-[8%]">Days</th>
              <th className="px-3 py-1.5 text-right font-bold w-[15%]">Debit Balance</th>
              <th className="px-3 py-1.5 text-right font-bold w-[15%]">Credit Balance</th>
              <th className="px-3 py-1.5 text-right font-bold w-[15%]">Interest</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-400 italic">
                  No interest intervals found.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                const isFocused = focusedIdx === idx;
                return (
                  <tr
                    key={idx}
                    className={`border-b border-zinc-100 cursor-pointer select-none transition-colors ${
                      isFocused ? "bg-[#e4e4e7] text-zinc-950 font-bold" : "hover:bg-zinc-50 text-zinc-800"
                    }`}
                    onClick={() => setFocused(idx)}
                  >
                    <td className="px-3 py-1.5 font-medium">{row.date_particulars}</td>
                    <td className="px-3 py-1.5">
                      {row.rate}% / {row.vch_type}
                    </td>
                    <td className="px-3 py-1.5 text-center">{row.days}</td>
                    <td className="px-3 py-1.5 text-right text-zinc-700">
                      {row.balance >= 0 ? fmt(row.balance) : ""}
                    </td>
                    <td className="px-3 py-1.5 text-right text-zinc-700">
                      {row.balance < 0 ? fmt(row.balance) : ""}
                    </td>
                    <td className="px-3 py-1.5 text-right font-bold text-zinc-800">
                      {row.interest > 0 ? fmt(row.interest) : ""}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Total */}
      <div className="border-t-2 border-double border-zinc-400 bg-[#f4f4f5] px-3 py-1.5 flex font-mono text-[11px] font-bold text-zinc-900 select-none">
        <span className="w-[25%]">Closing Balance: {fmt(finalBalance)} {finalBalance >= 0 ? "Dr" : "Cr"}</span>
        <span className="w-[12%]" />
        <span className="w-[8%] text-center">Totals</span>
        <span className="w-[15%] text-right pr-3">{fmtTotal(totalDebit)}</span>
        <span className="w-[15%] text-right pr-3">{fmtTotal(totalCredit)}</span>
        <span className="w-[15%] text-right pr-3 text-zinc-800">{fmtTotal(totalInterest)}</span>
      </div>
    </div>
  );
}
