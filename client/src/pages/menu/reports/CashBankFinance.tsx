import { Link } from 'react-router-dom';
import { useEscapeBack } from '@/hooks/useEscape';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';

const BASE = '/reports/cash-bank-finance';
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
const items = (labels: string[]) =>
  labels.map((label) => ({ label, route: `${BASE}/${slug(label)}` }));

export default function CashBankFinance() {
  useEscapeBack();

  const sections = [
    {
      title: 'CASH & BANK BOOKS',
      items: items([
        'Cash Book Detailed',
        'Bank Book Detailed',
        'Cash Summary',
        'Bank Summary',
        'Petty Cash Book',
        'Cash Deposit Report',
        'Cash Withdrawal Report',
        'Contra Cash-Bank Movement',
      ]),
    },
    {
      title: 'BANK RECONCILIATION',
      items: items([
        'Bank Reconciliation',
        'Bank Reconciliation Detailed',
        'Imported Bank Statement',
        'Bank Statement Matching',
        'Unreconciled Bank Entries',
        'Reconciled Bank Entries',
      ]),
    },
    {
      title: 'CHEQUE MANAGEMENT',
      items: items([
        'Cheque Register',
        'Cheque Issued Register',
        'Cheque Received Register',
        'Post-dated Cheques Issued',
        'Post-dated Cheques Received',
        'Bounced Cheque Report',
        'Cancelled Cheque Report',
      ]),
    },
    {
      title: 'DIGITAL PAYMENTS',
      items: items(['UPI Receipts Report', 'NEFT/RTGS Payments Report']),
    },
    {
      title: 'LOANS & FINANCE',
      items: items(['Loan Register', 'Loan EMI Schedule', 'Interest on Loan Report']),
    },
    {
      title: 'CASH FLOW & PLANNING',
      items: items([
        'Cash Flow Forecast',
        'Daily Cash Position',
        'Bank-wise Balance Report',
        'Payment Planning Report',
      ]),
    },
  ];

  return (
    <Card size="sm" className="w-96 mx-auto mt-10 text-xs">
      <CardHeader className="gap-1 pb-1">
        <div className="text-[11px] italic text-black flex flex-wrap gap-1">
          <Link to="/" className="hover:underline hover:text-black">
            Gateway
          </Link>
          <span>&gt;</span>
          <Link to="/reports/display-more" className="hover:underline hover:text-black">
            Display More Reports
          </Link>
        </div>
        <CardTitle className="text-base font-semibold">Cash, Bank, Finance & Banking</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {sections.map((section, si) => (
          <div key={si} className="flex flex-col gap-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-black px-1">
              {section.title}
            </div>
            <div className="flex flex-col pl-3 gap-0.5">
              {section.items.map((item) => (
                <Button
                  key={item.label}
                  asChild
                  variant="ghost"
                  size="xs"
                  className="justify-start text-[11px] font-normal px-2 h-7 text-black"
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
