import { Link } from 'react-router-dom';
import { useEscapeBack } from '@/hooks/useEscape';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';
import { useCompany } from '@/context/CompanyContext';
import { isFeatureEnabled, type FeatureFlag } from '@/lib/companyFeatures';

// F11 gate: Interest Calculations hides when interest calc is off; Cost Centres
// hides when cost centres are off (Tally shows a report only for enabled features).
const ITEM_FEATURE: Record<string, FeatureFlag> = {
  'Interest Calculations': 'enable_interest_calculation',
  'Cost Centres': 'enable_cost_centres',
};

export default function StatementsOfAccounts() {
  useEscapeBack();
  const { features } = useCompany();

  const sections = [
    {
      title: '',
      items: ['Outstandings', 'Interest Calculations', 'Cost Centres', 'Statistics'].filter(
        (item) => !ITEM_FEATURE[item] || isFeatureEnabled(features, ITEM_FEATURE[item]),
      ),
    },
  ];

  const getRoute = (_section: string, item: string) => {
    const routes: Record<string, string> = {
      Outstandings: '/reports/statements-of-accounts/outstandings',
      'Interest Calculations': '/reports/statements-of-accounts/interest-calculations',
      'Cost Centres': '/reports/statements-of-accounts/cost-centres',
      Statistics: '/reports/statements-of-accounts/statistics',
    };
    return routes[item] ?? null;
  };

  return (
    <Card size="sm" className="w-96 mx-auto mt-10 text-xs">
      <CardHeader className="gap-1 pb-1">
        <div className="text-[11px] italic text-black flex flex-wrap gap-1">
          <Link to="/" className="hover:underline hover:text-black">
            Gateway
          </Link>
          <span>&gt;</span>
          <Link to="/reports/display-more" className="hover:underline hover:text-black">
            Display More Reports
          </Link>
        </div>
        <CardTitle className="text-base font-semibold">Statements of Accounts</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {sections.map((section, idx) => (
          <div key={idx} className="flex flex-col gap-1.5">
            {section.title && (
              <div className="text-[10px] font-bold uppercase tracking-wider text-black px-1">
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
                    className="justify-start text-[11px] font-normal px-2 h-7 text-black"
                  >
                    <Link to={route}>{item}</Link>
                  </Button>
                ) : (
                  <Button
                    key={item}
                    variant="ghost"
                    size="xs"
                    className="justify-start text-[11px] font-normal px-2 h-7 text-black"
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
