import { Link } from 'react-router-dom';
import { useEscapeBack } from '@/hooks/useEscape';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';

export default function PayrollReports() {
  useEscapeBack();

  const sections = [
    {
      title: 'SUMMARY',
      items: [
        'Pay Slip',
        'Pay Sheet',
        'Attendance Sheet',
        'Payment Advice',
        'Employees Without E-mail IDs',
        'Payroll Statement',
        'Employee Pay Head Breakup',
        'Pay Head Employee Breakup',
        'Statutory Reports',
      ],
    },
    {
      title: 'REGISTERS',
      items: ['Payroll Register', 'Attendance Register'],
    },
    {
      // "Expat Reports" (passport/visa expiry) intentionally omitted — the
      // employees schema stores no passport/visa fields to report on.
      title: 'EMPLOYEES',
      items: ['Employee Profile', 'Employee Head Count'],
    },
  ];

  const getRoute = (_section: string, item: string) => {
    const routes: Record<string, string> = {
      'Pay Slip': '/reports/payroll-hr/pay-slip',
      'Pay Sheet': '/reports/payroll-hr/pay-sheet',
      'Attendance Sheet': '/reports/payroll-hr/attendance-sheet',
      'Payment Advice': '/reports/payroll-hr/payment-advice',
      'Employees Without E-mail IDs': '/reports/payroll-hr/employees-without-email',
      'Payroll Statement': '/reports/payroll-hr/payroll-statement',
      'Employee Pay Head Breakup': '/reports/payroll-hr/employee-pay-head-breakup',
      'Pay Head Employee Breakup': '/reports/payroll-hr/pay-head-employee-breakup',
      'Statutory Reports': '/reports/payroll-hr/statutory-reports',
      'Payroll Register': '/reports/payroll-hr/payroll-register',
      'Attendance Register': '/reports/payroll-hr/attendance-register',
      'Employee Profile': '/reports/payroll-hr/employee-profile',
      'Employee Head Count': '/reports/payroll-hr/employee-head-count',
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
        <CardTitle className="text-base font-semibold">Payroll Reports</CardTitle>
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
