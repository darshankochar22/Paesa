import { Link } from "react-router-dom";

export default function Gateway() {

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

                {section.items.map((item) => (
                  <Link
                    key={item.label}
                    to={item.route}
                    className="text-left rounded px-2 py-1 hover:bg-zinc-100 transition-colors flex items-center justify-between"
                  >
                    <span>{item.label}</span>
                    {item.key && (
                      <span className="text-xs text-zinc-400 font-mono ml-2">{item.key}</span>
                    )}
                  </Link>
                ))}

              </div>
            )}

          </div>
        ))}

      </div>
    </aside>
  );
}