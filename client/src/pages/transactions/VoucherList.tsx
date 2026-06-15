import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "../../context/CompanyContext";
import { PageTitleBar, AlertBanner, SearchInput, RightActionPanel } from "../../components/ui";
import { PageFooterBar } from "./ui";

const VOUCHER_TYPES = ["Receipt", "Payment", "Contra", "Journal", "Sales", "Purchase", "Credit Note", "Debit Note"];

interface VoucherRow {
  voucher_id: number;
  voucher_type: string;
  voucher_number: string;
  date: string;
  narration: string | null;
  party_name: string | null;
  is_cancelled: number;
  debit_amount: number;
  credit_amount: number;
  inwards_qty: number;
  outwards_qty: number;
}

const formatDate = (d: string) => {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" });
};

const formatAmount = (n: number) => {
  if (!n) return "";
  return Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function VoucherList() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const [selectedType, setSelectedType] = useState<string>("All");
  const [vouchers, setVouchers] = useState<VoucherRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const fetchVouchers = useCallback(async () => {
    if (!companyId || !fyId) return;
    setLoading(true);
    setError(null);
    try {
      const res: any = selectedType === "All"
        ? await window.api.voucher.getAll(companyId, fyId)
        : await window.api.voucher.getByType(companyId, fyId, selectedType);
      if (res.success) {
        setVouchers(res.vouchers || []);
        setSelectedIndex(0);
      }
      else setError(res.error || "Failed to fetch vouchers");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [companyId, fyId, selectedType]);

  useEffect(() => { fetchVouchers(); }, [fetchVouchers]);

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        navigate("/transactions/vouchers");
      }
      if (e.altKey && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        navigate("/transactions/daybook");
      }
      if (e.altKey && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        navigate("/utilities/banking");
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      }
      if (e.key === "Enter" && filtered.length > 0) {
        e.preventDefault();
        navigate(`/transactions/voucher/${filtered[selectedIndex].voucher_id}`);
      }
      if (e.key === "Escape") {
        e.preventDefault();
        navigate("/");
      }
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [navigate, selectedIndex]);

  const listActions = [
    { key: "Alt+C", label: "New Voucher", onClick: () => navigate("/transactions/vouchers") },
    { key: "Alt+D", label: "Day Book", onClick: () => navigate("/transactions/daybook") },
    { key: "Alt+B", label: "Banking", onClick: () => navigate("/utilities/banking") },
    { key: "Esc", label: "Quit", onClick: () => navigate("/") },
  ];

  const filtered = vouchers.filter(v => {
    const q = search.toLowerCase();
    return (
      !q ||
      v.voucher_number?.toLowerCase().includes(q) ||
      v.party_name?.toLowerCase().includes(q) ||
      v.narration?.toLowerCase().includes(q)
    );
  });

  const handleRowClick = (idx: number) => {
    setSelectedIndex(idx);
    navigate(`/transactions/voucher/${filtered[idx].voucher_id}`);
  };

  return (
    <div className="flex-1 flex flex-col bg-white h-full text-xs select-none">
      <PageTitleBar
        title="Voucher Register"
        subtitle={selectedCompany?.name}
        actions={
          <button
            onClick={() => navigate("/transactions/vouchers")}
            className="text-[10px] bg-zinc-700 hover:bg-zinc-600 text-white px-2 py-0.5 rounded uppercase tracking-wider transition-colors"
          >
            + New Voucher
          </button>
        }
      />

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex border-b border-zinc-200 bg-zinc-50 overflow-x-auto shrink-0">
            {["All", ...VOUCHER_TYPES].map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-4 py-2 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors ${
                  selectedType === type
                    ? "border-zinc-900 text-zinc-900 bg-white"
                    : "border-transparent text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="px-3 py-2 border-b border-zinc-100 bg-zinc-50/50">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by voucher no, party, narration…"
              className="max-w-sm"
            />
          </div>

          {error && (
            <AlertBanner type="error" message={error} onDismiss={() => setError(null)} />
          )}

          {/* Tally-style table */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {loading && (
              <div className="px-3 py-8 text-center text-zinc-400 italic text-xs">Loading…</div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="px-3 py-8 text-center text-zinc-400 italic text-xs">
                {vouchers.length === 0 ? "No vouchers found. Create your first voucher." : "No results match your search."}
              </div>
            )}

            {!loading && filtered.length > 0 && (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-zinc-300">
                    <th className="text-left text-[11px] font-bold text-zinc-700 px-3 py-1.5 w-[10%]">Date</th>
                    <th className="text-left text-[11px] font-bold text-zinc-700 px-3 py-1.5 w-[35%]">Particulars</th>
                    <th className="text-right text-[11px] font-bold text-zinc-700 px-3 py-1.5 w-[15%]">Vch Type</th>
                    <th className="text-right text-[11px] font-bold text-zinc-700 px-3 py-1.5 w-[10%]">Vch No.</th>
                    <th className="text-right text-[11px] font-bold text-zinc-700 px-3 py-1.5 w-[15%]">Debit Amount</th>
                    <th className="text-right text-[11px] font-bold text-zinc-700 px-3 py-1.5 w-[15%]">Credit Amount</th>
                  </tr>
                  <tr className="border-b border-zinc-300">
                    <th className="px-3 py-0.5"></th>
                    <th className="px-3 py-0.5"></th>
                    <th className="px-3 py-0.5"></th>
                    <th className="px-3 py-0.5"></th>
                    <th className="text-right text-[10px] font-bold text-zinc-500 px-3 py-0.5">Inwards Qty</th>
                    <th className="text-right text-[10px] font-bold text-zinc-500 px-3 py-0.5">Outwards Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((v, idx) => {
                    const isSelected = idx === selectedIndex;
                    return (
                      <tr
                        key={v.voucher_id}
                        onClick={() => handleRowClick(idx)}
                        className={`border-b border-zinc-100 cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-zinc-100"
                            : "hover:bg-zinc-50"
                        } ${v.is_cancelled ? "opacity-50" : ""}`}
                      >
                        <td className="px-3 py-1.5 text-zinc-800 text-[12px]">{formatDate(v.date)}</td>
                        <td className="px-3 py-1.5 font-bold text-zinc-900 text-[12px]">{v.party_name || v.narration || "—"}</td>
                        <td className={`px-3 py-1.5 text-right text-[12px] ${idx === 0 ? "font-bold text-zinc-900" : "text-zinc-700"}`}>{v.voucher_type}</td>
                        <td className="px-3 py-1.5 text-right text-zinc-700 text-[12px]">{v.voucher_number || "—"}</td>
                        <td className={`px-3 py-1.5 text-right text-[12px] ${v.debit_amount ? "font-bold text-zinc-900" : "text-zinc-400"}`}>
                          {v.debit_amount ? formatAmount(v.debit_amount) : ""}
                        </td>
                        <td className="px-3 py-1.5 text-right text-[12px] text-zinc-700">
                          {v.credit_amount ? formatAmount(v.credit_amount) : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <RightActionPanel actions={listActions} />
      </div>

      <PageFooterBar
        countLabel={`${filtered.length} voucher${filtered.length !== 1 ? "s" : ""}`}
        onBack={() => navigate("/")}
      />
    </div>
  );
}
