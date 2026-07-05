import { Link, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';
import { Separator } from '@/components/shadcn/separator';

const BASE = '/reports/gateway';
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
const items = (labels: string[]) =>
  labels.map((label) => ({ label, route: `${BASE}/${slug(label)}` }));

export default function GatewayNavigation() {
  const navigate = useNavigate();

  const sections = [
    {
      title: 'NAVIGATION',
      items: items([
        'Gateway of Business',
        'Display More Reports',
        'Go To Search Results',
        'Saved Views List',
        'Report Browser by Module',
      ]),
    },
    {
      title: 'SUMMARIES',
      items: items(['Company Summary', 'Current Period Summary', 'Last Entry Summary']),
    },
    {
      title: 'COMPANY & PERIOD',
      items: items([
        'Multi-Company Selector',
        'Period Change Panel',
        'Company Change Panel',
        'Basis of Values Panel',
      ]),
    },
    {
      title: 'REPORT ACTIONS',
      items: items([
        'Report Configure Panel',
        'Report Filter Panel',
        'Exception Reports Launcher',
        'Export Report Panel',
        'Print Report Panel',
        'Share Report Panel',
      ]),
    },
    {
      title: 'OTHER',
      items: items(['Import/Exchange Status', 'User Shortcut Help']),
    },
  ];

  return (
    <Card size="sm" className="w-96 mx-auto mt-10 text-xs">
      <CardHeader className="gap-1 pb-1">
        <div className="text-[11px] italic text-zinc-500 flex flex-wrap gap-1">
          <Link to="/" className="hover:underline hover:text-zinc-900">
            Gateway
          </Link>
        </div>
        <CardTitle className="text-base font-semibold">
          Gateway, Navigation & Global Report Shells
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

        <Separator className="my-1" />
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          size="xs"
          className="justify-start text-[11px] font-semibold px-2 h-7 text-zinc-900"
        >
          Quit
        </Button>
      </CardContent>
    </Card>
  );
}
