import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";

const ColHeader = ({ title, companyName, periodText }: { title: string; companyName: string; periodText: string }) => (
  <div className="bg-[#f4f4f5] sticky top-0 px-3 py-1 border-b border-zinc-300 select-none text-[10px]">
    <div className="font-bold text-zinc-800">{title}</div>
    <div className="text-zinc-600">{companyName}</div>
    <div className="text-zinc-500">{periodText}</div>
  </div>
);

const fmt = (d: string) => {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" }).replace(/ /g, "-");
};

export default function StatisticsLayout() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();

  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [activeCol, setActiveCol] = React.useState<"vouchers" | "accounts">("vouchers");
  const [vouchersFocusedIndex, setVouchersFocusedIndex] = React.useState(0);
  const [accountsFocusedIndex, setAccountsFocusedIndex] = React.useState(0);

  React.useEffect(() => {
    if (!selectedCompany?.company_id || !activeFY?.fy_id) { setLoading(false); return; }
    setLoading(true);
    (window as any).api.report
      .statistics(selectedCompany.company_id, activeFY.fy_id)
      .then((res: any) => {
        if (res?.success) setData(res);
        else setError(res?.error || "Failed to load statistics.");
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedCompany?.company_id, activeFY?.fy_id]);

  const periodText = activeFY
    ? `${fmt(activeFY.start_date)} to ${fmt(activeFY.end_date)}`
    : "";
  const companyName = selectedCompany?.name || "";

  const accountsRows = React.useMemo(() => [
    { name: "Groups",                      count: data?.accounts?.groups        || 0, path: "/master/coa/group" },
    { name: "Ledgers",                     count: data?.accounts?.ledgers       || 0, path: "/master/coa/ledger" },
    { name: "Cost Centres",                count: data?.accounts?.costCentres   || 0, path: "/master/coa/cost-centre" },
    { name: "Stock Groups",                count: data?.accounts?.stockGroups    || 0, path: "/master/coa/stock-group" },
    { name: "Stock Categories",            count: data?.accounts?.stockCategories || 0, path: "/master/coa/stock-category" },
    { name: "Stock Items",                 count: data?.accounts?.stockItems     || 0, path: "/master/alter/stock-item" },
    { name: "Voucher Types",               count: data?.accounts?.voucherTypes   || 0, path: "/master/coa/voucher-type" },
    { name: "Units",                       count: data?.accounts?.units          || 0, path: "/master/coa/unit" },
    { name: "Currencies",                  count: data?.accounts?.currencies     || 0, path: "/master/coa/currency" },
    { name: "Attendance/Production Types", count: 0,                                   path: "/master/coa/attendance-type" },
    { name: "Employee Groups",             count: data?.accounts?.employeeGroups || 0,  path: "/master/coa/employee-group" },
    { name: "Employees",                   count: data?.accounts?.employees     || 0,  path: "/master/coa/employee" },
  ], [data]);

  const vouchersRows = React.useMemo(() => data?.vouchers || [], [data]);
  const totalVouchers = React.useMemo(
    () => vouchersRows.reduce((s: number, v: any) => s + (v.count || 0), 0),
    [vouchersRows]
  );

  const getVoucherRegisterUrl = (vchType: string) => {
    const lower = vchType.toLowerCase();
    if (lower === "sales")       return "/reports/accounts/sales-register";
    if (lower === "purchase")    return "/reports/accounts/purchase-register";
    if (lower === "journal")     return "/reports/accounts/journal-register";
    if (lower === "debit note")  return "/reports/accounts/debit-note-register";
    if (lower === "credit note") return "/reports/accounts/credit-note-register";
    if (lower === "payment")     return "/reports/accounts/payment-register";
    if (lower === "receipt")     return "/reports/accounts/receipt-register";
    if (lower === "contra")      return "/reports/accounts/contra-register";
    return `/transactions/voucher-list?type=${encodeURIComponent(vchType)}`;
  };

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((document.activeElement as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (activeCol === "vouchers") setVouchersFocusedIndex(p => Math.min(vouchersRows.length - 1, p + 1));
        else setAccountsFocusedIndex(p => Math.min(accountsRows.length - 1, p + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (activeCol === "vouchers") setVouchersFocusedIndex(p => Math.max(0, p - 1));
        else setAccountsFocusedIndex(p => Math.max(0, p - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (activeCol === "vouchers") { setActiveCol("accounts"); setAccountsFocusedIndex(Math.min(accountsRows.length - 1, vouchersFocusedIndex)); }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (activeCol === "accounts") { setActiveCol("vouchers"); setVouchersFocusedIndex(Math.min(vouchersRows.length - 1, accountsFocusedIndex)); }
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeCol === "vouchers") { const r = vouchersRows[vouchersFocusedIndex]; if (r) navigate(getVoucherRegisterUrl(r.vch_type)); }
        else { const r = accountsRows[accountsFocusedIndex]; if (r) navigate(r.path); }
      } else if (e.key === "Escape" || e.key === "Backspace") {
        e.preventDefault();
        navigate(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeCol, vouchersFocusedIndex, accountsFocusedIndex, vouchersRows, accountsRows, navigate]);

  if (loading) return <div className="flex-1 flex items-center justify-center text-zinc-500 font-mono text-xs">Loading Statistics...</div>;
  if (error)   return <div className="flex-1 flex items-center justify-center text-zinc-600 font-mono text-xs">{error}</div>;

  return (
    <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden">
      {/* Page header */}
      <div className="bg-[#f4f4f5] border-b border-zinc-300 px-3 py-1 text-[11px] font-bold text-zinc-700 select-none text-center">
        Statistics
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Types of Vouchers */}
        <div className="w-1/2 border-r border-zinc-300 flex flex-col overflow-hidden">
          <ColHeader title="Types of Vouchers" companyName={companyName} periodText={periodText} />
          <div className="flex-1 overflow-y-auto">
            <table className="w-full border-collapse text-[11px] font-mono">
              <tbody>
                {vouchersRows.length === 0 ? (
                  <tr><td colSpan={2} className="px-4 py-8 text-center text-zinc-400 italic">No vouchers found.</td></tr>
                ) : (
                  vouchersRows.map((row: any, idx: number) => {
                    const focused = activeCol === "vouchers" && vouchersFocusedIndex === idx;
                    return (
                      <tr
                        key={row.vch_type}
                        className={`border-b border-zinc-100 cursor-pointer select-none ${focused ? "bg-[#e4e4e7] text-zinc-950 font-bold" : "hover:bg-zinc-50 text-zinc-800"}`}
                        onClick={() => { setActiveCol("vouchers"); setVouchersFocusedIndex(idx); }}
                        onDoubleClick={() => navigate(getVoucherRegisterUrl(row.vch_type))}
                      >
                        <td className="px-3 py-1">{row.vch_type}</td>
                        <td className="px-3 py-1 text-right w-20 font-bold">{row.count}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {vouchersRows.length > 0 && (
            <div className="bg-[#f4f4f5] border-t border-zinc-300 font-bold text-zinc-800 text-[11px] px-3 py-1.5 flex justify-between select-none">
              <span>Total</span>
              <span className="w-20 text-right">{totalVouchers}</span>
            </div>
          )}
        </div>

        {/* RIGHT: Types of Accounts */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          <ColHeader title="Types of Accounts" companyName={companyName} periodText={periodText} />
          <div className="flex-1 overflow-y-auto">
            <table className="w-full border-collapse text-[11px] font-mono">
              <tbody>
                {accountsRows.map((row, idx) => {
                  const focused = activeCol === "accounts" && accountsFocusedIndex === idx;
                  return (
                    <tr
                      key={row.name}
                      className={`border-b border-zinc-100 cursor-pointer select-none ${focused ? "bg-[#e4e4e7] text-zinc-950 font-bold" : "hover:bg-zinc-50 text-zinc-800"}`}
                      onClick={() => { setActiveCol("accounts"); setAccountsFocusedIndex(idx); }}
                      onDoubleClick={() => navigate(row.path)}
                    >
                      <td className="px-3 py-1">{row.name}</td>
                      <td className="px-3 py-1 text-right w-20 font-bold">{row.count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}