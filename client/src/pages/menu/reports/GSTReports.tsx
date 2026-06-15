import { Link, useNavigate } from "react-router-dom";

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

  const getRoute = (section: string, item: string) => {
    if (item === "GSTR-1") {
      return "/master/statutory/gstr1";
    }
    return null;
  };

  return (
    <aside className="w-[450px] mx-auto mt-10 bg-white border shadow-sm flex flex-col px-10 py-10 gap-6">
      <div className="flex flex-col pb-2">
        <div className="text-sm italic text-gray-600 mb-1 leading-tight flex flex-wrap gap-1">
          <Link to="/" className="hover:underline hover:text-gray-900">Gateway of Tally</Link>
          <span>&gt;</span>
          <Link to="/reports/display-more" className="hover:underline hover:text-gray-900">Display More Reports</Link>
          <span>&gt;</span>
          <Link to="/reports/statutory" className="hover:underline hover:text-gray-900">Statutory Reports</Link>
        </div>
        <div className="text-xl font-semibold mt-2">GST Reports</div>
      </div>

      <div className="flex flex-col gap-5">
        {sections.map((section, idx) => (
          <div key={idx} className="flex flex-col gap-2">
            {section.title && section.title !== "OTHER" && (
              <div className="font-semibold text-base uppercase text-gray-500">
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
                        className="text-left rounded px-2 py-1 font-semibold mt-4"
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
