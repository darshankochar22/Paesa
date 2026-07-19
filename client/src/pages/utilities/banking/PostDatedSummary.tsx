import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import ReportHeader from '@/components/ui/ReportHeader';
import RightActionPanel, { type RightPanelAction } from '@/components/ui/RightActionPanel';
import { PRIORITY, useShortcuts } from '@/lib/shortcuts';

type BankLedger = { ledger_id: number; name: string; enable_cheque_printing: number };
type MonthAgg = {
  ym: string;
  received_amount: number;
  received_count: number;
  issued_amount: number;
  issued_count: number;
};
type GrandAgg = Omit<MonthAgg, 'ym'>;
type TxnRow = {
  entry_id: number;
  voucher_id: number;
  date: string;
  type: string;
  particulars: string;
  instrument_number: string;
  instrument_date: string;
  status: string;
  amount: number;
};

const inr = (n: number) =>
  n ? n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
const cnt = (n: number) => (n ? String(n) : '');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
// "2026-04-01" -> "1-Apr-26" (TallyPrime day/month display, no leading zero).
const fmtDate = (iso: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${Number(d)}-${MONTHS[Number(m) - 1] ?? m}-${y.slice(2)}`;
};
const endOfMonth = (iso: string) => {
  const [y, m] = iso.split('-').map(Number);
  if (!y || !m) return iso;
  const last = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
};

// The 12 FY months (Apr→Mar) as { ym: 'YYYY-MM', label, from, to } starting at the FY start.
function fyMonths(startIso: string): { ym: string; label: string; from: string; to: string }[] {
  const [sy, sm] = startIso.split('-').map(Number);
  if (!sy || !sm) return [];
  const out = [];
  for (let i = 0; i < 12; i++) {
    const total = sm - 1 + i;
    const y = sy + Math.floor(total / 12);
    const m = (total % 12) + 1;
    const ym = `${y}-${String(m).padStart(2, '0')}`;
    out.push({
      ym,
      label: MONTH_LONG[m - 1],
      from: `${ym}-01`,
      to: endOfMonth(`${ym}-01`),
    });
  }
  return out;
}

// TallyPrime Banking → PosT-dated Summary (Post-Dated Transactions Monthly Summary).
export default function PostDatedSummary() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const [banks, setBanks] = useState<BankLedger[]>([]);
  const [ledgerId, setLedgerId] = useState<number | null>(null);
  const [ledgerName, setLedgerName] = useState('');

  const [months, setMonths] = useState<MonthAgg[]>([]);
  const [grand, setGrand] = useState<GrandAgg>({
    received_amount: 0,
    received_count: 0,
    issued_amount: 0,
    issued_count: 0,
  });

  const [txns, setTxns] = useState<TxnRow[]>([]);
  const [txnGrand, setTxnGrand] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const [view, setView] = useState<'summary' | 'detail'>('summary');
  const [cursor, setCursor] = useState(0);
  const [drillMonth, setDrillMonth] = useState<{ label: string; from: string; to: string } | null>(
    null,
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bankOpen, setBankOpen] = useState(true); // Tally opens with "Select Bank"
  const [bankQuery, setBankQuery] = useState('');

  const fyRows = useMemo(
    () => (activeFY?.start_date ? fyMonths(activeFY.start_date) : []),
    [activeFY],
  );

  // Merge backend month aggregates onto the full 12-month FY grid.
  const grid = useMemo(() => {
    const byYm = new Map(months.map((m) => [m.ym, m]));
    return fyRows.map((r) => ({
      ...r,
      agg: byYm.get(r.ym) || {
        received_amount: 0,
        received_count: 0,
        issued_amount: 0,
        issued_count: 0,
      },
    }));
  }, [fyRows, months]);

  // Load bank ledgers for the Select Bank list.
  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      const res = await window.api.banking.getBankLedgers(companyId);
      if (cancelled) return;
      setBanks((res.success ? res.ledgers : []) as BankLedger[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const reloadSummary = useCallback(async () => {
    if (!companyId || !fyId || !ledgerId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await window.api.banking.getPostDatedSummary(companyId, fyId, ledgerId);
      if (res.success) {
        setMonths(res.months as MonthAgg[]);
        setGrand(res.grand_total);
        setLedgerName(res.ledger_name || '');
      } else {
        setError(res.error || 'Failed to load post-dated summary');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load post-dated summary');
    } finally {
      setLoading(false);
    }
  }, [companyId, fyId, ledgerId]);

  useEffect(() => {
    if (ledgerId && !bankOpen) reloadSummary();
  }, [reloadSummary, ledgerId, bankOpen]);

  const openMonth = useCallback(
    async (m: { label: string; from: string; to: string }) => {
      if (!companyId || !fyId || !ledgerId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await window.api.banking.getPostDatedTransactions(
          companyId,
          fyId,
          ledgerId,
          m.from,
          m.to,
        );
        if (res.success) {
          setTxns(res.rows as TxnRow[]);
          setTxnGrand(res.grand_total);
          setDrillMonth(m);
          setSelected(new Set());
          setCursor(0);
          setView('detail');
        } else {
          setError(res.error || 'Failed to load post-dated transactions');
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load post-dated transactions');
      } finally {
        setLoading(false);
      }
    },
    [companyId, fyId, ledgerId],
  );

  const chooseBank = (id: number) => {
    setLedgerId(id);
    setBankOpen(false);
    setBankQuery('');
    setView('summary');
    setCursor(0);
  };

  const backToSummary = useCallback(() => {
    setView('summary');
    setDrillMonth(null);
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
    (r: TxnRow | undefined) => {
      if (r) navigate(`/transactions/voucher/${r.voucher_id}/edit`);
    },
    [navigate],
  );

  const selectedTotal = useMemo(
    () => txns.filter((r) => selected.has(r.entry_id)).reduce((s, r) => s + r.amount, 0),
    [txns, selected],
  );

  const rowCount = view === 'summary' ? grid.length : txns.length;

  useShortcuts(
    [
      {
        keys: 'ArrowDown',
        handler: () => setCursor((c) => Math.min(c + 1, Math.max(rowCount - 1, 0))),
      },
      { keys: 'ArrowUp', handler: () => setCursor((c) => Math.max(c - 1, 0)) },
      {
        keys: 'Enter',
        handler: () => {
          if (view === 'summary') {
            const m = grid[cursor];
            if (m) openMonth(m);
          } else alterRow(txns[cursor]);
        },
      },
      {
        keys: ' ',
        handler: () => {
          if (view === 'detail') {
            const r = txns[cursor];
            if (r) toggleSelect(r.entry_id);
          }
        },
      },
      { keys: 'F4', handler: () => setBankOpen(true) },
      {
        keys: 'Escape',
        handler: () => {
          if (bankOpen) return false;
          if (view === 'detail') {
            backToSummary();
            return;
          }
          navigate('/utilities/banking');
        },
      },
    ],
    { priority: PRIORITY.SCREEN, enabled: !bankOpen },
  );

  const periodLabel =
    view === 'detail' && drillMonth
      ? `${fmtDate(drillMonth.from)} to ${fmtDate(drillMonth.to)}`
      : activeFY
        ? `${fmtDate(activeFY.start_date)} to ${fmtDate(activeFY.end_date)}`
        : '';

  const rightActions: RightPanelAction[] = [
    { key: 'F2', label: 'Period', onClick: () => {}, disabled: true },
    { key: 'F3', label: 'Company', onClick: () => navigate('/') },
    { key: 'F4', label: 'Ledger', onClick: () => setBankOpen(true) },
    { key: 'B', label: 'Basis of Values', onClick: () => {}, disabled: true },
    { key: 'H', label: 'Change View', onClick: () => {}, disabled: true },
    { key: 'J', label: 'Exception Reports', onClick: () => {}, disabled: true },
    { key: 'L', label: 'Save View', onClick: () => {}, disabled: true },
  ];
  if (view === 'detail') {
    rightActions.push(
      { key: 'B', label: 'Alter Bank', onClick: () => setBankOpen(true) },
      {
        key: 'Enter',
        label: 'Alter',
        onClick: () => alterRow(txns[cursor]),
        disabled: txns.length === 0,
      },
    );
  }

  const filteredBanks = banks.filter((b) => b.name.toLowerCase().includes(bankQuery.toLowerCase()));

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white font-sans text-black">
      <ReportHeader
        title={
          view === 'detail' ? 'Post-Dated Transactions' : 'Post-Dated Transactions Monthly Summary'
        }
        companyName={selectedCompany?.name}
        periodLabel={periodLabel}
      />

      <div className="flex justify-between items-center px-3 py-1 border-b border-gray-300 text-[11px]">
        <div>
          Ledger: <span className="font-bold">{ledgerName || '—'}</span>
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
            {view === 'summary' ? (
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th rowSpan={2} className="px-2 py-1 text-left font-bold align-bottom">
                      Particulars
                    </th>
                    <th
                      colSpan={2}
                      className="px-2 py-1 text-center font-bold border-b border-l border-gray-300"
                    >
                      Received
                    </th>
                    <th
                      colSpan={2}
                      className="px-2 py-1 text-center font-bold border-b border-l border-gray-300"
                    >
                      Issued
                    </th>
                  </tr>
                  <tr className="border-b border-black">
                    <th className="px-2 py-1 text-right font-bold w-36 border-l border-gray-300">
                      Amount
                    </th>
                    <th className="px-2 py-1 text-right font-bold w-20">Count</th>
                    <th className="px-2 py-1 text-right font-bold w-36 border-l border-gray-300">
                      Amount
                    </th>
                    <th className="px-2 py-1 text-right font-bold w-20">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {grid.map((m, i) => {
                    const empty = !m.agg.received_count && !m.agg.issued_count;
                    return (
                      <tr
                        key={m.ym}
                        onClick={() => setCursor(i)}
                        onDoubleClick={() => openMonth(m)}
                        className={`cursor-pointer border-b border-gray-100 ${i === cursor ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                      >
                        <td className="px-2 py-0.5">{m.label}</td>
                        <td className="px-2 py-0.5 text-right border-l border-gray-100">
                          {inr(m.agg.received_amount)}
                        </td>
                        <td className="px-2 py-0.5 text-right">{cnt(m.agg.received_count)}</td>
                        <td className="px-2 py-0.5 text-right border-l border-gray-100">
                          {inr(m.agg.issued_amount)}
                        </td>
                        <td className="px-2 py-0.5 text-right">{cnt(m.agg.issued_count)}</td>
                        {empty && <td className="hidden" />}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-black">
                    <th className="px-2 py-1 text-left font-bold w-6" />
                    <th className="px-2 py-1 text-left font-bold w-24">Date</th>
                    <th className="px-2 py-1 text-left font-bold w-24">Type</th>
                    <th className="px-2 py-1 text-left font-bold">Particulars</th>
                    <th className="px-2 py-1 text-left font-bold w-32">Instrument no.</th>
                    <th className="px-2 py-1 text-left font-bold w-28">Instrument date</th>
                    <th className="px-2 py-1 text-left font-bold w-24">Status</th>
                    <th className="px-2 py-1 text-right font-bold w-32">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {txns.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-2 py-8 text-center text-gray-500 italic">
                        {loading ? 'Loading…' : 'No post-dated transactions in this period.'}
                      </td>
                    </tr>
                  ) : (
                    txns.map((r, i) => {
                      const isSel = selected.has(r.entry_id);
                      return (
                        <tr
                          key={r.entry_id}
                          onClick={() => {
                            setCursor(i);
                            toggleSelect(r.entry_id);
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
                          <td className="px-2 py-0.5">{fmtDate(r.date)}</td>
                          <td className="px-2 py-0.5">{r.type}</td>
                          <td className="px-2 py-0.5">
                            {r.particulars || <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-2 py-0.5">
                            {r.instrument_number || <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-2 py-0.5">{fmtDate(r.instrument_date)}</td>
                          <td className="px-2 py-0.5">{r.status}</td>
                          <td className="px-2 py-0.5 text-right font-semibold">{inr(r.amount)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Totals */}
          {view === 'summary' ? (
            <div className="border-t border-black text-[11px]">
              <table className="w-full border-collapse">
                <tbody>
                  <tr className="font-bold">
                    <td className="px-2 py-1 tracking-wider">Grand Total</td>
                    <td className="px-2 py-1 text-right w-36 border-l border-gray-100">
                      {inr(grand.received_amount)}
                    </td>
                    <td className="px-2 py-1 text-right w-20">{cnt(grand.received_count)}</td>
                    <td className="px-2 py-1 text-right w-36 border-l border-gray-100">
                      {inr(grand.issued_amount)}
                    </td>
                    <td className="px-2 py-1 text-right w-20">{cnt(grand.issued_count)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="border-t border-black text-[11px]">
              <div className="flex justify-between px-2 py-0.5 tracking-widest font-semibold">
                <span>Selected Total</span>
                <span className="font-bold pr-1">{inr(selectedTotal)}</span>
              </div>
              <div className="flex justify-between px-2 py-0.5 tracking-widest font-semibold border-t border-gray-300">
                <span>Grand Total</span>
                <span className="font-bold pr-1">{inr(txnGrand)}</span>
              </div>
            </div>
          )}

          {/* Bottom action bar (Tally footer) */}
          <div className="border-t border-gray-300 bg-gray-50 flex text-[10px] font-bold">
            {(view === 'summary'
              ? [
                  { k: 'Q', l: 'Quit', on: () => navigate('/utilities/banking') },
                  {
                    k: 'Enter',
                    l: 'Drill',
                    on: () => {
                      const m = grid[cursor];
                      if (m) openMonth(m);
                    },
                  },
                ]
              : [
                  { k: 'Q', l: 'Quit', on: backToSummary },
                  { k: 'Enter', l: 'Alter', on: () => alterRow(txns[cursor]) },
                  {
                    k: 'Space',
                    l: 'Select',
                    on: () => {
                      const r = txns[cursor];
                      if (r) toggleSelect(r.entry_id);
                    },
                  },
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

        <RightActionPanel actions={rightActions} title="Post-Dated Summary" />
      </div>

      {/* Select Bank popup (Tally: Name of Ledger + List of Banks) */}
      {bankOpen && (
        <div
          className="absolute inset-0 z-50 bg-black/10 flex items-start justify-center pt-24"
          onClick={() => ledgerId && setBankOpen(false)}
        >
          <div
            className="w-72 bg-white border border-gray-400 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center text-[12px] font-bold border-b border-gray-300 py-1">
              Name of Ledger
            </div>
            <div className="px-2 py-1">
              <input
                autoFocus
                value={bankQuery}
                onChange={(e) => setBankQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filteredBanks[0]) chooseBank(filteredBanks[0].ledger_id);
                  if (e.key === 'Escape' && ledgerId) setBankOpen(false);
                }}
                className="w-full text-[12px] border border-gray-300 px-1 py-0.5 bg-yellow-50 outline-none focus:border-black"
              />
            </div>
            <div className="bg-gray-900 text-white text-[11px] font-bold px-2 py-0.5">
              List of Banks
            </div>
            <div className="max-h-72 overflow-auto">
              {filteredBanks.length === 0 ? (
                <div className="px-2 py-2 text-[11px] text-gray-500">No bank ledgers found.</div>
              ) : (
                filteredBanks.map((b) => (
                  <button
                    key={b.ledger_id}
                    onClick={() => chooseBank(b.ledger_id)}
                    className="w-full text-left text-[12px] px-2 py-1 hover:bg-yellow-200"
                  >
                    {b.name}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
