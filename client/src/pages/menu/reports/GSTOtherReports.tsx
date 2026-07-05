import { Link, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';

// GST Reports → Other Reports submenu.
export default function GSTOtherReports() {
  const navigate = useNavigate();

  const items: Array<{ label: string; route: string }> = [
    { label: 'Marked Vouchers', route: '/master/statutory/gst/marked-vouchers' },
    { label: 'Outstanding Advance Receipts', route: '/master/statutory/gst/advance-receipts' },
    { label: 'Outstanding Advance Paid', route: '/master/statutory/gst/advance-paid' },
    { label: 'Reverse Charge Supplies', route: '/master/statutory/gst/reverse-charge-supplies' },
  ];

  return (
    <Card size="sm" className="w-96 mx-auto mt-10 text-xs">
      <CardHeader className="gap-1 pb-1">
        <div className="text-[11px] italic text-zinc-500 flex flex-wrap gap-1">
          <Link to="/" className="hover:underline hover:text-zinc-900">
            Gateway
          </Link>
          <span>&gt;</span>
          <Link to="/reports/statutory" className="hover:underline hover:text-zinc-900">
            Statutory Reports
          </Link>
          <span>&gt;</span>
          <Link to="/reports/gst" className="hover:underline hover:text-zinc-900">
            GST Reports
          </Link>
        </div>
        <CardTitle className="text-base font-semibold">Other Reports</CardTitle>
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
