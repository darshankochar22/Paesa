import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PRIORITY, useShortcuts } from '@/lib/shortcuts';

// TallyPrime's Alt+G "Go To" — jump to any report or screen by name.
// Registered as a deferred global so screens that already bind Alt+G for
// their own purpose (several master create/alter screens) keep it there.

interface Destination {
  label: string;
  route: string;
  group: string;
}

const DESTINATIONS: Destination[] = [
  { label: 'Gateway of Tally', route: '/', group: 'Home' },
  { label: 'Dashboard', route: '/dashboard', group: 'Home' },
  { label: 'Create Master', route: '/master/create', group: 'Masters' },
  { label: 'Alter Master', route: '/master/alter', group: 'Masters' },
  { label: 'Chart of Accounts', route: '/master/coa', group: 'Masters' },
  { label: 'Vouchers', route: '/transactions/vouchers', group: 'Transactions' },
  { label: 'Voucher Register', route: '/transactions/voucher-list', group: 'Transactions' },
  { label: 'Day Book', route: '/transactions/daybook', group: 'Transactions' },
  { label: 'Banking', route: '/utilities/banking', group: 'Utilities' },
  { label: 'AI Copilot', route: '/utilities/copilot', group: 'Utilities' },
  { label: 'Balance Sheet', route: '/reports/accounts/balance-sheet', group: 'Reports' },
  { label: 'Profit & Loss A/c', route: '/reports/accounts/profit-loss', group: 'Reports' },
  { label: 'Trial Balance', route: '/reports/accounts/trial-balance', group: 'Reports' },
  { label: 'Cash Flow', route: '/reports/accounts/cash-flow', group: 'Reports' },
  { label: 'Funds Flow', route: '/reports/accounts/funds-flow', group: 'Reports' },
  { label: 'Ratio Analysis', route: '/reports/accounts/ratio-analysis', group: 'Reports' },
  { label: 'Account Books', route: '/reports/account-books', group: 'Reports' },
  { label: 'Statements of Accounts', route: '/reports/statements-of-accounts', group: 'Reports' },
  { label: 'Stock Summary', route: '/reports/inventory/stock-summary', group: 'Inventory' },
  { label: 'Inventory Books', route: '/reports/inventory-books', group: 'Inventory' },
  {
    label: 'Statements of Inventory',
    route: '/reports/statements-of-inventory',
    group: 'Inventory',
  },
  { label: 'Job Work Reports', route: '/reports/job-work', group: 'Inventory' },
  { label: 'Statutory Reports', route: '/reports/statutory', group: 'Statutory' },
  { label: 'GSTR-1', route: '/master/statutory/gstr1', group: 'Statutory' },
  { label: 'e-Invoice', route: '/compliance/einvoice', group: 'Statutory' },
  { label: 'e-Way Bill', route: '/compliance/eway', group: 'Statutory' },
  { label: 'Upload GST Returns', route: '/compliance/filing', group: 'Statutory' },
  { label: 'Payroll Reports', route: '/reports/payroll-hr', group: 'Payroll' },
  { label: 'Exception Reports', route: '/reports/exception', group: 'Exception' },
  { label: 'Analysis & Verification', route: '/reports/analysis-verification', group: 'Exception' },
];

export default function GoToPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const openPalette = () => {
    setQuery('');
    setIndex(0);
    setOpen(true);
  };

  // Alt+G "Go To" and Ctrl+G "Switch To" — both open the navigation palette.
  // Deferred, so a screen already binding these keeps its own behaviour.
  useShortcuts(
    [
      { keys: 'Alt+G', handler: openPalette, defer: true, allowInInputs: true },
      { keys: 'Ctrl+G', handler: openPalette, defer: true, allowInInputs: true },
    ],
    { priority: PRIORITY.GLOBAL },
  );

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const filtered = q
    ? DESTINATIONS.filter(
        (d) => d.label.toLowerCase().includes(q) || d.group.toLowerCase().includes(q),
      )
    : DESTINATIONS;
  const selected = Math.min(index, Math.max(filtered.length - 1, 0));

  const go = (dest: Destination | undefined) => {
    if (!dest) return;
    setOpen(false);
    navigate(dest.route);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndex(filtered.length ? (selected + 1) % filtered.length : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex(filtered.length ? (selected - 1 + filtered.length) % filtered.length : 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      go(filtered[selected]);
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Go To"
      className="fixed inset-0 z-[60] bg-black/40 flex items-start justify-center pt-24"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="w-[28rem] max-h-[60vh] bg-white border border-black shadow-none flex flex-col font-mono text-sm">
        <div className="flex items-center justify-between px-3 py-2 border-b border-black bg-black text-white">
          <span className="font-bold uppercase tracking-wider text-xs">Go To</span>
          <span className="text-[10px] text-zinc-300">Alt+G</span>
        </div>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Type a report or screen name…"
          className="px-3 py-2 border-b border-zinc-300 outline-none text-black placeholder:text-zinc-400"
          data-enter-nav-ignore
        />
        <div className="flex-1 overflow-y-auto min-h-0">
          {filtered.length === 0 && (
            <div className="px-3 py-4 text-zinc-400 text-xs">No matching screen.</div>
          )}
          {filtered.map((d, i) => (
            <button
              key={d.route + d.label}
              onClick={() => go(d)}
              onMouseMove={() => setIndex(i)}
              className={`w-full text-left px-3 py-1.5 flex items-center justify-between ${
                i === selected ? 'bg-black text-white' : 'text-zinc-800 hover:bg-zinc-100'
              }`}
            >
              <span>{d.label}</span>
              <span
                className={`text-[10px] uppercase tracking-wider ${
                  i === selected ? 'text-zinc-300' : 'text-zinc-400'
                }`}
              >
                {d.group}
              </span>
            </button>
          ))}
        </div>
        <div className="px-3 py-1.5 border-t border-zinc-300 text-[10px] text-zinc-500 flex gap-4">
          <span>↑↓ Navigate</span>
          <span>Enter Open</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
}
