import { Link, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';

export default function JobWorkReports() {
  const navigate = useNavigate();

  const sections = [
    {
      title: 'ORDER OUTSTANDINGS',
      items: ['Orders', 'Components'],
    },
    {
      title: 'REGISTERS',
      items: [
        'Job Work IN Orders Book',
        'Job Work OUT Orders Book',
        'Material OUT Register',
        'Material In Register',
        'AnnExure - IV',
        'AnnExure - V',
      ],
    },
    {
      title: 'STOCK',
      items: ['From Party', 'With Job Worker', 'Ageing Analysis'],
    },
    {
      title: 'VARIANCE ANALYSIS',
      items: ['Issue Variance', 'Receipt Variance'],
    },
    {
      title: '',
      items: ['Quit'],
    },
  ];

  const getRoute = (_section: string, item: string) => {
    const routes: Record<string, string> = {
      Orders: '/reports/job-work/orders',
      Components: '/reports/job-work/components',
      'Job Work IN Orders Book': '/reports/job-work/in-orders-book',
      'Job Work OUT Orders Book': '/reports/job-work/out-orders-book',
      'Material OUT Register': '/reports/job-work/material-out-register',
      'Material In Register': '/reports/job-work/material-in-register',
      'AnnExure - IV': '/reports/job-work/annexure-iv',
      'AnnExure - V': '/reports/job-work/annexure-v',
      'From Party': '/reports/job-work/stock-from-party',
      'With Job Worker': '/reports/job-work/stock-with-job-worker',
      'Ageing Analysis': '/reports/job-work/ageing-analysis',
      'Issue Variance': '/reports/job-work/issue-variance',
      'Receipt Variance': '/reports/job-work/receipt-variance',
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
        <CardTitle className="text-base font-semibold">Job Work Reports</CardTitle>
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
