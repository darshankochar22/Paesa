import { useState } from 'react';
import { Link } from 'react-router-dom';

function renderLabel(label: string) {
  const parts: React.ReactNode[] = [];
  let i = 0;
  let boldUsed = false;

  while (i < label.length) {
    if (!boldUsed && label[i] === label[i].toUpperCase() && label[i].match(/[A-Z]/)) {
      let j = i + 1;
      while (j < label.length && label[j] === label[j].toUpperCase() && label[j].match(/[A-Z]/)) {
        j++;
      }
      parts.push(
        <span key={i} className="font-bold">
          {label.slice(i, j)}
        </span>,
      );
      boldUsed = true;
      i = j;
    } else {
      let j = i + 1;
      while (
        j < label.length &&
        !(!boldUsed && label[j] === label[j].toUpperCase() && label[j].match(/[A-Z]/))
      ) {
        j++;
      }
      parts.push(<span key={i}>{label.slice(i, j)}</span>);
      i = j;
    }
  }

  return <>{parts}</>;
}

const gatewaySections = [
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
      { label: 'Stock Summary', route: '/reports/inventory/stock-summary' },
      { label: 'Ratio Analysis', route: '/reports/accounts/ratio-analysis' },
    ],
  },
];

const displayMoreSections = [
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
    items: [
      { label: 'Inventory Books', route: '/reports/inventory-books' },
      { label: 'StatEments of Inventory', route: '/reports/statements-of-inventory' },
      { label: 'Job Work Reports', route: '/reports/job-work' },
    ],
  },
  {
    title: 'STATUTORY',
    items: [{ label: 'StatutOry Reports', route: '/reports/statutory' }],
  },
  {
    title: 'PAYROLL',
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

function Panel({
  title,
  sections,
  bottomItems,
  onBack,
}: {
  title: string;
  sections: { title: string; items: { label: string; route: string }[] }[];
  bottomItems?: { label: string; onClick?: () => void; route?: string }[];
  onBack?: () => void;
}) {
  return (
    <aside className="w-96 mx-auto mt-10 bg-white border shadow-sm flex flex-col px-10 py-10 gap-6">
      <div className="text-xl font-semibold pb-2">{title}</div>

      <div className="flex flex-col gap-5">
        {sections.map((section) => (
          <div key={section.title} className="flex flex-col gap-2">
            <div className="font-semibold text-lg">{section.title}</div>
            <div className="flex flex-col pl-4 gap-1">
              {section.items.map((item) => (
                <Link
                  key={item.label}
                  to={item.route}
                  className="text-left rounded px-2 py-1 hover:bg-zinc-100 transition-colors"
                >
                  {renderLabel(item.label)}
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* Bottom items (Display More Reports / Quit etc) */}
        {bottomItems && bottomItems.length > 0 && (
          <div className="flex flex-col gap-1">
            {bottomItems.map((item) =>
              item.route ? (
                <Link
                  key={item.label}
                  to={item.route}
                  className="text-left rounded px-2 py-1 hover:bg-zinc-100 transition-colors"
                >
                  {renderLabel(item.label)}
                </Link>
              ) : (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="text-left rounded px-2 py-1 hover:bg-zinc-100 transition-colors"
                >
                  {renderLabel(item.label)}
                </button>
              ),
            )}
          </div>
        )}

        {onBack && (
          <button
            onClick={onBack}
            className="text-left rounded px-2 py-1 hover:bg-zinc-100 transition-colors text-zinc-400 text-sm"
          >
            ← Back
          </button>
        )}
      </div>
    </aside>
  );
}

export default function Gateway() {
  const [page, setPage] = useState<'gateway' | 'display-more'>('gateway');

  if (page === 'display-more') {
    return (
      <Panel
        title="Display More Reports"
        sections={displayMoreSections}
        onBack={() => setPage('gateway')}
      />
    );
  }

  return (
    <Panel
      title="Gateway"
      sections={gatewaySections}
      bottomItems={[
        { label: 'Display More Reports', onClick: () => setPage('display-more') },
        { label: 'DashbOard', route: '/dashboard' },
      ]}
    />
  );
}
