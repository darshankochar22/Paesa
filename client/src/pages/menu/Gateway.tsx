import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PRIORITY, useShortcuts } from '@/lib/shortcuts';
import { useCompany } from '@/context/CompanyContext';
import { isFeatureEnabled, type FeatureFlag } from '@/lib/companyFeatures';
import { isTaxFeatureEnabled } from '@/lib/taxFeatures';
import type { TallyFeaturesType } from '@/types/entities/TallyFeatures';

// TallyPrime-style menu hotkey: a capital letter placed mid-word marks the
// hotkey ('CHart of Accounts' → H, 'Day BooK' → K, 'DashbOard' → O); labels
// without one use their first letter.
function hotkeyMatch(label: string): { char: string; index: number } {
  const mid = label.match(/\B[A-Z]/);
  if (mid && mid.index !== undefined) return { char: mid[0], index: mid.index };
  const first = label.match(/[A-Za-z]/);
  return first && first.index !== undefined
    ? { char: first[0], index: first.index }
    : { char: '', index: -1 };
}

function renderLabel(label: string) {
  return <>{label}</>;
}

interface MenuItem {
  label: string;
  route?: string;
  onClick?: () => void;
  feature?: FeatureFlag; // hide this item when the F11 flag is off
}

interface MenuSection {
  title: string;
  items: MenuItem[];
  // Hide the whole section when this returns false (e.g. STATUTORY needs any tax).
  visible?: (f: TallyFeaturesType | null | undefined) => boolean;
}

const gatewaySections: MenuSection[] = [
  {
    title: 'MASTERS',
    items: [
      { label: 'Create', route: '/master/create' },
      { label: 'Alter', route: '/master/alter' },
      { label: 'CHart of Accounts', route: '/master/coa' },
    ],
  },
  {
    title: 'TRANSACTIONS',
    items: [
      { label: 'Vouchers', route: '/transactions/vouchers' },
      { label: 'Day BooK', route: '/transactions/daybook' },
    ],
  },
  {
    title: 'UTILITIES',
    items: [
      { label: 'BaNking', route: '/utilities/banking' },
      { label: 'AI Copilot', route: '/utilities/copilot' },
    ],
  },
  {
    title: 'REPORTS',
    items: [
      { label: 'Balance Sheet', route: '/reports/accounts/balance-sheet' },
      { label: 'Profit & Loss A/c', route: '/reports/accounts/profit-loss' },
      {
        label: 'Stock Summary',
        route: '/reports/inventory/stock-summary',
        feature: 'maintain_inventory',
      },
      { label: 'Ratio Analysis', route: '/reports/accounts/ratio-analysis' },
    ],
  },
];

const anyTaxEnabled = (f: TallyFeaturesType | null | undefined) =>
  (['gst', 'vat', 'tds', 'tcs', 'excise', 'serviceTax'] as const).some((t) =>
    isTaxFeatureEnabled(f, t),
  );

const displayMoreSections: MenuSection[] = [
  {
    title: 'ACCOUNTING',
    items: [
      { label: 'Trial Balance', route: '/reports/accounts/trial-balance' },
      { label: 'Day Book', route: '/transactions/daybook' },
      { label: 'Cash Flow', route: '/reports/accounts/cash-flow' },
      { label: 'Funds Flow', route: '/reports/accounts/funds-flow' },
      { label: 'Account Books', route: '/reports/account-books' },
      { label: 'Statements of Accounts', route: '/reports/statements-of-accounts' },
    ],
  },
  {
    title: 'INVENTORY',
    visible: (f) => isFeatureEnabled(f, 'maintain_inventory'),
    items: [
      { label: 'Inventory Books', route: '/reports/inventory-books' },
      { label: 'StatEments of Inventory', route: '/reports/statements-of-inventory' },
      {
        label: 'Job Work Reports',
        route: '/reports/job-work',
        feature: 'enable_job_order_processing',
      },
    ],
  },
  {
    title: 'STATUTORY',
    visible: anyTaxEnabled,
    items: [{ label: 'StatutOry Reports', route: '/reports/statutory' }],
  },
  {
    title: 'PAYROLL',
    visible: (f) => isFeatureEnabled(f, 'maintain_payroll'),
    items: [{ label: 'Payroll Reports', route: '/reports/payroll-hr' }],
  },
  {
    title: 'EXCEPTION',
    items: [
      { label: 'EXception Reports', route: '/reports/exception' },
      { label: 'Analysis & Verification', route: '/reports/analysis-verification' },
    ],
  },
];

// Drop items whose feature is off, then drop sections hidden by `visible` or left empty.
function filterSections(
  sections: MenuSection[],
  features: TallyFeaturesType | null | undefined,
): MenuSection[] {
  return sections
    .filter((s) => !s.visible || s.visible(features))
    .map((s) => ({
      ...s,
      items: s.items.filter((it) => !it.feature || isFeatureEnabled(features, it.feature)),
    }))
    .filter((s) => s.items.length > 0);
}

function Panel({
  title,
  sections,
  bottomItems,
  onBack,
}: {
  title: string;
  sections: { title: string; items: MenuItem[] }[];
  bottomItems?: MenuItem[];
  onBack?: () => void;
}) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(0);

  // Flat item list in visual order — arrow keys walk it, hotkeys jump into it.
  const flat: MenuItem[] = [...sections.flatMap((s) => s.items), ...(bottomItems ?? [])];

  useEffect(() => {
    setSelected(0);
  }, [title]);

  const activate = (item: MenuItem | undefined) => {
    if (!item) return;
    if (item.route) navigate(item.route);
    else item.onClick?.();
  };

  const flatIndexOf = (item: MenuItem) => flat.indexOf(item);

  useShortcuts(
    [
      {
        keys: 'ArrowDown',
        handler: () => setSelected((p) => (p + 1) % flat.length),
      },
      {
        keys: 'ArrowUp',
        handler: () => setSelected((p) => (p - 1 + flat.length) % flat.length),
      },
      {
        keys: 'Enter',
        handler: () => {
          // let a focused link/button keep its native Enter activation
          const el = document.activeElement;
          if (el instanceof HTMLAnchorElement || el instanceof HTMLButtonElement) return false;
          activate(flat[selected]);
        },
      },
      {
        keys: 'Escape',
        handler: () => {
          if (!onBack) return false;
          onBack();
        },
      },
      // Tally menu hotkeys: press the highlighted letter to open directly.
      ...Array.from(new Set(flat.map((it) => hotkeyMatch(it.label).char.toLowerCase()))).map(
        (char) => ({
          keys: char,
          handler: () => {
            activate(flat.find((it) => hotkeyMatch(it.label).char.toLowerCase() === char));
          },
        }),
      ),
    ],
    { priority: PRIORITY.SCREEN },
  );

  const itemClass = (item: MenuItem) =>
    `text-left px-2 py-1 transition-colors ${
      flatIndexOf(item) === selected ? 'bg-zinc-100' : 'hover:bg-zinc-100'
    }`;

  return (
    <aside className="w-96 mx-auto mt-10 bg-white border shadow-sm flex flex-col px-10 py-10 gap-6">
      <div className="text-xl font-normal pb-2">{title}</div>

      <div className="flex flex-col gap-5">
        {sections.map((section) => (
          <div key={section.title} className="flex flex-col gap-2">
            <div className="font-medium text-sm text-zinc-500">{section.title}</div>
            <div className="flex flex-col pl-4 gap-1">
              {section.items.map((item) => (
                <Link key={item.label} to={item.route!} className={itemClass(item)}>
                  {renderLabel(item.label)}
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* Bottom items (Display More Reports / Dashboard etc) */}
        {bottomItems && bottomItems.length > 0 && (
          <div className="flex flex-col gap-1">
            {bottomItems.map((item) =>
              item.route ? (
                <Link key={item.label} to={item.route} className={itemClass(item)}>
                  {renderLabel(item.label)}
                </Link>
              ) : (
                <button key={item.label} onClick={item.onClick} className={itemClass(item)}>
                  {renderLabel(item.label)}
                </button>
              ),
            )}
          </div>
        )}

        {onBack && (
          <button
            onClick={onBack}
            className="text-left px-2 py-1 hover:bg-zinc-100 transition-colors text-zinc-400 text-sm"
          >
            ← Back (Esc)
          </button>
        )}
      </div>
    </aside>
  );
}

export default function Gateway() {
  const [page, setPage] = useState<'gateway' | 'display-more'>('gateway');
  const { features } = useCompany();

  if (page === 'display-more') {
    return (
      <Panel
        title="Display More Reports"
        sections={filterSections(displayMoreSections, features)}
        onBack={() => setPage('gateway')}
      />
    );
  }

  return (
    <Panel
      title="Gateway"
      sections={filterSections(gatewaySections, features)}
      bottomItems={[
        { label: 'Display More Reports', onClick: () => setPage('display-more') },
        { label: 'DashbOard', route: '/dashboard' },
      ]}
    />
  );
}
