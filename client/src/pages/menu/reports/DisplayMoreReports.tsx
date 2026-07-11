import { Link } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { useEscapeBack } from '@/hooks/useEscape';

export default function DisplayMoreReports() {
  const { selectedCompany, activeFY } = useCompany();
  useEscapeBack();

  const sections = [
    {
      title: 'GENERAL',
      items: [
        {
          label: 'Gateway, Navigation & Global Report Shells',
          route: '/reports/gateway',
          count: '20 reports',
        },
        {
          label: 'Core Financial Statements',
          route: '/reports/financial-statements',
          count: '35 reports',
        },
      ],
    },
    {
      title: 'ACCOUNTING',
      items: [
        {
          label: 'Account Books & Voucher Registers',
          route: '/reports/account-books',
          count: '45 reports',
        },
        {
          label: 'Receivables, Payables & Bill-wise',
          route: '/reports/receivables-payables',
          count: '35 reports',
        },
        {
          label: 'Cash, Bank, Finance & Banking',
          route: '/reports/cash-bank-finance',
          count: '30 reports',
        },
        {
          label: 'Sales, Purchase & Party Analysis',
          route: '/reports/sales-purchase-party',
          count: '55 reports',
        },
      ],
    },
    {
      title: 'INVENTORY',
      items: [
        {
          label: 'Inventory, Stock & Godown',
          route: '/reports/inventory-stock',
          count: '65 reports',
        },
        {
          label: 'Manufacturing, Job Work & Costing',
          route: '/reports/manufacturing-costing',
          count: '30 reports',
        },
      ],
    },
    {
      title: 'GST & INDIRECT TAX',
      items: [
        { label: 'GST Reports', route: '/reports/gst', count: '60 reports' },
        {
          label: 'e-Invoice, e-Way Bill & Exchange',
          route: '/reports/e-invoice-eway-bill',
          count: '30 reports',
        },
      ],
    },
    {
      title: 'TDS / TCS',
      items: [
        { label: 'TDS Reports', route: '/reports/tds', count: '30 reports' },
        { label: 'TCS Reports', route: '/reports/tcs', count: '25 reports' },
      ],
    },
    {
      title: 'PAYROLL & HR',
      items: [{ label: 'Payroll & HR Reports', route: '/reports/payroll-hr', count: '55 reports' }],
    },
    {
      title: 'STATUTORY & LEGACY',
      items: [
        {
          label: 'VAT, Excise, Service Tax, MSME',
          route: '/reports/legacy-statutory',
          count: '35 reports',
        },
      ],
    },
    {
      title: 'AUDIT & ADMIN',
      items: [
        {
          label: 'Audit, Edit Log, Security & Admin',
          route: '/reports/audit-security',
          count: '35 reports',
        },
      ],
    },
  ];

  const fyLabel = activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : '';

  return (
    <aside className="w-96 mx-auto mt-10 bg-white border shadow-sm flex flex-col px-10 py-10 gap-6">
      <div className="flex items-center justify-between pb-2">
        <div className="text-xl font-semibold">Display More Reports</div>
        <div className="text-right">
          <div className="text-xs text-zinc-600 font-medium">
            {selectedCompany?.name || 'Company'}
          </div>
          {fyLabel && <div className="text-[10px] text-zinc-400">{fyLabel}</div>}
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {sections.map((section) => (
          <div key={section.title} className="flex flex-col gap-2">
            <div className="font-semibold text-lg">{section.title}</div>

            <div className="flex flex-col pl-4 gap-1">
              {section.items.map((item) => (
                <Link
                  key={item.label}
                  to={item.route}
                  className="text-left rounded px-2 py-1 hover:bg-zinc-100 transition-colors flex items-center justify-between"
                >
                  <span>{item.label}</span>
                  <span className="text-xs text-zinc-400 font-mono ml-2">{item.count}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-zinc-400 border-t pt-3 flex items-center justify-between">
        <span>585 Reports · 15 Categories</span>
      </div>
    </aside>
  );
}
