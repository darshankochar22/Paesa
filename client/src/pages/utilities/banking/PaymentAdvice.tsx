import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import ReportHeader from '@/components/ui/ReportHeader';
import RightActionPanel, { type RightPanelAction } from '@/components/ui/RightActionPanel';
import { PRIORITY, useShortcuts } from '@/lib/shortcuts';

type PartyLedger = { ledger_id: number; name: string; email: string };
type AdviceRow = {
  voucher_id: number;
  bank_detail_id: number | null;
  voucher_number: string;
  voucher_type: string;
  date: string;
  particulars: string;
  reconciled: boolean;
  printed: boolean;
  amount: number;
};

const inr = (n: number) =>
  n ? n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// "2026-04-01" -> "1-Apr-26" (TallyPrime day/month display, no leading zero).
const fmtDate = (iso: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${Number(d)}-${MONTHS[Number(m) - 1] ?? m}-${y.slice(2)}`;
};
// Last day of the month containing `iso`.
const endOfMonth = (iso: string) => {
  const [y, m] = iso.split('-').map(Number);
  if (!y || !m) return iso;
  const last = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
};

// TallyPrime Banking → Payment Advice: for a selected party ledger, the payments
// made to that party (Payment vouchers where the party is debited), so an advice
// note can be sent listing them. Register columns mirror Tally: Date, Particulars,
// Vch Type, Vch No., Reconciled, Printed/Emailed?, Amount.
export default function PaymentAdvice() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const [ledgersList, setLedgersList] = useState<PartyLedger[]>([]);
  const [ledgerId, setLedgerId] = useState<number | null>(null);
  const [ledgerName, setLedgerName] = useState('');
  const [rows, setRows] = useState<AdviceRow[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [cursor, setCursor] = useState(0);
  const [reconciledOnly, setReconciledOnly] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Popups
  const [ledgerOpen, setLedgerOpen] = useState(true); // Tally opens with "Select Item"
  const [ledgerQuery, setLedgerQuery] = useState('');
  const [periodOpen, setPeriodOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailDraft, setEmailDraft] = useState('');

  // Default period to the first month of the FY (matches Tally's "For 1-Apr-26").
  useEffect(() => {
    if (activeFY?.start_date && !fromDate) {
      setFromDate(activeFY.start_date);
      setToDate(endOfMonth(activeFY.start_date));
    }
  }, [activeFY, fromDate]);

  // Load the full List of Ledgers for the Select Item list.
  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      const res = await window.api.banking.getPartyLedgers(companyId);
      if (cancelled) return;
      setLedgersList((res.success ? res.ledgers : []) as PartyLedger[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const reload = useCallback(async () => {
    if (!companyId || !fyId || !ledgerId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await window.api.banking.getPaymentAdvice(
        companyId,
        fyId,
        ledgerId,
        fromDate || undefined,
        toDate || undefined,
        reconciledOnly,
      );
      if (res.success) {
        setRows(res.rows);
        setLedgerName(res.ledger_name || '');
        setGrandTotal(res.grand_total);
        setSelected(new Set());
        setCursor(0);
      } else {
        setError(res.error || 'Failed to load payment advice');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load payment advice');
    } finally {
      setLoading(false);
    }
  }, [companyId, fyId, ledgerId, fromDate, toDate, reconciledOnly]);

  useEffect(() => {
    if (ledgerId && !ledgerOpen) reload();
  }, [reload, ledgerId, ledgerOpen]);

  const chooseLedger = (id: number) => {
    setLedgerId(id);
    setLedgerOpen(false);
    setLedgerQuery('');
  };

  const currentLedger = useMemo(
    () => ledgersList.find((l) => l.ledger_id === ledgerId) || null,
    [ledgersList, ledgerId],
  );

  const toggleSelect = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const alterRow = useCallback(
    (r: AdviceRow | undefined) => {
      if (r) navigate(`/transactions/voucher/${r.voucher_id}/edit`);
    },
    [navigate],
  );

  const printSelected = useCallback(async () => {
    const ids = rows
      .filter((r) => selected.has(r.voucher_id) && r.bank_detail_id != null)
      .map((r) => r.bank_detail_id as number);
    if (ids.length === 0) {
      setError('Select advices with Space before marking as printed.');
      return;
    }
    const res = await window.api.banking.markChequePrinted(ids, true);
    if (!res.success) {
      setError(res.error || 'Print failed');
      return;
    }
    window.print();
    reload();
  }, [rows, selected, reload]);

  const saveEmail = useCallback(async () => {
    if (!ledgerId) return;
    const res = await window.api.banking.updateLedgerEmail(ledgerId, emailDraft.trim());
    if (!res.success) {
      setError(res.error || 'Update e-mail failed');
      return;
    }
    setLedgersList((prev) =>
      prev.map((l) => (l.ledger_id === ledgerId ? { ...l, email: emailDraft.trim() } : l)),
    );
    setEmailOpen(false);
  }, [ledgerId, emailDraft]);

  const removeLine = useCallback(() => {
    // Tally "Remove Line" hides the cursor row from the current view.
    setRows((prev) => prev.filter((_, i) => i !== cursor));
    setCursor((c) => Math.max(0, c - 1));
  }, [cursor]);

  const selectedTotal = useMemo(
    () => rows.filter((r) => selected.has(r.voucher_id)).reduce((s, r) => s + r.amount, 0),
    [rows, selected],
  );

  const anyPopupOpen = ledgerOpen || periodOpen || emailOpen;

  // Keyboard: navigate rows, Space select, Enter alter, and the panel/footer keys.
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
          if (r) toggleSelect(r.voucher_id);
        },
      },
      {
        keys: 'Enter',
        handler: () => {
          if (!anyPopupOpen) alterRow(rows[cursor]);
          else return false;
        },
      },
      { keys: 'F2', handler: () => setPeriodOpen(true) },
      { keys: 'F4', handler: () => setLedgerOpen(true) },
      { keys: 'F8', handler: () => setReconciledOnly((v) => !v) },
      { keys: ['Ctrl+P'], handler: printSelected, allowInInputs: true },
      {
        keys: 'Escape',
        handler: () => {
          if (anyPopupOpen) return false;
          navigate('/utilities/banking');
        },
      },
    ],
    { priority: PRIORITY.SCREEN, enabled: !anyPopupOpen },
  );

  const periodLabel =
    fromDate === toDate ? `For ${fmtDate(fromDate)}` : `${fmtDate(fromDate)} to ${fmtDate(toDate)}`;

  const openEmail = () => {
    setEmailDraft(currentLedger?.email || '');
    setEmailOpen(true);
  };

  const rightActions: RightPanelAction[] = [
    { key: 'F2', label: 'Period', onClick: () => setPeriodOpen(true) },
    { key: 'F3', label: 'Company', onClick: () => navigate('/') },
    { key: 'F4', label: 'Ledger', onClick: () => setLedgerOpen(true) },
    {
      key: 'F8',
      label: 'Reconciled Only',
      onClick: () => setReconciledOnly((v) => !v),
      active: reconciledOnly,
    },
    { key: 'B', label: 'Basis of Values', onClick: () => {}, disabled: true },
    { key: 'H', label: 'Change View', onClick: () => {}, disabled: true },
    { key: 'J', label: 'Exception Reports', onClick: () => {}, disabled: true },
    { key: 'L', label: 'Save View', onClick: () => {}, disabled: true },
    { key: 'B', label: 'Mark as Printed', onClick: printSelected, disabled: rows.length === 0 },
    { key: 'W', label: 'Update E-mail ID', onClick: openEmail, disabled: !ledgerId },
  ];

  const filteredLedgers = ledgersList.filter((l) =>
    l.name.toLowerCase().includes(ledgerQuery.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white font-sans text-black">
      <ReportHeader
        title="Payment Advice"
        companyName={selectedCompany?.name}
        periodLabel={periodLabel}
      />

      {/* Ledger + period sub-header */}
      <div className="flex justify-between items-center px-3 py-1 border-b border-gray-300 text-[11px]">
        <div>
          Ledger: <span className="font-bold">{ledgerName || '—'}</span>
        </div>
        <div className="font-bold">{periodLabel}</div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {error && (
            <div className="mx-3 mt-2 text-[11px] border border-black px-2 py-1 flex justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="font-bold">
                &times;
              </button>
            </div>
          )}

          {/* Register table */}
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="border-b border-black">
                  <th className="px-2 py-1 text-left font-bold w-6" />
                  <th className="px-2 py-1 text-left font-bold w-24">Date</th>
                  <th className="px-2 py-1 text-left font-bold">Particulars</th>
                  <th className="px-2 py-1 text-left font-bold w-28">Vch Type</th>
                  <th className="px-2 py-1 text-left font-bold w-20">Vch No.</th>
                  <th className="px-2 py-1 text-center font-bold w-24">Reconciled</th>
                  <th className="px-2 py-1 text-center font-bold w-24">Printed / Emailed ?</th>
                  <th className="px-2 py-1 text-right font-bold w-32">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-2 py-8 text-center text-gray-500 italic">
                      {loading
                        ? 'Loading…'
                        : ledgerId
                          ? 'No payments to this party in the selected period.'
                          : 'Select a ledger.'}
                    </td>
                  </tr>
                ) : (
                  rows.map((r, i) => {
                    const isSel = selected.has(r.voucher_id);
                    const isCursor = i === cursor;
                    return (
                      <tr
                        key={r.voucher_id}
                        onClick={() => {
                          setCursor(i);
                          toggleSelect(r.voucher_id);
                        }}
                        onDoubleClick={() => alterRow(r)}
                        className={`cursor-pointer border-b border-gray-100 ${
                          isSel ? 'bg-gray-300' : isCursor ? 'bg-gray-100' : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="px-2 py-1 text-center">{isSel ? '✓' : ''}</td>
                        <td className="px-2 py-1">{fmtDate(r.date)}</td>
                        <td className="px-2 py-1">
                          {r.particulars || <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-2 py-1">{r.voucher_type}</td>
                        <td className="px-2 py-1">
                          {r.voucher_number || <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-2 py-1 text-center">{r.reconciled ? 'Yes' : 'No'}</td>
                        <td className="px-2 py-1 text-center">{r.printed ? 'Printed' : 'No'}</td>
                        <td className="px-2 py-1 text-right font-semibold">{inr(r.amount)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="border-t border-black text-[11px]">
            <div className="flex justify-between px-2 py-0.5 tracking-widest font-semibold">
              <span>Selected Total</span>
              <span className="font-bold pr-1">{inr(selectedTotal)}</span>
            </div>
            <div className="flex justify-between px-2 py-0.5 tracking-widest font-semibold border-t border-gray-300">
              <span>Grand Total</span>
              <span className="font-bold pr-1">{inr(grandTotal)}</span>
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
                  if (r) toggleSelect(r.voucher_id);
                },
              },
              { k: 'R', l: 'Remove Line', on: removeLine },
              { k: 'U', l: 'Restore Line', on: reload },
              { k: 'F12', l: 'Configure', on: () => setPeriodOpen(true) },
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

        <RightActionPanel actions={rightActions} title="Payment Advice" />
      </div>

      {/* Select Item popup (Tally: Name of Ledger + List of Ledgers) */}
      {ledgerOpen && (
        <div
          className="absolute inset-0 z-50 bg-black/10 flex items-start justify-center pt-24"
          onClick={() => ledgerId && setLedgerOpen(false)}
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
                value={ledgerQuery}
                onChange={(e) => setLedgerQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filteredLedgers[0])
                    chooseLedger(filteredLedgers[0].ledger_id);
                  if (e.key === 'Escape' && ledgerId) setLedgerOpen(false);
                }}
                className="w-full text-[12px] border border-gray-300 px-1 py-0.5 bg-yellow-50 outline-none focus:border-black"
              />
            </div>
            <div className="bg-gray-900 text-white text-[11px] font-bold px-2 py-0.5 flex justify-between">
              <span>List of Ledgers</span>
            </div>
            <div className="max-h-72 overflow-auto">
              {filteredLedgers.length === 0 ? (
                <div className="px-2 py-2 text-[11px] text-gray-500">No ledgers found.</div>
              ) : (
                filteredLedgers.map((l) => (
                  <button
                    key={l.ledger_id}
                    onClick={() => chooseLedger(l.ledger_id)}
                    className="w-full text-left text-[12px] px-2 py-1 hover:bg-yellow-200 flex justify-between items-center"
                  >
                    <span>{l.name}</span>
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

      {/* Update E-mail ID popup (Tally: W) */}
      {emailOpen && (
        <div
          className="absolute inset-0 z-50 bg-black/10 flex items-start justify-center pt-24"
          onClick={() => setEmailOpen(false)}
        >
          <div
            className="w-80 bg-white border border-gray-400 shadow-lg p-3 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center text-[12px] font-bold border-b border-gray-300 pb-1">
              Update E-mail ID
            </div>
            <div className="text-[11px] text-gray-600">{ledgerName}</div>
            <input
              autoFocus
              type="email"
              value={emailDraft}
              onChange={(e) => setEmailDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEmail();
                if (e.key === 'Escape') setEmailOpen(false);
              }}
              placeholder="name@example.com"
              className="w-full text-[12px] border border-gray-300 px-1 py-0.5 bg-yellow-50 outline-none focus:border-black"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setEmailOpen(false)}
                className="text-[11px] px-3 py-1 border border-gray-400 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={saveEmail}
                className="text-[11px] px-3 py-1 border border-black font-bold hover:bg-gray-100"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
