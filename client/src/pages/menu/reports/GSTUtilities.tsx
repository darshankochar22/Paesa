import { Link } from 'react-router-dom';
import { useEscapeBack } from '@/hooks/useEscape';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';

// GST Reports → GST Utilities submenu. Only "GST Rate Setup" is wired; the remaining
// utilities are listed to match TallyPrime and route in as they are built.
export default function GSTUtilities() {
  useEscapeBack();

  const items: Array<{ label: string; route?: string }> = [
    { label: 'GST Rate Setup', route: '/master/statutory/gst/rate-setup' },
    { label: 'Map UoM - UQC', route: '/master/statutory/gst/map-uom-uqc' },
    { label: 'Validate Party GSTIN/UIN', route: '/master/statutory/gst/validate-party-gstin' },
    { label: 'Create Party Using GSTIN/UIN', route: '/master/statutory/gst/create-party-gstin' },
    {
      label: 'GST Advances - Opening Balance',
      route: '/master/statutory/gst/advances-opening-balance',
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
          <Link to="/reports/statutory" className="hover:underline hover:text-zinc-900">
            Statutory Reports
          </Link>
          <span>&gt;</span>
          <Link to="/reports/gst" className="hover:underline hover:text-zinc-900">
            GST Reports
          </Link>
        </div>
        <CardTitle className="text-base font-semibold">GST Utilities</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col pl-3 gap-0.5">
          {items.map((item) =>
            item.route ? (
              <Button
                key={item.label}
                asChild
                variant="ghost"
                size="xs"
                className="justify-start text-[11px] font-normal px-2 h-7 text-zinc-700"
              >
                <Link to={item.route}>{item.label}</Link>
              </Button>
            ) : (
              <Button
                key={item.label}
                variant="ghost"
                size="xs"
                className="justify-start text-[11px] font-normal px-2 h-7 text-zinc-400"
              >
                {item.label}
              </Button>
            ),
          )}
        </div>
      </CardContent>
    </Card>
  );
}
