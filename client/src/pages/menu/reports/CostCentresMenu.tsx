import { Link } from 'react-router-dom';
import { useEscapeBack } from '@/hooks/useEscape';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';

export default function CostCentresMenu() {
  useEscapeBack();
  const items = [
    { label: 'Category Summary', route: '/reports/accounts/cost-category-summary' },
    { label: 'Cost Centre Summary', route: '/reports/accounts/cost-centre-summary' },
    { label: 'Cost Centre Break-up', route: '/reports/accounts/cost-centre-break-up' },
    { label: 'Ledger Break-up', route: '/reports/accounts/cost-centre-ledger' },
    { label: 'Group Break-up', route: '/reports/accounts/cost-centre-wise-p-and-l' },
  ];
  return (
    <Card size="sm" className="w-72 mx-auto mt-10 text-xs">
      <CardHeader className="gap-1 pb-1">
        <div className="text-[11px] italic text-zinc-500 flex flex-wrap gap-1">
          <Link to="/" className="hover:underline hover:text-zinc-900">
            Gateway
          </Link>
          <span>&gt;</span>
          <Link to="/reports/display-more" className="hover:underline hover:text-zinc-900">
            Display More Reports
          </Link>
          <span>&gt;</span>
          <Link
            to="/reports/statements-of-accounts"
            className="hover:underline hover:text-zinc-900"
          >
            Statements of Accounts
          </Link>
        </div>
        <CardTitle className="text-base font-semibold">Cost Centres</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-0.5">
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
      </CardContent>
    </Card>
  );
}
