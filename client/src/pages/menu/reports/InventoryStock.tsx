import { Link } from 'react-router-dom';
import { useEscapeBack } from '@/hooks/useEscape';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';

const BASE = '/reports/inventory-stock';
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
const items = (labels: string[]) =>
  labels.map((label) => ({ label, route: `${BASE}/${slug(label)}` }));

export default function InventoryStock() {
  useEscapeBack();

  const sections = [
    {
      title: 'STOCK SUMMARY',
      items: items([
        'Stock Summary',
        'Stock Summary Group-wise',
        'Stock Summary Item-wise',
        'Stock Summary Godown-wise',
        'Stock Summary Batch-wise',
        'Stock Summary Category-wise',
        'Stock Summary with Rates',
        'Stock Summary with Values',
      ]),
    },
    {
      title: 'STOCK LEDGERS',
      items: items(['Stock Item Ledger', 'Stock Group Ledger']),
    },
    {
      title: 'GODOWN',
      items: items(['Godown Summary', 'Godown Item Summary', 'Godown Batch Summary']),
    },
    {
      title: 'STOCK QUERY',
      items: items([
        'Stock Query',
        'Stock Query Godown-wise',
        'Stock Query Batch-wise',
        'Stock Query Order-wise',
      ]),
    },
    {
      title: 'MOVEMENT ANALYSIS',
      items: items([
        'Movement Analysis',
        'Movement Analysis Stock Item-wise',
        'Movement Analysis Stock Group-wise',
        'Movement Analysis Party-wise',
        'Movement Analysis Supplier-wise',
        'Movement Analysis Buyer-wise',
        'Movement Analysis Consumption-wise',
      ]),
    },
    {
      title: 'STOCK AGEING',
      items: items([
        'Stock Ageing Analysis',
        'Stock Ageing by Purchase Date',
        'Stock Ageing by Manufacturing Date',
        'Stock Ageing by Expiry Date',
        'To-be-Expired Stock Report',
        'Expired Stock Report',
      ]),
    },
    {
      title: 'BATCH & MRP',
      items: items(['Batch-wise Stock Report', 'MRP-wise Stock Report']),
    },
    {
      title: 'REORDER & EXCEPTIONS',
      items: items([
        'Reorder Status',
        'Reorder Quantity Report',
        'Negative Stock Report',
        'Zero Stock Report',
        'Low Stock Report',
        'Fast Moving Items',
        'Slow Moving Items',
        'Non-moving Items',
      ]),
    },
    {
      title: 'STOCK VALUATION',
      items: items([
        'Stock Valuation',
        'FIFO Stock Valuation',
        'Average Cost Stock Valuation',
        'Last Purchase Cost Valuation',
        'Standard Cost Valuation',
      ]),
    },
    {
      title: 'PHYSICAL STOCK & TRANSFERS',
      items: items([
        'Physical Stock Register',
        'Physical Stock Variance',
        'Stock Journal Register',
        'Stock Transfer Register',
        'Inter-Godown Transfer Report',
      ]),
    },
    {
      title: 'MATERIAL & REJECTION',
      items: items([
        'Material In Report',
        'Material Out Report',
        'Rejection In Report',
        'Rejection Out Report',
      ]),
    },
    {
      title: 'DELIVERY & RECEIPT NOTES',
      items: items([
        'Delivery Note Register',
        'Receipt Note Register',
        'Inventory Voucher Register',
      ]),
    },
    {
      title: 'PROFITABILITY & TRENDS',
      items: items([
        'Stock Item Profitability',
        'Stock Category Summary',
        'Stock Category Movement',
        'Stock Group Profitability',
        'Stock Item Cost Analysis',
        'Stock Item Sales Trend',
        'Stock Item Purchase Trend',
        'Inventory Exception Report',
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
        <CardTitle className="text-base font-semibold">Inventory, Stock & Godown Reports</CardTitle>
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
      </CardContent>
    </Card>
  );
}
