import { Link, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';

const ROUTES: Record<string, string> = {
  'Stock Group': '/reports/statements-of-inventory/item-cost-analysis/stock-group',
  'Stock Item': '/reports/statements-of-inventory/item-cost-analysis/stock-item',
  'Cost Track Break-up': '/reports/statements-of-inventory/item-cost-analysis/cost-track',
};

const ITEMS = ['Stock Group', 'Stock Item', 'Cost Track Break-up'];

export default function ItemCostAnalysisMenu() {
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
        <CardTitle className="text-base font-semibold">Item Cost Analysis</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {ITEMS.map((item) => (
          <Button
            key={item}
            asChild
            variant="ghost"
            size="xs"
            className="justify-start text-[11px] font-normal px-2 h-7 text-zinc-700"
          >
            <Link to={ROUTES[item]}>{item}</Link>
          </Button>
        ))}
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
