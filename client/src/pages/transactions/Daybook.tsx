import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useCompany } from "../../context/CompanyContext";
import type { VoucherRecordType } from "../../types/api";
import { PageTitleBar, RightActionPanel } from "../../components/ui";

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formatDateDisplay = (dateStr: string | undefined): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()}-${monthNames[d.getMonth()]}-${String(d.getFullYear())}`;
};

export default function Daybook() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const [entries, setEntries] = useState<VoucherRecordType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [selectedVoucher, setSelectedVoucher] = useState<any | null>(null);
  const [, setLoadingVoucher] = useState<boolean>(false);

  const [allGodowns, setAllGodowns] = useState<any[]>([]);
  const [allUnits, setAllUnits] = useState<any[]>([]);

  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const fetchDaybook = useCallback(async () => {
    if (!companyId || !fyId) return;
    setLoading(true);
    try {
      const data = await window.api.voucher.getDaybook(companyId, fyId);
      const vouchers = (data as any)?.vouchers || data || [];
      const list = Array.isArray(vouchers) ? vouchers : [];
      setEntries(list);
    } catch (err) {
      console.error("Failed to fetch daybook:", err);
    } finally {
      setLoading(false);
    }
  }, [companyId, fyId]);

  useEffect(() => {
    fetchDaybook();
  }, [fetchDaybook]);

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        navigate("/transactions/vouchers");
      }
      if (e.altKey && (e.key === "v" || e.key === "V")) {
        e.preventDefault();
        navigate("/transactions/voucher-list");
      }
      if (e.altKey && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        navigate("/utilities/banking");
      }
      if (e.key === "Escape") {
        e.preventDefault();
        navigate("/");
      }
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [navigate]);

  const daybookActions = [
    { key: "Alt+C", label: "New Voucher", onClick: () => navigate("/transactions/vouchers") },
    { key: "Alt+V", label: "Voucher Reg", onClick: () => navigate("/transactions/voucher-list") },
    { key: "Alt+B", label: "Banking", onClick: () => navigate("/utilities/banking") },
    { key: "Esc", label: "Quit", onClick: () => navigate("/") },
  ];


  useEffect(() => {
    if (!companyId) return;
    async function loadMetadata() {
      try {
        const [godRes, unitRes] = await Promise.all([
          window.api.godown.getAll(companyId),
          window.api.unit.getAll(companyId),
        ]);
        if (godRes.success) setAllGodowns(godRes.godowns || []);
        if (unitRes.success) setAllUnits(unitRes.units || []);
      } catch (err) {
        console.error("Failed to load metadata:", err);
      }
    }
    loadMetadata();
  }, [companyId]);

  const handleRowClick = async (voucherId: number) => {
    setLoadingVoucher(true);
    try {
      const res = await window.api.voucher.getById(voucherId);
      if (res.success && res.voucher) {
        setSelectedVoucher(res.voucher);
      } else {
        alert(res.error || "Failed to load voucher details");
      }
    } catch (err) {
      console.error("Failed to fetch voucher by ID:", err);
    } finally {
      setLoadingVoucher(false);
    }
  };

  const handleCancelVoucher = async (voucherId: number) => {
    if (!window.confirm("Are you sure you want to cancel this voucher? This cannot be undone.")) return;
    try {
      const res = await window.api.voucher.cancel(voucherId);
      if (res.success) {
        setSelectedVoucher(null);
        fetchDaybook();
      } else {
        alert(res.error || "Failed to cancel voucher");
      }
    } catch (err) {
      console.error("Failed to cancel voucher:", err);
    }
  };

  const grandTotal = useMemo(() => {
    if (!selectedVoucher) return 0;
    if (selectedVoucher.entries && selectedVoucher.entries.length > 0) {
      if (["Sales", "Purchase"].includes(selectedVoucher.voucher_type)) {
        const partyEntry = selectedVoucher.entries.find((e: any) =>
          selectedVoucher.voucher_type === "Sales" ? e.type === "Dr" : e.type === "Cr"
        );
        if (partyEntry) return partyEntry.amount;
      }
      return selectedVoucher.entries.reduce((sum: number, e: any) => {
        if (selectedVoucher.voucher_type === "Payment") {
          return e.type === "Dr" ? sum + e.amount : sum;
        } else if (selectedVoucher.voucher_type === "Receipt") {
          return e.type === "Cr" ? sum + e.amount : sum;
        } else if (selectedVoucher.voucher_type === "Contra") {
          return e.type === "Cr" ? sum + e.amount : sum;
        }
        return e.type === "Dr" ? sum + e.amount : sum;
      }, 0);
    }
    return 0;
  }, [selectedVoucher]);

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50 select-none text-xs relative overflow-hidden">
      
      <PageTitleBar title="Day Book" subtitle={selectedCompany?.name} />
      <div className="flex-1 flex min-h-0">
        
        <div className="flex-1 flex flex-col min-w-0 p-4 overflow-y-auto">
          <div className="max-w-6xl w-full mx-auto flex flex-col h-full">
          
          <div className="mb-3 flex justify-between items-center">
            <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
              Daily Transactions List
            </div>
            <div className="text-right">
              <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block">Financial Period</span>
              <span className="text-xs font-bold text-zinc-800">
                {activeFY?.start_date ? formatDateDisplay(activeFY.start_date) : "—"} to {activeFY?.end_date ? formatDateDisplay(activeFY.end_date) : "—"}
              </span>
            </div>
          </div>

          <div className="bg-white rounded border border-zinc-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-[400px]">
            <div className="grid grid-cols-12 border-b border-zinc-200 bg-zinc-50 px-4 py-2.5 text-zinc-500 font-bold uppercase tracking-wider text-[10px] select-none shrink-0">
              <div className="col-span-2">Date</div>
              <div className="col-span-2">Voucher Type</div>
              <div className="col-span-2">Voucher No.</div>
              <div className="col-span-3">Particulars (Party Name)</div>
              <div className="col-span-3 text-right">Narration</div>
            </div>


            <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 min-h-0 bg-white">
              {loading && (
                <div className="p-8 text-center text-zinc-400 italic">Loading daybook entries...</div>
              )}
              {!loading && entries.length === 0 && (
                <div className="p-12 text-center text-zinc-400 italic flex flex-col items-center justify-center gap-2">
                  <span>No vouchers found in this financial year.</span>
                  <Link to="/transactions/vouchers" className="text-xs text-zinc-900 font-bold underline hover:text-zinc-700">Create Voucher</Link>
                </div>
              )}
              {!loading && entries.map((entry) => (
                <div
                  key={entry.voucher_id}
                  onClick={() => entry.voucher_id && handleRowClick(entry.voucher_id)}
                  className="grid grid-cols-12 items-center px-4 py-2 hover:bg-zinc-900 hover:text-white cursor-pointer transition-colors min-h-[36px]"
                >
                  <div className="col-span-2">{formatDateDisplay(entry.date)}</div>
                  <div className="col-span-2 font-semibold">{entry.voucher_type}</div>
                  <div className="col-span-2 font-bold">{entry.voucher_number}</div>
                  <div className="col-span-3 truncate font-semibold">{entry.party_name || "—"}</div>
                  <div className="col-span-3 text-right truncate opacity-75">{entry.narration || "—"}</div>
                </div>
              ))}
            </div>

            <div className="px-4 py-2 border-t border-zinc-200 bg-zinc-50 text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex justify-between items-center select-none shrink-0">
              <span>Total Transactions: {entries.length}</span>
              <span>&bull; End of Daybook</span>
            </div>
          </div>

        </div>
      </div>

      <RightActionPanel actions={daybookActions} />
    </div>

      {selectedVoucher && (
        <div
          className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs z-40 transition-opacity animate-fade-in"
          onClick={() => setSelectedVoucher(null)}
        />
      )}

      {selectedVoucher && (
        <div className="fixed inset-y-0 right-0 w-[550px] bg-white shadow-2xl border-l border-zinc-200 z-50 flex flex-col animate-slide-left text-xs text-zinc-800">
          
          <div className="bg-zinc-900 text-white px-4 py-3 flex justify-between items-center shadow-md shrink-0 select-none">
            <div className="flex flex-col">
              <span className="uppercase tracking-wider font-bold text-xs">{selectedVoucher.voucher_type} Voucher Details</span>
              <span className="text-[10px] text-zinc-400 mt-0.5">Voucher No. {selectedVoucher.voucher_number}</span>
            </div>
            <button
              onClick={() => setSelectedVoucher(null)}
              className="text-zinc-400 hover:text-white text-lg font-bold font-sans transition-colors"
            >
              &times;
            </button>
          </div>


          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-white">
            <div className="grid grid-cols-2 gap-3 p-3 border border-zinc-100 bg-zinc-50/50 rounded">
              <div className="space-y-1">
                <div className="flex">
                  <span className="w-20 text-zinc-400">Date</span>
                  <span className="font-semibold">{formatDateDisplay(selectedVoucher.date)}</span>
                </div>
                <div className="flex">
                  <span className="w-20 text-zinc-400">Ref No.</span>
                  <span>{selectedVoucher.reference_number || "—"}</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex">
                  <span className="w-20 text-zinc-400">Supply State</span>
                  <span className="font-semibold">{selectedVoucher.place_of_supply || "—"}</span>
                </div>
                {selectedVoucher.party_name && (
                  <div className="flex">
                    <span className="w-20 text-zinc-400">Party</span>
                    <span className="font-semibold truncate">{selectedVoucher.party_name}</span>
                  </div>
                )}
              </div>
            </div>

            {selectedVoucher.stock_entries && selectedVoucher.stock_entries.length > 0 && (
              <div className="border border-zinc-200 rounded overflow-hidden">
                <div className="bg-zinc-50 border-b border-zinc-200 px-3 py-1.5 font-bold uppercase text-[9px] text-zinc-500 tracking-wider">
                  Inventory Stock Particulars
                </div>
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-zinc-50/40 border-b border-zinc-100 text-[9px] uppercase text-zinc-400 font-bold font-sans">
                      <th className="px-3 py-1.5">Item Name</th>
                      <th className="px-2 py-1.5">Godown</th>
                      <th className="px-2 py-1.5 text-right">Quantity</th>
                      <th className="px-2 py-1.5 text-right">Rate</th>
                      <th className="px-3 py-1.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {selectedVoucher.stock_entries.map((item: any, idx: number) => {
                      const godownName = allGodowns.find(g => g.godown_id === item.godown_id)?.name || "Main Location";
                      const unitSymbol = allUnits.find(u => u.unit_id === item.unit_id)?.symbol || "Nos";
                      return (
                        <tr key={idx} className="hover:bg-zinc-50/30">
                          <td className="px-3 py-2 font-semibold text-zinc-900">{item.item_name}</td>
                          <td className="px-2 py-2 text-zinc-500">{godownName}</td>
                          <td className="px-2 py-2 text-right">{item.quantity.toFixed(2)} {unitSymbol}</td>
                          <td className="px-2 py-2 text-right">{(item.rate || 0).toFixed(2)}</td>
                          <td className="px-3 py-2 text-right font-bold">{(item.amount || 0).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}


            <div className="border border-zinc-200 rounded overflow-hidden">
              <div className="bg-zinc-50 border-b border-zinc-200 px-3 py-1.5 font-bold uppercase text-[9px] text-zinc-500 tracking-wider">
                Accounting Double-Entry Details
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-zinc-50/40 border-b border-zinc-100 text-[9px] uppercase text-zinc-400 font-bold font-sans">
                    <th className="px-3 py-1.5 text-center w-12">Dr/Cr</th>
                    <th className="px-3 py-1.5">Ledger Name</th>
                    <th className="px-3 py-1.5 text-right">Debit (Dr)</th>
                    <th className="px-3 py-1.5 text-right">Credit (Cr)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {selectedVoucher.entries && selectedVoucher.entries.map((entry: any, idx: number) => (
                    <tr key={idx} className="hover:bg-zinc-50/30">
                      <td className={`px-3 py-2 text-center font-bold ${entry.type === 'Dr' ? 'text-blue-700 bg-blue-50/10' : 'text-red-700 bg-red-50/10'}`}>
                        {entry.type}
                      </td>
                      <td className="px-3 py-2 font-semibold text-zinc-900">{entry.ledger_name}</td>
                      <td className="px-3 py-2 text-right font-bold text-zinc-800">
                        {entry.type === 'Dr' ? (entry.amount || 0).toFixed(2) : ""}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-zinc-800">
                        {entry.type === 'Cr' ? (entry.amount || 0).toFixed(2) : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-2 border-t border-zinc-100 pt-3">
              <div className="flex justify-between items-center p-3 border border-zinc-200 rounded bg-zinc-50">
                <span className="font-bold text-zinc-600 uppercase tracking-wider">Grand Total (INR) :</span>
                <span className="text-sm font-bold text-zinc-950">
                  {grandTotal.toFixed(2)}
                </span>
              </div>

              <div className="p-3 border border-zinc-100 rounded bg-zinc-50/20">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">Narration Remarks</span>
                <p className="text-zinc-700 italic font-medium break-words">
                  {selectedVoucher.narration || "No narration remarks recorded for this transaction."}
                </p>
              </div>
            </div>

          </div>

          <div className="border-t border-zinc-200 p-3 bg-zinc-50 flex justify-between items-center gap-2 shrink-0 select-none">
            <button
              onClick={() => handleCancelVoucher(selectedVoucher.voucher_id)}
              className="text-xs text-red-600 hover:text-red-800 font-bold bg-red-50 hover:bg-red-100 border border-red-200 px-4 py-2 rounded transition-colors uppercase font-sans tracking-wide"
            >
              Cancel Voucher
            </button>
            <button
              onClick={() => setSelectedVoucher(null)}
              className="text-xs text-zinc-700 hover:text-zinc-950 font-bold bg-white hover:bg-zinc-100 border border-zinc-300 px-5 py-2 rounded transition-colors uppercase font-sans tracking-wide shadow-sm"
            >
              Close Details
            </button>
          </div>

        </div>
      )}

    </div>
  );
}