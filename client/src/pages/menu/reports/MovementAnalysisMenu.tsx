import { Link, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';

const ROUTES: Record<string, string> = {
  'Stock Group Analysis': '/reports/inventory/stock-group-analysis',
  'Stock Category Analysis': '/reports/inventory/stock-category-analysis',
  'Stock Item Analysis': '/reports/inventory/stock-item-analysis',
  'Group Analysis': '/reports/inventory/group-analysis',
  'Ledger Analysis': '/reports/inventory/ledger-analysis',
  'Transfer Analysis': '/reports/inventory/transfer-analysis',
};

const ITEMS = [
  'Stock Group Analysis',
  'Stock Category Analysis',
  'Stock Item Analysis',
  'Group Analysis',
  'Ledger Analysis',
  'Transfer Analysis',
];

export default function MovementAnalysisMenu() {
  const navigate = useNavigate();
  return (
    <Card size="sm" className="w-96 mx-auto mt-10 text-xs">
      <CardHeader className="gap-1 pb-1">
        <div className="text-[11px] italic text-zinc-500 flex flex-wrap gap-1">
          <Link to="/" className="hover:underline hover:text-zinc-900">
            Gateway
          </Link>
          <span>&gt;</span>
          <Link
            to="/reports/statements-of-inventory"
            className="hover:underline hover:text-zinc-900"
          >
            Statements of Inventory
          </Link>
        </div>
        <CardTitle className="text-base font-semibold">Movement Analysis</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {ITEMS.map((item) => {
          const route = ROUTES[item];
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
              className="justify-start text-[11px] font-normal px-2 h-7 text-zinc-400 cursor-default"
            >
              {item}
            </Button>
          );
        })}
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          size="xs"
          className="justify-start text-[11px] font-semibold px-2 h-7 mt-2 text-zinc-900"
        >
          Quit
        </Button>
      </CardContent>
    </Card>
  );
}
