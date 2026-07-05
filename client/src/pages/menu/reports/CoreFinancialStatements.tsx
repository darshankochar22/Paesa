import { Link, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';
import { Separator } from '@/components/shadcn/separator';

const BASE = '/reports/financial-statements';
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
const items = (labels: string[]) =>
  labels.map((label) => ({ label, route: `${BASE}/${slug(label)}` }));

export default function CoreFinancialStatements() {
  const navigate = useNavigate();

  const sections = [
    {
      title: 'BALANCE SHEET',
      items: items([
        'Balance Sheet',
        'Vertical Balance Sheet',
        'Consolidated Balance Sheet',
        'Schedule VI Balance Sheet',
        'Balance Sheet with Previous Year',
        'Balance Sheet with Monthly Columns',
      ]),
    },
    {
      title: 'PROFIT & LOSS',
      items: items([
        'Profit & Loss Account',
        'Vertical Profit & Loss Account',
        'Profit & Loss with Gross Profit Split',
        'Profit & Loss Monthly Comparison',
        'Profit & Loss Cost Centre-wise',
      ]),
    },
    {
      title: 'TRIAL BALANCE',
      items: items([
        'Trial Balance',
        'Group-wise Trial Balance',
        'Ledger-wise Trial Balance',
        'Opening Balance Trial Balance',
        'Closing Balance Trial Balance',
        'Trial Balance with Transactions',
      ]),
    },
    {
      title: 'CASH & FUND FLOW',
      items: items(['Cash Flow Statement', 'Cash Flow Projection', 'Fund Flow Statement']),
    },
    {
      title: 'ANALYSIS & RATIOS',
      items: items([
        'Ratio Analysis',
        'Statistics Report',
        'Working Capital Report',
        'Net Worth Report',
      ]),
    },
    {
      title: 'GROUP SUMMARIES',
      items: items([
        'Capital Account Summary',
        'Reserves & Surplus Summary',
        'Drawings Summary',
        'Fixed Assets Summary',
        'Depreciation Summary',
        'Loans & Advances Summary',
        'Secured Loans Summary',
        'Unsecured Loans Summary',
        'Current Assets Summary',
        'Current Liabilities Summary',
        'Monthly Financial Snapshot',
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
        <CardTitle className="text-base font-semibold">Core Financial Statements</CardTitle>
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
