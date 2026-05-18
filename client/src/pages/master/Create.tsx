import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useCompany } from "../../context/CompanyContext";

export default function Create() {
  const { selectedCompany } = useCompany();
  const [masterSections, setMasterSections] = useState<{title: string, items: string[]}[]>([]);

  useEffect(() => {
    const companyId = selectedCompany?.company_id;
    if (!companyId) return;
    async function fetchMenu() {
      try {
        const data = await window.api.master.getMenu(companyId);
        if (data && data.success) {
          setMasterSections(data.menu);
        }
      } catch (err) {
        console.error("Failed to fetch master menu:", err);
      }
    }
    fetchMenu();
  }, [selectedCompany]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-3xl border rounded p-8">

        <div className="flex items-start justify-between mb-12">
          <div className="text-2xl font-semibold">
            List of Masters (Create)
          </div>

          <div className="flex flex-col items-end gap-3">

            <Link to="/" className="rounded px-2 py-1">
              Back
            </Link>

            <div className="flex flex-col items-end gap-2 mt-4">
              <div className="text-lg font-semibold">Company</div>
              <button className="rounded px-2 py-1">Change Company</button>
              <button className="rounded px-2 py-1">Show More</button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-12">
          {masterSections.map((section) => (
            <div key={section.title} className="flex flex-col items-center gap-4">
              <div className="text-lg font-semibold">
                {section.title}
              </div>

              <div className="flex flex-col items-start w-full pl-8">
                {section.items.map((item) => (
                  <button
                    key={item}
                    className="text-left rounded px-2 py-1 hover:bg-blue-100 dark:hover:bg-blue-800"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
