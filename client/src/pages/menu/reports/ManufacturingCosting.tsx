import { Link, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/shadcn/card";
import { Button } from "@/components/shadcn/button";
import { Separator } from "@/components/shadcn/separator";

const BASE = "/reports/manufacturing-costing";
const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const items = (labels: string[]) =>
  labels.map((label) => ({ label, route: `${BASE}/${slug(label)}` }));

export default function ManufacturingCosting() {
  const navigate = useNavigate();

  const sections = [
    {
      title: "BILL OF MATERIALS",
      items: items([
        "Bill of Materials Report",
        "BOM Component Summary",
        "BOM Cost Report",
      ]),
    },
    {
      title: "MANUFACTURING & PRODUCTION",
      items: items([
        "Manufacturing Journal Register",
        "Production Summary",
        "Production Voucher Register",
        "Finished Goods Production Report",
        "Raw Material Consumption Report",
        "Wastage Report",
        "Scrap Report",
        "Yield Analysis",
        "Standard vs Actual Consumption",
        "Production Cost Sheet",
      ]),
    },
    {
      title: "JOB WORK",
      items: items([
        "Job Work In Register",
        "Job Work Out Register",
        "Material Sent to Job Worker",
        "Material Received from Job Worker",
        "Pending Job Work Material",
        "Job Worker-wise Stock",
        "Principal Manufacturer-wise Stock",
      ]),
    },
    {
      title: "COST CENTRES",
      items: items([
        "Cost Centre Summary",
        "Cost Category Summary",
        "Cost Centre Break-up",
        "Cost Centre Ledger",
        "Cost Centre-wise P&L",
      ]),
    },
    {
      title: "PROJECT & DEPARTMENT COSTING",
      items: items([
        "Project Cost Report",
        "Project Profitability",
        "Department Cost Report",
      ]),
    },
    {
      title: "BATCH & ORDER COSTING",
      items: items([
        "Batch Costing Report",
        "Order Costing Report",
      ]),
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
        <CardTitle className="text-base font-semibold">Manufacturing, Job Work & Costing</CardTitle>
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
