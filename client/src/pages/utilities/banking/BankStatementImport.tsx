import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import ReportHeader from '@/components/ui/ReportHeader';
import RightActionPanel, { type RightPanelAction } from '@/components/ui/RightActionPanel';
import NotificationBanner from '@/components/ui/NotificationBanner';
import { PRIORITY, useShortcuts } from '@/lib/shortcuts';
import {
  downloadBankStatementCsvTemplate,
  downloadBankStatementXlsxTemplate,
} from '@/lib/bankStatementTemplate';
import type { BankStatementImportRow } from '@/types/api/Transactions';

type BankLedger = { ledger_id: number; name: string };

const KEYBAR_BTN = 'flex-1 px-2 py-1 border-r border-gray-300 text-left hover:bg-gray-100';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (iso?: string | null) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${Number(d)}-${MONTHS[Number(m) - 1] ?? m}-${y.slice(2)}`;
};

// Banking → Import Bank Statement: list of imported statements + the upload
// entry point. Each import drills to the review screen where lines become
// Payment / Receipt / Contra vouchers.
export default function BankStatementImport() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [imports, setImports] = useState<BankStatementImportRow[]>([]);
  const [cursor, setCursor] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Bank picker for files whose account number didn't resolve to one ledger.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerBanks, setPickerBanks] = useState<BankLedger[]>([]);
  const [pickerQuery, setPickerQuery] = useState('');
  const [pickerHint, setPickerHint] = useState('');
  const pendingFile = useRef<{ name: string; content: string } | null>(null);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);
  const pickFile = useCallback(() => fileRef.current?.click(), []);

  const reload = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const res = await window.api.banking.getStatementImports(companyId);
    setLoading(false);
    if (res.success) {
      setImports(res.imports);
      setCursor((c) => Math.min(c, Math.max(res.imports.length - 1, 0)));
    } else {
      setError(res.error || 'Failed to load statement imports');
    }
  }, [companyId]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    rowRefs.current[cursor]?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const openReview = useCallback(
    (row: BankStatementImportRow | undefined) => {
      if (row) navigate(`/utilities/banking/statement-import/${row.import_id}`);
    },
    [navigate],
  );

  // Send the file content to the server; when it can't identify the bank ledger
  // from the account number, open the bank picker and retry with the choice.
  const runImport = useCallback(
    async (fileName: string, content: string, ledgerId?: number) => {
      if (!companyId) return;
      setError(null);
      setNotice(null);
      const res = await window.api.banking.importBankStatement({
        company_id: companyId,
        ledger_id: ledgerId ?? null,
        file_name: fileName,
        content,
      });
      if (!res.success) {
        setError(res.error || 'Import failed');
        return;
      }
      if (res.needs_ledger) {
        pendingFile.current = { name: fileName, content };
        let banks: BankLedger[] = res.candidates?.length ? res.candidates : [];
        if (!banks.length) {
          const bankRes = await window.api.banking.getBankLedgers(companyId);
          banks = bankRes.success ? bankRes.ledgers : [];
        }
        if (!banks.length) {
          setError(
            'No bank ledgers found. Create a bank ledger (group: Bank Accounts) with its account number first.',
          );
          return;
        }
        setPickerBanks(banks);
        setPickerHint(
          res.account_number
            ? `Account number ${res.account_number} did not match exactly one bank ledger — select the bank for these ${res.rows_found} transactions.`
            : `No account number found in the file — select the bank ledger for these ${res.rows_found} transactions.`,
        );
        setPickerQuery('');
        setPickerOpen(true);
        return;
      }
      pendingFile.current = null;
      await reload();
      if (res.import_id) {
        const extras = [
          res.duplicates ? `${res.duplicates} possible duplicate(s)` : '',
          res.skipped ? `${res.skipped} row(s) could not be parsed and were skipped` : '',
          res.warnings?.length ? res.warnings[0] : '',
        ].filter(Boolean);
        navigate(`/utilities/banking/statement-import/${res.import_id}`, {
          state: {
            notice: `Imported ${res.total} transactions into ${res.ledger_name}${
              res.matched_by === 'account_number' ? ' (matched by account number)' : ''
            }${extras.length ? ` — ${extras.join('; ')}` : ''}.`,
          },
        });
      }
    },
    [companyId, navigate, reload],
  );

  const onFilePicked = useCallback(
    async (file: File | undefined | null) => {
      if (!file) return;
      if (/\.xlsx?$/i.test(file.name)) {
        setError(
          'Excel files must be saved as CSV first (File → Save As → CSV), then imported here.',
        );
        return;
      }
      const content = await file.text();
      await runImport(file.name, content);
    },
    [runImport],
  );

  const deleteImport = useCallback(async () => {
    const row = imports[cursor];
    if (!row || !companyId) return;
    const created = row.created_count || 0;
    const ok = window.confirm(
      `Delete this statement import (${row.total_rows} rows)?` +
        (created ? ` The ${created} voucher(s) already created from it will NOT be deleted.` : ''),
    );
    if (!ok) return;
    const res = await window.api.banking.deleteStatementImport(companyId, row.import_id);
    if (!res.success) setError(res.error || 'Delete failed');
    else setNotice('Statement import deleted.');
    reload();
  }, [imports, cursor, companyId, reload]);

  const rightActions: RightPanelAction[] = [
    { key: 'I', label: 'Import Statement', onClick: pickFile },
    { key: 'T', label: 'CSV Template', onClick: downloadBankStatementCsvTemplate },
    { key: 'X', label: 'Excel Template', onClick: downloadBankStatementXlsxTemplate },
    {
      key: 'Alt+D',
      label: 'Delete Import',
      onClick: deleteImport,
      disabled: imports.length === 0,
    },
  ];

  useShortcuts(
    [
      {
        keys: 'ArrowDown',
        handler: () => setCursor((c) => Math.min(c + 1, Math.max(imports.length - 1, 0))),
      },
      { keys: 'ArrowUp', handler: () => setCursor((c) => Math.max(c - 1, 0)) },
      { keys: 'Enter', handler: () => openReview(imports[cursor]) },
      { keys: 'i', handler: pickFile },
      { keys: 't', handler: downloadBankStatementCsvTemplate },
      { keys: 'x', handler: downloadBankStatementXlsxTemplate },
      { keys: 'Alt+D', handler: deleteImport },
      { keys: 'Escape', handler: () => navigate('/utilities/banking') },
    ],
    { priority: PRIORITY.SCREEN, enabled: !pickerOpen },
  );

  // While the bank picker is open it owns Escape (otherwise the global Footer
  // Escape fires and navigates the screen away).
  useShortcuts([{ keys: 'Escape', handler: () => setPickerOpen(false), allowInInputs: true }], {
    priority: PRIORITY.POPUP,
    enabled: pickerOpen,
  });

  const filteredBanks = pickerBanks.filter((b) =>
    b.name.toLowerCase().includes(pickerQuery.toLowerCase()),
  );

  const chooseBank = (b: BankLedger) => {
    setPickerOpen(false);
    const pf = pendingFile.current;
    if (pf) runImport(pf.name, pf.content, b.ledger_id);
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white font-sans text-black">
      <ReportHeader title="Import Bank Statement" companyName={selectedCompany?.name} />

      <input
        ref={fileRef}
        type="file"
        accept=".csv,.txt,text/csv"
        className="hidden"
        onChange={(e) => {
          onFilePicked(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

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
                  <th className="px-2 py-1 text-left font-bold w-24">Imported On</th>
                  <th className="px-2 py-1 text-left font-bold">Bank Ledger</th>
                  <th className="px-2 py-1 text-left font-bold">File</th>
                  <th className="px-2 py-1 text-left font-bold w-40">Statement Period</th>
                  <th className="px-2 py-1 text-right font-bold w-16">Rows</th>
                  <th className="px-2 py-1 text-right font-bold w-16">Pending</th>
                  <th className="px-2 py-1 text-right font-bold w-16">Created</th>
                  <th className="px-2 py-1 text-right font-bold w-16">Ignored</th>
                </tr>
              </thead>
              <tbody>
                {imports.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-2 py-10 text-center text-gray-500 italic">
                      {loading ? (
                        'Loading…'
                      ) : (
                        <>
                          No bank statements imported yet.
                          <br />
                          Press <span className="font-bold not-italic">I</span> to import a CSV
                          statement, or <span className="font-bold not-italic">T</span> /{' '}
                          <span className="font-bold not-italic">X</span> to download the CSV /
                          Excel template.
                        </>
                      )}
                    </td>
                  </tr>
                ) : (
                  imports.map((row, i) => (
                    <tr
                      key={row.import_id}
                      ref={(el) => {
                        rowRefs.current[i] = el;
                      }}
                      onClick={() => setCursor(i)}
                      onDoubleClick={() => openReview(row)}
                      className={`border-b border-gray-100 cursor-pointer ${
                        i === cursor ? 'bg-gray-100' : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-2 py-1 whitespace-nowrap">
                        {fmtDate((row.imported_at || '').slice(0, 10))}
                      </td>
                      <td className="px-2 py-1 font-semibold">{row.ledger_name}</td>
                      <td className="px-2 py-1">{row.file_name || '—'}</td>
                      <td className="px-2 py-1 whitespace-nowrap">
                        {fmtDate(row.statement_from)} to {fmtDate(row.statement_to)}
                      </td>
                      <td className="px-2 py-1 text-right">{row.total_rows}</td>
                      <td className="px-2 py-1 text-right">
                        {(row.pending_count || 0) + (row.duplicate_count || 0)}
                      </td>
                      <td className="px-2 py-1 text-right font-semibold">
                        {row.created_count || 0}
                      </td>
                      <td className="px-2 py-1 text-right">{row.ignored_count || 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-300 bg-gray-50 flex text-[10px] font-bold">
            <button onClick={() => navigate('/utilities/banking')} className={KEYBAR_BTN}>
              <span className="underline">Q</span>: Quit
            </button>
            <button onClick={() => openReview(imports[cursor])} className={KEYBAR_BTN}>
              <span className="underline">Enter</span>: Review
            </button>
            <button onClick={pickFile} className={KEYBAR_BTN}>
              <span className="underline">I</span>: Import Statement
            </button>
            <button onClick={downloadBankStatementCsvTemplate} className={KEYBAR_BTN}>
              <span className="underline">T</span>: CSV Template
            </button>
            <button onClick={downloadBankStatementXlsxTemplate} className={KEYBAR_BTN}>
              <span className="underline">X</span>: Excel Template
            </button>
          </div>
        </div>

        <RightActionPanel actions={rightActions} title="Import Statement" />
      </div>

      {/* Select Bank popup — shown when the file's account number can't be matched. */}
      {pickerOpen && (
        <div
          className="absolute inset-0 z-50 bg-black/10 flex items-start justify-center pt-24"
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="w-96 bg-white border border-black shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center text-[12px] font-bold border-b border-gray-300 py-1">
              Select Bank Ledger
            </div>
            <div className="px-2 py-1 text-[10px] text-gray-600">{pickerHint}</div>
            <div className="px-2 py-1">
              <input
                autoFocus
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filteredBanks[0]) {
                    e.preventDefault();
                    e.stopPropagation();
                    chooseBank(filteredBanks[0]);
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    setPickerOpen(false);
                  }
                }}
                className="w-full text-[12px] border border-gray-300 px-1 py-0.5 outline-none focus:border-black"
              />
            </div>
            <div className="bg-black text-white text-[11px] font-bold px-2 py-0.5">
              List of Bank Ledgers
            </div>
            <div className="max-h-72 overflow-auto">
              {filteredBanks.length === 0 ? (
                <div className="px-2 py-2 text-[11px] text-gray-500">No bank ledgers found.</div>
              ) : (
                filteredBanks.map((b) => (
                  <button
                    key={b.ledger_id}
                    onClick={() => chooseBank(b)}
                    className="w-full text-left text-[12px] px-2 py-1 hover:bg-gray-100"
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
