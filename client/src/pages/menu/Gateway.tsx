import { Link } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";

export default function Gateway() {
  const { selectedCompany, activeFY } = useCompany();

  const sections = [
    {
      title: "MASTERS",
      icon: "M",
      color: "blue",
      items: [
        { label: "Create", route: "/master/create", key: "C" },
        { label: "Alter", route: "/master/alter", key: "A" },
        { label: "Chart of Accounts", route: "/master/coa", key: "O" },
        { label: "Financial Years", route: "/master/financial-years", key: "Y" },
      ],
    },
    {
      title: "TRANSACTIONS",
      icon: "T",
      color: "green",
      items: [
        { label: "Vouchers", route: "/transactions/vouchers", key: "V" },
        { label: "Voucher List", route: "/transactions/voucher-list", key: "L" },
        { label: "Day Book", route: "/transactions/daybook", key: "D" },
      ],
    },
    {
      title: "UTILITIES",
      icon: "U",
      color: "purple",
      items: [
        { label: "Banking", route: "/utilities/banking", key: "B" },
        { label: "AI Copilot", route: "/utilities/copilot", key: "I" },
      ],
    },
    {
      title: "QUICK REPORTS",
      icon: "R",
      color: "orange",
      items: [
        { label: "Balance Sheet", route: "/reports/accounts/balance-sheet", key: "1" },
        { label: "Profit & Loss A/c", route: "/reports/accounts/profit-loss", key: "2" },
        { label: "Stock Summary", route: "/reports/inventory/stock-summary", key: "3" },
        { label: "Ratio Analysis", route: "/reports/accounts/ratio-analysis", key: "4" },
        { label: "Trial Balance", route: "/reports/accounts/trial-balance", key: "5" },
        { label: "Cash Flow", route: "/reports/accounts/cash-flow", key: "6" },
      ],
    },
    {
      title: "ALL REPORT CATEGORIES",
      icon: "S",
      color: "teal",
      items: [
        { label: "Display More Reports", route: "/reports/display-more", key: "" },
        { label: "Gateway & Navigation", route: "/reports/gateway", key: "" },
        { label: "Core Financial Statements", route: "/reports/financial-statements", key: "" },
        { label: "Account Books & Registers", route: "/reports/receivables-payables", key: "" },
        { label: "Receivables & Payables", route: "/reports/receivables-payables", key: "" },
        { label: "Cash, Bank & Finance", route: "/reports/cash-bank-finance", key: "" },
        { label: "Sales, Purchase & Party", route: "/reports/sales-purchase-party", key: "" },
        { label: "Inventory & Stock", route: "/reports/inventory-stock", key: "" },
        { label: "Manufacturing & Costing", route: "/reports/manufacturing-costing", key: "" },
        { label: "GST Reports", route: "/reports/gst", key: "" },
        { label: "e-Invoice & e-Way Bill", route: "/reports/e-invoice-eway-bill", key: "" },
        { label: "TDS Reports", route: "/reports/tds", key: "" },
        { label: "TCS Reports", route: "/reports/tcs", key: "" },
        { label: "Payroll & HR", route: "/reports/payroll-hr", key: "" },
        { label: "VAT/Excise/Service Tax", route: "/reports/legacy-statutory", key: "" },
        { label: "Audit & Security", route: "/reports/audit-security", key: "" },
      ],
    },
  ];

  const colorMap: Record<string, { header: string; icon: string; border: string }> = {
    blue: { header: "from-[#1565c0] to-[#1976d2]", icon: "bg-[#1565c0]", border: "border-[#1565c0]" },
    green: { header: "from-[#2e7d32] to-[#388e3c]", icon: "bg-[#2e7d32]", border: "border-[#2e7d32]" },
    purple: { header: "from-[#6a1b9a] to-[#7b1fa2]", icon: "bg-[#6a1b9a]", border: "border-[#6a1b9a]" },
    orange: { header: "from-[#e65100] to-[#ef6c00]", icon: "bg-[#e65100]", border: "border-[#e65100]" },
    teal: { header: "from-[#00695c] to-[#00796b]", icon: "bg-[#00695c]", border: "border-[#00695c]" },
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#e8eaf6] to-[#c5cae9]">
      {/* Tally Prime Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-[#1a237e] to-[#283593] text-white border-b-2 border-[#0d47a1] shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#ffeb3b] rounded flex items-center justify-center">
            <span className="text-[#1a237e] font-black text-sm">T</span>
          </div>
          <span className="font-bold text-lg tracking-wide">Gateway of Tally</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="font-bold text-sm text-yellow-200">{selectedCompany?.name || "Select Company"}</span>
          {activeFY && (
            <span className="text-[9px] text-blue-200">
              FY: {activeFY.start_date} to {activeFY.end_date}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-3">
          {sections.map((section) => {
            const colors = colorMap[section.color];
            return (
              <div key={section.title} className={`bg-white rounded-lg shadow-md border-2 ${colors.border} overflow-hidden`}>
                {/* Section Header */}
                <div className={`flex items-center gap-2 px-3 py-2 bg-gradient-to-r ${colors.header} text-white`}>
                  <div className={`w-6 h-6 ${colors.icon} rounded flex items-center justify-center border-2 border-white/50`}>
                    <span className="font-black text-[10px]">{section.icon}</span>
                  </div>
                  <span className="font-bold text-[11px] tracking-wider">{section.title}</span>
                </div>

                {/* Section Items */}
                <div className="p-2 grid grid-cols-2 gap-1">
                  {section.items.map((item) => (
                    <Link
                      key={item.label}
                      to={item.route}
                      className="flex items-center gap-2 px-3 py-2 rounded text-[11px] font-medium text-zinc-800 hover:bg-[#e3f2fd] hover:text-[#0d47a1] border border-transparent hover:border-[#90caf9] transition-all"
                    >
                      {item.key && (
                        <kbd className="bg-[#ffeb3b] text-[#1a237e] px-1.5 py-0.5 rounded font-black text-[8px] min-w-[16px] text-center border border-[#f9a825]">
                          {item.key}
                        </kbd>
                      )}
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-gradient-to-r from-[#1b5e20] to-[#2e7d32] text-white border-t-2 border-[#0d47a1] text-[10px]">
        <div className="flex items-center gap-3">
          <span className="font-bold text-yellow-200 uppercase tracking-wide">Gateway</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <kbd className="bg-[#ffeb3b] text-[#1b5e20] px-1.5 py-0.5 rounded font-black text-[8px] border border-[#f9a825]">Esc</kbd>
            <span className="text-green-100">Quit</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="bg-[#ffeb3b] text-[#1b5e20] px-1.5 py-0.5 rounded font-black text-[8px] border border-[#f9a825]">Enter</kbd>
            <span className="text-green-100">Select</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="bg-[#ffeb3b] text-[#1b5e20] px-1.5 py-0.5 rounded font-black text-[8px] border border-[#f9a825]">F1</kbd>
            <span className="text-green-100">Help</span>
          </div>
        </div>
      </div>
    </div>
  );
}
