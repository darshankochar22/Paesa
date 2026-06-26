import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";

const fmtQty = (val: number | null | undefined) => {
  const n = Number(val) || 0;
  if (n === 0) return "";
  return n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
  } catch {
    return dateStr;
  }
};

const MONTHS_ORDER = ["April","May","June","July","August","September","October","November","December","January","February","March"];

interface MonthRow { month: string; total_vouchers: number; cancelled: number; }
interface VoucherRow {
  voucher_id: number;
  date: string;
  particulars: string;
  voucher_type: string;
  voucher_number: string | number;
  inwards_qty: number;
  outwards_qty: number;
}

interface Props {
  voucherType: string; // e.g. "Stock Journal" | "Physical Stock"
  title: string;       // e.g. "Stock Journal Register"
}

type Level = { step: "monthly" } | { step: "vouchers"; month: string };

export default function InventoryVoucherRegister({ voucherType, title }: Props) {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;
  const periodLabel = activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : "";

  const [level, setLevel] = React.useState<Level>({ step: "monthly" });

  // ── Level 1: Monthly ─────────────────────────────────────────────────────
  const [months, setMonths] = React.useState<MonthRow[]>([]);
  const [loadingMonths, setLoadingMonths] = React.useState(true);
  const [monthsError, setMonthsError] = React.useState<string | null>(null);
  const [monthIndex, setMonthIndex] = React.useState(0);

  React.useEffect(() => {
    setLevel({ step: "monthly" });
    if (!companyId || !fyId) { setLoadingMonths(false); return; }
    setLoadingMonths(true);
    setMonthsError(null);
    (window as any).api.report
      .inventoryRegisterMonthly(companyId, fyId, voucherType)
      .then((res: any) => {
        if (res.success) setMonths(res.rows ?? []);
        else setMonthsError(res.error || "Failed to load register");
        setLoadingMonths(false);
      });
  }, [companyId, fyId, voucherType]);

  // ── Level 2: Vouchers for a month ────────────────────────────────────────
  const [voucherRows, setVoucherRows] = React.useState<VoucherRow[]>([]);
  const [loadingVouchers, setLoadingVouchers] = React.useState(false);
  const [voucherError, setVoucherError] = React.useState<string | null>(null);
  const [voucherIndex, setVoucherIndex] = React.useState(0);

  const monthRange = React.useCallback((monthName: string) => {
    if (!activeFY?.start_date) return { from: undefined, to: undefined };
    const startYear = new Date(activeFY.start_date).getFullYear();
    const idx = MONTHS_ORDER.indexOf(monthName);
    let m = idx + 4, y = startYear;
    if (m > 12) { m -= 12; y = startYear + 1; }
    const pad = (n: number) => String(n).padStart(2, "0");
    const from = `${y}-${pad(m)}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const to = `${y}-${pad(m)}-${pad(lastDay)}`;
    return { from, to };
  }, [activeFY]);

  const loadVouchers = React.useCallback((monthName: string) => {
    if (!companyId || !fyId) return;
    setLevel({ step: "vouchers", month: monthName });
    setLoadingVouchers(true);
    setVoucherError(null);
    setVoucherIndex(0);
    const { from, to } = monthRange(monthName);
    (window as any).api.report
      .inventoryRegisterVouchers(companyId, fyId, voucherType, from, to)
      .then((res: any) => {
        if (res.success) setVoucherRows(res.rows ?? []);
        else setVoucherError(res.error || "Failed to load vouchers");
        setLoadingVouchers(false);
      });
  }, [companyId, fyId, voucherType, monthRange]);

  const backToMonthly = React.useCallback(() => { setLevel({ step: "monthly" }); setVoucherRows([]); }, []);

  // ── Keyboard nav ─────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (level.step !== "monthly") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setMonthIndex((p) => Math.min(months.length - 1, p + 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMonthIndex((p) => Math.max(0, p - 1)); return; }
      if (e.key === "Enter") { e.preventDefault(); const m = months[monthIndex]; if (m) loadVouchers(m.month); return; }
      if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); navigate(-1); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [level.step, months, monthIndex, loadVouchers, navigate]);

  React.useEffect(() => {
    if (level.step !== "vouchers") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setVoucherIndex((p) => Math.min(voucherRows.length - 1, p + 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setVoucherIndex((p) => Math.max(0, p - 1)); return; }
      if (e.key === "Enter") { e.preventDefault(); const r = voucherRows[voucherIndex]; if (r?.voucher_id) navigate(`/transactions/voucher/${r.voucher_id}`); return; }
      if (e.key === "Escape" || e.key === "Backspace") { e.preventDefault(); backToMonthly(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [level.step, voucherRows, voucherIndex, navigate, backToMonthly]);

  // ═══════════════════════════════════════════════════════════════════════
  // LEVEL 1 — Monthly register (matches screenshots 2 / 5)
  // ═══════════════════════════════════════════════════════════════════════
  if (level.step === "monthly") {
    const totalVouchers = months.reduce((s, r) => s + (Number(r.total_vouchers) || 0), 0);
    const totalCancelled = months.reduce((s, r) => s + (Number(r.cancelled) || 0), 0);
    return (
      <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-900 font-sans text-[11px]">
        <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-zinc-900">
          <span className="font-bold text-sm tracking-wide">{title}</span>
          <span className="font-bold text-sm">{selectedCompany?.name || "Company"}</span>
          <span />
        </div>
        <div className="flex justify-between items-center px-3 py-1.5 bg-white border-b border-zinc-300 font-mono">
          <span>{voucherType}</span>
          <span>{periodLabel}</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full border-collapse text-[11px] font-mono select-none">
            <thead className="sticky top-0 bg-[#e5eff5] border-b border-zinc-300 z-10 text-zinc-700">
              <tr>
                <th rowSpan={2} className="px-3 py-1 text-left font-bold align-bottom">Particulars</th>
                <th colSpan={2} className="px-3 py-0.5 text-center font-bold border-b border-l border-zinc-200">Transactions</th>
              </tr>
              <tr>
                <th className="px-3 py-1 text-right font-bold w-40 border-l border-zinc-200">Total Vouchers</th>
                <th className="px-3 py-1 text-right font-bold w-40">(cancelled )</th>
              </tr>
            </thead>
            <tbody>
              {loadingMonths ? (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-zinc-400 italic">Loading...</td></tr>
              ) : monthsError ? (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-red-500">{monthsError}</td></tr>
              ) : (
                months.map((row, idx) => {
                  const isFocused = idx === monthIndex;
                  return (
                    <tr
                      key={row.month}
                      onClick={() => setMonthIndex(idx)}
                      onDoubleClick={() => loadVouchers(row.month)}
                      className={`border-b border-zinc-100 cursor-pointer ${isFocused ? "bg-[#ffcc00] text-zinc-950 font-bold" : "hover:bg-zinc-50 text-zinc-800"}`}
                    >
                      <td className="px-3 py-1">{row.month}</td>
                      <td className="px-3 py-1 text-right border-l border-zinc-100">{row.total_vouchers > 0 ? row.total_vouchers : ""}</td>
                      <td className="px-3 py-1 text-right text-zinc-500">{row.cancelled > 0 ? `(${row.cancelled} )` : ""}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t-2 border-zinc-300 bg-[#e5eff5] px-3 py-1.5 flex font-mono text-[11px] font-bold text-zinc-900 shrink-0">
          <span className="flex-1">Grand Total</span>
          <span className="w-40 text-right border-l border-zinc-300 pr-2">{totalVouchers > 0 ? totalVouchers : ""}</span>
          <span className="w-40 text-right text-zinc-500 pr-2">{totalCancelled > 0 ? `(${totalCancelled} )` : ""}</span>
        </div>

        <div className="flex items-center gap-4 px-3 py-1 border-t border-zinc-300 bg-zinc-50 text-[10px] font-semibold text-zinc-600 shrink-0">
          <button onClick={() => navigate(-1)} className="hover:underline hover:text-zinc-900">Q: Quit</button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LEVEL 2 — Voucher Register (matches screenshots 3 / 6)
  // ═══════════════════════════════════════════════════════════════════════
  const totalIn = voucherRows.reduce((s, r) => s + (Number(r.inwards_qty) || 0), 0);
  const totalOut = voucherRows.reduce((s, r) => s + (Number(r.outwards_qty) || 0), 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-900 font-sans text-[11px]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-zinc-900">
        <span className="font-bold text-sm tracking-wide">Voucher Register</span>
        <span className="font-bold text-sm">{selectedCompany?.name || "Company"}</span>
        <span />
      </div>
      <div className="flex justify-between items-center px-3 py-1.5 bg-white border-b border-zinc-300 font-mono">
        <span>List of All {voucherType} Vouchers</span>
        <span>{periodLabel}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono select-none">
          <thead className="sticky top-0 bg-[#e5eff5] border-b border-zinc-300 z-10 text-zinc-700">
            <tr>
              <th className="px-3 py-1 text-left font-bold w-20">Date</th>
              <th className="px-3 py-1 text-left font-bold">Particulars</th>
              <th className="px-3 py-1 text-left font-bold w-28">Vch Type</th>
              <th className="px-3 py-1 text-right font-bold w-20">Vch No.</th>
              <th className="px-3 py-1 text-right font-bold w-28 border-l border-zinc-200">Inwards<br />Quantity</th>
              <th className="px-3 py-1 text-right font-bold w-28 border-l border-zinc-200">Outwards<br />Quantity</th>
            </tr>
          </thead>
          <tbody>
            {loadingVouchers ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-400 italic">Loading vouchers...</td></tr>
            ) : voucherError ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-red-500">{voucherError}</td></tr>
            ) : voucherRows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-400 italic">No records found.</td></tr>
            ) : (
              voucherRows.map((row, idx) => {
                const isFocused = idx === voucherIndex;
                return (
                  <tr
                    key={row.voucher_id}
                    onClick={() => setVoucherIndex(idx)}
                    onDoubleClick={() => navigate(`/transactions/voucher/${row.voucher_id}`)}
                    className={`border-b border-zinc-100 cursor-pointer ${isFocused ? "bg-[#ffcc00] text-zinc-950 font-bold" : "hover:bg-zinc-50 text-zinc-800"}`}
                  >
                    <td className="px-3 py-1 whitespace-nowrap">{formatDate(row.date)}</td>
                    <td className="px-3 py-1 truncate max-w-xs">{row.particulars}</td>
                    <td className="px-3 py-1">{row.voucher_type}</td>
                    <td className="px-3 py-1 text-right">{row.voucher_number || ""}</td>
                    <td className="px-3 py-1 text-right border-l border-zinc-100">{fmtQty(row.inwards_qty)}</td>
                    <td className="px-3 py-1 text-right border-l border-zinc-100">{fmtQty(row.outwards_qty)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t-2 border-zinc-300 bg-[#e5eff5] px-3 py-1.5 flex font-mono text-[11px] font-bold text-zinc-900 shrink-0">
        <span className="w-20" />
        <span className="flex-1" />
        <span className="w-28" />
        <span className="w-20" />
        <span className="w-28 text-right pr-2 border-l border-zinc-300">{fmtQty(totalIn)}</span>
        <span className="w-28 text-right pr-2 border-l border-zinc-300">{fmtQty(totalOut)}</span>
      </div>

      <div className="flex items-center gap-4 px-3 py-1 border-t border-zinc-300 bg-zinc-50 text-[10px] font-semibold text-zinc-600 shrink-0">
        <button onClick={backToMonthly} className="hover:underline hover:text-zinc-900">Q: Quit</button>
      </div>
    </div>
  );
}
