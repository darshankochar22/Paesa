import * as React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';

const fmtDate = (d: string) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return `${dt.getDate()}-${dt.toLocaleString('en-IN', { month: 'short' })}-${String(dt.getFullYear()).slice(-2)}`;
};

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

interface CostCentreMeta {
  cc_id: number;
  name: string;
}

export default function CostCentreLedgerLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedCompany, activeFY } = useCompany();

  const [costCentreId, setCostCentreId] = React.useState<number | null>(() => {
    const p = new URLSearchParams(location.search);
    const id = p.get('cost_centre_id');
    return id ? Number(id) : ((location.state as any)?.cost_centre_id ?? null);
  });
  const [costCentreName, setCostCentreName] = React.useState<string>(() => {
    const p = new URLSearchParams(location.search);
    return p.get('cost_centre_name') || (location.state as any)?.cost_centre_name || '';
  });

  const ledgerFilter = React.useMemo(() => {
    const p = new URLSearchParams(location.search);
    return p.get('ledger_name') || null;
  }, [location.search]);

  /* Picker state */
  const [costCentres, setCostCentres] = React.useState<CostCentreMeta[]>([]);
  const [search, setSearch] = React.useState('');
  const [pickerFocus, setPickerFocus] = React.useState(0);

  /* Data state */
  const [rawRows, setRawRows] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = React.useState(0);

  const cid = selectedCompany?.company_id;
  const fyid = activeFY?.fy_id;

  /* Load cost centre list for picker */
  React.useEffect(() => {
    if (!cid || costCentreId) return;
    (window as any).api.costCentre.getAll(cid).then((res: any) => {
      const list = (res && Array.isArray(res.costCentres) ? res.costCentres : [])
        .map((c: any) => ({ cc_id: c.cc_id, name: c.name }))
        .sort((a: CostCentreMeta, b: CostCentreMeta) => a.name.localeCompare(b.name));
      setCostCentres(list);
    });
  }, [cid, costCentreId]);

  /* Load cost centre detail/ledger entries */
  React.useEffect(() => {
    if (!costCentreId || !cid || !fyid) return;
    setLoading(true);
    setError(null);
    (window as any).api.report
      .run('cost_centre_ledger', { company_id: cid, fy_id: fyid, cost_centre_id: costCentreId })
      .then((res: any) => {
        if (res?.success) {
          setRawRows(res.rows || []);
        } else {
          setError(res?.error || 'Failed to load ledger.');
        }
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [costCentreId, cid, fyid]);

  /* Filter entries by ledger_name if filtered */
  const filteredRows = React.useMemo(() => {
    if (!ledgerFilter) return rawRows;
    let runningBal = 0;
    return rawRows
      .filter((r) => r.ledger_name === ledgerFilter)
      .map((r) => {
        const dr = Number(r.debit) || 0;
        const cr = Number(r.credit) || 0;
        runningBal += dr - cr;
        return { ...r, balance: runningBal };
      });
  }, [rawRows, ledgerFilter]);

  const filteredCentres = costCentres.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  /* Keyboard for picker */
  React.useEffect(() => {
    if (costCentreId) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') {
        if (e.key === 'Escape') navigate(-1);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setPickerFocus((p) => Math.min(filteredCentres.length - 1, p + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setPickerFocus((p) => Math.max(0, p - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const c = filteredCentres[pickerFocus];
        if (c) {
          setCostCentreId(c.cc_id);
          setCostCentreName(c.name);
        }
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        navigate(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [costCentreId, filteredCentres, pickerFocus, navigate]);

  /* Keyboard for table */
  React.useEffect(() => {
    if (!costCentreId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((p) => Math.min(filteredRows.length - 1, p + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((p) => Math.max(0, p - 1));
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        setCostCentreId(null);
        setCostCentreName('');
        setRawRows([]);
        setFocusedIndex(0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [costCentreId, filteredRows, focusedIndex, navigate]);

  if (!costCentreId) {
    return (
      <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-3 py-1 text-[10px] font-mono text-black flex gap-6 select-none">
          <span className="font-bold">Cost Centre Ledger</span>
          <span className="ml-auto">Select a cost centre to view details</span>
        </div>
        <div className="px-3 py-1.5 border-b border-gray-200 bg-white">
          <input
            autoFocus
            type="text"
            placeholder="Type to search cost centre..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPickerFocus(0);
            }}
            className="w-full text-[11px] font-mono border border-gray-200 px-2 py-1 rounded outline-none focus:border-gray-200 bg-white"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredCentres.map((c, idx) => (
            <div
              key={c.cc_id}
              className={`px-4 py-2 text-[11px] cursor-pointer select-none border-b border-gray-200 ${
                pickerFocus === idx
                  ? 'bg-black/[0.06] text-black font-bold'
                  : 'hover:bg-black/[0.03] text-black'
              }`}
              onClick={() => {
                setCostCentreId(c.cc_id);
                setCostCentreName(c.name);
              }}
            >
              {c.name}
            </div>
          ))}
          {filteredCentres.length === 0 && (
            <div className="text-center py-8 text-black italic text-[11px]">
              No cost centres found.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading)
    return (
      <div className="flex-1 flex items-center justify-center text-black font-mono text-xs">
        Loading Ledger...
      </div>
    );
  if (error)
    return (
      <div className="flex-1 flex items-center justify-center text-black font-mono text-xs">
        {error}
      </div>
    );

  const totalDebit = filteredRows.reduce((s, r) => s + (Number(r.debit) || 0), 0);
  const totalCredit = filteredRows.reduce((s, r) => s + (Number(r.credit) || 0), 0);
  const closingBalance = totalDebit - totalCredit;

  return (
    <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-3 py-1 text-[10px] font-mono text-black flex gap-6 select-none">
        <span className="font-bold">
          Cost Centre Ledger: {costCentreName}
          {ledgerFilter ? ` (${ledgerFilter})` : ''}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono">
          <thead className="sticky top-0 bg-white border-b border-gray-200 z-10 text-black select-none">
            <tr>
              <th className="px-4 py-2 text-left font-bold w-24">Date</th>
              <th className="px-4 py-2 text-left font-bold">Particulars</th>
              <th className="px-4 py-2 text-left font-bold w-28">Vch Type</th>
              <th className="px-4 py-2 text-left font-bold w-24">Vch No.</th>
              <th className="w-32 text-right px-4 py-2 font-bold border-l border-gray-200">
                Debit
              </th>
              <th className="w-32 text-right px-4 py-2 font-bold border-l border-gray-200">
                Credit
              </th>
              <th className="w-32 text-right px-4 py-2 font-bold border-l border-gray-200">
                Balance
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-black italic">
                  No transactions found for the selected period.
                </td>
              </tr>
            ) : (
              filteredRows.map((row, idx) => {
                const isFocused = focusedIndex === idx;
                return (
                  <tr
                    key={idx}
                    className={`border-b border-gray-200 cursor-pointer select-none transition-colors ${
                      isFocused
                        ? 'bg-black/[0.06] text-black font-bold'
                        : 'hover:bg-black/[0.03] text-black font-semibold'
                    }`}
                    onClick={() => setFocusedIndex(idx)}
                  >
                    <td className="px-4 py-1.5 text-left">{fmtDate(row.date)}</td>
                    <td className="px-4 py-1.5 text-left">{row.ledger_name}</td>
                    <td className="px-4 py-1.5 text-left">{row.voucher_type}</td>
                    <td className="px-4 py-1.5 text-left">{row.voucher_number}</td>
                    <td className="w-32 text-right px-4 py-1.5 border-l border-gray-200">
                      {fmt(row.debit)}
                    </td>
                    <td className="w-32 text-right px-4 py-1.5 border-l border-gray-200">
                      {fmt(row.credit)}
                    </td>
                    <td className="w-32 text-right px-4 py-1.5 border-l border-gray-200">
                      {fmt(row.balance)} {row.balance >= 0 ? 'Dr' : 'Cr'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {filteredRows.length > 0 && (
            <tfoot className="sticky bottom-0 bg-white border-t border-gray-200 z-10 font-bold text-black">
              <tr>
                <td colSpan={4} className="px-4 py-2 text-left">
                  Grand Total
                </td>
                <td className="w-32 text-right px-4 py-2 border-l border-gray-200">
                  {fmtTotal(totalDebit)}
                </td>
                <td className="w-32 text-right px-4 py-2 border-l border-gray-200">
                  {fmtTotal(totalCredit)}
                </td>
                <td className="w-32 text-right px-4 py-2 border-l border-gray-200">
                  {fmtTotal(closingBalance)} {closingBalance >= 0 ? 'Dr' : 'Cr'}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
