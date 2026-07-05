export function DashboardMockup() {
  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-gray-200 shadow-2xl bg-white">
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
        <span className="w-3 h-3 rounded-full bg-gray-300" />
        <span className="w-3 h-3 rounded-full bg-gray-300" />
        <span className="w-3 h-3 rounded-full bg-gray-300" />
        <span className="ml-3 text-xs text-gray-400 font-mono">paisa.app / dashboard</span>
      </div>

      {/* App body */}
      <div className="flex h-[460px]">
        {/* Sidebar */}
        <div className="w-48 border-r border-gray-100 bg-gray-50 p-3 flex flex-col gap-1 shrink-0">
          <div className="mb-2 px-2 py-1.5">
            <span className="text-xs font-semibold text-gray-900">Paisa</span>
          </div>
          {[
            { label: "Dashboard", active: true },
            { label: "Accounts" },
            { label: "Vouchers" },
            { label: "Inventory" },
            { label: "Payroll" },
            { label: "GST" },
            { label: "Reports" },
            { label: "Settings" },
          ].map((item) => (
            <div
              key={item.label}
              className={`px-3 py-2 rounded-md text-xs font-medium ${
                item.active
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {item.label}
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 p-5 overflow-hidden">
          {/* Header row */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-base font-semibold text-gray-900">Good morning, Rahul</div>
              <div className="text-xs text-gray-400 mt-0.5">FY 2025–26 · April → March</div>
            </div>
            <div className="flex gap-2">
              <div className="px-3 py-1.5 text-xs border border-gray-200 rounded-md text-gray-600 bg-white">
                This Month
              </div>
              <div className="px-3 py-1.5 text-xs bg-gray-900 rounded-md text-white">
                + New Voucher
              </div>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: "Revenue", value: "₹24,85,000", delta: "+12.4%" },
              { label: "Expenses", value: "₹18,32,000", delta: "+5.1%" },
              { label: "Net Profit", value: "₹6,53,000", delta: "+24.7%" },
            ].map((kpi) => (
              <div key={kpi.label} className="border border-gray-100 rounded-lg p-3 bg-white">
                <div className="text-xs text-gray-400 mb-1">{kpi.label}</div>
                <div className="text-sm font-semibold text-gray-900">{kpi.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{kpi.delta} vs last month</div>
              </div>
            ))}
          </div>

          {/* Chart area */}
          <div className="border border-gray-100 rounded-lg p-4 mb-4 bg-white">
            <div className="text-xs font-medium text-gray-600 mb-3">Monthly Revenue</div>
            <div className="flex items-end gap-2 h-20">
              {[45, 62, 55, 80, 70, 90, 75, 85, 65, 95, 88, 100].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-gray-900"
                  style={{ height: `${h}%`, opacity: i === 11 ? 1 : 0.2 + i * 0.065 }}
                />
              ))}
            </div>
            <div className="flex gap-2 mt-1 justify-between">
              {["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"].map((m) => (
                <div key={m} className="flex-1 text-center text-[9px] text-gray-300">{m}</div>
              ))}
            </div>
          </div>

          {/* Recent vouchers */}
          <div className="border border-gray-100 rounded-lg bg-white overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-50 text-xs font-medium text-gray-600">
              Recent Vouchers
            </div>
            {[
              { date: "29 Jun", ref: "INV-2847", party: "Sharma Traders", type: "Sales", amount: "₹1,24,000" },
              { date: "28 Jun", ref: "PUR-1103", party: "Mehta Suppliers", type: "Purchase", amount: "₹87,500" },
              { date: "27 Jun", ref: "PMT-0892", party: "HDFC Bank", type: "Payment", amount: "₹50,000" },
            ].map((row) => (
              <div key={row.ref} className="flex items-center px-4 py-2 border-b border-gray-50 last:border-0 text-xs">
                <span className="w-14 text-gray-400 shrink-0">{row.date}</span>
                <span className="w-24 text-gray-500 shrink-0 font-mono">{row.ref}</span>
                <span className="flex-1 text-gray-700">{row.party}</span>
                <span className="w-20 text-gray-400 shrink-0">{row.type}</span>
                <span className="w-24 text-right text-gray-900 font-medium shrink-0">{row.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
