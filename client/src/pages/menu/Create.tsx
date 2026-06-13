import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useCompany } from "@/context/CompanyContext";
import CompanyGSTDetailsModal from "@/pages/master/statutory/company-gst-details/CompanyGSTDetailsModal";

export default function Create() {
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
      "Ledger": "/master/create/ledger",
      "Group": "/master/create/group",
      "Currency": "/master/create/currency",
      "Voucher Type": "/master/create/voucher-type",
      "Cost Centre": "/master/create/cost-centre",
      "Stock Group": "/master/create/stock-group",
      "Stock Category": "/master/create/stock-category",
      "Stock Items": "/master/create/stock-item",
      "Unit": "/master/create/unit",
      "Location": "/master/create/godown",
      "GST Registration": "/master/create/gst-registration",
      "GST Classification": "/master/create/gst-classification",
      "Company GST Details": "modal",
      "TCS Nature of Goods": "/master/create/tcs-nature-of-goods",
      "TDS Nature of Payment": "/master/create/tds-nature-of-payment",
      "Tax Units": "/master/create/tax-units",
      "TDS Details": "/master/create/tds-details",
      "TCS Details": "/master/create/tcs-details",
      "VAT Registration Details": "/master/create/vat-registration-details",
      "Excise Registration Details": "/master/create/excise-registration-details",
      "Price levels": "/master/create/price-levels",
      "Price list (Stock Group)": "/master/create/price-lists",
      "Price list (Stock Category)": "/master/create/price-lists",      
      "PAN / CIN Details": "/master/create/pan-cin-details",
      "Employee Category": "/master/create/employee-category",
      "Employee Group": "/master/create/employee-group",
      "Employee": "/master/create/employee",
      "Attendance Type": "/master/create/attendance-type",
      "Pay Head": "/master/create/pay-head",
      "Payroll Unit": "/master/create/payroll-unit",
      "Salary Structure": "/master/create/salary-structure",
    };
    return map[item] ?? null;
  };

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
              <div className="text-lg font-semibold">{section.title}</div>
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