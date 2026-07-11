import { Link } from 'react-router-dom';
import { useEscapeBack } from '@/hooks/useEscape';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';
import { useCompany } from '@/context/CompanyContext';
import { isTaxFeatureEnabled, type TaxFeature } from '@/lib/taxFeatures';

// Report sections hidden when their F11 tax feature is off (Service Tax/MSME not gated).
const SECTION_FEATURE: Record<string, TaxFeature> = {
  VAT: 'vat',
  'CENTRAL EXCISE': 'excise',
  'SERVICE TAX': 'serviceTax',
};

const BASE = '/reports/legacy-statutory';
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
const items = (labels: string[]) =>
  labels.map((label) => ({ label, route: `${BASE}/${slug(label)}` }));

export default function LegacyStatutory() {
  useEscapeBack();
  const { features } = useCompany();

  const allSections = [
    {
      title: 'VAT',
      items: items([
        'VAT Reports Menu',
        'VAT Computation',
        'VAT Return Summary',
        'VAT Sales Annexure',
        'VAT Purchase Annexure',
        'VAT Commodity-wise Report',
        'VAT Party-wise Report',
        'VAT Form RT-III',
        'VAT Payment Details',
        'VAT Exception Report',
      ]),
    },
    {
      title: 'CENTRAL EXCISE',
      items: items([
        'Central Excise Reports Menu',
        'Excise Computation',
        'Excise Duty Payable',
        'Excise Sales Register',
        'Excise Purchase Register',
        'Excise Stock Register',
        'Excise Invoice Register',
        'Excise Payment Register',
        'Excise Exception Report',
      ]),
    },
    {
      title: 'SERVICE TAX',
      items: items([
        'Service Tax Reports Menu',
        'Service Tax Computation',
        'Form ST-3',
        'Service Tax Payable',
        'Service Tax Input Credit',
        'Service Tax Payment Details',
        'Service Tax Exception Report',
      ]),
    },
    {
      title: 'MSME',
      items: items([
        'MSME Reports Menu',
        'MSME Form 1',
        'MSME Outstanding to Micro/Small Enterprises',
        'MSME Supplier Ageing',
        'MSME Interest Payable',
        'MSME Pending Acceptance Report',
        'MSME Party Classification Exception',
        'MSME Payment Delay Report',
        'MSME Compliance Summary',
      ]),
    },
  ];

  // Hide the VAT report block when VAT is turned off in Company Features (F11).
  const sections = allSections.filter((s) => {
    const f = SECTION_FEATURE[s.title];
    return !f || isTaxFeatureEnabled(features, f);
  });

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
        <CardTitle className="text-base font-semibold">
          VAT, Excise, Service Tax, MSME & Legacy Statutory
        </CardTitle>
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
