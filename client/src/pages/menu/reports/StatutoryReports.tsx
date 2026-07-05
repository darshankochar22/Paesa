import { Link, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';

export default function StatutoryReports() {
  const navigate = useNavigate();

  const sections = [
    {
      title: '',
      items: [
        'GST Reports',
        'TDS Reports',
        'TCS Reports',
        'Payroll Reports',
        'Central Excise Reports',
        'Service Tax Reports',
        'MSME Reports',
        'Quit',
      ],
    },
  ];

  const getRoute = (_section: string, item: string) => {
    if (item === 'GST Reports') {
      return '/reports/statutory/gst';
    }
    if (item === 'TDS Reports') {
      return '/reports/statutory/tds';
    }
    return null;
  };

  return (
    <Card className="w-96 mx-auto mt-10 gap-4 text-xs">
      <CardHeader className="pb-2">
        <div className="text-[11px] italic text-zinc-500 flex flex-wrap gap-1">
          <Link to="/" className="hover:underline hover:text-zinc-900">
            Gateway
          </Link>
          <span>&gt;</span>
          <Link to="/reports/display-more" className="hover:underline hover:text-zinc-900">
            Display More Reports
          </Link>
        </div>
        <CardTitle className="text-base font-semibold">Statutory Reports</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        {sections.map((section, idx) => (
          <div key={idx} className="flex flex-col gap-2">
            {section.title && (
              <div className="font-semibold text-xs uppercase tracking-wide text-zinc-500">
                {section.title}
              </div>
            )}

            {section.items.length > 0 && (
              <div className="flex flex-col pl-4 gap-0.5">
                {section.items.map((item) => {
                  if (item === 'Quit') {
                    return (
                      <Button
                        key={item}
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(-1)}
                        className="h-auto justify-start px-2 py-1 font-semibold mt-2 text-xs"
                      >
                        {item}
                      </Button>
                    );
                  }

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
