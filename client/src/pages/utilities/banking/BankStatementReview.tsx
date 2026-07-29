import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import ReportHeader from '@/components/ui/ReportHeader';
import RightActionPanel, { type RightPanelAction } from '@/components/ui/RightActionPanel';
import NotificationBanner from '@/components/ui/NotificationBanner';
import { PRIORITY, useShortcuts } from '@/lib/shortcuts';
import type { BankStatementImportRow, BankStatementLineRow } from '@/types/api/Transactions';

type LedgerOption = { ledger_id: number; name: string; group_name?: string };

const inr = (n: number) =>
  n
    ? Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (iso?: string | null) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${Number(d)}-${MONTHS[Number(m) - 1] ?? m}-${y.slice(2)}`;
};

const MATCH_LABEL: Record<string, string> = {
  account_number: 'A/c match',
  rule: 'Learned',
  ledger_name: 'Name match',
  keyword: 'Keyword',
  manual: 'Manual',
};

// Review one imported bank statement: adjust each line's voucher type and
// counter ledger, then create the Payment / Receipt / Contra vouchers in bulk.
// Created vouchers are auto-reconciled with the statement date.
export default function BankStatementReview() {
  const navigate = useNavigate();
  const location = useLocation();
  const { importId } = useParams<{ importId: string }>();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [header, setHeader] = useState<BankStatementImportRow | null>(null);
  const [rows, setRows] = useState<BankStatementLineRow[]>([]);
  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(
    (location.state as { notice?: string } | null)?.notice || null,
  );

  const [ledgers, setLedgers] = useState<LedgerOption[]>([]);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ledgerQuery, setLedgerQuery] = useState('');

  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  const reload = useCallback(async () => {
    if (!companyId || !importId) return;
    setLoading(true);
    const res = await window.api.banking.getStatementImportLines(companyId, Number(importId));
    setLoading(false);
    if (res.success) {
      setHeader(res.import || null);
      setRows(res.rows);
      setCursor((c) => Math.min(c, Math.max(res.rows.length - 1, 0)));
    } else {
      setError(res.error || 'Failed to load statement lines');
    }
  }, [companyId, importId]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Full ledger list for the counter-ledger picker (bank ledger itself excluded).
  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      const res = await window.api.ledger.getAll(companyId);
      if (cancelled || !res.success) return;
      setLedgers(
        (res.ledgers as unknown as LedgerOption[]).map((l) => ({
          ledger_id: l.ledger_id,
          name: l.name,
          group_name: l.group_name,
        })),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  useEffect(() => {
    rowRefs.current[cursor]?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const editable = (r: BankStatementLineRow) => r.status === 'pending' || r.status === 'duplicate';

  const patchLine = useCallback(
    async (
      line: BankStatementLineRow,
      patch: {
        voucher_type?: string;
        contra_ledger_id?: number | null;
        status?: 'pending' | 'ignored';
      },
    ) => {
      if (!companyId) return;
      const res = await window.api.banking.updateStatementLine({
        company_id: companyId,
        line_id: line.line_id,
        ...patch,
      });
      if (res.success && res.line) {
        const updated = res.line;
        setRows((prev) => prev.map((r) => (r.line_id === updated.line_id ? updated : r)));
      } else if (!res.success) {
        setError(res.error || 'Update failed');
      }
    },
    [companyId],
  );

  const toggleSelect = useCallback((line: BankStatementLineRow) => {
    if (!editable(line)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(line.line_id)) next.delete(line.line_id);
      else next.add(line.line_id);
      return next;
    });
  }, []);

  const toggleIgnore = useCallback(() => {
    const targets =
      selected.size > 0
        ? rows.filter((r) => selected.has(r.line_id))
        : rows[cursor]
          ? [rows[cursor]]
          : [];
    targets.forEach((r) => {
      if (r.status === 'ignored') patchLine(r, { status: 'pending' });
      else if (editable(r)) patchLine(r, { status: 'ignored' });
    });
    setSelected(new Set());
  }, [selected, rows, cursor, patchLine]);

  // Create vouchers for the selected lines, or every PENDING line when nothing
  // is selected — 'Duplicate?' lines only post when explicitly selected, so a
  // re-imported statement can't double-post with one keystroke. The server
  // reports per-line results; failures stay pending.
  const createVouchers = useCallback(async () => {
    if (!companyId || busy) return;
    const explicit = selected.size > 0;
    const targets = explicit
      ? rows.filter((r) => selected.has(r.line_id) && editable(r))
      : rows.filter((r) => r.status === 'pending');
    if (!targets.length) {
      setError('No pending lines to create vouchers for.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    const res = await window.api.banking.createVouchersFromStatement({
      company_id: companyId,
      line_ids: targets.map((r) => r.line_id),
      include_duplicates: explicit,
    });
    setBusy(false);
    setSelected(new Set());
    if (!res.success) {
      setError(res.error || 'Voucher creation failed');
    } else {
      const firstError = res.results?.find((r) => !r.success)?.error;
      if (res.failed) {
        setError(
          `Created ${res.created} voucher(s); ${res.failed} line(s) failed${
            firstError ? ` — ${firstError}` : ''
          }`,
        );
      } else {
        setNotice(
          `Created ${res.created} voucher(s) and reconciled them with the statement dates.`,
        );
      }
    }
    reload();
  }, [companyId, busy, selected, rows, reload]);

  const deleteImport = useCallback(async () => {
    if (!companyId || !header) return;
    const created = header.created_count || rows.filter((r) => r.status === 'created').length;
    const ok = window.confirm(
      `Delete this statement import?` +
        (created ? ` The ${created} voucher(s) already created will NOT be deleted.` : ''),
    );
    if (!ok) return;
    const res = await window.api.banking.deleteStatementImport(companyId, header.import_id);
    if (!res.success) setError(res.error || 'Delete failed');
    else navigate('/utilities/banking/statement-import');
  }, [companyId, header, rows, navigate]);

  const openLedgerPicker = useCallback(() => {
    const r = rows[cursor];
    if (r && editable(r)) {
      setLedgerQuery('');
      setLedgerOpen(true);
    }
  }, [rows, cursor]);

  // Picking a bank/cash ledger makes the line a Contra (and leaving one reverts
  // to the direction's default type) — mirrors the classifier's rule.
  const chooseLedger = (l: LedgerOption) => {
    setLedgerOpen(false);
    const r = rows[cursor];
    if (!r) return;
    const group = (l.group_name || '').toLowerCase();
    const isCashBank = group.includes('bank') || group.includes('cash');
    const directionDefault = Number(r.deposit) > 0 ? 'Receipt' : 'Payment';
    const voucher_type = isCashBank
      ? 'Contra'
      : r.voucher_type === 'Contra'
        ? directionDefault
        : r.voucher_type || directionDefault;
    patchLine(r, { contra_ledger_id: l.ledger_id, voucher_type });
  };

  const drill = useCallback(
    (r: BankStatementLineRow | undefined) => {
      if (r?.status === 'created' && r.voucher_id) {
        navigate(`/transactions/voucher/${r.voucher_id}`);
      } else if (r && editable(r)) {
        openLedgerPicker();
      }
    },
    [navigate, openLedgerPicker],
  );

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => {
          acc.withdrawal += Number(r.withdrawal) || 0;
          acc.deposit += Number(r.deposit) || 0;
          if (r.status === 'pending') acc.pending++;
          if (r.status === 'duplicate') acc.duplicate++;
          if (r.status === 'created') acc.created++;
          return acc;
        },
        { withdrawal: 0, deposit: 0, pending: 0, duplicate: 0, created: 0 },
      ),
    [rows],
  );

  const rightActions: RightPanelAction[] = [
    {
      key: 'F5',
      label: busy ? 'Creating…' : 'Create Vouchers',
      onClick: createVouchers,
      disabled: busy || (totals.pending === 0 && selected.size === 0),
    },
    { key: 'L', label: 'Set Ledger', onClick: openLedgerPicker, disabled: rows.length === 0 },
    { key: 'I', label: 'Ignore / Restore', onClick: toggleIgnore, disabled: rows.length === 0 },
    { key: 'Alt+D', label: 'Delete Import', onClick: deleteImport, disabled: !header },
  ];

  useShortcuts(
    [
      {
        keys: 'ArrowDown',
        handler: () => setCursor((c) => Math.min(c + 1, Math.max(rows.length - 1, 0))),
      },
      { keys: 'ArrowUp', handler: () => setCursor((c) => Math.max(c - 1, 0)) },
      {
        keys: 'Space',
        handler: () => {
          const r = rows[cursor];
          if (r) toggleSelect(r);
        },
      },
      { keys: 'Enter', handler: () => drill(rows[cursor]) },
      { keys: 'F5', handler: createVouchers },
      { keys: 'l', handler: openLedgerPicker },
      { keys: 'i', handler: toggleIgnore },
      { keys: 'Alt+D', handler: deleteImport },
      {
        keys: 'Escape',
        handler: () => {
          if (ledgerOpen) return false;
          navigate('/utilities/banking/statement-import');
        },
      },
    ],
    { priority: PRIORITY.SCREEN, enabled: !ledgerOpen },
  );

  // While the ledger picker is open it owns Escape (the screen's bindings are
  // disabled above, and without this the global Footer Escape would navigate).
  useShortcuts([{ keys: 'Escape', handler: () => setLedgerOpen(false), allowInInputs: true }], {
    priority: PRIORITY.POPUP,
    enabled: ledgerOpen,
  });

  const bankLedgerId = header?.ledger_id;
  const filteredLedgers = ledgers.filter(
    (l) => l.ledger_id !== bankLedgerId && l.name.toLowerCase().includes(ledgerQuery.toLowerCase()),
  );

  const periodLabel = header
    ? `${fmtDate(header.statement_from)} to ${fmtDate(header.statement_to)}`
    : '';

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white font-sans text-black">
      <ReportHeader
        title="Bank Statement Review"
        companyName={selectedCompany?.name}
        periodLabel={periodLabel}
      />

      <div className="grid grid-cols-3 items-center px-3 py-1 border-b border-gray-300 text-[11px]">
        <div>
          Bank: <span className="font-bold">{header?.ledger_name || '—'}</span>
          {header?.account_number ? (
            <span className="text-gray-600"> (A/c {header.account_number})</span>
          ) : null}
        </div>
        <div className="text-center italic text-gray-600">{header?.file_name || ''}</div>
        <div className="text-right font-bold">{periodLabel}</div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          {error && (
            <div className="px-3">
              <NotificationBanner type="error" message={error} onDismiss={() => setError(null)} />
            </div>
          )}
          {notice && (
            <div className="px-3">
              <NotificationBanner
                type="success"
                message={notice}
                onDismiss={() => setNotice(null)}
              />
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-[11px] border-collapse">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-black">
                  <th className="px-2 py-1 text-left font-bold w-6" />
                  <th className="px-2 py-1 text-left font-bold w-20">Date</th>
                  <th className="px-2 py-1 text-left font-bold">Narration</th>
                  <th className="px-2 py-1 text-left font-bold w-24">Ref No</th>
                  <th className="px-2 py-1 text-left font-bold w-24">Vch Type</th>
                  <th className="px-2 py-1 text-left font-bold w-48">Ledger</th>
                  <th className="px-2 py-1 text-left font-bold w-20">Via</th>
                  <th className="px-2 py-1 text-right font-bold w-24">Withdrawal</th>
                  <th className="px-2 py-1 text-right font-bold w-24">Deposit</th>
                  <th className="px-2 py-1 text-left font-bold w-28">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-2 py-8 text-center text-gray-500 italic">
                      {loading ? 'Loading…' : 'No statement lines.'}
                    </td>
                  </tr>
                ) : (
                  rows.map((r, i) => {
                    const isSel = selected.has(r.line_id);
                    const isCursor = i === cursor;
                    const canEdit = editable(r);
                    return (
                      <tr
                        key={r.line_id}
                        ref={(el) => {
                          rowRefs.current[i] = el;
                        }}
                        onClick={() => setCursor(i)}
                        onDoubleClick={() => drill(r)}
                        className={`border-b border-gray-100 ${
                          isSel ? 'bg-gray-300' : isCursor ? 'bg-gray-100' : 'hover:bg-gray-50'
                        } ${r.status === 'ignored' ? 'text-gray-400' : ''}`}
                      >
                        <td
                          className="px-2 py-1 text-center cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelect(r);
                          }}
                        >
                          {isSel ? '✓' : ''}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap">{fmtDate(r.txn_date)}</td>
                        <td className="px-2 py-1 max-w-0 truncate" title={r.narration || ''}>
                          {r.narration || <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-2 py-1 truncate">{r.ref_no || ''}</td>
                        <td className="px-1 py-0.5">
                          {isCursor && canEdit ? (
                            <select
                              value={r.voucher_type || ''}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => patchLine(r, { voucher_type: e.target.value })}
                              className="w-full text-[11px] border border-gray-300 px-1 py-0.5 bg-white outline-none focus:border-black"
                            >
                              {/* The statement fixes the direction: deposits can't be Payments, withdrawals can't be Receipts. */}
                              {(Number(r.deposit) > 0
                                ? ['Receipt', 'Contra']
                                : ['Payment', 'Contra']
                              ).map((t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="px-1">{r.voucher_type || '—'}</span>
                          )}
                        </td>
                        <td className="px-1 py-0.5">
                          {isCursor && canEdit ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openLedgerPicker();
                              }}
                              className={`w-full text-left text-[11px] border px-1 py-0.5 ${
                                r.contra_ledger_name
                                  ? 'border-gray-300'
                                  : 'border-black font-semibold'
                              } hover:border-black`}
                            >
                              {r.contra_ledger_name || 'Select ledger…'}
                            </button>
                          ) : (
                            <span className="px-1">
                              {r.contra_ledger_name || <span className="text-gray-400">—</span>}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1 text-gray-600">
                          {r.match_source ? MATCH_LABEL[r.match_source] || r.match_source : ''}
                        </td>
                        <td className="px-2 py-1 text-right font-semibold">
                          {inr(Number(r.withdrawal))}
                        </td>
                        <td className="px-2 py-1 text-right font-semibold">
                          {inr(Number(r.deposit))}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap">
                          {r.status === 'created' ? (
                            <span className="font-bold">✓ {r.voucher_number || 'Created'}</span>
                          ) : r.status === 'duplicate' ? (
                            <span className="font-semibold">Duplicate?</span>
                          ) : r.status === 'ignored' ? (
                            'Ignored'
                          ) : (
                            'Pending'
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-black text-[11px]">
            <div className="flex justify-between px-2 py-1 font-bold">
              <span>
                {totals.pending} pending
                {totals.duplicate ? ` · ${totals.duplicate} duplicate?` : ''} · {totals.created}{' '}
                created · {rows.length} total
              </span>
              <span className="flex gap-6">
                <span className="w-32 text-right">{inr(totals.withdrawal)}</span>
                <span className="w-32 text-right">{inr(totals.deposit)}</span>
              </span>
            </div>
          </div>

          <div className="border-t border-gray-300 bg-gray-50 flex text-[10px] font-bold">
            {[
              { k: 'Q', l: 'Quit', on: () => navigate('/utilities/banking/statement-import') },
              { k: 'Space', l: 'Select', on: () => rows[cursor] && toggleSelect(rows[cursor]) },
              { k: 'L', l: 'Set Ledger', on: openLedgerPicker },
              { k: 'I', l: 'Ignore', on: toggleIgnore },
              { k: 'F5', l: 'Create Vouchers', on: createVouchers },
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

        <RightActionPanel actions={rightActions} title="Statement Review" />
      </div>

      {/* Counter-ledger picker for the cursor row. */}
      {ledgerOpen && (
        <div
          className="absolute inset-0 z-50 bg-black/10 flex items-start justify-center pt-24"
          onClick={() => setLedgerOpen(false)}
        >
          <div
            className="w-96 bg-white border border-black shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center text-[12px] font-bold border-b border-gray-300 py-1">
              Select Ledger
            </div>
            <div className="px-2 py-1">
              <input
                autoFocus
                value={ledgerQuery}
                onChange={(e) => setLedgerQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filteredLedgers[0]) {
                    e.preventDefault();
                    e.stopPropagation();
                    chooseLedger(filteredLedgers[0]);
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    setLedgerOpen(false);
                  }
                }}
                className="w-full text-[12px] border border-gray-300 px-1 py-0.5 outline-none focus:border-black"
              />
            </div>
            <div className="bg-black text-white text-[11px] font-bold px-2 py-0.5">
              List of Ledgers
            </div>
            <div className="max-h-72 overflow-auto">
              {filteredLedgers.length === 0 ? (
                <div className="px-2 py-2 text-[11px] text-gray-500">No ledgers found.</div>
              ) : (
                filteredLedgers.slice(0, 200).map((l) => (
                  <button
                    key={l.ledger_id}
                    onClick={() => chooseLedger(l)}
                    className="w-full text-left text-[12px] px-2 py-1 hover:bg-gray-100 flex justify-between"
                  >
                    <span>{l.name}</span>
                    <span className="text-gray-500 text-[10px]">{l.group_name || ''}</span>
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
