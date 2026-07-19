import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import ReportHeader from '@/components/ui/ReportHeader';
import RightActionPanel, { type RightPanelAction } from '@/components/ui/RightActionPanel';
import { PRIORITY, useShortcuts } from '@/lib/shortcuts';

type BankLedger = { ledger_id: number; name: string; enable_cheque_printing: number };
type StatementRow = {
  entry_id: number;
  voucher_id: number;
  voucher_number?: string;
  date: string;
  voucher_type?: string;
  party_name?: string;
  narration?: string;
  transaction_type?: string | null;
  instrument_number?: string | null;
  instrument_date?: string | null;
  type: string; // 'Dr' | 'Cr'
  amount: number;
  is_reconciled: boolean;
  bank_date?: string | null;
  reconciliation_id?: number | null;
  balance: number;
};

const inr = (n: number) =>
  n
    ? Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// "2026-04-01" -> "1-Apr-26" (TallyPrime day/month display, no leading zero).
const fmtDate = (iso?: string | null) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${Number(d)}-${MONTHS[Number(m) - 1] ?? m}-${y.slice(2)}`;
};

// TallyPrime Banking → Bank Reconciliation (BRS).
// Entering a Bank Date against a bank-ledger entry reconciles it; clearing the
// Bank Date un-reconciles. The footer reconciles book balance to bank balance.
export default function BankReconciliation() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const [banks, setBanks] = useState<BankLedger[]>([]);
  const [ledgerId, setLedgerId] = useState<number | null>(null);
  const [ledgerName, setLedgerName] = useState('');
  const [rows, setRows] = useState<StatementRow[]>([]);
  const [bookBalance, setBookBalance] = useState(0);
  const [unreconciledDr, setUnreconciledDr] = useState(0);
  const [unreconciledCr, setUnreconciledCr] = useState(0);
  const [balanceAsPerBank, setBalanceAsPerBank] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bankOpen, setBankOpen] = useState(true); // Tally opens with "Select Bank"
  const [bankQuery, setBankQuery] = useState('');
  const [periodOpen, setPeriodOpen] = useState(false);

  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  // Default period to the full financial year (Tally's default reconciliation range).
  useEffect(() => {
    if (activeFY?.start_date && !fromDate) {
      setFromDate(activeFY.start_date);
      setToDate(activeFY.end_date);
    }
  }, [activeFY, fromDate]);

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

  // Reload the statement; preserves cursor so post-reconcile refreshes don't jump.
  const reload = useCallback(async () => {
    if (!companyId || !fyId || !ledgerId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await window.api.banking.getStatement(
        companyId,
        fyId,
        ledgerId,
        fromDate || undefined,
        toDate || undefined,
      );
      if (res.success) {
        setRows(res.rows as StatementRow[]);
        setLedgerName(res.ledger_name || '');
        setBookBalance(res.book_balance);
        setUnreconciledDr(res.unreconciled_dr);
        setUnreconciledCr(res.unreconciled_cr);
        setBalanceAsPerBank(res.balance_as_per_bank);
      } else {
        setError(res.error || 'Failed to load statement');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load statement');
    } finally {
      setLoading(false);
    }
  }, [companyId, fyId, ledgerId, fromDate, toDate]);

  useEffect(() => {
    if (ledgerId && !bankOpen) reload();
  }, [reload, ledgerId, bankOpen]);

  useEffect(() => {
    rowRefs.current[cursor]?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const chooseBank = (id: number) => {
    setLedgerId(id);
    setBankOpen(false);
    setBankQuery('');
    setCursor(0);
    setSelected(new Set());
  };

  const toggleSelect = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Set / clear the Bank Date of one entry → reconcile / un-reconcile.
  const applyBankDate = useCallback(
    async (row: StatementRow, iso: string | null) => {
      if (!ledgerId) return;
      // Optimistic update so the input stays responsive.
      setRows((prev) =>
        prev.map((r) =>
          r.entry_id === row.entry_id ? { ...r, bank_date: iso, is_reconciled: !!iso } : r,
        ),
      );
      try {
        const res = iso
          ? await window.api.banking.reconcile({
              entry_id: row.entry_id,
              voucher_id: row.voucher_id,
              ledger_id: ledgerId,
              bank_date: iso,
              reconciled_date: iso,
            })
          : await window.api.banking.unreconcile(row.entry_id);
        if (!res.success) {
          setError(res.error || 'Reconcile failed');
        }
      } catch (e: any) {
        setError(e?.message || 'Reconcile failed');
      }
      reload();
    },
    [ledgerId, reload],
  );

  const alterRow = useCallback(
    (r: StatementRow | undefined) => {
      if (r) navigate(`/transactions/voucher/${r.voucher_id}/edit`);
    },
    [navigate],
  );

  // S: Set Bank Date — reconcile the selected rows (or cursor row) using each
  // entry's own voucher date as the bank date (Tally's quick-reconcile).
  const setBankDateBulk = useCallback(() => {
    const targets =
      selected.size > 0
        ? rows.filter((r) => selected.has(r.entry_id))
        : rows[cursor]
          ? [rows[cursor]]
          : [];
    targets.forEach((r) => {
      if (!r.is_reconciled) applyBankDate(r, r.date);
    });
    setSelected(new Set());
  }, [selected, rows, cursor, applyBankDate]);

  const selectedCount = selected.size;

  const periodLabel = `${fmtDate(fromDate)} to ${fmtDate(toDate)}`;

  const rightActions: RightPanelAction[] = [
    { key: 'F2', label: 'Period', onClick: () => setPeriodOpen(true) },
    { key: 'F3', label: 'Company', onClick: () => navigate('/') },
    { key: 'F4', label: 'Bank', onClick: () => setBankOpen(true) },
    { key: 'B', label: 'Basis of Values', onClick: () => {}, disabled: true },
    { key: 'H', label: 'Change View', onClick: () => {}, disabled: true },
    { key: 'J', label: 'Exception Reports', onClick: () => {}, disabled: true },
    { key: 'H', label: 'Opening BRS', onClick: () => {}, disabled: true },
    { key: 'J', label: 'Create Voucher', onClick: () => navigate('/transactions/vouchers') },
    { key: 'S', label: 'Set Bank Date', onClick: setBankDateBulk, disabled: rows.length === 0 },
  ];

  useShortcuts(
    [
      {
        keys: 'ArrowDown',
        handler: () => setCursor((c) => Math.min(c + 1, Math.max(rows.length - 1, 0))),
      },
      { keys: 'ArrowUp', handler: () => setCursor((c) => Math.max(c - 1, 0)) },
      {
        keys: ' ',
        handler: () => {
          const r = rows[cursor];
          if (r) toggleSelect(r.entry_id);
        },
      },
      { keys: 'F2', handler: () => setPeriodOpen(true) },
      { keys: 'F4', handler: () => setBankOpen(true) },
      { keys: 'F5', handler: setBankDateBulk },
      {
        keys: 'Escape',
        handler: () => {
          if (bankOpen || periodOpen) return false;
          navigate('/utilities/banking');
        },
      },
    ],
    { priority: PRIORITY.SCREEN, enabled: !bankOpen && !periodOpen },
  );

  const filteredBanks = banks.filter((b) => b.name.toLowerCase().includes(bankQuery.toLowerCase()));

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white font-sans text-black">
      <ReportHeader
        title="Bank Reconciliation"
        companyName={selectedCompany?.name}
        periodLabel={periodLabel}
      />

      {/* Ledger + period sub-header */}
      <div className="grid grid-cols-3 items-center px-3 py-1 border-b border-gray-300 text-[11px]">
        <div>
          Ledger: <span className="font-bold">{ledgerName || '—'}</span>
        </div>
        <div className="text-center italic text-gray-600">(Reconciliation)</div>
        <div className="text-right font-bold">{periodLabel}</div>
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

          {/* Reconciliation table */}
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-[11px] border-collapse">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-black">
                  <th className="px-2 py-1 text-left font-bold w-6" />
                  <th className="px-2 py-1 text-left font-bold w-20">Date</th>
                  <th className="px-2 py-1 text-left font-bold">Particulars</th>
                  <th className="px-2 py-1 text-left font-bold w-24">Vch Type</th>
                  <th className="px-2 py-1 text-left font-bold w-28">Transaction Type</th>
                  <th className="px-2 py-1 text-left font-bold w-24">Instrument No.</th>
                  <th className="px-2 py-1 text-left font-bold w-24">Instrument Date</th>
                  <th className="px-2 py-1 text-left font-bold w-28">Bank Date</th>
                  <th className="px-2 py-1 text-right font-bold w-28">Debit</th>
                  <th className="px-2 py-1 text-right font-bold w-28">Credit</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-2 py-8 text-center text-gray-500 italic">
                      {loading
                        ? 'Loading…'
                        : ledgerId
                          ? 'No bank entries in the selected period.'
                          : 'Select a bank.'}
                    </td>
                  </tr>
                ) : (
                  rows.map((r, i) => {
                    const isSel = selected.has(r.entry_id);
                    const isCursor = i === cursor;
                    return (
                      <tr
                        key={r.entry_id}
                        ref={(el) => {
                          rowRefs.current[i] = el;
                        }}
                        onClick={() => setCursor(i)}
                        onDoubleClick={() => alterRow(r)}
                        className={`border-b border-gray-100 ${
                          isSel ? 'bg-gray-300' : isCursor ? 'bg-gray-100' : 'hover:bg-gray-50'
                        }`}
                      >
                        <td
                          className="px-2 py-1 text-center cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelect(r.entry_id);
                          }}
                        >
                          {isSel ? '✓' : ''}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap">{fmtDate(r.date)}</td>
                        <td className="px-2 py-1">
                          {r.party_name || <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-2 py-1">{r.voucher_type}</td>
                        <td className="px-2 py-1">
                          {r.transaction_type || <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-2 py-1">
                          {r.instrument_number || <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap">
                          {fmtDate(r.instrument_date)}
                        </td>
                        <td className="px-1 py-0.5">
                          {isCursor ? (
                            <input
                              type="date"
                              value={r.bank_date || ''}
                              min={fromDate || undefined}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => applyBankDate(r, e.target.value || null)}
                              className="w-full text-[11px] border border-gray-300 px-1 py-0.5 bg-yellow-50 outline-none focus:border-black"
                            />
                          ) : (
                            <span className={r.is_reconciled ? 'font-semibold' : 'text-gray-400'}>
                              {r.bank_date ? fmtDate(r.bank_date) : '—'}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1 text-right font-semibold">
                          {r.type === 'Dr' ? inr(r.amount) : ''}
                        </td>
                        <td className="px-2 py-1 text-right font-semibold">
                          {r.type === 'Cr' ? inr(r.amount) : ''}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* BRS balance footer (TallyPrime) */}
          <div className="border-t border-black text-[11px]">
            <div className="flex justify-between px-2 py-0.5">
              <span>Balance as per Company Books</span>
              <span className="font-bold pr-1 w-40 text-right">
                {inr(bookBalance)} {bookBalance < 0 ? 'Cr' : 'Dr'}
              </span>
            </div>
            <div className="flex justify-between px-2 py-0.5 border-t border-gray-200">
              <span>Amounts not reflected in Bank</span>
              <span className="font-bold pr-1 flex gap-6">
                <span className="w-32 text-right">{inr(unreconciledDr)}</span>
                <span className="w-32 text-right">{inr(unreconciledCr)}</span>
              </span>
            </div>
            <div className="flex justify-between px-2 py-1 border-t border-black font-bold">
              <span>Balance as per Bank</span>
              <span className="pr-1 w-40 text-right">
                {inr(balanceAsPerBank)} {balanceAsPerBank < 0 ? 'Cr' : 'Dr'}
              </span>
            </div>
          </div>

          {/* Bottom action bar (Tally footer) */}
          <div className="border-t border-gray-300 bg-gray-50 flex text-[10px] font-bold">
            {[
              { k: 'Q', l: 'Quit', on: () => navigate('/utilities/banking') },
              { k: 'Enter', l: 'Alter', on: () => alterRow(rows[cursor]) },
              {
                k: 'Space',
                l: 'Select',
                on: () => {
                  const r = rows[cursor];
                  if (r) toggleSelect(r.entry_id);
                },
              },
              { k: 'F5', l: 'Set Bank Date', on: setBankDateBulk },
              { k: 'F2', l: 'Period', on: () => setPeriodOpen(true) },
            ].map((b) => (
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

        <RightActionPanel actions={rightActions} title="Bank Reconciliation" />
      </div>

      {/* Select Bank popup (Tally: Name of Bank Ledger + List of Bank Ledgers) */}
      {bankOpen && (
        <div
          className="absolute inset-0 z-50 bg-black/10 flex items-start justify-center pt-24"
          onClick={() => ledgerId && setBankOpen(false)}
        >
          <div
            className="w-80 bg-white border border-gray-400 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center text-[12px] font-bold border-b border-gray-300 py-1">
              Name of Bank Ledger
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
            <div className="bg-gray-900 text-white text-[11px] font-bold px-2 py-0.5 flex justify-between">
              <span>List of Bank Ledgers</span>
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

      {/* Period popup */}
      {periodOpen && (
        <div
          className="absolute inset-0 z-50 bg-black/10 flex items-start justify-center pt-24"
          onClick={() => setPeriodOpen(false)}
        >
          <div
            className="w-72 bg-white border border-gray-400 shadow-lg p-3 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center text-[12px] font-bold border-b border-gray-300 pb-1">
              Period
            </div>
            <label className="flex items-center justify-between text-[11px]">
              <span>From</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="border border-gray-300 px-1 py-0.5 text-[11px]"
              />
            </label>
            <label className="flex items-center justify-between text-[11px]">
              <span>To</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="border border-gray-300 px-1 py-0.5 text-[11px]"
              />
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setPeriodOpen(false)}
                className="text-[11px] px-3 py-1 border border-black font-bold hover:bg-gray-100"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
