import { Link } from 'react-router-dom';
import { useEscapeBack } from '@/hooks/useEscape';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';

export default function AccountBooks() {
  useEscapeBack();

  const sections = [
    {
      title: 'SUMMARY',
      items: ['Cash/Bank Book(s)', 'Ledger', 'Group Summary', 'Group Vouchers'],
    },
    {
      title: 'REGISTERS',
      items: [
        'Contra Register',
        'Payment Register',
        'Receipt Register',
        'Sales Register',
        'Purchase Register',
        'Journal Register',
        'Debit Note Register',
        'Credit Note Register',
        'Voucher Clarification',
      ],
    },
  ];

  const getRoute = (_section: string, item: string) => {
    const routes: Record<string, string> = {
      'Cash/Bank Book(s)': '/reports/accounts/cash-bank',
      Ledger: '/reports/accounts/ledger-select',
      'Group Summary': '/reports/accounts/group-select',
      'Group Vouchers': '/reports/accounts/group-vouchers-select',
      'Contra Register': '/reports/accounts/contra-register',
      'Payment Register': '/reports/accounts/payment-register',
      'Receipt Register': '/reports/accounts/receipt-register',
      'Sales Register': '/reports/accounts/sales-register',
      'Purchase Register': '/reports/accounts/purchase-register',
      'Journal Register': '/reports/accounts/journal-register',
      'Debit Note Register': '/reports/accounts/debit-note-register',
      'Credit Note Register': '/reports/accounts/credit-note-register',
      'Voucher Clarification': '/reports/accounts/voucher-clarification',
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
        <CardTitle className="text-base font-semibold">Account Books</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {sections.map((section) => (
          <div key={section.title || 'misc'} className="flex flex-col gap-1.5">
            {section.title && (
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-1">
                {section.title}
              </div>
            )}
            <div className="flex flex-col pl-3 gap-0.5">
              {section.items.map((item) => {
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
