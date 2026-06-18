import { Link, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/shadcn/card";
import { Button } from "@/components/shadcn/button";
import { Separator } from "@/components/shadcn/separator";

export default function PayrollReports() {
  const navigate = useNavigate();

  const sections = [
    {
      title: "PAYROLL STATEMENTS",
      items: [
        { label: "Payslip",                 route: "/reports/payroll/payslip" },
        { label: "Salary Statement",        route: "/reports/payroll/salary-statement" },
        { label: "Salary Register",         route: "/reports/payroll/salary-register" },
      ],
    },
    {
      title: "ATTENDANCE",
      items: [
        { label: "Attendance Register",     route: "/reports/payroll/attendance-register" },
        { label: "Pay Head Breakup",        route: "/reports/payroll/pay-head-breakup" },
      ],
    },
    {
      title: "STATUTORY",
      items: [
        { label: "PF Reports",              route: "/reports/payroll/pf" },
        { label: "ESI Reports",             route: "/reports/payroll/esi" },
        { label: "Professional Tax",        route: "/reports/payroll/professional-tax" },
        { label: "Gratuity",                route: "/reports/payroll/gratuity" },
      ],
    },
  ];

  return (
    <Card size="sm" className="w-96 mx-auto mt-10 text-xs">
      <CardHeader className="gap-1 pb-1">
        <div className="text-[11px] italic text-zinc-500 flex flex-wrap gap-1">
          <Link to="/" className="hover:underline hover:text-zinc-900">Gateway of Tally</Link>
          <span>&gt;</span>
          <Link to="/reports/display-more" className="hover:underline hover:text-zinc-900">Display More Reports</Link>
        </div>
        <CardTitle className="text-base font-semibold">Payroll Reports</CardTitle>
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

        <Separator className="my-1" />
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
