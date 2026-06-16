import { Link, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/shadcn/card";
import { Button } from "@/components/shadcn/button";
import { Separator } from "@/components/shadcn/separator";

export default function DisplayMoreReports() {
  const navigate = useNavigate();

  const sections = [
    {
      title: "ACCOUNTING",
      items: ["Trial Balance", "Day Book", "Cash Flow", "Funds Flow", "Account Books", "Statements of Accounts"],
    },
    {
      title: "INVENTORY",
      items: ["Inventory Books", "Statements of Inventory", "Job Work Reports"],
    },
    {
      title: "STATUTORY",
      items: ["Statutory Reports"],
    },
    {
      title: "PAYROLL",
      items: ["Payroll Reports"],
    },
    {
      title: "EXCEPTION",
      items: ["Exception Reports", "Analysis & Verification"],
    },
    {
      title: "QUIT",
      items: ["Quit"],
    },
  ];

  const getRoute = (section: string, item: string) => {
    if (section === "STATUTORY" && item === "Statutory Reports") {
      return "/reports/statutory";
    }
    return null;
  };

  return (
    <Card size="sm" className="w-96 mx-auto mt-10 text-xs">
      <CardHeader className="gap-1 pb-1">
        <div className="text-[11px] italic text-zinc-500 flex flex-wrap gap-1">
          <Link to="/" className="hover:underline hover:text-zinc-900">
            Gateway of Tally
          </Link>
        </div>
        <CardTitle className="text-base font-semibold">Display More Reports</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {sections.map((section) => (
          <div key={section.title} className="flex flex-col gap-1.5">
            {section.title !== "QUIT" ? (
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-1">
                {section.title}
              </div>
            ) : (
              <Separator className="my-1" />
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
                        className="justify-start text-[11px] font-semibold px-2 h-7 text-zinc-900"
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
