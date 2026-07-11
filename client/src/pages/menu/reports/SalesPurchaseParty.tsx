import { Link } from 'react-router-dom';
import { useEscapeBack } from '@/hooks/useEscape';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';

const BASE = '/reports/sales-purchase-party';
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
const items = (labels: string[]) =>
  labels.map((label) => ({ label, route: `${BASE}/${slug(label)}` }));

export default function SalesPurchaseParty() {
  useEscapeBack();

  const sections = [
    {
      title: 'SALES REGISTER',
      items: items([
        'Sales Register Detailed',
        'Sales Register Monthly',
        'Sales Register Party-wise',
        'Sales Register Item-wise',
        'Sales Register Voucher-wise',
        'Sales Register GST-wise',
        'Sales Register State-wise',
        'Sales Register Salesperson-wise',
        'Sales Register Cost Centre-wise',
        'Sales Return Register',
      ]),
    },
    {
      title: 'PURCHASE REGISTER',
      items: items([
        'Purchase Register Detailed',
        'Purchase Register Monthly',
        'Purchase Register Supplier-wise',
        'Purchase Register Item-wise',
        'Purchase Register Voucher-wise',
        'Purchase Register GST-wise',
        'Purchase Register State-wise',
        'Purchase Register Cost Centre-wise',
        'Purchase Return Register',
      ]),
    },
    {
      title: 'PARTY ANALYSIS',
      items: items([
        'Customer Summary',
        'Supplier Summary',
        'Customer Profitability',
        'Supplier Purchase Analysis',
        'Top Customers by Sales',
        'Top Suppliers by Purchase',
        'Dormant Customers',
        'Dormant Suppliers',
        'New Customers Report',
        'New Suppliers Report',
        'Customer Credit Analysis',
        'Supplier Credit Analysis',
      ]),
    },
    {
      title: 'CHARGES & MARGINS',
      items: items(['Discount Analysis', 'Additional Charges Analysis', 'Freight Analysis']),
    },
    {
      title: 'SALESPERSON & TARGETS',
      items: items(['Salesperson Performance', 'Sales Target Report', 'Sales Target vs Actual']),
    },
    {
      title: 'ORDER MANAGEMENT',
      items: items([
        'Order to Invoice Report',
        'Purchase Order to Bill Report',
        'Pending Sales Orders',
        'Pending Purchase Orders',
        'Cancelled Sales Orders',
        'Cancelled Purchase Orders',
        'Preclosed Sales Orders',
        'Preclosed Purchase Orders',
        'Delivery Pending Sales Orders',
        'Receipt Pending Purchase Orders',
      ]),
    },
    {
      title: 'RETURNS ANALYSIS',
      items: items([
        'Party-wise Sales Return',
        'Party-wise Purchase Return',
        'Item-wise Sales Return',
        'Item-wise Purchase Return',
      ]),
    },
    {
      title: 'PRICING & PROFITABILITY',
      items: items([
        'Price List Report',
        'Price Change History',
        'Margin Analysis',
        'Gross Profit by Invoice',
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
        <CardTitle className="text-base font-semibold">Sales, Purchase & Party Analysis</CardTitle>
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
