import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useCompany } from "../../context/CompanyContext";
import type { VoucherRecordType } from "../../types/api";
import { PageTitleBar, RightActionPanel } from "../../components/ui";
import DaybookDetail from "./DaybookDetail";

const monthNames = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

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
  const [loading, setLoading] = useState(false);

  const [selectedVoucher, setSelectedVoucher] = useState<any | null>(null);
  const [, setLoadingVoucher] = useState(false);

  const [allGodowns, setAllGodowns] = useState<any[]>([]);
  const [allUnits, setAllUnits] = useState<any[]>([]);

  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchDaybook = useCallback(async () => {
    if (!companyId || !fyId) return;
    setLoading(true);
    try {
      const data = await window.api.voucher.getDaybook(companyId, fyId);
      const vouchers = (data as any)?.vouchers || data || [];
      setEntries(Array.isArray(vouchers) ? vouchers : []);
    } catch (err) {
      console.error("Failed to fetch daybook:", err);
    } finally {
      setLoading(false);
    }
  }, [companyId, fyId]);

  useEffect(() => {
    fetchDaybook();
  }, [fetchDaybook]);

  // Load godowns & units for the detail drawer
  useEffect(() => {
    if (!companyId) return;
    (async () => {
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
    })();
  }, [companyId]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────

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
    { key: "Alt+B", label: "Banking",     onClick: () => navigate("/utilities/banking") },
    { key: "Esc",   label: "Quit",        onClick: () => navigate("/") },
  ];

  // ── Row click → load voucher detail ───────────────────────────────────────

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

  // ── Cancel voucher ─────────────────────────────────────────────────────────

  const handleCancelVoucher = async (voucherId: number) => {
    if (
      !window.confirm(
        "Are you sure you want to cancel this voucher? This cannot be undone."
      )
    )
      return;
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

  // ── Grand total for the detail drawer ─────────────────────────────────────

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
        }
        if (selectedVoucher.voucher_type === "Receipt") {
          return e.type === "Cr" ? sum + e.amount : sum;
        }
        if (selectedVoucher.voucher_type === "Contra") {
          return e.type === "Cr" ? sum + e.amount : sum;
        }
        return e.type === "Dr" ? sum + e.amount : sum;
      }, 0);
    }
    return 0;
  }, [selectedVoucher]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50 select-none text-xs relative overflow-hidden">

      {/* Title Bar */}
      <PageTitleBar title="Day Book" subtitle={selectedCompany?.name} />

      {/* Main Body */}
      <div className="flex-1 flex min-h-0">

        {/* Left: daybook list */}
        <div className="flex-1 flex flex-col min-w-0 p-4 overflow-y-auto">
          <div className="max-w-6xl w-full mx-auto flex flex-col h-full">

            {/* Period header */}
            <div className="mb-3 flex justify-between items-center">
              <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                Daily Transactions List
              </div>
              <div className="text-right">
                <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block">
                  Financial Period
                </span>
                <span className="text-xs font-bold text-zinc-800">
                  {activeFY?.start_date ? formatDateDisplay(activeFY.start_date) : "—"} to{" "}
                  {activeFY?.end_date ? formatDateDisplay(activeFY.end_date) : "—"}
                </span>
              </div>
            </div>

            <div className="bg-white rounded border border-zinc-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-[400px]">

              {/* Table header */}
              <div className="grid grid-cols-12 border-b border-zinc-200 bg-zinc-50 px-4 py-2.5 text-zinc-500 font-bold uppercase tracking-wider text-[10px] select-none shrink-0">
                <div className="col-span-2">Date</div>
                <div className="col-span-2">Voucher Type</div>
                <div className="col-span-2">Voucher No.</div>
                <div className="col-span-3">Particulars (Party Name)</div>
                <div className="col-span-3 text-right">Narration</div>
              </div>

              {/* Table body */}
              <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 min-h-0 bg-white">
                {loading && (
                  <div className="p-8 text-center text-zinc-400 italic">
                    Loading daybook entries...
                  </div>
                )}
                {!loading && entries.length === 0 && (
                  <div className="p-12 text-center text-zinc-400 italic flex flex-col items-center justify-center gap-2">
                    <span>No vouchers found in this financial year.</span>
                    <Link
                      to="/transactions/vouchers"
                      className="text-xs text-zinc-900 font-bold underline hover:text-zinc-700"
                    >
                      Create Voucher
                    </Link>
                  </div>
                )}
                {!loading &&
                  entries.map((entry) => (
                    <div
                      key={entry.voucher_id}
                      onClick={() =>
                        entry.voucher_id && handleRowClick(entry.voucher_id)
                      }
                      className="grid grid-cols-12 items-center px-4 py-2 hover:bg-zinc-900 hover:text-white cursor-pointer transition-colors min-h-[36px]"
                    >
                      <div className="col-span-2">{formatDateDisplay(entry.date)}</div>
                      <div className="col-span-2 font-semibold">{entry.voucher_type}</div>
                      <div className="col-span-2 font-bold">{entry.voucher_number}</div>
                      <div className="col-span-3 truncate font-semibold">
                        {entry.party_name || "—"}
                      </div>
                      <div className="col-span-3 text-right truncate opacity-75">
                        {entry.narration || "—"}
                      </div>
                    </div>
                  ))}
              </div>

              {/* Footer summary */}
              <div className="px-4 py-2 border-t border-zinc-200 bg-zinc-50 text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex justify-between items-center select-none shrink-0">
                <span>Total Transactions: {entries.length}</span>
                <span>&bull; End of Daybook</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: action panel */}
        <RightActionPanel actions={daybookActions} />
      </div>

      {/* Detail drawer — rendered when a voucher row is selected */}
      {selectedVoucher && (
        <DaybookDetail
          voucher={selectedVoucher}
          grandTotal={grandTotal}
          allGodowns={allGodowns}
          allUnits={allUnits}
          onClose={() => setSelectedVoucher(null)}
          onCancel={handleCancelVoucher}
        />
      )}
    </div>
  );
}