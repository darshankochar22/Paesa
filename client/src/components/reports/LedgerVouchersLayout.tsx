import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";

interface LedgerRow {
  voucher_id: number;
  date: string;
  particulars: string;
  voucher_type: string;
  voucher_number: string;
  debit: number;
  credit: number;
  balance: number;
  narration: string;
}

interface LedgerResponse {
  success: boolean;
  ledger_name: string;
  opening_balance: number;
  rows: LedgerRow[];
  closing_balance: number;
  error?: string;
}

interface LedgerVouchersLayoutProps {
  fromDate: string;
  toDate: string;
}

const fmt = (val: number) =>
  val === 0
    ? ""
    : new Intl.NumberFormat("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(val);

const fmtTotal = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);

const formatBalance = (val: number) => {
  if (val === 0) return "0.00";
  const abs = Math.abs(val);
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);
  return val > 0 ? `${formatted} Dr` : `${formatted} Cr`;
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

export default function LedgerVouchersLayout({ fromDate, toDate }: LedgerVouchersLayoutProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selectedCompany, activeFY } = useCompany();

  const ledgerIdParam = searchParams.get("ledger_id");
  const ledgerId = ledgerIdParam ? Number(ledgerIdParam) : 1;

  const [data, setData] = React.useState<LedgerResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = React.useState<number>(0);

const companyId = selectedCompany?.company_id;
const fyId = activeFY?.fy_id;

const fetchLedgerReport = React.useCallback(async () => {
  if (!companyId || !fyId) return;
  setLoading(true);
  setError(null);
  try {
    const res = await (window as any).api.report.ledgerReport(
      companyId, fyId, ledgerId, fromDate, toDate
    );
    if (res.success) { setData(res); setFocusedIndex(0); }
    else setError(res.error || "Failed to load ledger vouchers");
  } catch (err: any) {
    setError(err.message || "An error occurred");
  } finally { setLoading(false); }
}, [ledgerId, fromDate, toDate, companyId, fyId]);

  React.useEffect(() => {
    fetchLedgerReport();
  }, [fetchLedgerReport]);

  const handleRowClick = React.useCallback(
    (row: LedgerRow) => {
      const vId = row.voucher_id || (row as any).id;
      if (vId) {
        navigate(`/transactions/voucher/${vId}`);
      }
    },
    [navigate]
  );

  React.useEffect(() => {
    if (!data?.rows.length) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "SELECT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(data.rows.length - 1, prev + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const activeRow = data.rows[focusedIndex];
        if (activeRow) {
          handleRowClick(activeRow);
        }
      } else if (e.key === "Backspace" || e.key === "Escape") {
        e.preventDefault();
        navigate(-1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [data, focusedIndex, handleRowClick, navigate]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400 font-mono text-xs">
        Loading Ledger Vouchers...
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

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400 font-mono text-xs">
        No data available.
      </div>
    );
  }

  // Calculate transaction totals
  const totalDebit = data.rows.reduce((sum, r) => sum + r.debit, 0);
  const totalCredit = data.rows.reduce((sum, r) => sum + r.credit, 0);
  const periodLabel = `Period: ${fromDate} to ${toDate}`;

  return (
    <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono select-none">
          <thead className="sticky top-0 bg-[#f4f4f5] border-b border-zinc-300 z-10 text-zinc-700">
            <tr>
              <th className="px-4 py-2 text-left font-bold" rowSpan={3}>
                Date
              </th>
              <th className="px-4 py-2 text-left font-bold" rowSpan={3}>
                Particulars
              </th>
              <th className="px-4 py-0.5 text-center font-bold border-b border-zinc-200" colSpan={5}>
                {data.ledger_name} / {selectedCompany?.name || "No Company"}
              </th>
            </tr>
            <tr>
              <th className="px-4 py-0.5 text-center font-normal italic text-zinc-500" colSpan={5}>
                {periodLabel}
              </th>
            </tr>
            <tr>
              <th className="px-4 py-1.5 text-left font-bold w-24">Vch Type</th>
              <th className="px-4 py-1.5 text-right font-bold w-20">Vch No.</th>
              <th className="px-4 py-1.5 text-right font-bold w-28">Debit</th>
              <th className="px-4 py-1.5 text-right font-bold w-28">Credit</th>
              <th className="px-4 py-1.5 text-right font-bold w-32">Balance</th>
            </tr>
          </thead>
          <tbody>
            {/* Opening Balance Row */}
            <tr className="border-b border-zinc-100 font-semibold text-zinc-600">
              <td className="px-4 py-1.5 text-left" />
              <td className="px-4 py-1.5 text-left italic">Opening Balance</td>
              <td className="px-4 py-1.5 text-left" />
              <td className="px-4 py-1.5 text-right" />
              <td className="px-4 py-1.5 text-right" />
              <td className="px-4 py-1.5 text-right" />
              <td className="px-4 py-1.5 text-right whitespace-nowrap font-mono">
                {formatBalance(data.opening_balance)}
              </td>
            </tr>

            {/* Voucher Transaction Rows */}
            {data.rows.length === 0 ? (
              <tr className="border-b border-zinc-100 text-zinc-400 italic">
                <td className="px-4 py-1.5 text-center" colSpan={7}>
                  No vouchers found for this period.
                </td>
              </tr>
            ) : (
              data.rows.map((row, idx) => {
                const isFocused = idx === focusedIndex;
                return (
                  <tr
                    key={idx}
                    className={`border-b border-zinc-100 cursor-pointer transition-colors ${
                      isFocused
                        ? "bg-[#e4e4e7] text-zinc-950 font-bold"
                        : "hover:bg-zinc-50 text-zinc-800"
                    }`}
                    onClick={() => {
                      setFocusedIndex(idx);
                      handleRowClick(row);
                    }}
                  >
                    <td className="px-4 py-1.5 text-left whitespace-nowrap">
                      {formatDate(row.date)}
                    </td>
                    <td className="px-4 py-1.5 text-left truncate max-w-xs" title={row.particulars}>
                      {row.particulars || "—"}
                    </td>
                    <td className="px-4 py-1.5 text-left">{row.voucher_type}</td>
                    <td className="px-4 py-1.5 text-right">{row.voucher_number || "—"}</td>
                    <td className="px-4 py-1.5 text-right font-mono">
                      {row.debit !== 0 ? fmt(row.debit) : ""}
                    </td>
                    <td className="px-4 py-1.5 text-right font-mono">
                      {row.credit !== 0 ? fmt(row.credit) : ""}
                    </td>
                    <td className="px-4 py-1.5 text-right whitespace-nowrap font-mono">
                      {formatBalance(row.balance)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Grand Total Bar */}
      <div className="border-t border-zinc-300 bg-[#f4f4f5] px-4 py-1.5 flex justify-between font-mono text-[11px] font-bold text-zinc-900 select-none shrink-0">
        <span className="w-24">Grand Total</span>
        <div className="flex-1 flex justify-end gap-0">
          <span className="w-24 text-right" /> {/* Vch Type spacer */}
          <span className="w-20 text-right" /> {/* Vch No spacer */}
          <span className="w-28 text-right pr-2">
            {totalDebit !== 0 ? fmtTotal(totalDebit) : ""}
          </span>
          <span className="w-28 text-right pr-2">
            {totalCredit !== 0 ? fmtTotal(totalCredit) : ""}
          </span>
          <span className="w-32 text-right whitespace-nowrap">
            {formatBalance(data.closing_balance)}
          </span>
        </div>
      </div>
    </div>
  );
}
