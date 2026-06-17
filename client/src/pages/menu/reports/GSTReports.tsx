import { Link, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/shadcn/card";
import { Button } from "@/components/shadcn/button";

export default function GSTReports() {
  const navigate = useNavigate();

  const sections = [
    {
      title: "GST RETURNS/COMPUTATIONS",
      items: ["Track GST Return Activities", "GSTR-1", "GSTR-3B", "Annual Computation"],
    },
    {
      title: "EXCHANGE REPORTS",
      items: ["e-Way Bill"],
    },
    {
      title: "RECONCILIATION REPORTS",
      items: ["GSTR-1 Reconciliation", "GSTR-2A Reconciliation", "GSTR-2B Reconciliation", "Challan Reconciliation"],
    },
    {
      title: "OTHER",
      items: ["Invoice Management System (IMS)", "GST Utilities", "Other Reports", "Quit"],
    },
  ];

  const getRoute = (_section: string, item: string) => {
    if (item === "Track GST Return Activities") {
      return "/master/statutory/gst/track-activities";
    }
    if (item === "GSTR-1") {
      return "/master/statutory/gstr1";
    }
    if (item === "GSTR-3B") {
      return "/master/statutory/gstr3b";
    }
    if (item === "Annual Computation") {
      return "/master/statutory/annual-computation";
    }
    return null;
  };

  return (
    <Card size="sm" className="w-96 mx-auto mt-10 text-xs">
      <CardHeader className="gap-1 pb-1">
        <div className="text-[11px] italic text-zinc-500 flex flex-wrap gap-1">
          <Link to="/" className="hover:underline hover:text-zinc-900">Gateway of Tally</Link>
          <span>&gt;</span>
          <Link to="/reports/display-more" className="hover:underline hover:text-zinc-900">Display More Reports</Link>
          <span>&gt;</span>
          <Link to="/reports/statutory" className="hover:underline hover:text-zinc-900">Statutory Reports</Link>
        </div>
        <CardTitle className="text-base font-semibold">GST Reports</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {sections.map((section) => (
          <div key={section.title} className="flex flex-col gap-1.5">
            {section.title && section.title !== "OTHER" && (
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-1">
                {section.title}
              </div>
            )}

            {section.items.length > 0 && (
              <div className="flex flex-col pl-3 gap-0.5">
                {section.items.map((item) => {
                  if (item === "Quit") {
                    return (
                      <Button
                        key={item}
                        onClick={() => navigate(-1)}
                        variant="ghost"
                        size="xs"
                        className="justify-start text-[11px] font-semibold px-2 h-7 mt-2 text-zinc-900"
                      >
                        {item}
                      </Button>
                    );
                  }

                  const route = getRoute(section.title, item);

                  if (route) {
                    return (
                      <Button
                        key={item}
                        asChild
                        variant="ghost"
                        size="xs"
                        className="justify-start text-[11px] font-normal px-2 h-7 text-zinc-700"
                      >
                        <Link to={route}>{item}</Link>
                      </Button>
                    );
                  }

                  return (
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
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
