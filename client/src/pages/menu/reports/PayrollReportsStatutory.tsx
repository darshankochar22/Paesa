import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';
import { useEscapeBack } from '@/hooks/useEscape';

// Statutory Reports → Payroll Reports (compact menu #206, parallel to GST/TDS/TCS).
// Summary + Provident Fund open dedicated screens; the remaining components route to
// their existing report screens.
export default function PayrollReportsStatutory() {
  useEscapeBack();

  const items: Array<{ label: string; route: string }> = [
    { label: 'Summary', route: '/reports/statutory/payroll/summary' },
    { label: 'Provident Fund', route: '/reports/statutory/payroll/pf' },
    {
      label: 'Employee State Insurance',
      route: '/reports/statutory/payroll/esi',
    },
    { label: 'Professional Tax', route: '/reports/statutory/payroll/professional-tax' },
    { label: 'National Pension Scheme', route: '/reports/statutory/payroll/nps' },
    { label: 'Gratuity', route: '/reports/statutory/payroll/gratuity' },
    { label: 'Income Tax', route: '/reports/statutory/payroll/income-tax' },
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
          <span>&gt;</span>
          <Link to="/reports/statutory" className="hover:underline hover:text-zinc-900">
            Statutory Reports
          </Link>
        </div>
        <CardTitle className="text-base font-semibold">Payroll Reports</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col pl-3 gap-0.5">
          {items.map((item) => (
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
      </CardContent>
    </Card>
  );
}

// Payroll Reports → Provident Fund submenu (#207/#208 fill the Form 5/10 screens).
export function PFReportsMenu() {
  useEscapeBack();

  const sections: Array<{ title: string; items: Array<{ label: string; route: string }> }> = [
    {
      title: 'MONTHLY',
      items: [
        { label: 'Form 5', route: '/reports/statutory/payroll/pf/form-5' },
        { label: 'Form 10', route: '/reports/statutory/payroll/pf/form-10' },
        { label: 'Form 12A', route: '/reports/statutory/payroll/pf/form-12a' },
        { label: 'Monthly Statement', route: '/reports/statutory/payroll/pf/monthly-statement' },
        {
          label: 'E-Challan Cum Return (ECR)',
          route: '/reports/statutory/payroll/pf/ecr',
        },
      ],
    },
    {
      title: 'ANNUAL',
      items: [
        { label: 'Form 3A', route: '/reports/statutory/payroll/pf/form-3a' },
        { label: 'Form 6A', route: '/reports/statutory/payroll/pf/form-6a' },
      ],
    },
    {
      title: '',
      items: [{ label: 'E-Return', route: '/reports/statutory/payroll/pf/e-return' }],
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
          <Link to="/reports/statutory" className="hover:underline hover:text-zinc-900">
            Statutory Reports
          </Link>
          <span>&gt;</span>
          <Link to="/reports/statutory/payroll" className="hover:underline hover:text-zinc-900">
            Payroll Reports
          </Link>
        </div>
        <CardTitle className="text-base font-semibold">Provident Fund</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {sections.map((sec, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            {sec.title && (
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-1">
                {sec.title}
              </div>
            )}
            <div className="flex flex-col pl-3 gap-0.5">
              {sec.items.map((item) => (
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

// Payroll Reports → Employee State Insurance submenu (#218-#222). Monthly: Form 3 /
// Monthly Statement / E-Return; Half-Yearly: Form 5 / Form 6.
export function ESIReportsMenu() {
  useEscapeBack();

  const sections: Array<{ title: string; items: Array<{ label: string; route: string }> }> = [
    {
      title: 'MONTHLY',
      items: [
        { label: 'Form 3', route: '/reports/statutory/payroll/esi/form-3' },
        { label: 'Monthly Statement', route: '/reports/statutory/payroll/esi/monthly-statement' },
        { label: 'E-Return', route: '/reports/statutory/payroll/esi/e-return' },
      ],
    },
    {
      title: 'HALF YEARLY',
      items: [
        { label: 'Form 5', route: '/reports/statutory/payroll/esi/form-5' },
        { label: 'Form 6', route: '/reports/statutory/payroll/esi/form-6' },
      ],
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
          <Link to="/reports/statutory/payroll" className="hover:underline hover:text-zinc-900">
            Payroll Reports
          </Link>
        </div>
        <CardTitle className="text-base font-semibold">Employee State Insurance</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {sections.map((sec, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-1">
              {sec.title}
            </div>
            <div className="flex flex-col pl-3 gap-0.5">
              {sec.items.map((item) => (
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

// Payroll Reports → National Pension Scheme submenu (#224-#226).
export function NPSReportsMenu() {
  useEscapeBack();

  const items: Array<{ label: string; route: string }> = [
    {
      label: 'Subscriber Contribution Details',
      route: '/reports/statutory/payroll/nps/contribution-details',
    },
    { label: 'NPS Summary', route: '/reports/statutory/payroll/nps/summary' },
    { label: 'PRAN Not Available', route: '/reports/statutory/payroll/nps/pran-not-available' },
  ];

  return (
    <Card size="sm" className="w-96 mx-auto mt-10 text-xs">
      <CardHeader className="gap-1 pb-1">
        <div className="text-[11px] italic text-zinc-500 flex flex-wrap gap-1">
          <Link to="/" className="hover:underline hover:text-zinc-900">
            Gateway
          </Link>
          <span>&gt;</span>
          <Link to="/reports/statutory/payroll" className="hover:underline hover:text-zinc-900">
            Payroll Reports
          </Link>
        </div>
        <CardTitle className="text-base font-semibold">National Pension Scheme</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col pl-3 gap-0.5">
          {items.map((item) => (
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
      </CardContent>
    </Card>
  );
}

// Payroll Reports → Income Tax submenu (#228-#233). Computation/Projection/Challan
// Reconciliation, plus the e-TDS return forms (E-24Q / Form 27A / Form 24Q).
export function IncomeTaxReportsMenu() {
  useEscapeBack();

  const sections: Array<{ title: string; items: Array<{ label: string; route: string }> }> = [
    {
      title: 'STATEMENTS',
      items: [
        { label: 'Computation', route: '/reports/statutory/payroll/income-tax/computation' },
        {
          label: 'Salary Projection',
          route: '/reports/statutory/payroll/income-tax/salary-projection',
        },
        {
          label: 'Challan Reconciliation',
          route: '/reports/statutory/payroll/income-tax/challan-reconciliation',
        },
      ],
    },
    {
      title: 'RETURNS',
      items: [
        { label: 'E-24Q', route: '/reports/statutory/payroll/income-tax/e-24q' },
        { label: 'Form 27A', route: '/reports/statutory/payroll/income-tax/form-27a' },
        { label: 'Form 24Q', route: '/reports/statutory/payroll/income-tax/form-24q' },
        { label: 'Annexure I to 24Q', route: '/reports/statutory/payroll/income-tax/annexure-i' },
        { label: 'Annexure II to 24Q', route: '/reports/statutory/payroll/income-tax/annexure-ii' },
      ],
    },
    {
      title: 'CERTIFICATES',
      items: [{ label: 'Form 16', route: '/reports/statutory/payroll/income-tax/form-16' }],
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
          <Link to="/reports/statutory/payroll" className="hover:underline hover:text-zinc-900">
            Payroll Reports
          </Link>
        </div>
        <CardTitle className="text-base font-semibold">Income Tax</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {sections.map((sec, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-1">
              {sec.title}
            </div>
            <div className="flex flex-col pl-3 gap-0.5">
              {sec.items.map((item) => (
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

// Provident Fund → E-Return submenu (#214). Monthly: Form 5/10/12A, Annual: Form 3A —
// each reuses its existing PF document screen.
export function PFEReturnMenu() {
  useEscapeBack();

  const sections: Array<{ title: string; items: Array<{ label: string; route: string }> }> = [
    {
      title: 'MONTHLY',
      items: [
        { label: 'Form 5', route: '/reports/statutory/payroll/pf/e-return/form-5' },
        { label: 'Form 10', route: '/reports/statutory/payroll/pf/e-return/form-10' },
        { label: 'Form 12A', route: '/reports/statutory/payroll/pf/e-return/form-12a' },
      ],
    },
    {
      title: 'ANNUAL',
      items: [{ label: 'Form 3A', route: '/reports/statutory/payroll/pf/e-return/form-3a' }],
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
          <Link to="/reports/statutory/payroll" className="hover:underline hover:text-zinc-900">
            Payroll Reports
          </Link>
          <span>&gt;</span>
          <Link to="/reports/statutory/payroll/pf" className="hover:underline hover:text-zinc-900">
            Provident Fund
          </Link>
        </div>
        <CardTitle className="text-base font-semibold">E-Return</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {sections.map((sec, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-1">
              {sec.title}
            </div>
            <div className="flex flex-col pl-3 gap-0.5">
              {sec.items.map((item) => (
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
