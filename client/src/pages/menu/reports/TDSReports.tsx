import { Link, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';
import { Separator } from '@/components/shadcn/separator';

const BASE = '/reports/tds';
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
const items = (labels: string[]) =>
  labels.map((label) => ({ label, route: `${BASE}/${slug(label)}` }));

export default function TDSReports() {
  const navigate = useNavigate();

  const sections = [
    {
      title: 'TDS MENU & CHALLANS',
      items: items([
        'TDS Reports Menu',
        'TDS Challan Reconciliation',
        'TDS Challan Details',
        'TDS Challan Status',
      ]),
    },
    {
      title: 'TDS RETURNS',
      items: items(['Form 26Q', 'Form 27Q', 'Form 24Q', 'TDS Return Transaction Book']),
    },
    {
      title: 'TDS OUTSTANDINGS',
      items: items([
        'TDS Outstandings',
        'TDS Outstandings Nature of Payment-wise',
        'TDS Outstandings Party-wise',
      ]),
    },
    {
      title: 'TDS EXCEPTIONS',
      items: items([
        'Ledgers Without PAN - Deductees',
        'Deductee PAN Exception',
        'Deductee Type Exception',
        'Resident Type Exception',
        'Section Number Exception',
      ]),
    },
    {
      title: 'TDS DEDUCTION DETAILS',
      items: items([
        'TDS Deduction Details',
        'TDS Deducted at Normal Rate',
        'TDS Deducted at Higher Rate',
        'TDS Zero/Lower Rate Deduction',
        'TDS Exemption Limit Report',
      ]),
    },
    {
      title: 'TDS PAYMENTS & RETURNS',
      items: items([
        'TDS Payment Details',
        'TDS Balance Payable',
        'TDS Recompute Return',
        'TDS Revised Return',
        'TDS Save Return',
      ]),
    },
    {
      title: 'TDS VALIDATION & EXPORT',
      items: items([
        'TDS Remarks Report',
        'TDS Exception Report',
        'TDS Validation/FVU Report',
        'TDS Return Export Report',
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
        <CardTitle className="text-base font-semibold">TDS Reports</CardTitle>
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
