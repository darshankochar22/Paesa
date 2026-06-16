import { Link } from "react-router-dom";

export default function Gateway() {

  const sections = [
    {
      title: "Masters",
      items: ["Create", "Alter", "Chart of Accounts", "Financial Years"],
    },
    {
      title: "Transactions",
      items: ["Vouchers", "Voucher Register", "Day Book"],
    },
    {
      title: "Utilities",
      items: ["Banking", "AI Copilot"],
    },
    {
      title: "Reports",
      items: [
        "Balance Sheet",
        "Profit & Loss A/c",
        "Stock Summary",
        "Ratio Analysis",
        "Display More Reports",
      ],
    },
    {
      title: "Dashboard",
      items: [],
    },
    {
      title: "Quit",
      items: [],
    },
  ];

  const getRoute = (section: string, item: string) => {
    if (section === "Masters" || section === "Transactions" || section === "Utilities") {
      if (item === "Create") return "/master/create";
      if (item === "Alter") return "/master/alter";
      if (item == "Chart of Accounts") return "/master/coa";
      if (item == "Financial Years") return "/master/financial-years";
      if (item == "Vouchers") return "/transactions/vouchers";
      if (item == "Voucher Register") return "/transactions/voucher-list";
      if (item == "Day Book") return "/transactions/daybook";
      if (item == "Banking") return "/utilities/banking";
      if (item == "AI Copilot") return "/utilities/copilot";
    }
    if (section === "Reports") {
      if (item === "Display More Reports") return "/reports/display-more";
    }
    return null;
  };

  return (
    <aside className="w-96 mx-auto mt-10 bg-white border shadow-sm flex flex-col px-10 py-10 gap-6">

      <div className="text-xl font-semibold pb-2">
        Gateway of Tally
      </div>

      <div className="flex flex-col gap-5">

        {sections.map((section) => (
          <div key={section.title} className="flex flex-col gap-2">

            <div className="font-semibold text-lg">
              {section.title}
            </div>

            {section.items.length > 0 && (
              <div className="flex flex-col pl-4 gap-1">

                {section.items.map((item) => {

                  const route = getRoute(section.title, item);

                  if (route) {
                    return (
                      <Link
                        key={item}
                        to={route}
                        className="text-left rounded px-2 py-1"
                      >
                        {item}
                      </Link>
                    );
                  }

                  return (
                    <button
                      key={item}
                      className="text-left rounded px-2 py-1"
                    >
                      {item}
                    </button>
                  );
                })}

              </div>
            )}

          </div>
        ))}

      </div>
    </aside>
  );
}
