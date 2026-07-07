import { Link, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';

export default function ExceptionReports() {
  const navigate = useNavigate();

  const sections = [
    {
      title: 'REGISTERS',
      items: [
        'Memorandum Register',
        'Reversing Journal Register',
        'Optional Vouchers',
        'Cancelled Vouchers',
        'Post-Dated Vouchers',
        'Marked Vouchers',
      ],
    },
    {
      title: 'REPORTS',
      items: ['Negative Ledgers', 'Negative Stock', 'Overdue Receivables', 'Overdue Payables'],
    },
    {
      title: '',
      items: ['Quit'],
    },
  ];

  const getRoute = (_section: string, item: string) => {
    const routes: Record<string, string> = {
      'Memorandum Register': '/reports/accounts/memorandum-register',
      'Reversing Journal Register': '/reports/accounts/reversing-journal-register',
      'Optional Vouchers': '/reports/exception/optional-vouchers',
      'Cancelled Vouchers': '/reports/exception/cancelled-vouchers',
      'Post-Dated Vouchers': '/reports/exception/post-dated-vouchers',
      'Marked Vouchers': '/reports/exception/marked-vouchers',
      'Negative Ledgers': '/reports/exception/negative-ledgers',
      'Negative Stock': '/reports/exception/negative-stock',
      'Overdue Receivables': '/reports/exception/overdue-receivables',
      'Overdue Payables': '/reports/exception/overdue-payables',
    };
    return routes[item] ?? null;
  };

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
        <CardTitle className="text-base font-semibold">Exception Reports</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {sections.map((section, idx) => (
          <div key={idx} className="flex flex-col gap-1.5">
            {section.title && (
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-1">
                {section.title}
              </div>
            )}
            <div className="flex flex-col pl-3 gap-0.5">
              {section.items.map((item) => {
                if (item === 'Quit') {
                  return (
                    <Button
                      key={item}
                      onClick={() => navigate(-1)}
                      variant="ghost"
                      size="xs"
                      className="justify-start text-[11px] font-semibold px-2 h-7 mt-2 text-zinc-900"
                    >
                      {item}
                    </Button>
                  );
                }
                const route = getRoute(section.title, item);
                return route ? (
                  <Button
                    key={item}
                    asChild
                    variant="ghost"
                    size="xs"
                    className="justify-start text-[11px] font-normal px-2 h-7 text-zinc-700"
                  >
                    <Link to={route}>{item}</Link>
                  </Button>
                ) : (
                  <Button
                    key={item}
                    variant="ghost"
                    size="xs"
                    className="justify-start text-[11px] font-normal px-2 h-7 text-zinc-700"
                  >
                    {item}
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
