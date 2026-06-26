import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";

const fmtAmount = (val: number) =>
  val === 0 ? "" : new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
};

interface MonthRow {
  month: string;
  total_vouchers?: number;
  cancelled?: number;
  debit?: number;
  credit?: number;
  closing_balance?: number;
  value?: number;
}

interface VoucherRow {
  id?: number;
  voucher_id?: number;
  date?: string;
  particulars?: string;
  voucher_type?: string;
  voucher_number?: string | number;
  debit?: number;
  credit?: number;
}

export default function PaymentRegisterLayout() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();

  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;
  const periodLabel = activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : "";

  // Level 1: monthly summary
  const [monthRows, setMonthRows] = React.useState<MonthRow[]>([]);
  const [loadingMonths, setLoadingMonths] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [focusedMonthIndex, setFocusedMonthIndex] = React.useState(0);

  // Level 2: voucher list for selected month
  const [selectedMonth, setSelectedMonth] = React.useState<MonthRow | null>(null);
  const [voucherRows, setVoucherRows] = React.useState<VoucherRow[]>([]);
  const [loadingVouchers, setLoadingVouchers] = React.useState(false);
  const [focusedVoucherIndex, setFocusedVoucherIndex] = React.useState(0);

  React.useEffect(() => {
    if (!companyId || !fyId) return;
    setLoadingMonths(true);
    setError(null);
    (window as any).api.report
      .paymentRegister(companyId, fyId)
      .then((res: any) => {
        if (res.success) {
          setMonthRows(res.rows || []);
          setFocusedMonthIndex(0);
        } else {
          setError(res.error || "Failed to load Payment Register");
        }
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoadingMonths(false));
  }, [companyId, fyId]);

  // registerBuilder's monthly rows don't carry from_date/to_date, so derive
  // the month's date range here from the FY start + month name (same logic
  // ReportRunner.tsx already uses for the month query-param drilldown).
  const getMonthDateRange = React.useCallback(
    (monthName: string): { from: string; to: string } | null => {
      if (!activeFY?.start_date || !activeFY?.end_date) return null;
      const monthNames = [
        "april", "may", "june", "july", "august", "september",
        "october", "november", "december", "january", "february", "march",
      ];
      const mIndex = monthNames.findIndex((m) => m === monthName.toLowerCase());
      if (mIndex === -1) return null;

      const fyStart = new Date(activeFY.start_date);
      const fyEnd = new Date(activeFY.end_date);
      const fyStartMonth = fyStart.getMonth(); // 0-indexed
      // months array above is FY-ordered (Apr..Mar); convert back to calendar month (0-indexed)
      const calendarMonth = (fyStartMonth + mIndex) % 12;
      const year = calendarMonth >= fyStartMonth ? fyStart.getFullYear() : fyEnd.getFullYear();

      const start = new Date(year, calendarMonth, 1);
      const end = new Date(year, calendarMonth + 1, 0);
      const pad = (n: number) => String(n).padStart(2, "0");
      return {
        from: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
        to: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
      };
    },
    [activeFY]
  );

  const loadVouchersForMonth = React.useCallback(
    (monthRow: MonthRow) => {
      if (!companyId || !fyId) return;
      const range = getMonthDateRange(monthRow.month);
      if (!range) return;
      setSelectedMonth(monthRow);
      setLoadingVouchers(true);
      setFocusedVoucherIndex(0);
      (window as any).api.report
        .paymentRegisterVouchers(companyId, fyId, range.from, range.to)
        .then((res: any) => {
          if (res.success) {
            setVoucherRows(res.rows || []);
          } else {
            setError(res.error || "Failed to load Payment vouchers");
          }
        })
        .catch((err: any) => setError(err.message))
        .finally(() => setLoadingVouchers(false));
    },
    [companyId, fyId, getMonthDateRange]
  );

  const goBackToMonths = React.useCallback(() => {
    setSelectedMonth(null);
    setVoucherRows([]);
  }, []);

  // Keyboard nav — month level
  React.useEffect(() => {
    if (selectedMonth || !monthRows.length) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT") return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedMonthIndex((p) => Math.min(monthRows.length - 1, p + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedMonthIndex((p) => Math.max(0, p - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const r = monthRows[focusedMonthIndex];
        if (r) loadVouchersForMonth(r);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedMonth, monthRows, focusedMonthIndex, loadVouchersForMonth]);

  // Keyboard nav — voucher level
  React.useEffect(() => {
    if (!selectedMonth || !voucherRows.length) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT") return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedVoucherIndex((p) => Math.min(voucherRows.length - 1, p + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedVoucherIndex((p) => Math.max(0, p - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const r = voucherRows[focusedVoucherIndex];
        const id = r?.voucher_id || r?.id;
        if (id) navigate(`/transactions/voucher/${id}`);
      } else if (e.key === "Escape" || e.key === "Backspace") {
        e.preventDefault();
        goBackToMonths();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedMonth, voucherRows, focusedVoucherIndex, navigate, goBackToMonths]);

  if (loadingMonths) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400 font-mono text-xs">
        Loading Payment Register...
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

  // ─── Level 2: Voucher list for the selected month ───
  if (selectedMonth) {
    const totalDebit = voucherRows.reduce((s, r) => s + (Number(r.debit) || 0), 0);
    const totalCredit = voucherRows.reduce((s, r) => s + (Number(r.credit) || 0), 0);

    return (
      <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <table className="w-full border-collapse text-[11px] font-mono select-none">
            <thead className="sticky top-0 bg-[#f4f4f5] border-b border-zinc-300 z-10 text-zinc-700">
              <tr>
                <th className="px-4 py-2 text-left font-bold w-24">Date</th>
                <th className="px-4 py-2 text-left font-bold">Particulars</th>
                <th className="px-4 py-2 text-left font-bold w-32">Vch Type</th>
                <th className="px-4 py-2 text-right font-bold w-24">Vch No.</th>
                <th className="px-4 py-2 text-right font-bold w-32">Debit Amount</th>
                <th className="px-4 py-2 text-right font-bold w-32">Credit Amount</th>
              </tr>
              <tr className="bg-[#f4f4f5]">
                <th colSpan={6} className="px-4 py-0.5 text-right font-normal italic text-zinc-500 border-b border-zinc-200">
                  List of All Payment Vouchers — {selectedCompany?.name} — {selectedMonth.month}
                </th>
              </tr>
            </thead>
            <tbody>
              {loadingVouchers ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-400 italic">
                    Loading vouchers...
                  </td>
                </tr>
              ) : voucherRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-400 italic">
                    No records found.
                  </td>
                </tr>
              ) : (
                voucherRows.map((row, idx) => {
                  const isFocused = idx === focusedVoucherIndex;
                  return (
                    <tr
                      key={row.voucher_id || row.id || idx}
                      onClick={() => setFocusedVoucherIndex(idx)}
                      onDoubleClick={() => {
                        const id = row.voucher_id || row.id;
                        if (id) navigate(`/transactions/voucher/${id}`);
                      }}
                      className={`border-b border-zinc-100 cursor-pointer transition-colors ${
                        isFocused ? "bg-[#e4e4e7] text-zinc-950 font-bold" : "hover:bg-zinc-50 text-zinc-800"
                      }`}
                    >
                      <td className="px-4 py-1.5 whitespace-nowrap">{formatDate(row.date)}</td>
                      <td className="px-4 py-1.5 truncate max-w-xs">{row.particulars || "—"}</td>
                      <td className="px-4 py-1.5">{row.voucher_type || "Payment"}</td>
                      <td className="px-4 py-1.5 text-right">{row.voucher_number ?? "—"}</td>
                      <td className="px-4 py-1.5 text-right font-mono">{fmtAmount(Number(row.debit) || 0)}</td>
                      <td className="px-4 py-1.5 text-right font-mono">{fmtAmount(Number(row.credit) || 0)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Grand Total */}
        <div className="border-t-2 border-zinc-300 bg-[#f4f4f5] px-4 py-1.5 flex font-mono text-[11px] font-bold text-zinc-900 select-none shrink-0">
          <span className="flex-1">Total:</span>
          <span className="w-32 text-right pr-2">{fmtAmount(totalDebit)}</span>
          <span className="w-32 text-right pr-2">{fmtAmount(totalCredit)}</span>
        </div>
      </div>
    );
  }

  // ─── Level 1: Monthly summary ───
  const totalVouchersSum = monthRows.reduce((s, r) => s + (Number(r.total_vouchers) || 0), 0);
  const totalCancelledSum = monthRows.reduce((s, r) => s + (Number(r.cancelled) || 0), 0);

  return (
    <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono select-none">
          <thead className="sticky top-0 bg-[#f4f4f5] text-zinc-900 border-b border-zinc-300 z-10">
            <tr className="bg-[#f4f4f5]">
              <th rowSpan={5} className="border-b border-r border-zinc-300 px-3 py-1.5 text-left font-bold w-[50%] align-bottom">
                Particulars
              </th>
              <th colSpan={2} className="px-3 py-0.5 text-right font-normal italic">
                Payment
              </th>
            </tr>
            <tr className="bg-[#f4f4f5]">
              <th colSpan={2} className="px-3 py-0.5 text-right font-bold text-zinc-800">
                {selectedCompany?.name || "—"}
              </th>
            </tr>
            <tr className="bg-[#f4f4f5]">
              <th colSpan={2} className="px-3 py-0.5 text-right font-normal text-zinc-700">
                {periodLabel}
              </th>
            </tr>
            <tr className="bg-[#f4f4f5] border-t border-zinc-200">
              <th colSpan={2} className="px-3 py-1 text-center font-bold border-b border-zinc-200">
                Transactions
              </th>
            </tr>
            <tr className="bg-[#f4f4f5] border-b border-zinc-300">
              <th className="border-r border-zinc-300 px-3 py-1 text-right font-bold w-[25%]">Total Vouchers</th>
              <th className="px-3 py-1 text-right font-bold w-[25%]">(cancelled )</th>
            </tr>
          </thead>
          <tbody>
            {monthRows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-zinc-400 italic">
                  No records found.
                </td>
              </tr>
            ) : (
              monthRows.map((row, idx) => {
                const isFocused = idx === focusedMonthIndex;
                return (
                  <tr
                    key={row.month}
                    onClick={() => setFocusedMonthIndex(idx)}
                    onDoubleClick={() => loadVouchersForMonth(row)}
                    className={`border-b border-zinc-100 hover:bg-zinc-50 transition-colors cursor-pointer ${
                      isFocused ? "bg-[#e4e4e7] text-zinc-950 font-bold" : "text-zinc-800"
                    }`}
                  >
                    <td className="border-r border-zinc-155 px-3 py-1.5 text-left">{row.month}</td>
                    <td className="border-r border-zinc-155 px-3 py-1.5 text-right font-mono">
                      {row.total_vouchers ? row.total_vouchers.toLocaleString("en-IN") : ""}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-zinc-500">
                      {row.cancelled && row.cancelled > 0 ? `(${row.cancelled} )` : ""}
                    </td>
                  </tr>
                );
              })
            )}

            {/* Grand Total Row */}
            <tr className="border-t-2 border-b-2 border-zinc-300 bg-zinc-50 font-bold text-zinc-900">
              <td className="border-r border-zinc-300 px-3 py-2 text-left">Grand Total</td>
              <td className="border-r border-zinc-300 px-3 py-2 text-right font-mono">
                {totalVouchersSum > 0 ? totalVouchersSum : ""}
              </td>
              <td className="px-3 py-2 text-right font-mono text-zinc-500">
                {totalCancelledSum > 0 ? `(${totalCancelledSum} )` : ""}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}