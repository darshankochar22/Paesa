import { Link, useNavigate } from "react-router-dom";

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
    <aside className="w-96 mx-auto mt-10 bg-white border shadow-sm flex flex-col px-10 py-10 gap-6">
      <div className="flex flex-col pb-2">
        <div className="text-sm italic text-gray-600 mb-1 flex flex-wrap gap-1">
          <Link to="/" className="hover:underline hover:text-gray-900">Gateway of Tally</Link>
        </div>
        <div className="text-xl font-semibold">Display More Reports</div>
      </div>

      <div className="flex flex-col gap-5">
        {sections.map((section) => (
          <div key={section.title} className="flex flex-col gap-2">
            {section.title !== "QUIT" && (
              <div className="font-semibold text-lg uppercase">
                {section.title}
              </div>
            )}

            {section.items.length > 0 && (
              <div className="flex flex-col pl-4 gap-1">
                {section.items.map((item) => {
                  if (item === "Quit") {
                    return (
                      <button
                        key={item}
                        onClick={() => navigate(-1)}
                        className="text-left rounded px-2 py-1 font-semibold mt-2"
                      >
                        {item}
                      </button>
                    );
                  }

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
