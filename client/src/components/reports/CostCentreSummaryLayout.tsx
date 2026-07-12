import * as React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';

const fmt = (v: number) =>
  v === 0
    ? ''
    : new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
        Math.abs(v),
      );
const fmtTotal = (v: number) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Math.abs(v),
  );

export default function CostCentreSummaryLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedCompany, activeFY } = useCompany();

  const [rawRows, setRawRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = React.useState(0);

  const categoryFilter = React.useMemo(() => {
    const p = new URLSearchParams(location.search);
    return p.get('category_name') || null;
  }, [location.search]);

  const asOnDate = activeFY?.end_date ?? null;

  React.useEffect(() => {
    if (!selectedCompany?.company_id || !activeFY?.fy_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    (window as any).api.report
      .costCentreReport(selectedCompany.company_id, activeFY.fy_id, asOnDate)
      .then((res: any) => {
        if (res?.success) {
          setRawRows(res.rows || []);
        } else {
          setError(res?.error || 'Failed to load.');
        }
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedCompany?.company_id, activeFY?.fy_id, asOnDate]);

  const filteredRows = React.useMemo(() => {
    if (!categoryFilter) return rawRows;
    return rawRows.filter((r) => (r.category ?? 'General') === categoryFilter);
  }, [rawRows, categoryFilter]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((p) => Math.min(filteredRows.length - 1, p + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((p) => Math.max(0, p - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const r = filteredRows[focusedIndex];
        if (r) {
          navigate(
            `/reports/accounts/cost-centre-break-up?cost_centre_id=${r.cc_id}&cost_centre_name=${encodeURIComponent(r.cost_centre)}`,
          );
        }
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        navigate(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filteredRows, focusedIndex, navigate]);

  if (loading)
    return (
      <div className="flex-1 flex items-center justify-center text-black font-mono text-xs">
        Loading Cost Centre Summary...
      </div>
    );
  if (error)
    return (
      <div className="flex-1 flex items-center justify-center text-black font-mono text-xs">
        {error}
      </div>
    );

  const totalExpense = filteredRows.reduce((s, r) => s + (Number(r.expense) || 0), 0);
  const totalIncome = filteredRows.reduce((s, r) => s + (Number(r.income) || 0), 0);
  const totalVariance = totalIncome - totalExpense;

  return (
    <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-3 py-1 text-[10px] font-mono text-black flex gap-6 select-none">
        <span className="font-bold">
          Cost Centre Summary{categoryFilter ? `: ${categoryFilter}` : ''}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono">
          <thead className="sticky top-0 bg-white border-b border-gray-200 z-10 text-black select-none">
            <tr>
              <th className="px-4 py-2 text-left font-bold">Cost Centre</th>
              <th className="w-40 text-right px-4 py-2 font-bold border-l border-gray-200">
                Expense/Debit
              </th>
              <th className="w-40 text-right px-4 py-2 font-bold border-l border-gray-200">
                Income/Credit
              </th>
              <th className="w-40 text-right px-4 py-2 font-bold border-l border-gray-200">
                Variance
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-black italic">
                  No cost centres found.
                </td>
              </tr>
            ) : (
              filteredRows.map((row, idx) => {
                const isFocused = focusedIndex === idx;
                return (
                  <tr
                    key={row.cc_id}
                    className={`border-b border-gray-200 cursor-pointer select-none transition-colors ${
                      isFocused
                        ? 'bg-black/[0.06] text-black font-bold'
                        : 'hover:bg-black/[0.03] text-black font-semibold'
                    }`}
                    onClick={() => setFocusedIndex(idx)}
                    onDoubleClick={() =>
                      navigate(
                        `/reports/accounts/cost-centre-break-up?cost_centre_id=${row.cc_id}&cost_centre_name=${encodeURIComponent(row.cost_centre)}`,
                      )
                    }
                  >
                    <td className="px-4 py-1.5 text-left">{row.cost_centre}</td>
                    <td className="w-40 text-right px-4 py-1.5 border-l border-gray-200">
                      {fmt(row.expense)}
                    </td>
                    <td className="w-40 text-right px-4 py-1.5 border-l border-gray-200">
                      {fmt(row.income)}
                    </td>
                    <td
                      className={`w-40 text-right px-4 py-1.5 border-l border-gray-200 ${row.variance < 0 ? 'text-black' : ''}`}
                    >
                      {fmt(row.variance)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {filteredRows.length > 0 && (
            <tfoot className="sticky bottom-0 bg-white border-t border-gray-200 z-10 font-bold text-black">
              <tr>
                <td className="px-4 py-2 text-left">Grand Total</td>
                <td className="w-40 text-right px-4 py-2 border-l border-gray-200">
                  {fmtTotal(totalExpense)}
                </td>
                <td className="w-40 text-right px-4 py-2 border-l border-gray-200">
                  {fmtTotal(totalIncome)}
                </td>
                <td
                  className={`w-40 text-right px-4 py-2 border-l border-gray-200 ${totalVariance < 0 ? 'text-black' : ''}`}
                >
                  {fmtTotal(totalVariance)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
