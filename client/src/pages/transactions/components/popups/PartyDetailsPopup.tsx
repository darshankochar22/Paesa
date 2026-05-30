import { useState, useEffect } from "react";
import { INDIAN_STATES } from "@/constants/states";

export interface PartyDetailData {
  party_name: string;
  mailing_name: string;
  address: string;
  state: string;
  country: string;
  place_of_supply: string;
  registration_type: "Regular" | "Composition" | "Consumer" | "Unregistered";
  gstin: string;
}

interface Props {
  partyLedger: any;
  onClose: () => void;
  onSave: (details: PartyDetailData) => void;
  voucherType?: string;
}

export default function PartyDetailsPopup({
  partyLedger,
  onClose,
  onSave,
  voucherType,
}: Props) {
  const [form, setForm] = useState<PartyDetailData>({
    party_name: partyLedger?.name ?? "",
    mailing_name: partyLedger?.name ?? "",
    address: partyLedger?.address ?? "",
    state: partyLedger?.state ?? "Select",
    country: partyLedger?.country ?? "India",
    place_of_supply: partyLedger?.state ?? "Select",
    registration_type: (partyLedger?.registration_type as any) ?? "Unregistered",
    gstin: partyLedger?.gstin ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.altKey && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const set = (field: keyof PartyDetailData, value: any) => {
    setError(null);
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      // Keep place of supply in sync with state changes
      if (field === "state") {
        updated.place_of_supply = value;
      }
      return updated;
    });
  };

  const handleSave = () => {
    if (!form.party_name.trim()) {
      setError("Party name is required.");
      return;
    }
    onSave(form);
  };

  // Determine the first label based on voucher type
  const isPurchase = voucherType === "Purchase";
  const partyLabel = isPurchase ? "Supplier (Bill from)" : "Buyer (Bill to)";

  // Common styling for TallyPrime-like fields
  const fieldInputClass =
    "w-full text-xs font-bold font-mono px-2 py-0.5 border border-zinc-300 focus:border-amber-500/80 bg-white focus:bg-[#fffbeb] focus:ring-1 focus:ring-amber-500/40 outline-none rounded-sm transition-colors text-black";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[2px]">
      <div className="bg-white border-2 border-zinc-400 shadow-2xl w-[580px] flex flex-col max-h-[90vh] overflow-hidden rounded-sm">
        
        {/* Header / Title */}
        <div className="pt-4 pb-2 text-center border-b border-zinc-100 select-none">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-800 border-b-2 border-zinc-800 pb-0.5">
            Party Details
          </span>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto min-h-0 space-y-4">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-1.5 rounded flex justify-between items-center animate-slide-down">
              <span>• {error}</span>
              <button onClick={() => setError(null)} className="font-bold">&times;</button>
            </div>
          )}

          {/* Single Column Layout matching TallyPrime screenshot */}
          <div className="space-y-2.5">
            
            {/* Party Name / Buyer / Supplier */}
            <div className="grid grid-cols-12 items-center">
              <div className="col-span-4 text-xs font-medium text-zinc-700 select-none">
                {partyLabel}
              </div>
              <div className="col-span-1 text-xs font-medium text-zinc-400 text-center select-none">:</div>
              <div className="col-span-7">
                <input
                  type="text"
                  value={form.party_name}
                  onChange={(e) => set("party_name", e.target.value)}
                  className={fieldInputClass}
                  autoFocus
                />
              </div>
            </div>

            {/* Mailing Name */}
            <div className="grid grid-cols-12 items-center">
              <div className="col-span-4 text-xs font-medium text-zinc-700 select-none">
                Mailing Name
              </div>
              <div className="col-span-1 text-xs font-medium text-zinc-400 text-center select-none">:</div>
              <div className="col-span-7">
                <input
                  type="text"
                  value={form.mailing_name}
                  onChange={(e) => set("mailing_name", e.target.value)}
                  className={fieldInputClass}
                />
              </div>
            </div>

            {/* Address */}
            <div className="grid grid-cols-12 items-start">
              <div className="col-span-4 text-xs font-medium text-zinc-700 select-none pt-1">
                Address
              </div>
              <div className="col-span-1 text-xs font-medium text-zinc-400 text-center select-none pt-1">:</div>
              <div className="col-span-7">
                <textarea
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  rows={3}
                  className={`${fieldInputClass} resize-none py-1`}
                />
              </div>
            </div>

            {/* Spacer to separate address from state & country */}
            <div className="h-2"></div>

            {/* State */}
            <div className="grid grid-cols-12 items-center">
              <div className="col-span-4 text-xs font-medium text-zinc-700 select-none">
                State
              </div>
              <div className="col-span-1 text-xs font-medium text-zinc-400 text-center select-none">:</div>
              <div className="col-span-7">
                <select
                  value={form.state}
                  onChange={(e) => set("state", e.target.value)}
                  className={`${fieldInputClass} py-0.5 font-sans`}
                >
                  <option value="Select">Select State</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Country */}
            <div className="grid grid-cols-12 items-center">
              <div className="col-span-4 text-xs font-medium text-zinc-700 select-none">
                Country
              </div>
              <div className="col-span-1 text-xs font-medium text-zinc-400 text-center select-none">:</div>
              <div className="col-span-7">
                <input
                  type="text"
                  value={form.country}
                  onChange={(e) => set("country", e.target.value)}
                  className={fieldInputClass}
                />
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 p-3 bg-zinc-50 flex justify-between items-center select-none">
          <span className="text-[10px] text-zinc-500 font-mono">
            <span className="underline">Alt+A</span>: Accept &nbsp;·&nbsp; <span className="underline">Esc</span>: Close
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-xs px-3 py-1.5 border border-zinc-300 rounded text-zinc-700 bg-white hover:bg-zinc-100 font-semibold active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="text-xs px-5 py-1.5 rounded bg-zinc-950 text-white hover:bg-zinc-800 font-semibold shadow-sm active:scale-95 transition-all"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
