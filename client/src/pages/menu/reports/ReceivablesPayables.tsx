import { Link } from 'react-router-dom';
import { useEscapeBack } from '@/hooks/useEscape';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';

const BASE = '/reports/receivables-payables';
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
const items = (labels: string[]) =>
  labels.map((label) => ({ label, route: `${BASE}/${slug(label)}` }));

export default function ReceivablesPayables() {
  useEscapeBack();

  const sections = [
    {
      title: 'BILLS & OUTSTANDINGS',
      items: items([
        'Bills Receivable',
        'Bills Payable',
        'Ledger Outstandings',
        'Group Outstandings',
      ]),
    },
    {
      title: 'AGEING ANALYSIS',
      items: items(['Receivables Ageing', 'Payables Ageing']),
    },
    {
      title: 'BILL-WISE DETAILS',
      items: items(['Bill-wise Receivables', 'Bill-wise Payables']),
    },
    {
      title: 'PARTY-WISE OUTSTANDING',
      items: items([
        'Customer-wise Outstanding',
        'Supplier-wise Outstanding',
        'Salesperson-wise Outstanding',
        'Area-wise Outstanding',
      ]),
    },
    {
      title: 'DUE & OVERDUE',
      items: items([
        'Due Today Receivables',
        'Due Today Payables',
        'Overdue Receivables',
        'Overdue Payables',
      ]),
    },
    {
      title: 'EXCEPTIONS',
      items: items(['Credit Limit Exception', 'Credit Period Exception']),
    },
    {
      title: 'INTEREST',
      items: items(['Interest Receivable', 'Interest Payable', 'Interest Calculation Ledger-wise']),
    },
    {
      title: 'FOLLOW-UP & DISPUTES',
      items: items([
        'Collection Follow-up',
        'Payment Follow-up',
        'Promise-to-Pay Report',
        'Broken Promise Report',
        'Disputed Bills Report',
      ]),
    },
    {
      title: 'ADJUSTMENTS & ADVANCES',
      items: items([
        'Unadjusted Receipts',
        'Unadjusted Payments',
        'Advance from Customers',
        'Advance to Suppliers',
        'Pending Bill Allocations',
        'Bill Settlement Register',
      ]),
    },
    {
      title: 'STATEMENTS',
      items: items(['Party Statement', 'Ledger Confirmation Report']),
    },
  ];

  return (
    <Card size="sm" className="w-96 mx-auto mt-10 text-xs">
      <CardHeader className="gap-1 pb-1">
        <div className="text-[11px] italic text-zinc-500 flex flex-wrap gap-1">
          <Link to="/" className="hover:underline hover:text-zinc-900">
            Gateway
          </Link>
          <span>&gt;</span>
          <Link to="/reports/display-more" className="hover:underline hover:text-zinc-900">
            Display More Reports
          </Link>
        </div>
        <CardTitle className="text-base font-semibold">
          Receivables, Payables & Bill-wise Reports
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {sections.map((section, si) => (
          <div key={si} className="flex flex-col gap-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-1">
              {section.title}
            </div>
            <div className="flex flex-col pl-3 gap-0.5">
              {section.items.map((item) => (
                <Button
                  key={item.label}
                  asChild
                  variant="ghost"
                  size="xs"
                  className="justify-start text-[11px] font-normal px-2 h-7 text-zinc-700"
                >
                  <Link to={item.route}>{item.label}</Link>
                </Button>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
