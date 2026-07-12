/**
 * CategoryMenuPage — a reusable category landing page that lists
 * all reports belonging to a given category slug.  Used as the
 * element for each of the 15 top-level report category routes.
 */
import { Link, useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { REPORT_CATEGORIES } from './reportDefinitions';

interface CategoryMenuPageProps {
  title: string;
  categorySlug: string;
  description?: string;
}

// Map route slugs to REPORT_CATEGORIES keys
const SLUG_TO_CATEGORY: Record<string, string> = {
  gateway: 'Gateway, Navigation & Global Report Shells',
  'financial-statements': 'Core Financial Statements',
  'account-books': 'Account Books & Voucher Registers',
  'receivables-payables': 'Receivables, Payables & Bill-wise Reports',
  'cash-bank-finance': 'Cash, Bank, Finance & Banking',
  'sales-purchase-party': 'Sales, Purchase & Party Analysis',
  'inventory-stock': 'Inventory, Stock & Godown Reports',
  'manufacturing-costing': 'Manufacturing, Job Work & Costing',
  gst: 'GST Reports',
  'e-invoice-eway-bill': 'e-Invoice, e-Way Bill & Exchange',
  tds: 'TDS Reports',
  tcs: 'TCS Reports',
  'payroll-hr': 'Payroll & HR Reports',
  'legacy-statutory': 'VAT, Excise, Service Tax, MSME & Legacy Statutory',
  'audit-security': 'Audit, Edit Log, Security & Admin',
};

export default function CategoryMenuPage({
  title,
  categorySlug,
  description,
}: CategoryMenuPageProps) {
  const navigate = useNavigate();
  const { activeFY } = useCompany();

  const categoryName = SLUG_TO_CATEGORY[categorySlug] || categorySlug;
  const reports = REPORT_CATEGORIES[categoryName] || [];

  const fyLabel = activeFY ? `${activeFY.start_date} to ${activeFY.end_date ?? ''}` : '';

  return (
    <aside className="w-96 mx-auto mt-10 bg-white border shadow-sm flex flex-col px-10 py-10 gap-6">
      <div className="flex items-center justify-between pb-2">
        <div className="text-xl font-semibold">{title}</div>
        {fyLabel && <div className="text-xs text-black">{fyLabel}</div>}
      </div>

      {description && <div className="text-sm text-black -mt-4">{description}</div>}

      <div className="flex flex-col gap-1">
        <div className="font-semibold text-lg pb-1">Select a Report</div>

        {reports.length === 0 ? (
          <div className="text-sm text-black italic pl-4 py-4">
            No reports available in this category.
          </div>
        ) : (
          <div className="flex flex-col pl-4 gap-1">
            {reports.map((report) => (
              <Link
                key={report.slug}
                to={`/reports/${categorySlug}/${report.slug}`}
                className="text-left rounded px-2 py-1 hover:bg-black/[0.03] transition-colors"
              >
                {report.title}
              </Link>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => navigate(-1)}
        className="text-left rounded px-2 py-1 hover:bg-black/[0.03] transition-colors mt-2 border-t pt-3"
      >
        Esc: Quit / Go Back
      </button>
    </aside>
  );
}
