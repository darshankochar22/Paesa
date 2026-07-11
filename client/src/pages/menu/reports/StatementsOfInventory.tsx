import { Link } from 'react-router-dom';
import { useEscapeBack } from '@/hooks/useEscape';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';

export default function StatementsOfInventory() {
  useEscapeBack();

  const sections = [
    {
      title: 'STOCK',
      items: [
        'Stock Query',
        'Movement Analysis',
        'Ageing Analysis',
        'Job Work Analysis',
        'Reorder Status',
        'Cost Estimation',
        'Item Cost Analysis',
      ],
    },
    {
      title: 'STOCK OUTSTANDINGS',
      items: [
        'Sales Order Outstandings',
        'Purchase Order Outstandings',
        'Sale Bills Pending',
        'Purchase Bills Pending',
      ],
    },
  ];

  const getRoute = (_section: string, item: string) => {
    const routes: Record<string, string> = {
      'Stock Query': '/reports/statements-of-inventory/stock-query',
      'Movement Analysis': '/reports/statements-of-inventory/movement-analysis',
      'Ageing Analysis': '/reports/statements-of-inventory/ageing-analysis',
      'Job Work Analysis': '/reports/statements-of-inventory/job-work-analysis',
      'Reorder Status': '/reports/statements-of-inventory/reorder-status',
      'Cost Estimation': '/reports/statements-of-inventory/cost-estimation',
      'Item Cost Analysis': '/reports/statements-of-inventory/item-cost-analysis',
      'Sales Order Outstandings': '/reports/statements-of-inventory/sales-order-outstandings',
      'Purchase Order Outstandings': '/reports/statements-of-inventory/purchase-order-outstandings',
      'Sale Bills Pending': '/reports/statements-of-inventory/sale-bills-pending',
      'Purchase Bills Pending': '/reports/statements-of-inventory/purchase-bills-pending',
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
        <CardTitle className="text-base font-semibold">Statements of Inventory</CardTitle>
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
