import { Link, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/shadcn/card";
import { Button } from "@/components/shadcn/button";

// Payroll Reports → Statutory Reports sub-menu (Tally parity).
// Each item resolves through the ReportRunner catch-all via its definition slug.
const ROUTES: Record<string, string> = {
  "Provident Fund Summary": "/reports/payroll-hr/provident-fund-summary",
  "Employee State Insurance Summary": "/reports/payroll-hr/employee-state-insurance-summary",
  "Professional Tax Summary": "/reports/payroll-hr/professional-tax-summary",
  "Gratuity Report": "/reports/payroll-hr/gratuity-report",
  "Payroll Statutory Pay Head Details": "/reports/payroll-hr/payroll-statutory-pay-head-details",
};

const ITEMS = Object.keys(ROUTES);

export default function PayrollStatutoryReportsMenu() {
  const navigate = useNavigate();
  return (
    <Card size="sm" className="w-96 mx-auto mt-10 text-xs">
      <CardHeader className="gap-1 pb-1">
        <div className="text-[11px] italic text-zinc-500 flex flex-wrap gap-1">
          <Link to="/" className="hover:underline hover:text-zinc-900">Gateway of Tally</Link>
          <span>&gt;</span>
          <Link to="/reports/payroll-hr" className="hover:underline hover:text-zinc-900">Payroll Reports</Link>
        </div>
        <CardTitle className="text-base font-semibold">Statutory Reports</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {ITEMS.map((item) => (
          <Button key={item} asChild variant="ghost" size="xs"
            className="justify-start text-[11px] font-normal px-2 h-7 text-zinc-700">
            <Link to={ROUTES[item]}>{item}</Link>
          </Button>
        ))}
        <Button onClick={() => navigate(-1)} variant="ghost" size="xs"
          className="justify-start text-[11px] font-semibold px-2 h-7 mt-2 text-zinc-900">
          Quit
        </Button>
      </CardContent>
    </Card>
  );
}
