import { useState, useCallback } from "react";
import { INDIAN_STATES } from "../../../../constants/states";
import LedgerListPanel from "../LedgerListPanel";
import { VoucherPopupShell } from "@/components/tally-ui/VoucherPopupShell";

export interface PartyDetails {
  supplier_name?: string;
  mailing_name?: string;
  address?: string;
  address_type?: string;
  state?: string;
  country?: string;
  gst_registration_type?: string;
  gstin?: string;
  nature_of_return?: string;
  place_of_supply?: string;
}

interface Props {
  partyLedger: any;
  allLedgers: any[];
  initialDetails?: PartyDetails | null;
  onClose: () => void;
  onSave: (details: PartyDetails) => void;
  onCreateLedger: () => void;
  buyerLabel?: string;
  /** Pass e.g. "Nature of Sales Return" for Credit Note, "Nature of Purchase Return" for
   *  Debit Note. Leave undefined for Sales/Purchase — the field will be hidden. */
  natureOfReturnLabel?: string;
}

const GST_REGISTRATION_TYPES = [
  "Regular",
  "Composition",
  "Unregistered",
  "Consumer",
  "Overseas",
  "Special Economic Zone",
  "Deemed Export",
  "UIN Holders",
];

const inputCls =
  "flex-1 text-sm bg-white border border-gray-400 px-1 py-0 outline-none focus:border-black";

export default function PartyDetailsPopup({
  partyLedger,
  allLedgers,
  initialDetails,
  onClose,
  onSave,
  onCreateLedger,
  buyerLabel = "Supplier (Bill from)",
  natureOfReturnLabel,
}: Props) {
  const [form, setForm] = useState<PartyDetails>({
    supplier_name: initialDetails?.supplier_name ?? partyLedger?.name ?? "",
    mailing_name: initialDetails?.mailing_name ?? partyLedger?.mailing_name ?? partyLedger?.name ?? "",
    address: initialDetails?.address ?? [partyLedger?.address1, partyLedger?.address2, partyLedger?.city, partyLedger?.pincode].filter(Boolean).join("\n") ?? "",
    address_type: initialDetails?.address_type ?? "Primary",
    state: initialDetails?.state ?? partyLedger?.state ?? "",
    country: initialDetails?.country ?? partyLedger?.country ?? "India",
    gst_registration_type: initialDetails?.gst_registration_type ?? partyLedger?.gst_registration_type ?? "Regular",
    gstin: initialDetails?.gstin ?? partyLedger?.gstin ?? "",
    nature_of_return: initialDetails?.nature_of_return ?? "",
    place_of_supply: initialDetails?.place_of_supply ?? partyLedger?.state ?? "",
  });

  const [showLedgerPanel, setShowLedgerPanel] = useState(false);
  const [ledgerSearchTerm, setLedgerSearchTerm] = useState("");

  const set = (field: keyof PartyDetails, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // keep Place of Supply synced to State unless the user already diverged it
      if (field === "state" && (!prev.place_of_supply || prev.place_of_supply === prev.state)) {
        next.place_of_supply = value;
      }
      return next;
    });
  };

  const handleSave = () => onSave(form);

  const handleLedgerSelect = useCallback((item: any) => {
    set("supplier_name", item.name);
    set("mailing_name", item.mailing_name || item.name);
    set("address", [item.address1, item.address2, item.city, item.pincode].filter(Boolean).join("\n"));
    set("state", item.state || "");
    set("country", item.country || "India");
    set("gstin", item.gstin || "");
    set("gst_registration_type", item.gst_registration_type || "Regular");
    setShowLedgerPanel(false);
    setLedgerSearchTerm("");
  }, []);

  // While the ledger picker is open, Esc / Cancel should close the picker,
  // not the whole popup (preserves the previous guarded-Escape behavior).
  const handleClose = () => {
    if (showLedgerPanel) {
      setShowLedgerPanel(false);
      setLedgerSearchTerm("");
    } else {
      onClose();
    }
  };

  const handleAccept = () => {
    if (!showLedgerPanel) handleSave();
  };

  return (
    <>
      <VoucherPopupShell
        title="Party Details"
        headerRight={partyLedger?.name}
        onClose={handleClose}
        onAccept={handleAccept}
      >
        <div className="max-w-[640px] space-y-3">
          {natureOfReturnLabel && (
            <div className="flex items-center gap-2 pb-3 border-b border-gray-300">
              <span className="w-44 text-sm text-black shrink-0">{natureOfReturnLabel}</span>
              <span className="text-sm text-black shrink-0">:</span>
              <input
                type="text"
                className={inputCls}
                value={form.nature_of_return ?? ""}
                onChange={(e) => set("nature_of_return", e.target.value)}
                autoFocus
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="w-44 text-sm text-black shrink-0">{buyerLabel}</span>
            <span className="text-sm text-black shrink-0">:</span>
            <input
              type="text"
              className={inputCls}
              value={form.supplier_name ?? ""}
              onChange={(e) => set("supplier_name", e.target.value)}
              onFocus={() => { setShowLedgerPanel(true); setLedgerSearchTerm(""); }}
              autoFocus={!natureOfReturnLabel}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="w-44 text-sm text-black shrink-0">Address Type</span>
            <span className="text-sm text-black shrink-0">:</span>
            <select
              className={inputCls}
              value={form.address_type ?? "Primary"}
              onChange={(e) => set("address_type", e.target.value)}
            >
              <option value="Primary">♦ Primary</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-44 text-sm text-black shrink-0">Mailing Name</span>
            <span className="text-sm text-black shrink-0">:</span>
            <input
              type="text"
              className={inputCls}
              value={form.mailing_name ?? ""}
              onChange={(e) => set("mailing_name", e.target.value)}
            />
          </div>

          <div className="flex items-start gap-2">
            <span className="w-44 text-sm text-black shrink-0 pt-0.5">Address</span>
            <span className="text-sm text-black shrink-0 pt-0.5">:</span>
            <textarea
              className={`${inputCls} resize-none h-16`}
              value={form.address ?? ""}
              onChange={(e) => set("address", e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="w-44 text-sm text-black shrink-0">State</span>
            <span className="text-sm text-black shrink-0">:</span>
            <select
              className={inputCls}
              value={form.state ?? ""}
              onChange={(e) => set("state", e.target.value)}
            >
              <option value="">Select State</option>
              {INDIAN_STATES.map((s: string) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-44 text-sm text-black shrink-0">Country</span>
            <span className="text-sm text-black shrink-0">:</span>
            <input
              type="text"
              className={inputCls}
              value={form.country ?? ""}
              onChange={(e) => set("country", e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-gray-300">
            <span className="w-44 text-sm text-black shrink-0">GST Registration type</span>
            <span className="text-sm text-black shrink-0">:</span>
            <select
              className={inputCls}
              value={form.gst_registration_type ?? "Regular"}
              onChange={(e) => set("gst_registration_type", e.target.value)}
            >
              {GST_REGISTRATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-44 text-sm text-black shrink-0">GSTIN/UIN</span>
            <span className="text-sm text-black shrink-0">:</span>
            <input
              type="text"
              className={`${inputCls} uppercase`}
              value={form.gstin ?? ""}
              onChange={(e) => set("gstin", e.target.value.toUpperCase())}
              maxLength={15}
              placeholder="Optional"
            />
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-gray-300">
            <span className="w-44 text-sm text-black shrink-0">Place of Supply</span>
            <span className="text-sm text-black shrink-0">:</span>
            <select
              className={inputCls}
              value={form.place_of_supply ?? ""}
              onChange={(e) => set("place_of_supply", e.target.value)}
            >
              <option value="">Select State</option>
              {INDIAN_STATES.map((s: string) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </VoucherPopupShell>

      {showLedgerPanel && (
        <div className="fixed inset-y-0 right-0 z-[60] shadow-2xl">
          <LedgerListPanel
            title="List of Ledger Accounts"
            items={allLedgers}
            searchTerm={ledgerSearchTerm}
            onSearchChange={setLedgerSearchTerm}
            onSelect={handleLedgerSelect}
            onClose={() => { setShowLedgerPanel(false); setLedgerSearchTerm(""); }}
            onCreateNew={onCreateLedger}
            createLabel="Create"
            height="h-screen"
          />
        </div>
      )}
    </>
  );
}
