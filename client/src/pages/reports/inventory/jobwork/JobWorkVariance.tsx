import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dmy = (iso?: string) => {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${Number(m[3])}-${MON[Number(m[2]) - 1]}-${m[1].slice(2)}` : iso;
};
const fmtQty = (val: number, unit?: string) => {
  const n = Number(val) || 0;
  if (n === 0) return '';
  const s = n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  return unit ? `${s} ${unit}` : s;
};
const fmtPct = (val: number) => {
  const n = Number(val) || 0;
  if (n === 0) return '';
  return `${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
};

interface Row {
  item_id: number;
  item_name: string;
  unit_name: string;
  ordered_qty: number;
  actual_qty: number;
  variance_qty: number;
  variance_pct: number;
}

interface Props {
  /** "issue" → Issue Variance Analysis; "receipt" → Receipt Variance Analysis. */
  kind: 'issue' | 'receipt';
}

/**
 * Job Work — Variance Analysis (Issue / Receipt). Ordered vs actually
 * issued/received quantity per item, with a Job Work In/Out basis toggle (F8).
 */
export default function JobWorkVariance({ kind }: Props) {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;
  const periodLabel = activeFY ? `${dmy(activeFY.start_date)} to ${dmy(activeFY.end_date)}` : '';

  const title = kind === 'receipt' ? 'Receipt Variance Analysis' : 'Issue Variance Analysis';
  const actualHead = kind === 'receipt' ? 'Received Quantity' : 'Issued Quantity';

  const [direction, setDirection] = React.useState<'in' | 'out'>('in');
  const [rows, setRows] = React.useState<Row[]>([]);
  const [basis, setBasis] = React.useState('Job Work In');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [idx, setIdx] = React.useState(0);

  React.useEffect(() => {
    if (!companyId || !fyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setIdx(0);
    (window as any).api.report
      .jobWorkVariance(companyId, fyId, kind, direction)
      .then((res: any) => {
        if (res.success) {
          setRows(res.items ?? []);
          setBasis(res.basis || (direction === 'out' ? 'Job Work Out' : 'Job Work In'));
        } else setError(res.error || 'Failed to load');
        setLoading(false);
      });
  }, [companyId, fyId, kind, direction]);

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setIdx((p) => Math.min(rows.length - 1, p + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setIdx((p) => Math.max(0, p - 1));
      } else if (e.key === 'F8') {
        e.preventDefault();
        setDirection((p) => (p === 'in' ? 'out' : 'in'));
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        navigate(-1);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [rows.length, navigate]);

  const tOrdered = rows.reduce((s, r) => s + (Number(r.ordered_qty) || 0), 0);
  const tActual = rows.reduce((s, r) => s + (Number(r.actual_qty) || 0), 0);
  const tVar = rows.reduce((s, r) => s + (Number(r.variance_qty) || 0), 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-black font-sans text-[11px]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-gray-200">
        <span className="font-bold text-sm tracking-wide">{title}</span>
        <span className="font-bold text-sm">{selectedCompany?.name || 'Company'}</span>
        <span />
      </div>
      <div className="flex justify-between items-center px-3 py-1.5 bg-white border-b border-gray-200 font-mono">
        <span className="font-semibold">
          {title}: {basis}
        </span>
        <span>{periodLabel}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono select-none">
          <thead className="sticky top-0 bg-white border-b border-gray-200 z-10 text-black">
            <tr>
              <th className="px-3 py-1 text-left font-bold">Particulars</th>
              <th className="px-3 py-1 text-right font-bold w-36 border-l border-gray-200">
                Ordered Quantity
              </th>
              <th className="px-3 py-1 text-right font-bold w-36 border-l border-gray-200">
                {actualHead}
              </th>
              <th className="px-3 py-1 text-right font-bold w-36 border-l border-gray-200">
                Variance Quantity
              </th>
              <th className="px-3 py-1 text-right font-bold w-28 border-l border-gray-200">
                Variance %
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-black italic">
                  Loading...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-black">
                  {error}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-black italic">
                  No records found.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => {
                const focused = i === idx;
                return (
                  <tr
                    key={r.item_id}
                    onClick={() => setIdx(i)}
                    className={`border-b border-gray-200 cursor-pointer ${focused ? 'bg-black/[0.06] text-black font-bold' : 'hover:bg-black/[0.03] text-black'}`}
                  >
                    <td className="px-3 py-1">{r.item_name}</td>
                    <td className="px-3 py-1 text-right border-l border-gray-200">
                      {fmtQty(r.ordered_qty, r.unit_name)}
                    </td>
                    <td className="px-3 py-1 text-right border-l border-gray-200">
                      {fmtQty(r.actual_qty, r.unit_name)}
                    </td>
                    <td className="px-3 py-1 text-right border-l border-gray-200">
                      {fmtQty(r.variance_qty, r.unit_name)}
                    </td>
                    <td className="px-3 py-1 text-right border-l border-gray-200">
                      {fmtPct(r.variance_pct)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t-2 border-black bg-white px-3 py-1.5 flex font-mono text-[11px] font-bold text-black shrink-0">
        <span className="flex-1">Grand Total</span>
        <span className="w-36 text-right border-l border-gray-200 pr-2">{fmtQty(tOrdered)}</span>
        <span className="w-36 text-right border-l border-gray-200 pr-2">{fmtQty(tActual)}</span>
        <span className="w-36 text-right border-l border-gray-200 pr-2">{fmtQty(tVar)}</span>
        <span className="w-28 border-l border-gray-200" />
      </div>

      <div className="flex items-center gap-4 px-3 py-1 border-t border-gray-200 bg-white text-[10px] font-semibold text-black shrink-0">
        <button
          onClick={() => setDirection((p) => (p === 'in' ? 'out' : 'in'))}
          className="hover:underline hover:text-black"
        >
          F8: {direction === 'in' ? 'Job Work Out' : 'Job Work In'}
        </button>
      </div>
    </div>
  );
}
