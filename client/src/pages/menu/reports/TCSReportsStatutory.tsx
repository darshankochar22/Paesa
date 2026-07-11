import { Link } from 'react-router-dom';
import { useEscapeBack } from '@/hooks/useEscape';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';

// Statutory Reports → TCS Reports (compact menu, parallel to TDS Reports #199/#203).
// "Challan Reconciliation" opens the dedicated screen; the other reports route to their
// existing ReportRunner reports under /reports/tcs.
export default function TCSReportsStatutory() {
  useEscapeBack();

  const items: Array<{ label: string; route: string }> = [
    { label: 'Challan Reconciliation', route: '/reports/statutory/tcs/challan-reconciliation' },
    { label: 'Form 27EQ', route: '/reports/statutory/tcs/form-27eq' },
    { label: 'Return Transaction Book', route: '/reports/statutory/tcs/return-transaction-book' },
    { label: 'TCS Outstandings', route: '/reports/statutory/tcs/outstandings' },
    { label: 'Ledgers Without PAN', route: '/reports/statutory/tcs/ledgers-without-pan' },
    {
      label: 'TDS Challan details of Buyer',
      route: '/reports/statutory/tcs/challan-details-of-buyer',
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
          <span>&gt;</span>
          <Link to="/reports/statutory" className="hover:underline hover:text-zinc-900">
            Statutory Reports
          </Link>
        </div>
        <CardTitle className="text-base font-semibold">TCS Reports</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col pl-3 gap-0.5">
          {items.map((item) => (
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
      </CardContent>
    </Card>
  );
}
