import { Link, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/shadcn/card";
import { Button } from "@/components/shadcn/button";
import { Separator } from "@/components/shadcn/separator";

const BASE = "/reports/einvoice-ewaybill";
const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const items = (labels: string[]) =>
  labels.map((label) => ({ label, route: `${BASE}/${slug(label)}` }));

export default function EInvoiceEWayBill() {
  const navigate = useNavigate();

  const sections = [
    {
      title: "E-INVOICE",
      items: items([
        "e-Invoice Report",
        "e-Invoice Register",
        "e-Invoice Pending for Generation",
        "e-Invoice Generated",
        "e-Invoice Cancelled",
        "e-Invoice Failed",
        "e-Invoice Error Report",
        "IRN Details Report",
        "Ack Number Register",
        "e-Invoice Correction Report",
      ]),
    },
    {
      title: "E-WAY BILL",
      items: items([
        "e-Way Bill Report",
        "e-Way Bill Register",
        "e-Way Bill Pending",
        "e-Way Bill Generated",
        "e-Way Bill Cancelled",
        "e-Way Bill Expired",
        "e-Way Bill Extended Validity",
        "e-Way Bill Part-B Pending",
        "Transporter ID Pending",
        "Vehicle Number Pending",
        "Distance Exception Report",
        "Consolidated e-Way Bill Report",
      ]),
    },
    {
      title: "EXCHANGE & PORTAL",
      items: items([
        "Exchange Activity Log",
        "Upload GST Returns Log",
        "Download GST Data Log",
        "GST Portal Sync Status",
        "Failed Uploads Report",
        "Imported GST Data Report",
        "Exported JSON Report",
        "Portal Difference Report",
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
        <CardTitle className="text-base font-semibold">e-Invoice, e-Way Bill & Exchange</CardTitle>
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
