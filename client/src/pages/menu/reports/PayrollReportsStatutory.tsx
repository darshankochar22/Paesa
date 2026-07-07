import { Link, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';

// Statutory Reports → Payroll Reports (compact menu #206, parallel to GST/TDS/TCS).
// Summary + Provident Fund open dedicated screens; the remaining components route to
// their existing report screens.
export default function PayrollReportsStatutory() {
  const navigate = useNavigate();

  const items: Array<{ label: string; route: string }> = [
    { label: 'Summary', route: '/reports/statutory/payroll/summary' },
    { label: 'Provident Fund', route: '/reports/statutory/payroll/pf' },
    {
      label: 'Employee State Insurance',
      route: '/reports/payroll-hr/employee-state-insurance-summary',
    },
    { label: 'Professional Tax', route: '/reports/payroll-hr/professional-tax-summary' },
    { label: 'National Pension Scheme', route: '/reports/statutory/payroll/summary' },
    { label: 'Gratuity', route: '/reports/payroll-hr/gratuity-report' },
    { label: 'Income Tax', route: '/reports/statutory/payroll/summary' },
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
          <Button
            onClick={() => navigate(-1)}
            variant="ghost"
            size="xs"
            className="justify-start text-[11px] font-semibold px-2 h-7 mt-2 text-zinc-900"
          >
            Quit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Payroll Reports → Provident Fund submenu (#207/#208 fill the Form 5/10 screens).
export function PFReportsMenu() {
  const navigate = useNavigate();

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
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          size="xs"
          className="justify-start text-[11px] font-semibold px-2 h-7 text-zinc-900"
        >
          Quit
        </Button>
      </CardContent>
    </Card>
  );
}

// Provident Fund → E-Return submenu (#214). Form 5 reuses the joiners document.
export function PFEReturnMenu() {
  const navigate = useNavigate();

  const items: Array<{ label: string; route: string }> = [
    { label: 'Form 5', route: '/reports/statutory/payroll/pf/e-return/form-5' },
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
          <Button
            onClick={() => navigate(-1)}
            variant="ghost"
            size="xs"
            className="justify-start text-[11px] font-semibold px-2 h-7 mt-2 text-zinc-900"
          >
            Quit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
