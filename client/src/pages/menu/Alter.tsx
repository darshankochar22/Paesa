import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useCompany } from "@/context/CompanyContext";
import CompanyGSTDetailsModal from "@/pages/master/statutory/company-gst-details/CompanyGSTDetailsModal";

export default function Alter() {
  const { selectedCompany } = useCompany();
  const [masterSections, setMasterSections] = useState<{title: string, items: string[]}[]>([]);
  const [isGSTModalOpen, setIsGSTModalOpen] = useState(false);
  const navigate = useNavigate();

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

  const getRoute = (item: string) => {
    const map: Record<string, string> = {
      "Ledger": "/master/alter/ledger",
      "Group": "/master/alter/group",
      "Currency": "/master/alter/currency",
      "Voucher Type": "/master/alter/voucher-type",
      "Stock Group": "/master/alter/stock-group",
      "Stock Category": "/master/alter/stock-category",
      "Stock Items": "/master/alter/stock-item",
      "Unit": "/master/alter/unit",
      "Location": "/master/alter/godown",
      "GST Registration": "/master/alter/gst-registration",
      "GST Classification": "/master/alter/gst-classification",
       "TDS Details": "/master/alter/tds-details",
       "TCS Details": "/master/alter/tcs-details",
       "VAT registration Details": "/master/alter/vat-registration-details",
        "Excise Registration Details": "/master/alter/excise-registration-details",
      "Company GST Details": "modal",
      "TCS Nature of Goods": "/master/alter/tcs-nature-of-goods",
      "TDS Nature of Payment": "/master/alter/tds-nature-of-payment",
      "Price levels": "/master/alter/price-levels",
      "Price list (Stock Group)": "/master/alter/price-lists",
      "Price list (Stock Category)": "/master/alter/price-lists",
      "Tax Units": "/master/alter/tax-units",
      "Employee Category": "/master/alter/employee-category",
      "Employee Group": "/master/alter/employee-group",
      "Employee": "/master/alter/employee",
      "Attendance Type": "/master/alter/attendance-type",
      "Pay Head": "/master/alter/pay-head",
      "Payroll Unit": "/master/alter/payroll-unit",
      "Salary Structure": "/master/alter/salary-structure",
    };
    return map[item] ?? null;
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-3xl border rounded p-8">

        <div className="flex items-start justify-between mb-12">
          <div className="text-2xl font-semibold">
            List of Masters (Alter)
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
                {section.items.map((item) => {
                  const route = getRoute(item);
                  const isAvailable = route !== null;
                  return (
                    <button
                      key={item}
                      onClick={() => {
                        if (route === "modal" && item === "Company GST Details") {
                          setIsGSTModalOpen(true);
                        } else if (route) {
                          navigate(route);
                        }
                      }}
                      className={`text-left rounded px-2 py-1 w-full transition-colors ${
                        isAvailable
                          ? "hover:bg-black hover:text-white cursor-pointer"
                          : "opacity-40 cursor-not-allowed"
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <CompanyGSTDetailsModal
        isOpen={isGSTModalOpen}
        onClose={() => setIsGSTModalOpen(false)}
      />
    </div>
  );
}
