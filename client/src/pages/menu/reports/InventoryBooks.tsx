import { Link, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';

export default function InventoryBooks() {
  const navigate = useNavigate();

  const sections = [
    {
      title: 'SUMMARY',
      items: [
        'Stock Item',
        'Batch',
        'Godowns / Excise Units',
        'Stock Group Summary',
        'Stock Category Summary',
      ],
    },
    {
      title: 'REGISTERS',
      items: [
        'Sales Orders Book',
        'Purchase Orders Book',
        'Delivery Note Register',
        'Receipt Note Register',
        'Rejections In Register',
        'Rejections Out Register',
        'Stock Transfer Journal Register',
        'Physical Stock Register',
      ],
    },
    {
      title: '',
      items: ['Quit'],
    },
  ];

  const getRoute = (_section: string, item: string) => {
    const routes: Record<string, string> = {
      'Stock Item': '/reports/inventory/stock-item',
      Batch: '/reports/inventory/batch-vouchers',
      'Godowns / Excise Units': '/reports/inventory/godown-summary',
      'Stock Group Summary': '/reports/inventory/stock-group-summary',
      'Stock Category Summary': '/reports/inventory/stock-category-summary',
      'Sales Orders Book': '/reports/inventory-books/sales-orders-book',
      'Purchase Orders Book': '/reports/inventory-books/purchase-orders-book',
      'Delivery Note Register': '/reports/inventory-books/delivery-note-register',
      'Receipt Note Register': '/reports/inventory-books/receipt-note-register',
      'Rejections In Register': '/reports/inventory-books/rejections-in-register',
      'Rejections Out Register': '/reports/inventory-books/rejections-out-register',
      'Stock Transfer Journal Register': '/reports/inventory-books/stock-transfer-register',
      'Physical Stock Register': '/reports/inventory-books/physical-stock-register',
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
        <CardTitle className="text-base font-semibold">Inventory Books</CardTitle>
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
