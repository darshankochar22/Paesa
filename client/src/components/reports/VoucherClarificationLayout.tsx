import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";

const CLARIFICATION_ITEMS = [
  { key: "verification", label: "Verification of Vouchers" },
  { key: "related-party", label: "Related Party Transactions" },
  { key: "forex", label: "Forex Transactions" },
];

interface ClarificationCount {
  verification: number;
  "related-party": number;
  forex: number;
}

const fmt = (val: number) =>
  val === 0
    ? ""
    : new Intl.NumberFormat("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(val);

export default function VoucherClarificationLayout() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();

  const [counts] = React.useState<ClarificationCount>({
    verification: 0,
    "related-party": 0,
    forex: 0,
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = React.useState(0);

  React.useEffect(() => {
    if (!selectedCompany?.company_id || !activeFY?.fy_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    // TODO: wire real backend
    // window.api.report.voucherClarificationSummary(
    //   selectedCompany.company_id,
    //   activeFY.fy_id
    // ).then((res) => {
    //   if (res?.success) {
    //     setCounts({
    //       verification: res.verification ?? 0,
    //       "related-party": res.relatedParty ?? 0,
    //       forex: res.forex ?? 0,
    //     });
    //   } else {
    //     setError(res?.error || "Failed to load.");
    //   }
    // }).catch((e) => setError(e.message))
    //   .finally(() => setLoading(false));

    // Mock until backend ready
    setLoading(false);
  }, [selectedCompany?.company_id, activeFY?.fy_id]);

  const handleDrilldown = React.useCallback(
    (key: string) => {
      navigate(`/reports/accounts/voucher-clarification/${key}`);
    },
    [navigate]
  );

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "SELECT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(CLARIFICATION_ITEMS.length - 1, prev + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleDrilldown(CLARIFICATION_ITEMS[focusedIndex].key);
      } else if (e.key === "Backspace" || e.key === "Escape") {
        e.preventDefault();
        navigate(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusedIndex, handleDrilldown, navigate]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400 font-mono text-xs">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-500 font-mono text-xs px-8 text-center">
        {error}
      </div>
    );
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono">
          <thead className="sticky top-0 bg-[#e5eff5] border-b border-zinc-300 z-10 text-zinc-700 select-none">
            <tr>
              <th className="px-4 py-2 text-left font-bold">Particulars</th>
              <th className="w-48 text-right px-4 py-2 font-bold">Need Clarification</th>
            </tr>
          </thead>
          <tbody>
            {CLARIFICATION_ITEMS.map((item, idx) => {
              const isFocused = focusedIndex === idx;
              const count = counts[item.key as keyof ClarificationCount];
              return (
                <tr
                  key={item.key}
                  className={`border-b border-zinc-100 cursor-pointer select-none transition-colors ${
                    isFocused
                      ? "bg-[#ffcc00] text-zinc-950 font-bold"
                      : "hover:bg-zinc-50 text-zinc-800 font-semibold"
                  }`}
                  onClick={() => setFocusedIndex(idx)}
                  onDoubleClick={() => handleDrilldown(item.key)}
                >
                  <td className="px-4 py-1.5 text-left">{item.label}</td>
                  <td className="w-48 text-right px-4 py-1.5">{fmt(count)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t-2 border-double border-zinc-400 bg-[#e5eff5] px-4 py-1.5 flex justify-between font-mono text-[11px] font-bold text-zinc-900 select-none">
        <span className="flex-1">Grand Total</span>
        <span className="w-48 text-right pr-0">{fmt(total)}</span>
      </div>
    </div>
  );
}