import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";

export default function StatisticsLayout() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();

  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [activeCol, setActiveCol] = React.useState<"accounts" | "vouchers">("accounts");
  const [accountsFocusedIndex, setAccountsFocusedIndex] = React.useState(0);
  const [vouchersFocusedIndex, setVouchersFocusedIndex] = React.useState(0);

  // Fetch data
  React.useEffect(() => {
    if (!selectedCompany?.company_id || !activeFY?.fy_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    (window as any).api.report
      .statistics(selectedCompany.company_id, activeFY.fy_id)
      .then((res: any) => {
        if (res?.success) {
          setData(res);
        } else {
          setError(res?.error || "Failed to load statistics.");
        }
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedCompany?.company_id, activeFY?.fy_id]);

  const accountsRows = React.useMemo(() => {
    return [
      { name: "Groups", count: data?.accounts?.groups || 0, path: "/master/coa/group" },
      { name: "Ledgers", count: data?.accounts?.ledgers || 0, path: "/master/coa/ledger" },
      { name: "Stock Groups", count: data?.accounts?.stockGroups || 0, path: "/master/coa/stock-group" },
      { name: "Stock Categories", count: data?.accounts?.stockCategories || 0, path: "/master/coa/stock-category" },
      { name: "Stock Items", count: data?.accounts?.stockItems || 0, path: "/master/alter/stock-item" },
      { name: "Voucher Types", count: data?.accounts?.voucherTypes || 0, path: "/master/coa/voucher-type" },
      { name: "Units", count: data?.accounts?.units || 0, path: "/master/coa/unit" },
      { name: "Godowns", count: data?.accounts?.godowns || 0, path: "/master/coa/godown" },
    ];
  }, [data]);

  const vouchersRows = React.useMemo(() => {
    return data?.vouchers || [];
  }, [data]);

  const totalVouchers = React.useMemo(() => {
    return vouchersRows.reduce((s: number, v: any) => s + (v.count || 0), 0);
  }, [vouchersRows]);

  const getVoucherRegisterUrl = (vchType: string) => {
    const lower = vchType.toLowerCase();
    if (lower === "sales") return "/reports/accounts/sales-register";
    if (lower === "purchase") return "/reports/accounts/purchase-register";
    if (lower === "journal") return "/reports/accounts/journal-register";
    if (lower === "debit note") return "/reports/accounts/debit-note-register";
    if (lower === "credit note") return "/reports/accounts/credit-note-register";
    if (lower === "payment") return "/reports/accounts/payment-register";
    if (lower === "receipt") return "/reports/accounts/receipt-register";
    if (lower === "contra") return "/reports/accounts/contra-register";
    return `/transactions/voucher-list?type=${encodeURIComponent(vchType)}`;
  };

  // Keyboard navigation
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT") return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (activeCol === "accounts") {
          setAccountsFocusedIndex((p) => Math.min(accountsRows.length - 1, p + 1));
        } else {
          setVouchersFocusedIndex((p) => Math.min(vouchersRows.length - 1, p + 1));
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (activeCol === "accounts") {
          setAccountsFocusedIndex((p) => Math.max(0, p - 1));
        } else {
          setVouchersFocusedIndex((p) => Math.max(0, p - 1));
        }
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (activeCol === "accounts" && vouchersRows.length > 0) {
          setActiveCol("vouchers");
          setVouchersFocusedIndex(Math.min(vouchersRows.length - 1, accountsFocusedIndex));
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (activeCol === "vouchers") {
          setActiveCol("accounts");
          setAccountsFocusedIndex(Math.min(accountsRows.length - 1, vouchersFocusedIndex));
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeCol === "accounts") {
          const r = accountsRows[accountsFocusedIndex];
          if (r) navigate(r.path);
        } else {
          const r = vouchersRows[vouchersFocusedIndex];
          if (r) navigate(getVoucherRegisterUrl(r.vch_type));
        }
      } else if (e.key === "Escape" || e.key === "Backspace") {
        e.preventDefault();
        navigate(-1);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeCol, accountsFocusedIndex, vouchersFocusedIndex, accountsRows, vouchersRows, navigate]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 font-mono text-xs">
        Loading Statistics...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-500 font-mono text-xs">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden">
      <div className="bg-[#e5eff5] border-b border-zinc-300 px-3 py-1 text-[10px] font-mono text-zinc-700 flex gap-6 select-none justify-between items-center">
        <span className="font-bold">Statistics</span>
        <span className="font-semibold text-zinc-500">
          {selectedCompany?.name || "No Company"}
        </span>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Types of Accounts */}
        <div className="w-1/2 border-r border-zinc-300 flex flex-col overflow-y-auto">
          <div className="bg-[#e5eff5] sticky top-0 px-4 py-2 border-b border-zinc-300 font-bold text-zinc-700 select-none text-[11px] flex justify-between">
            <span>Types of Accounts</span>
            <span>Count</span>
          </div>
          <table className="w-full border-collapse text-[11px] font-mono">
            <tbody>
              {accountsRows.map((row, idx) => {
                const isFocused = activeCol === "accounts" && accountsFocusedIndex === idx;
                return (
                  <tr
                    key={row.name}
                    className={`border-b border-zinc-100 cursor-pointer select-none transition-colors ${
                      isFocused
                        ? "bg-[#ffcc00] text-zinc-950 font-bold"
                        : "hover:bg-zinc-50 text-zinc-800 font-semibold"
                    }`}
                    onClick={() => {
                      setActiveCol("accounts");
                      setAccountsFocusedIndex(idx);
                    }}
                    onDoubleClick={() => navigate(row.path)}
                  >
                    <td className="px-4 py-1.5 text-left">{row.name}</td>
                    <td className="px-4 py-1.5 text-right w-24 font-bold">{row.count}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Right Column: Types of Vouchers */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          <div className="bg-[#e5eff5] sticky top-0 px-4 py-2 border-b border-zinc-300 font-bold text-zinc-700 select-none text-[11px] flex justify-between">
            <span>Types of Vouchers</span>
            <span>Count</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full border-collapse text-[11px] font-mono">
              <tbody>
                {vouchersRows.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-zinc-400 italic">
                      No vouchers found.
                    </td>
                  </tr>
                ) : (
                  vouchersRows.map((row: any, idx: number) => {
                    const isFocused = activeCol === "vouchers" && vouchersFocusedIndex === idx;
                    return (
                      <tr
                        key={row.vch_type}
                        className={`border-b border-zinc-100 cursor-pointer select-none transition-colors ${
                          isFocused
                            ? "bg-[#ffcc00] text-zinc-950 font-bold"
                            : "hover:bg-zinc-50 text-zinc-800 font-semibold"
                        }`}
                        onClick={() => {
                          setActiveCol("vouchers");
                          setVouchersFocusedIndex(idx);
                        }}
                        onDoubleClick={() => navigate(getVoucherRegisterUrl(row.vch_type))}
                      >
                        <td className="px-4 py-1.5 text-left">{row.vch_type}</td>
                        <td className="px-4 py-1.5 text-right w-24 font-bold">{row.count}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {vouchersRows.length > 0 && (
            <div className="bg-[#e5eff5] border-t border-zinc-300 font-bold text-zinc-800 text-[11px] px-4 py-2 flex justify-between select-none">
              <span>Total Vouchers Entered</span>
              <span className="w-24 text-right">{totalVouchers}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
