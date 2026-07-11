import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';

const fmtAmt = (val: number | null | undefined) => {
  const n = Number(val) || 0;
  if (n === 0) return '';
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

interface MarkedRow {
  voucher_id: number;
  date: string;
  particulars?: string | null;
  voucher_type: string;
  voucher_number: string | number;
  is_optional?: boolean;
  debit?: number;
  credit?: number;
}

export default function MarkedVouchers() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;
  const periodLabel = activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : '';

  const [rows, setRows] = React.useState<MarkedRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [focusIndex, setFocusIndex] = React.useState(0);

  React.useEffect(() => {
    if (!companyId || !fyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    (window as any).api.report
      .run('marked_voucher_register', {
        company_id: companyId,
        fy_id: fyId,
        from_date: activeFY?.start_date,
        to_date: activeFY?.end_date,
      })
      .then((res: any) => {
        if (res?.success) setRows(res.rows ?? []);
        else setError(res?.error || 'Failed to load marked vouchers');
        setLoading(false);
      })
      .catch((e: any) => {
        setError(e?.message || 'Failed to load marked vouchers');
        setLoading(false);
      });
  }, [companyId, fyId, activeFY?.start_date, activeFY?.end_date]);

  const drill = React.useCallback(
    (row?: MarkedRow) => {
      if (row?.voucher_id) navigate(`/transactions/voucher/${row.voucher_id}`);
    },
    [navigate],
  );

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusIndex((p) => Math.min(rows.length - 1, p + 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusIndex((p) => Math.max(0, p - 1));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        drill(rows[focusIndex]);
        return;
      }
      if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        navigate(-1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [rows, focusIndex, drill, navigate]);

  const totalDebit = rows.reduce((s, r) => s + (Number(r.debit) || 0), 0);
  const totalCredit = rows.reduce((s, r) => s + (Number(r.credit) || 0), 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-900 font-sans text-[11px]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-zinc-900">
        <span className="font-bold text-sm tracking-wide">Marked Vouchers Register</span>
        <span className="font-bold text-sm">{selectedCompany?.name || 'Company'}</span>
        <span />
      </div>
      <div className="flex justify-between items-center px-3 py-1.5 bg-white border-b border-zinc-300 font-mono">
        <span>Marked Vouchers Register</span>
        <span>{periodLabel}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono select-none">
          <thead className="sticky top-0 bg-[#f4f4f5] border-b border-zinc-300 z-10 text-zinc-700">
            <tr>
              <th className="px-3 py-1 text-left font-bold w-24">Date</th>
              <th className="px-3 py-1 text-left font-bold">Particulars</th>
              <th className="px-3 py-1 text-left font-bold w-32">Vch Type</th>
              <th className="px-3 py-1 text-right font-bold w-20">Vch No.</th>
              <th className="px-3 py-1 text-right font-bold w-32 border-l border-zinc-200">
                Debit Amount
                <br />
                <span className="font-normal text-zinc-500">Inwards Qty</span>
              </th>
              <th className="px-3 py-1 text-right font-bold w-32 border-l border-zinc-200">
                Credit Amount
                <br />
                <span className="font-normal text-zinc-500">Outwards Qty</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-400 italic">
                  Loading...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-600">
                  {error}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-400 italic">
                  No marked vouchers found.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                const isFocused = idx === focusIndex;
                return (
                  <tr
                    key={row.voucher_id}
                    onClick={() => setFocusIndex(idx)}
                    onDoubleClick={() => drill(row)}
                    className={`border-b border-zinc-100 cursor-pointer ${isFocused ? 'bg-[#e4e4e7] text-zinc-950 font-bold' : 'hover:bg-zinc-50 text-zinc-800'} ${row.is_optional ? 'italic' : ''}`}
                  >
                    <td className="px-3 py-1 whitespace-nowrap">{formatDate(row.date)}</td>
                    <td className="px-3 py-1 truncate max-w-xs">
                      {row.particulars || '—'}
                      {row.is_optional ? (
                        <span className="ml-1 text-zinc-500">(Optional)</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-1">{row.voucher_type}</td>
                    <td className="px-3 py-1 text-right">{row.voucher_number || ''}</td>
                    <td className="px-3 py-1 text-right border-l border-zinc-100">
                      {fmtAmt(row.debit)}
                    </td>
                    <td className="px-3 py-1 text-right border-l border-zinc-100">
                      {fmtAmt(row.credit)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t-2 border-zinc-300 bg-[#f4f4f5] px-3 py-1.5 flex font-mono text-[11px] font-bold text-zinc-900 shrink-0">
        <span className="w-24" />
        <span className="flex-1">Grand Total</span>
        <span className="w-32" />
        <span className="w-20" />
        <span className="w-32 text-right pr-2 border-l border-zinc-300">{fmtAmt(totalDebit)}</span>
        <span className="w-32 text-right pr-2 border-l border-zinc-300">{fmtAmt(totalCredit)}</span>
      </div>
    </div>
  );
}
