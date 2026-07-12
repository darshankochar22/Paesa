import { Link } from 'react-router-dom';
import { useEscapeBack } from '@/hooks/useEscape';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/shadcn/card';
import { Button } from '@/components/shadcn/button';

const BASE = '/reports/payroll-hr';
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
const items = (labels: string[]) =>
  labels.map((label) => ({ label, route: `${BASE}/${slug(label)}` }));

export default function PayrollHRReports() {
  useEscapeBack();

  const sections = [
    {
      title: 'PAYROLL MENU',
      items: items([
        'Payroll Reports Menu',
        'Payroll Summary',
        'Employee Summary',
        'Employee Pay Slip',
      ]),
    },
    {
      title: 'PAYROLL STATEMENTS',
      items: items(['Pay Sheet', 'Salary Register']),
    },
    {
      title: 'ATTENDANCE & LEAVE',
      items: items([
        'Attendance Register',
        'Attendance Sheet',
        'Overtime Register',
        'Leave Register',
        'Leave Encashment Report',
      ]),
    },
    {
      title: 'EMPLOYEE BENEFITS',
      items: items(['Gratuity Report', 'Employee Loan/Advance Report']),
    },
    {
      title: 'PAYROLL REGISTERS & ANALYSIS',
      items: items([
        'Payroll Voucher Register',
        'Payroll Cost Centre Report',
        'Department-wise Payroll',
        'Employee Group-wise Payroll',
      ]),
    },
    {
      title: 'PAY HEADS',
      items: items([
        'Pay Head Summary',
        'Pay Head Employee-wise',
        'Earnings Summary',
        'Deductions Summary',
        'Employer Contribution Summary',
      ]),
    },
    {
      title: 'STATUTORY PAYROLL',
      items: items(['Payroll Statutory Summary', 'Payroll Statutory Pay Head Details']),
    },
    {
      title: 'PROVIDENT FUND',
      items: items([
        'Provident Fund Summary',
        'PF Form 5',
        'PF Form 10',
        'PF Form 12A',
        'PF Monthly Statement',
        'PF E-Challan-cum-Return',
        'PF Form 3A',
        'PF Form 6A',
        'PF E-Return',
      ]),
    },
    {
      title: 'ESI',
      items: items([
        'Employee State Insurance Summary',
        'ESI Monthly Contribution',
        'ESI Employee-wise Contribution',
        'ESI Employer Contribution',
      ]),
    },
    {
      title: 'PROFESSIONAL TAX',
      items: items([
        'Professional Tax Summary',
        'Professional Tax Employee-wise',
        'Professional Tax State-wise',
      ]),
    },
    {
      title: 'NPS',
      items: items([
        'National Pension Scheme Summary',
        'NPS Employee Contribution',
        'NPS Employer Contribution',
      ]),
    },
    {
      title: 'INCOME TAX - PAYROLL',
      items: items([
        'Income Tax Summary',
        'Form 16',
        'Form 12BA',
        'Annexure I',
        'Annexure II',
        'Form 24Q Payroll',
        'E-24Q Return',
        'TDS Variance Payroll',
        'Income Tax Projection',
        'Tax Regime Comparison',
        'Employee Investment Declaration',
        'Employee Tax Computation',
      ]),
    },
  ];

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
        <CardTitle className="text-base font-semibold">Payroll & HR Reports</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {sections.map((section, si) => (
          <div key={si} className="flex flex-col gap-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-black px-1">
              {section.title}
            </div>
            <div className="flex flex-col pl-3 gap-0.5">
              {section.items.map((item) => (
                <Button
                  key={item.label}
                  asChild
                  variant="ghost"
                  size="xs"
                  className="justify-start text-[11px] font-normal px-2 h-7 text-black"
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
