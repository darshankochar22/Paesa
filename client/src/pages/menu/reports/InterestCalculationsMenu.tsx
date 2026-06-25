import { Link, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/shadcn/card";
import { Button } from "@/components/shadcn/button";

export default function InterestCalculationsMenu() {
  const navigate = useNavigate();
  const items = [
    { label: "Interest Receivable", route: "/reports/accounts/interest-receivable" },
    { label: "Interest Payable",    route: "/reports/accounts/interest-payable" },
    { label: "Ledger",              route: "/reports/accounts/interest-calculation-ledger-wise" },
    { label: "Bill-wise",           route: "/reports/accounts/interest-calculation-bill-wise" },
  ];
  return (
    <Card size="sm" className="w-72 mx-auto mt-10 text-xs">
      <CardHeader className="gap-1 pb-1">
        <div className="text-[11px] italic text-zinc-500 flex flex-wrap gap-1">
          <Link to="/" className="hover:underline hover:text-zinc-900">Gateway of Tally</Link>
          <span>&gt;</span>
          <Link to="/reports/display-more" className="hover:underline hover:text-zinc-900">Display More Reports</Link>
          <span>&gt;</span>
          <Link to="/reports/statements-of-accounts" className="hover:underline hover:text-zinc-900">Statements of Accounts</Link>
        </div>
        <CardTitle className="text-base font-semibold">Interest Calculations</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-0.5">
        {items.map((item) => (
          <Button key={item.label} asChild variant="ghost" size="xs"
            className="justify-start text-[11px] font-normal px-2 h-7 text-zinc-700">
            <Link to={item.route}>{item.label}</Link>
          </Button>
        ))}
        <Button variant="ghost" size="xs" onClick={() => navigate(-1)}
          className="justify-start text-[11px] font-semibold px-2 h-7 mt-2 text-zinc-900">
          Quit
        </Button>
      </CardContent>
    </Card>
  );
}
