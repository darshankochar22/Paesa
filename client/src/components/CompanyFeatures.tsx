import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { CompanyType } from '@/types/entities/Company';
import type { TallyFeaturesType } from '@/types/entities/TallyFeatures';

// F11 "Company Features" popup — the Tally-style feature toggle screen.
// Backed by window.api.tallyFeatures (tally_features table, one row per company).
// Strict black/white/zinc per UI.md — Yes/No shown via weight/fill, never colour.

type Level = 'basic' | 'more' | 'all';

interface Row {
  key: string; // tally_features snake_case column
  label: string;
  level: Level;
  indent?: boolean;
  default?: number;
}

interface Section {
  title: string;
  rows: Row[];
}

// Column 1 (left)
const LEFT: Section[] = [
  {
    title: 'Accounting',
    rows: [
      { key: 'maintain_accounts', label: 'Maintain Accounts', level: 'basic', default: 1 },
      {
        key: 'enable_bill_wise_entry',
        label: 'Enable Bill-wise entry',
        level: 'basic',
        indent: true,
      },
      {
        key: 'enable_cost_centres',
        label: 'Enable Cost Centres',
        level: 'basic',
        indent: true,
        default: 1,
      },
      {
        key: 'enable_interest_calculation',
        label: 'Enable Interest Calculation',
        level: 'more',
        indent: true,
      },
    ],
  },
  {
    title: 'Inventory',
    rows: [
      { key: 'maintain_inventory', label: 'Maintain Inventory', level: 'basic', default: 1 },
      {
        key: 'integrate_accounts_with_inventory',
        label: 'Integrate Accounts with Inventory',
        level: 'more',
        indent: true,
        default: 1,
      },
      {
        key: 'enable_multiple_price_levels',
        label: 'Enable multiple Price Levels',
        level: 'more',
        indent: true,
      },
      { key: 'enable_batches', label: 'Enable Batches', level: 'basic', indent: true },
      {
        key: 'maintain_expiry_date_for_batches',
        label: 'Maintain Expiry Date for Batches',
        level: 'more',
        indent: true,
      },
      {
        key: 'enable_job_order_processing',
        label: 'Enable Job Order Processing',
        level: 'more',
        indent: true,
      },
      { key: 'enable_cost_tracking', label: 'Enable Cost Tracking', level: 'all', indent: true },
      { key: 'enable_job_costing', label: 'Enable Job Costing', level: 'all', indent: true },
      {
        key: 'use_discount_column_in_invoices',
        label: 'Use Discount column in invoices',
        level: 'more',
        indent: true,
      },
      {
        key: 'use_separate_actual_billed_qty',
        label: 'Use separate Actual and Billed Quantity columns in invoices',
        level: 'more',
        indent: true,
      },
    ],
  },
];

// Column 2 (right)
const RIGHT: Section[] = [
  {
    title: 'Taxation',
    rows: [
      { key: 'enable_gst', label: 'Enable Goods and Services Tax (GST)', level: 'basic' },
      {
        key: 'set_alter_company_gst_details',
        label: 'Set/Alter Company GST Rate and Other Details',
        level: 'more',
        indent: true,
      },
      { key: 'enable_tds', label: 'Enable Tax Deducted at Source (TDS)', level: 'basic' },
      { key: 'enable_tcs', label: 'Enable Tax Collected at Source (TCS)', level: 'basic' },
      { key: 'enable_vat', label: 'Enable Value Added Tax (VAT)', level: 'all' },
      { key: 'enable_excise', label: 'Enable Excise', level: 'all' },
      { key: 'enable_service_tax', label: 'Enable Service Tax', level: 'all' },
    ],
  },
  {
    title: 'Online Access',
    rows: [
      {
        key: 'enable_browser_access_for_reports',
        label: 'Enable Browser Access for Reports',
        level: 'all',
      },
      {
        key: 'enable_tally_net_services',
        label: 'Enable Tally.NET Services for Remote Access & Synchronisation',
        level: 'all',
      },
    ],
  },
  {
    title: 'Payroll',
    rows: [
      { key: 'maintain_payroll', label: 'Maintain Payroll', level: 'basic' },
      {
        key: 'enable_payroll_statutory',
        label: 'Enable Payroll Statutory',
        level: 'more',
        indent: true,
      },
    ],
  },
  {
    title: 'Others',
    rows: [
      {
        key: 'enable_payment_request_qr',
        label: 'Enable Payment Request to share payment link/QR code',
        level: 'more',
        default: 1,
      },
      { key: 'enable_multiple_addresses', label: 'Enable multiple addresses', level: 'more' },
      { key: 'mark_modified_vouchers', label: 'Mark modified vouchers', level: 'more' },
    ],
  },
];

const ALL_ROWS: Row[] = [...LEFT, ...RIGHT].flatMap((s) => s.rows);

const DEFAULTS: Record<string, number> = ALL_ROWS.reduce(
  (acc, r) => ({ ...acc, [r.key]: r.default ?? 0 }),
  {} as Record<string, number>,
);

interface Props {
  open: boolean;
  onClose: () => void;
  company: CompanyType | null;
}

export default function CompanyFeatures({ open, onClose, company }: Props) {
  const companyId = company?.company_id;
  const [values, setValues] = useState<Record<string, number>>(DEFAULTS);
  const [showMore, setShowMore] = useState(true);
  const [showAll, setShowAll] = useState(true);
  const [focusIdx, setFocusIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const levelVisible = useCallback(
    (level: Level) => (level === 'all' ? showAll : level === 'more' ? showMore || showAll : true),
    [showMore, showAll],
  );

  // Flat list of currently-visible rows — drives keyboard navigation.
  const visibleRows = ALL_ROWS.filter((r) => levelVisible(r.level));

  // Hydrate from the DB each time the popup opens.
  useEffect(() => {
    if (!open || !companyId) return;
    let cancelled = false;
    setLoading(true);
    setFocusIdx(0);
    window.api.tallyFeatures
      .get(companyId)
      .then((res) => {
        if (cancelled) return;
        const feat = (res?.success && res.features ? res.features : {}) as TallyFeaturesType;
        const next: Record<string, number> = { ...DEFAULTS };
        for (const r of ALL_ROWS) {
          const v = (feat as Record<string, unknown>)[r.key];
          if (v !== undefined && v !== null) next[r.key] = Number(v) ? 1 : 0;
        }
        setValues(next);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, companyId]);

  const setVal = useCallback((key: string, v: number) => {
    setValues((prev) => (prev[key] === v ? prev : { ...prev, [key]: v }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!companyId || saving) return;
    setSaving(true);
    try {
      const payload: Partial<TallyFeaturesType> = { company_id: companyId };
      for (const r of ALL_ROWS) (payload as Record<string, number>)[r.key] = values[r.key] ? 1 : 0;
      const res = await window.api.tallyFeatures.update(payload);
      if (res?.success) onClose();
    } finally {
      setSaving(false);
    }
  }, [companyId, values, saving, onClose]);

  const handleReset = useCallback(async () => {
    if (!companyId) return;
    setSaving(true);
    try {
      const res = await window.api.tallyFeatures.reset(companyId);
      if (res?.success && res.features) {
        const next: Record<string, number> = { ...DEFAULTS };
        for (const r of ALL_ROWS) {
          const v = (res.features as Record<string, unknown>)[r.key];
          if (v !== undefined && v !== null) next[r.key] = Number(v) ? 1 : 0;
        }
        setValues(next);
      }
    } finally {
      setSaving(false);
    }
  }, [companyId]);

  // Keyboard: Esc/Q close, arrows move focus, Y/N/Space set, Ctrl/Alt+A accept.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const key = e.key.toLowerCase();
      if (e.key === 'Escape' || key === 'q') {
        e.preventDefault();
        onClose();
      } else if ((e.ctrlKey || e.altKey) && key === 'a') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusIdx((i) => Math.min(i + 1, visibleRows.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusIdx((i) => Math.max(i - 1, 0));
      } else if (key === 'y') {
        e.preventDefault();
        const r = visibleRows[focusIdx];
        if (r) setVal(r.key, 1);
      } else if (key === 'n') {
        e.preventDefault();
        const r = visibleRows[focusIdx];
        if (r) setVal(r.key, 0);
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        const r = visibleRows[focusIdx];
        if (r) setVal(r.key, values[r.key] ? 0 : 1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, focusIdx, visibleRows, values, setVal, handleSave, onClose]);

  if (!open) return null;

  const focusedKey = visibleRows[focusIdx]?.key;

  const renderRow = (row: Row) => {
    if (!levelVisible(row.level)) return null;
    const on = !!values[row.key];
    const focused = row.key === focusedKey;
    return (
      <div
        key={row.key}
        onMouseEnter={() => {
          const idx = visibleRows.findIndex((r) => r.key === row.key);
          if (idx >= 0) setFocusIdx(idx);
        }}
        className={cn(
          'flex items-center justify-between gap-3 min-h-[26px] px-2 -mx-2',
          focused && 'bg-zinc-100',
        )}
      >
        <span className={cn('text-zinc-700 leading-tight', row.indent && 'pl-3')}>{row.label}</span>
        <Toggle value={on} onChange={(v) => setVal(row.key, v ? 1 : 0)} />
      </div>
    );
  };

  const renderSection = (s: Section) => (
    <div key={s.title} className="mb-4">
      <div className="font-bold text-zinc-900 mb-1.5">{s.title}</div>
      <div className="flex flex-col">{s.rows.map(renderRow)}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white border border-zinc-300 shadow-2xl w-[880px] max-w-[95vw] max-h-[90vh] overflow-hidden select-none flex flex-col text-xs">
        {/* Header */}
        <div className="bg-zinc-100 px-4 py-3 border-b border-zinc-200 flex justify-between items-center">
          <div className="flex items-center gap-2 text-sm font-bold text-zinc-800">
            <span className="bg-black text-white text-[10px] px-1.5 py-0.5 rounded">F11</span>
            <span>Company Features</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-zinc-600">
              Company: <span className="font-semibold text-zinc-900">{company?.name || '—'}</span>
            </span>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-black font-semibold text-sm leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto p-5">
          {!companyId ? (
            <div className="py-10 text-center text-zinc-500">
              Select a company first (Gateway → company) to configure its features.
            </div>
          ) : (
            <>
              {/* Show more / all */}
              <div className="flex flex-col gap-0.5 pb-3 mb-3 border-b border-zinc-200">
                <div className="flex items-center justify-between min-h-[26px]">
                  <span className="italic text-zinc-600">Show more features</span>
                  <Toggle value={showMore} onChange={(v) => setShowMore(v)} />
                </div>
                <div className="flex items-center justify-between min-h-[26px]">
                  <span className="italic text-zinc-600">Show all features</span>
                  <Toggle
                    value={showAll}
                    onChange={(v) => {
                      setShowAll(v);
                      if (v) setShowMore(true);
                    }}
                  />
                </div>
              </div>

              <div className={cn('grid grid-cols-2 gap-x-10', loading && 'opacity-50')}>
                <div>{LEFT.map(renderSection)}</div>
                <div>{RIGHT.map(renderSection)}</div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-zinc-50 border-t border-zinc-200 px-4 py-2.5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              disabled={!companyId || saving}
              className="border border-zinc-900 text-zinc-900 px-3 py-1 hover:bg-zinc-100 disabled:opacity-40"
            >
              Reset to Default
            </button>
            <span className="text-[11px] text-zinc-400">
              ↑↓ move · Y / N · Ctrl+A accept · Esc close
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1 text-zinc-700 hover:bg-zinc-100">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!companyId || saving}
              className="bg-black text-white px-4 py-1 hover:bg-zinc-800 disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Accept'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Segmented Yes/No — strict black/white; active side is filled black.
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="inline-flex border border-zinc-300 shrink-0 text-[11px]">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={cn(
          'px-2.5 py-0.5',
          value ? 'bg-black text-white font-semibold' : 'text-zinc-500 hover:bg-zinc-100',
        )}
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={cn(
          'px-2.5 py-0.5 border-l border-zinc-300',
          !value ? 'bg-black text-white font-semibold' : 'text-zinc-500 hover:bg-zinc-100',
        )}
      >
        No
      </button>
    </div>
  );
}
