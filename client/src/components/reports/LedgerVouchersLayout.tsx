import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';

interface LedgerDetail {
  ledger_name: string;
  amount: number;
  type: 'Dr' | 'Cr';
}

interface LedgerRow {
  voucher_id: number;
  date: string;
  particulars: string;
  details?: LedgerDetail[] | null;
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
    ? ''
    : new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(val);

const fmtTotal = (val: number) =>
  new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);

const formatBalance = (val: number) => {
  if (val === 0) return '0.00';
  const abs = Math.abs(val);
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);
  return val > 0 ? `${formatted} Dr` : `${formatted} Cr`;
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export default function LedgerVouchersLayout({ fromDate, toDate }: LedgerVouchersLayoutProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selectedCompany, activeFY } = useCompany();

  const ledgerIdParam = searchParams.get('ledger_id');
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
        companyId,
        fyId,
        ledgerId,
        fromDate,
        toDate,
      );
      if (res.success) {
        setData(res);
        setFocusedIndex(0);
      } else setError(res.error || 'Failed to load ledger vouchers');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
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
    [navigate],
  );

  React.useEffect(() => {
    if (!data?.rows.length) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'SELECT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(data.rows.length - 1, prev + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const activeRow = data.rows[focusedIndex];
        if (activeRow) {
          handleRowClick(activeRow);
        }
      } else if (e.key === 'Backspace' || e.key === 'Escape') {
        e.preventDefault();
        navigate(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [data, focusedIndex, handleRowClick, navigate]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-black font-mono text-xs">
        Loading Ledger Vouchers...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-black font-mono text-xs px-8 text-center">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center text-black font-mono text-xs">
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
          <thead className="sticky top-0 bg-white border-b border-gray-200 z-10 text-black">
            <tr>
              <th className="px-4 py-2 text-left font-bold" rowSpan={3}>
                Date
              </th>
              <th className="px-4 py-2 text-left font-bold" rowSpan={3}>
                Particulars
              </th>
              <th
                className="px-4 py-0.5 text-center font-bold border-b border-gray-200"
                colSpan={5}
              >
                {data.ledger_name} / {selectedCompany?.name || 'No Company'}
              </th>
            </tr>
            <tr>
              <th className="px-4 py-0.5 text-center font-normal italic text-black" colSpan={5}>
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
            <tr className="border-b border-gray-200 font-semibold text-black">
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
              <tr className="border-b border-gray-200 text-black italic">
                <td className="px-4 py-1.5 text-center" colSpan={7}>
                  No vouchers found for this period.
                </td>
              </tr>
            ) : (
              data.rows.map((row, idx) => {
                const isFocused = idx === focusedIndex;
                const hasDetails = !!row.details && row.details.length > 0;
                return (
                  <React.Fragment key={idx}>
                    <tr
                      className={`border-b border-gray-200 cursor-pointer transition-colors ${
                        isFocused
                          ? 'bg-black/[0.06] text-black font-bold'
                          : 'hover:bg-black/[0.03] text-black'
                      }`}
                      onClick={() => {
                        setFocusedIndex(idx);
                        handleRowClick(row);
                      }}
                    >
                      <td className="px-4 py-1.5 text-left whitespace-nowrap align-top">
                        {formatDate(row.date)}
                      </td>
                      <td
                        className={`px-4 py-1.5 text-left align-top ${hasDetails ? 'italic' : 'truncate max-w-xs'}`}
                        title={row.particulars}
                      >
                        {row.particulars || '—'}
                      </td>
                      <td className="px-4 py-1.5 text-left align-top">{row.voucher_type}</td>
                      <td className="px-4 py-1.5 text-right align-top">
                        {row.voucher_number || '—'}
                      </td>
                      <td className="px-4 py-1.5 text-right font-mono align-top">
                        {row.debit !== 0 ? fmt(row.debit) : ''}
                      </td>
                      <td className="px-4 py-1.5 text-right font-mono align-top">
                        {row.credit !== 0 ? fmt(row.credit) : ''}
                      </td>
                      <td className="px-4 py-1.5 text-right whitespace-nowrap font-mono align-top">
                        {formatBalance(row.balance)}
                      </td>
                    </tr>
                    {hasDetails &&
                      row.details!.map((d, dIdx) => (
                        <tr
                          key={`${idx}-d-${dIdx}`}
                          className={`cursor-pointer transition-colors ${
                            isFocused
                              ? 'bg-black/[0.06] text-black'
                              : 'hover:bg-black/[0.03] text-black'
                          }`}
                          onClick={() => {
                            setFocusedIndex(idx);
                            handleRowClick(row);
                          }}
                        >
                          <td />
                          <td className="px-4 py-0.5 text-left">
                            <div className="flex justify-between gap-4">
                              <span className="pl-6">{d.ledger_name}</span>
                              <span className="font-mono whitespace-nowrap pr-2">
                                {fmtTotal(d.amount)} {d.type}
                              </span>
                            </div>
                          </td>
                          <td />
                          <td />
                          <td />
                          <td />
                          <td />
                        </tr>
                      ))}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Grand Total Bar */}
      <div className="border-t border-gray-200 bg-white px-4 py-1.5 flex justify-between font-mono text-[11px] font-bold text-black select-none shrink-0">
        <span className="w-24">Grand Total</span>
        <div className="flex-1 flex justify-end gap-0">
          <span className="w-24 text-right" /> {/* Vch Type spacer */}
          <span className="w-20 text-right" /> {/* Vch No spacer */}
          <span className="w-28 text-right pr-2">
            {totalDebit !== 0 ? fmtTotal(totalDebit) : ''}
          </span>
          <span className="w-28 text-right pr-2">
            {totalCredit !== 0 ? fmtTotal(totalCredit) : ''}
          </span>
          <span className="w-32 text-right whitespace-nowrap">
            {formatBalance(data.closing_balance)}
          </span>
        </div>
      </div>
    </div>
  );
}
