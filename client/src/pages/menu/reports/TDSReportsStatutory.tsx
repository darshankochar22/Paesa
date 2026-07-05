import { Link, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';

// Statutory Reports → TDS Reports (compact menu, parallel to GST Reports). "Challan
// Reconciliation" opens the dedicated screen; the other reports route to their existing
// ReportRunner reports.
export default function TDSReportsStatutory() {
  const navigate = useNavigate();

  const items: Array<{ label: string; route: string }> = [
    { label: 'Challan Reconciliation', route: '/reports/statutory/tds/challan-reconciliation' },
    { label: 'Form 26Q', route: '/reports/statutory/tds/form-26q' },
    { label: 'Form 27Q', route: '/reports/statutory/tds/form-27q' },
    { label: 'Return Transaction Book', route: '/reports/statutory/tds/return-transaction-book' },
    { label: 'TDS Outstandings', route: '/reports/statutory/tds/outstandings' },
    { label: 'Ledgers Without PAN', route: '/reports/statutory/tds/ledgers-without-pan' },
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
        <CardTitle className="text-base font-semibold">TDS Reports</CardTitle>
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
          <Button
            onClick={() => navigate(-1)}
            variant="ghost"
            size="xs"
            className="justify-start text-[11px] font-semibold px-2 h-7 mt-2 text-zinc-900"
          >
            Quit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
