import { Link, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';
import { Separator } from '@/components/shadcn/separator';

const BASE = '/reports/tcs';
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
const items = (labels: string[]) =>
  labels.map((label) => ({ label, route: `${BASE}/${slug(label)}` }));

export default function TCSReports() {
  const navigate = useNavigate();

  const sections = [
    {
      title: 'TCS MENU & CHALLANS',
      items: items(['TCS Reports Menu', 'TCS Challan Reconciliation', 'TCS Challan Details']),
    },
    {
      title: 'TCS RETURNS',
      items: items(['Form 27EQ', 'TCS Return Transaction Book']),
    },
    {
      title: 'TCS OUTSTANDINGS',
      items: items([
        'TCS Outstandings',
        'TCS Outstandings Nature of Goods-wise',
        'TCS Outstandings Party-wise',
      ]),
    },
    {
      title: 'TCS EXCEPTIONS',
      items: items(['Ledgers Without PAN - Collectees', 'Buyer Ledger Without PAN']),
    },
    {
      title: 'TCS COLLECTION DETAILS',
      items: items([
        'TCS Collection Details',
        'TCS Collection at Normal Rate',
        'TCS Collection at Higher Rate',
        'TCS Zero/Lower Rate Collection',
        'TCS Exemption Limit Report',
      ]),
    },
    {
      title: 'TCS PAYMENTS & RETURNS',
      items: items([
        'TCS Payment Details',
        'TCS Balance Payable',
        'TCS Recompute Return',
        'TCS Revised Return',
        'TCS Save Return',
      ]),
    },
    {
      title: 'TCS VALIDATION & EXPORT',
      items: items([
        'TCS Remarks Report',
        'TCS Exception Report',
        'TCS Challan Details of Buyer',
        'TCS Validation Report',
        'TCS Return Export Report',
      ]),
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
        </div>
        <CardTitle className="text-base font-semibold">TCS Reports</CardTitle>
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
