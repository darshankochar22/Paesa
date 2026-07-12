import { Link } from 'react-router-dom';
import { useEscapeBack } from '@/hooks/useEscape';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';

export default function OutstandingsMenu() {
  useEscapeBack();
  const items = [
    { label: 'Receivables', route: '/reports/accounts/outstandings-receivable' },
    { label: 'Payables', route: '/reports/accounts/outstandings-payable' },
    { label: 'Ledger', route: '/reports/accounts/ledger-outstandings' },
    { label: 'Group', route: '/reports/accounts/group-outstandings' },
  ];
  return (
    <Card size="sm" className="w-72 mx-auto mt-10 text-xs">
      <CardHeader className="gap-1 pb-1">
        <div className="text-[11px] italic text-black flex flex-wrap gap-1">
          <Link to="/" className="hover:underline hover:text-black">
            Gateway
          </Link>
          <span>&gt;</span>
          <Link to="/reports/display-more" className="hover:underline hover:text-black">
            Display More Reports
          </Link>
          <span>&gt;</span>
          <Link to="/reports/statements-of-accounts" className="hover:underline hover:text-black">
            Statements of Accounts
          </Link>
        </div>
        <CardTitle className="text-base font-semibold">Outstandings</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-0.5">
        {items.map((item) => (
          <Button
            key={item.label}
            asChild
            variant="ghost"
            size="xs"
            className="justify-start text-[11px] font-normal px-2 h-7 text-black"
          >
            <Link to={item.route}>{item.label}</Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
