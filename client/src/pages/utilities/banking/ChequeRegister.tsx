import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import ReportHeader from '@/components/ui/ReportHeader';
import RightActionPanel, { type RightPanelAction } from '@/components/ui/RightActionPanel';
import { PRIORITY, useShortcuts } from '@/lib/shortcuts';
import type {
  ChequeRegisterCounts,
  ChequeRegisterCountRow,
  ChequeRegisterRangeRow,
} from '@/types/api/Transactions';

type InstrumentRow = {
  bank_detail_id: number;
  voucher_id: number;
  cheque_no: string;
  status: string;
  date: string;
  particulars: string;
  vch_type: string;
  vch_no: string;
  instrument_date: string;
  amount: number;
};

const inr = (n: number) =>
  n ? n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
const num = (n: number) => (n ? String(n) : '');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (iso: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${Number(d)}-${MONTHS[Number(m) - 1] ?? m}-${y.slice(2)}`;
};

const EMPTY_COUNTS: ChequeRegisterCounts = {
  unreconciled: 0,
  reconciled: 0,
  cancelled: 0,
  out_of_period: 0,
  blank: 0,
  available: 0,
  total: 0,
};

type View = 'bankwise' | 'ranges' | 'instruments';

// TallyPrime Banking → Cheque Register.
// Level 1 Bank wise Register → Level 2 Cheque Range Register → Level 3 Instrument Wise → Voucher Alteration.
export default function ChequeRegister() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;
  const from = activeFY?.start_date;
  const to = activeFY?.end_date;

  const [view, setView] = useState<View>('bankwise');
  const [cursor, setCursor] = useState(0);

  const [bankRows, setBankRows] = useState<ChequeRegisterCountRow[]>([]);
  const [bankGrand, setBankGrand] = useState<ChequeRegisterCounts>(EMPTY_COUNTS);

  const [ledger, setLedger] = useState<{ id: number; name: string } | null>(null);
  const [rangeRows, setRangeRows] = useState<ChequeRegisterRangeRow[]>([]);
  const [rangeGrand, setRangeGrand] = useState<ChequeRegisterCounts>(EMPTY_COUNTS);

  const [range, setRange] = useState<string>('');
  const [instRows, setInstRows] = useState<InstrumentRow[]>([]);
  const [instGrand, setInstGrand] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Level 1 — Bank wise Register.
  const loadBankWise = useCallback(async () => {
    if (!companyId || !fyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await window.api.banking.getChequeRegisterBankWise(companyId, fyId, from, to);
      if (res.success) {
        setBankRows(res.rows);
        setBankGrand(res.grand_total);
      } else setError(res.error || 'Failed to load cheque register');
    } catch (e: any) {
      setError(e?.message || 'Failed to load cheque register');
    } finally {
      setLoading(false);
    }
  }, [companyId, fyId, from, to]);

  useEffect(() => {
    loadBankWise();
  }, [loadBankWise]);

  // Level 2 — Cheque Range Register for a bank.
  const openBank = useCallback(
    async (row: ChequeRegisterCountRow) => {
      if (!companyId || !fyId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await window.api.banking.getChequeRegisterRanges(
          companyId,
          fyId,
          row.ledger_id,
          from,
          to,
        );
        if (res.success) {
          setRangeRows(res.rows);
          setRangeGrand(res.grand_total);
          setLedger({ id: row.ledger_id, name: res.ledger_name || row.particulars });
          setView('ranges');
          setCursor(0);
        } else setError(res.error || 'Failed to load cheque ranges');
      } catch (e: any) {
        setError(e?.message || 'Failed to load cheque ranges');
      } finally {
        setLoading(false);
      }
    },
    [companyId, fyId, from, to],
  );

  // Level 3 — Instrument Wise for a cheque range.
  const openRange = useCallback(
    async (rangeName: string) => {
      if (!companyId || !fyId || !ledger) return;
      setLoading(true);
      setError(null);
      try {
        const res = await window.api.banking.getChequeRegisterInstruments(
          companyId,
          fyId,
          ledger.id,
          rangeName,
          from,
          to,
        );
        if (res.success) {
          setInstRows(res.rows as InstrumentRow[]);
          setInstGrand(res.grand_total);
          setRange(rangeName);
          setSelected(new Set());
          setView('instruments');
          setCursor(0);
        } else setError(res.error || 'Failed to load instruments');
      } catch (e: any) {
        setError(e?.message || 'Failed to load instruments');
      } finally {
        setLoading(false);
      }
    },
    [companyId, fyId, ledger, from, to],
  );

  const backToBankWise = useCallback(() => {
    setView('bankwise');
    setCursor(0);
  }, []);
  const backToRanges = useCallback(() => {
    setView('ranges');
    setCursor(0);
  }, []);

  const toggleSelect = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const alterRow = useCallback(
    (r: InstrumentRow | undefined) => {
      if (r) navigate(`/transactions/voucher/${r.voucher_id}/edit`);
    },
    [navigate],
  );

  const selectedTotal = useMemo(
    () => instRows.filter((r) => selected.has(r.bank_detail_id)).reduce((s, r) => s + r.amount, 0),
    [instRows, selected],
  );

  const rowCount =
    view === 'bankwise' ? bankRows.length : view === 'ranges' ? rangeRows.length : instRows.length;

  const drillCurrent = useCallback(() => {
    if (view === 'bankwise') {
      const r = bankRows[cursor];
      if (r) openBank(r);
    } else if (view === 'ranges') {
      const r = rangeRows[cursor];
      if (r) openRange(r.range);
    } else alterRow(instRows[cursor]);
  }, [view, cursor, bankRows, rangeRows, instRows, openBank, openRange, alterRow]);

  useShortcuts(
    [
      {
        keys: 'ArrowDown',
        handler: () => setCursor((c) => Math.min(c + 1, Math.max(rowCount - 1, 0))),
      },
      { keys: 'ArrowUp', handler: () => setCursor((c) => Math.max(c - 1, 0)) },
      { keys: 'Enter', handler: drillCurrent },
      {
        keys: ' ',
        handler: () => {
          if (view === 'instruments') {
            const r = instRows[cursor];
            if (r) toggleSelect(r.bank_detail_id);
          }
        },
      },
      {
        keys: 'F4',
        handler: () => {
          if (view === 'ranges') backToBankWise();
          else if (view === 'instruments') backToRanges();
        },
      },
      {
        keys: 'Escape',
        handler: () => {
          if (view === 'instruments') {
            backToRanges();
            return;
          }
          if (view === 'ranges') {
            backToBankWise();
            return;
          }
          navigate('/utilities/banking');
        },
      },
    ],
    { priority: PRIORITY.SCREEN },
  );

  const periodLabel = activeFY
    ? `${fmtDate(activeFY.start_date)} to ${fmtDate(activeFY.end_date)}`
    : '';

  const title =
    view === 'bankwise'
      ? 'Cheque Register'
      : view === 'ranges'
        ? 'Cheque Range Register'
        : 'Instrument Wise';

  const rightActions: RightPanelAction[] = [
    { key: 'F2', label: 'Period', onClick: () => {}, disabled: true },
    { key: 'F3', label: 'Company', onClick: () => navigate('/') },
  ];
  if (view === 'ranges') rightActions.push({ key: 'F4', label: 'Bank', onClick: backToBankWise });
  if (view === 'instruments')
    rightActions.push({ key: 'F4', label: 'Cheque Range', onClick: backToRanges });
  if (view === 'instruments')
    rightActions.push({ key: 'F5', label: 'Status Wise', onClick: () => {}, disabled: true });
  rightActions.push(
    {
      key: 'F8',
      label: view === 'ranges' ? 'Transactions' : 'Cheque Status',
      onClick: () => {
        if (view === 'ranges' && rangeRows[cursor]) openRange(rangeRows[cursor].range);
      },
      disabled: view !== 'ranges',
    },
    { key: 'B', label: 'Basis of Values', onClick: () => {}, disabled: true },
    { key: 'H', label: 'Change View', onClick: () => {}, disabled: true },
    { key: 'J', label: 'Exception Reports', onClick: () => {}, disabled: true },
    { key: 'L', label: 'Save View', onClick: () => {}, disabled: true },
    {
      key: 'B',
      label: view === 'instruments' ? 'Assign Chq Range' : 'Alter Chq Book',
      onClick: () => {},
      disabled: true,
    },
  );
  if (view === 'instruments')
    rightActions.push({
      key: 'J',
      label: 'Create Voucher',
      onClick: () => navigate('/transactions/vouchers'),
    });
  rightActions.push({
    key: 'R',
    label: 'Reconcile',
    onClick: () => navigate('/utilities/banking/reconciliation'),
  });
  if (view === 'instruments')
    rightActions.push({ key: 'S', label: 'Alter Status', onClick: () => {}, disabled: true });

  // Count row (bankwise + ranges share the same status columns).
  const renderCountRow = (
    label: string,
    c: ChequeRegisterCounts,
    i: number,
    onDrill: () => void,
    italic = false,
  ) => (
    <tr
      key={label + i}
      onClick={() => setCursor(i)}
      onDoubleClick={onDrill}
      className={`cursor-pointer border-b border-gray-100 ${i === cursor ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
    >
      <td className={`px-2 py-0.5 ${italic ? 'italic' : 'font-semibold'}`}>{label}</td>
      <td className="px-2 py-0.5 text-right border-l border-gray-100">{num(c.available)}</td>
      <td className="px-2 py-0.5 text-right border-l border-gray-100">{num(c.unreconciled)}</td>
      <td className="px-2 py-0.5 text-right">{num(c.reconciled)}</td>
      <td className="px-2 py-0.5 text-right">{num(c.blank)}</td>
      <td className="px-2 py-0.5 text-right">{num(c.cancelled)}</td>
      <td className="px-2 py-0.5 text-right border-l border-gray-100">{num(c.out_of_period)}</td>
      <td className="px-2 py-0.5 text-right border-l border-gray-100 font-semibold">
        {num(c.total)}
      </td>
    </tr>
  );

  const CountHeader = (
    <thead>
      <tr className="border-b border-gray-300">
        <th rowSpan={2} className="px-2 py-1 text-left font-bold align-bottom">
          Particulars
        </th>
        <th
          rowSpan={2}
          className="px-2 py-1 text-center font-bold align-bottom border-l border-gray-300 w-24"
        >
          Available
          <br />
          Cheques
        </th>
        <th colSpan={4} className="px-2 py-1 text-center font-bold border-l border-gray-300">
          {periodLabel}
        </th>
        <th
          rowSpan={2}
          className="px-2 py-1 text-center font-bold align-bottom border-l border-gray-300 w-24"
        >
          Out of
          <br />
          Period
        </th>
        <th
          rowSpan={2}
          className="px-2 py-1 text-center font-bold align-bottom border-l border-gray-300 w-24"
        >
          Total
          <br />
          Cheques
        </th>
      </tr>
      <tr className="border-b border-black">
        <th className="px-2 py-1 text-right font-bold w-24 border-l border-gray-300">
          Unreconciled
        </th>
        <th className="px-2 py-1 text-right font-bold w-24">Reconciled</th>
        <th className="px-2 py-1 text-right font-bold w-20">Blank</th>
        <th className="px-2 py-1 text-right font-bold w-20">Cancelled</th>
      </tr>
    </thead>
  );

  const GrandCountRow = (g: ChequeRegisterCounts) => (
    <div className="border-t border-black text-[11px]">
      <table className="w-full border-collapse">
        <tbody>
          <tr className="font-bold">
            <td className="px-2 py-1 tracking-wider">Grand Total</td>
            <td className="px-2 py-1 text-right w-24 border-l border-gray-100">
              {num(g.available)}
            </td>
            <td className="px-2 py-1 text-right w-24 border-l border-gray-100">
              {num(g.unreconciled)}
            </td>
            <td className="px-2 py-1 text-right w-24">{num(g.reconciled)}</td>
            <td className="px-2 py-1 text-right w-20">{num(g.blank)}</td>
            <td className="px-2 py-1 text-right w-20">{num(g.cancelled)}</td>
            <td className="px-2 py-1 text-right w-24 border-l border-gray-100">
              {num(g.out_of_period)}
            </td>
            <td className="px-2 py-1 text-right w-24 border-l border-gray-100">{num(g.total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white font-sans text-black">
      <ReportHeader title={title} companyName={selectedCompany?.name} periodLabel={periodLabel} />

      {/* Sub-header: level label / ledger / range */}
      <div className="flex justify-between items-center px-3 py-1 border-b border-gray-300 text-[11px]">
        <div className="flex flex-col">
          {view === 'bankwise' && <span className="font-bold">Bank wise Register</span>}
          {view === 'ranges' && (
            <>
              <span>
                Ledger: <span className="font-bold">{ledger?.name}</span>
              </span>
              <span className="text-gray-500">List of Cheque Ranges</span>
            </>
          )}
          {view === 'instruments' && (
            <>
              <span>
                Ledger: <span className="font-bold">{ledger?.name}</span>
              </span>
              <span>
                Cheque Range: <span className="font-bold">{range}</span>
              </span>
            </>
          )}
        </div>
        <div className="font-bold">{periodLabel}</div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          {error && (
            <div className="mx-3 mt-2 text-[11px] border border-black px-2 py-1 flex justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="font-bold">
                &times;
              </button>
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-auto">
            {view === 'instruments' ? (
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-black">
                    <th className="px-2 py-1 text-left font-bold w-6" />
                    <th className="px-2 py-1 text-left font-bold w-28">Cheque No.</th>
                    <th className="px-2 py-1 text-left font-bold w-28">Status</th>
                    <th className="px-2 py-1 text-left font-bold w-24">Date</th>
                    <th className="px-2 py-1 text-left font-bold">Particulars</th>
                    <th className="px-2 py-1 text-left font-bold w-28">Vch Type</th>
                    <th className="px-2 py-1 text-right font-bold w-20">Vch No.</th>
                    <th className="px-2 py-1 text-left font-bold w-24">Inst. Date</th>
                    <th className="px-2 py-1 text-right font-bold w-32">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {instRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-2 py-8 text-center text-gray-500 italic">
                        {loading ? 'Loading…' : 'No cheque instruments in this range.'}
                      </td>
                    </tr>
                  ) : (
                    instRows.map((r, i) => {
                      const isSel = selected.has(r.bank_detail_id);
                      return (
                        <tr
                          key={r.bank_detail_id}
                          onClick={() => {
                            setCursor(i);
                            toggleSelect(r.bank_detail_id);
                          }}
                          onDoubleClick={() => alterRow(r)}
                          className={`cursor-pointer border-b border-gray-100 ${
                            isSel
                              ? 'bg-gray-300'
                              : i === cursor
                                ? 'bg-gray-100'
                                : 'hover:bg-gray-50'
                          }`}
                        >
                          <td className="px-2 py-0.5 text-center">{isSel ? '✓' : ''}</td>
                          <td className="px-2 py-0.5">
                            {r.cheque_no || <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-2 py-0.5">{r.status}</td>
                          <td className="px-2 py-0.5">{fmtDate(r.date)}</td>
                          <td className="px-2 py-0.5">
                            {r.particulars || <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-2 py-0.5">{r.vch_type}</td>
                          <td className="px-2 py-0.5 text-right">{r.vch_no}</td>
                          <td className="px-2 py-0.5">{fmtDate(r.instrument_date)}</td>
                          <td className="px-2 py-0.5 text-right font-semibold">{inr(r.amount)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-[11px] border-collapse">
                {CountHeader}
                <tbody>
                  {(view === 'bankwise' ? bankRows : rangeRows).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-2 py-8 text-center text-gray-500 italic">
                        {loading ? 'Loading…' : 'No cheques found.'}
                      </td>
                    </tr>
                  ) : view === 'bankwise' ? (
                    bankRows.map((r, i) => renderCountRow(r.particulars, r, i, () => openBank(r)))
                  ) : (
                    rangeRows.map((r, i) =>
                      renderCountRow(
                        r.range,
                        r,
                        i,
                        () => openRange(r.range),
                        r.range === 'Not in Range',
                      ),
                    )
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Totals */}
          {view === 'instruments' ? (
            <div className="border-t border-black text-[11px]">
              <div className="flex justify-between px-2 py-0.5 tracking-widest font-semibold">
                <span>Selected Total</span>
                <span className="font-bold pr-1">{inr(selectedTotal)}</span>
              </div>
              <div className="flex justify-between px-2 py-0.5 tracking-widest font-semibold border-t border-gray-300">
                <span>Grand Total</span>
                <span className="font-bold pr-1">{inr(instGrand)}</span>
              </div>
            </div>
          ) : (
            GrandCountRow(view === 'bankwise' ? bankGrand : rangeGrand)
          )}

          {/* Bottom action bar */}
          <div className="border-t border-gray-300 bg-gray-50 flex text-[10px] font-bold">
            {(view === 'instruments'
              ? [
                  { k: 'Q', l: 'Quit', on: backToRanges },
                  { k: 'Enter', l: 'Alter', on: () => alterRow(instRows[cursor]) },
                  {
                    k: 'Space',
                    l: 'Select',
                    on: () => {
                      const r = instRows[cursor];
                      if (r) toggleSelect(r.bank_detail_id);
                    },
                  },
                ]
              : [
                  {
                    k: 'Q',
                    l: 'Quit',
                    on: () =>
                      view === 'ranges' ? backToBankWise() : navigate('/utilities/banking'),
                  },
                  { k: 'Enter', l: 'Drill', on: drillCurrent },
                ]
            ).map((b) => (
              <button
                key={b.l}
                onClick={b.on}
                className="flex-1 px-2 py-1 border-r border-gray-300 text-left hover:bg-gray-100"
              >
                <span className="underline">{b.k}</span>: {b.l}
              </button>
            ))}
          </div>
        </div>

        <RightActionPanel actions={rightActions} title="Cheque Register" />
      </div>
    </div>
  );
}
