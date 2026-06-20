import { Link } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";

export default function DisplayMoreReports() {
  const { selectedCompany, activeFY } = useCompany();

  const sections = [
    {
      title: "GENERAL",
      icon: "G",
      color: "blue",
      items: [
        { label: "Gateway, Navigation & Global Report Shells", route: "/reports/gateway", count: "20 reports" },
        { label: "Core Financial Statements", route: "/reports/financial-statements", count: "35 reports" },
      ],
    },
    {
      title: "ACCOUNTING",
      icon: "A",
      color: "green",
      items: [
        { label: "Account Books & Voucher Registers", route: "/reports/account-books", count: "45 reports" },
        { label: "Receivables, Payables & Bill-wise", route: "/reports/receivables-payables", count: "35 reports" },
        { label: "Cash, Bank, Finance & Banking", route: "/reports/cash-bank-finance", count: "30 reports" },
        { label: "Sales, Purchase & Party Analysis", route: "/reports/sales-purchase-party", count: "55 reports" },
      ],
    },
    {
      title: "INVENTORY",
      icon: "I",
      color: "orange",
      items: [
        { label: "Inventory, Stock & Godown", route: "/reports/inventory-stock", count: "65 reports" },
        { label: "Manufacturing, Job Work & Costing", route: "/reports/manufacturing-costing", count: "30 reports" },
      ],
    },
    {
      title: "GST & INDIRECT TAX",
      icon: "T",
      color: "red",
      items: [
        { label: "GST Reports", route: "/reports/gst", count: "60 reports" },
        { label: "e-Invoice, e-Way Bill & Exchange", route: "/reports/e-invoice-eway-bill", count: "30 reports" },
      ],
    },
    {
      title: "TDS / TCS",
      icon: "D",
      color: "purple",
      items: [
        { label: "TDS Reports", route: "/reports/tds", count: "30 reports" },
        { label: "TCS Reports", route: "/reports/tcs", count: "25 reports" },
      ],
    },
    {
      title: "PAYROLL & HR",
      icon: "P",
      color: "teal",
      items: [
        { label: "Payroll & HR Reports", route: "/reports/payroll-hr", count: "55 reports" },
      ],
    },
    {
      title: "STATUTORY & LEGACY",
      icon: "S",
      color: "brown",
      items: [
        { label: "VAT, Excise, Service Tax, MSME", route: "/reports/legacy-statutory", count: "35 reports" },
      ],
    },
    {
      title: "AUDIT & ADMIN",
      icon: "U",
      color: "grey",
      items: [
        { label: "Audit, Edit Log, Security & Admin", route: "/reports/audit-security", count: "35 reports" },
      ],
    },
  ];

  const colorMap: Record<string, { header: string; icon: string; border: string; hover: string }> = {
    blue: { header: "from-[#1565c0] to-[#1976d2]", icon: "bg-[#1565c0]", border: "border-[#1565c0]", hover: "hover:bg-[#e3f2fd]" },
    green: { header: "from-[#2e7d32] to-[#388e3c]", icon: "bg-[#2e7d32]", border: "border-[#2e7d32]", hover: "hover:bg-[#e8f5e9]" },
    orange: { header: "from-[#e65100] to-[#ef6c00]", icon: "bg-[#e65100]", border: "border-[#e65100]", hover: "hover:bg-[#fff3e0]" },
    red: { header: "from-[#c62828] to-[#d32f2f]", icon: "bg-[#c62828]", border: "border-[#c62828]", hover: "hover:bg-[#ffebee]" },
    purple: { header: "from-[#6a1b9a] to-[#7b1fa2]", icon: "bg-[#6a1b9a]", border: "border-[#6a1b9a]", hover: "hover:bg-[#f3e5f5]" },
    teal: { header: "from-[#00695c] to-[#00796b]", icon: "bg-[#00695c]", border: "border-[#00695c]", hover: "hover:bg-[#e0f2f1]" },
    brown: { header: "from-[#4e342e] to-[#5d4037]", icon: "bg-[#4e342e]", border: "border-[#4e342e]", hover: "hover:bg-[#efebe9]" },
    grey: { header: "from-[#424242] to-[#616161]", icon: "bg-[#424242]", border: "border-[#424242]", hover: "hover:bg-[#f5f5f5]" },
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#e8eaf6] to-[#c5cae9]">
      {/* Tally Prime Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-[#1a237e] to-[#283593] text-white border-b-2 border-[#0d47a1] shadow-lg">
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg tracking-wide">Display More Reports</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="font-bold text-sm text-yellow-200">{selectedCompany?.name || "Company"}</span>
          {activeFY && (
            <span className="text-[9px] text-blue-200">
              {activeFY.start_date} to {activeFY.end_date}
            </span>
          )}
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 px-4 py-1.5 bg-[#f5f5f5] border-b border-zinc-300 text-[10px]">
        <Link to="/" className="text-[#1a237e] hover:underline font-medium">
          Gateway of Tally
        </Link>
        <span className="text-zinc-400 mx-1">›</span>
        <span className="text-zinc-700 font-bold">Display More Reports</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto space-y-2">
          {sections.map((section) => {
            const colors = colorMap[section.color];
            return (
              <div key={section.title} className={`bg-white rounded-lg shadow-sm border-2 ${colors.border} overflow-hidden`}>
                {/* Section Header */}
                <div className={`flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r ${colors.header} text-white`}>
                  <div className={`w-5 h-5 ${colors.icon} rounded flex items-center justify-center border border-white/50`}>
                    <span className="font-black text-[9px]">{section.icon}</span>
                  </div>
                  <span className="font-bold text-[10px] tracking-wider">{section.title}</span>
                </div>

                {/* Section Items */}
                <div className="p-1.5">
                  {section.items.map((item) => (
                    <Link
                      key={item.label}
                      to={item.route}
                      className={`flex items-center justify-between px-3 py-2 rounded text-[11px] font-medium text-zinc-800 ${colors.hover} border border-transparent hover:border-zinc-200 transition-all`}
                    >
                      <span>{item.label}</span>
                      <span className="text-[9px] text-zinc-400 font-normal">{item.count}</span>
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
          <span className="font-bold text-yellow-200 uppercase tracking-wide">585 Reports</span>
          <span className="border-l-2 border-green-400 pl-3 text-white">
            15 Categories
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <kbd className="bg-[#ffeb3b] text-[#1b5e20] px-1.5 py-0.5 rounded font-black text-[8px] border border-[#f9a825]">Esc</kbd>
            <span className="text-green-100">Back</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="bg-[#ffeb3b] text-[#1b5e20] px-1.5 py-0.5 rounded font-black text-[8px] border border-[#f9a825]">Enter</kbd>
            <span className="text-green-100">Select</span>
          </div>
        </div>
      </div>
    </div>
  );
}
