import { Link, useNavigate } from "react-router-dom";

export default function StatutoryReports() {
  const navigate = useNavigate();

  const sections = [
    {
      title: "",
      items: [
        "GST Reports",
        "TDS Reports",
        "TCS Reports",
        "Payroll Reports",
        "Central Excise Reports",
        "Service Tax Reports",
        "MSME Reports",
        "Quit"
      ],
    }
  ];

  const getRoute = (_section: string, item: string) => {
    if (item === "GST Reports") {
      return "/reports/statutory/gst";
    }
    return null;
  };

  return (
    <aside className="w-96 mx-auto mt-10 bg-white border shadow-sm flex flex-col px-10 py-10 gap-6">
      <div className="flex flex-col pb-2">
        <div className="text-sm italic text-gray-600 mb-1 flex flex-wrap gap-1">
          <Link to="/" className="hover:underline hover:text-gray-900">Gateway of Tally</Link>
          <span>&gt;</span>
          <Link to="/reports/display-more" className="hover:underline hover:text-gray-900">Display More Reports</Link>
        </div>
        <div className="text-xl font-semibold">Statutory Reports</div>
      </div>

      <div className="flex flex-col gap-5">
        {sections.map((section, idx) => (
          <div key={idx} className="flex flex-col gap-2">
            {section.title && (
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
