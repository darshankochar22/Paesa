import { Link } from 'react-router-dom';
import { useEscapeBack } from '@/hooks/useEscape';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';

// TallyPrime lists every statutory report head regardless of which F11 tax features are on,
// so we always show the full set. Individual report screens still gate their own data.
const ROUTES: Record<string, string> = {
  'GST Reports': '/reports/statutory/gst',
  'TDS Reports': '/reports/statutory/tds',
  'TCS Reports': '/reports/statutory/tcs',
  'Payroll Reports': '/reports/statutory/payroll',
  'VAT Reports': '/reports/legacy-statutory',
  'Central Excise Reports': '/reports/legacy-statutory',
  'Service Tax Reports': '/reports/legacy-statutory',
  'MSME Reports': '/reports/statutory/msme',
};

export default function StatutoryReports() {
  useEscapeBack();

  const sections = [
    {
      title: '',
      items: [
        'GST Reports',
        'TDS Reports',
        'TCS Reports',
        'Payroll Reports',
        'VAT Reports',
        'Central Excise Reports',
        'Service Tax Reports',
        'MSME Reports',
      ],
    },
  ];

  const getRoute = (_section: string, item: string) => ROUTES[item] ?? null;

  return (
    <Card className="w-96 mx-auto mt-10 gap-4 text-xs">
      <CardHeader className="pb-2">
        <div className="text-[11px] italic text-black flex flex-wrap gap-1">
          <Link to="/" className="hover:underline hover:text-black">
            Gateway
          </Link>
          <span>&gt;</span>
          <Link to="/reports/display-more" className="hover:underline hover:text-black">
            Display More Reports
          </Link>
        </div>
        <CardTitle className="text-base font-semibold">Statutory Reports</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        {sections.map((section, idx) => (
          <div key={idx} className="flex flex-col gap-2">
            {section.title && (
              <div className="font-semibold text-xs uppercase tracking-wide text-black">
                {section.title}
              </div>
            )}

            {section.items.length > 0 && (
              <div className="flex flex-col pl-4 gap-0.5">
                {section.items.map((item) => {
                  const route = getRoute(section.title, item);

                  if (route) {
                    return (
                      <Button
                        key={item}
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-auto justify-start px-2 py-1 font-normal text-xs"
                      >
                        <Link to={route}>{item}</Link>
                      </Button>
                    );
                  }

                  return (
                    <Button
                      key={item}
                      variant="ghost"
                      size="sm"
                      className="h-auto justify-start px-2 py-1 font-normal text-xs"
                    >
                      {item}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
