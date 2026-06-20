import { useState, useEffect } from "react";

export interface GSTDetails {
  place_of_supply: string;
  is_party_a_transporter: "Yes" | "No";
  transporter_id: string;
}

export const EMPTY_GST_DETAILS: GSTDetails = {
  place_of_supply: "",
  is_party_a_transporter: "No",
  transporter_id: "",
};

const INDIAN_STATES = [
  "Not Applicable",
  "Andaman & Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra & Nagar Haveli",
  "Daman & Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu & Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Other Territory",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttarakhand",
  "Uttar Pradesh",
  "West Bengal",
];

interface Props {
  isOpen: boolean;
  ledgerName?: string;
  value: GSTDetails;
  onClose: () => void;
  onAccept: (state: GSTDetails) => void;
}

const rowCls = "flex items-center min-h-[22px] px-3 py-[2px]";
const labelCls = "text-[11px] text-zinc-700 w-52 shrink-0";
const sepCls = "text-[11px] text-zinc-500 mr-3 shrink-0";
const selectCls =
  "text-[11px] text-zinc-900 bg-white border border-zinc-300 px-1 py-[1px] outline-none focus:border-zinc-500 transition-colors";
const inputCls =
  "text-[11px] text-zinc-900 bg-white border border-zinc-300 px-1.5 py-[1px] outline-none focus:border-zinc-500 transition-colors flex-1";

export default function AdditionalGSTDetailsModal({
  isOpen,
  ledgerName,
  value,
  onClose,
  onAccept,
}: Props) {
  const [form, setForm] = useState<GSTDetails>(value);

  // sync if parent value changes while open
  useEffect(() => {
    if (isOpen) setForm(value);
  }, [isOpen, value]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.altKey && (e.key === "a" || e.key === "A")) { e.preventDefault(); onAccept(form); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, form, onClose, onAccept]);

  if (!isOpen) return null;

  const set = <K extends keyof GSTDetails>(key: K, val: GSTDetails[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/10 pt-32">
      <div className="bg-white border border-zinc-400 shadow-lg flex flex-col" style={{ width: 480 }}>

        {/* Title */}
        <div className="border-b border-zinc-300 text-center py-1 select-none bg-white">
          <span className="text-[11px] text-zinc-700">Additional GST Details</span>
          {ledgerName && (
            <span className="text-[11px] font-semibold text-zinc-900"> — {ledgerName}</span>
          )}
        </div>

        {/* Body */}
        <div className="py-2">

          {/* Place of Supply */}
          <div className={rowCls}>
            <span className={labelCls}>Place of Supply (for Outwards)</span>
            <span className={sepCls}>:</span>
            <select
              className={selectCls}
              value={form.place_of_supply}
              onChange={(e) => set("place_of_supply", e.target.value)}
            >
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Is the Party a Transporter */}
          <div className={`${rowCls} bg-[#fffde7]`}>
            <span className={labelCls}>Is the Party a Transporter</span>
            <span className={sepCls}>:</span>
            <select
              className={selectCls}
              value={form.is_party_a_transporter}
              onChange={(e) =>
                set("is_party_a_transporter", e.target.value as "Yes" | "No")
              }
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>

          {/* Transporter ID — only when Yes */}
          {form.is_party_a_transporter === "Yes" && (
            <div className={`${rowCls} bg-[#fffde7]`}>
              <span className={labelCls}>Transporter ID</span>
              <span className={sepCls}>:</span>
              <input
                autoFocus
                className={inputCls}
                value={form.transporter_id}
                onChange={(e) => set("transporter_id", e.target.value)}
                maxLength={15}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-300 flex select-none">
          <button
            onClick={onClose}
            className="px-4 py-1 text-[11px] text-zinc-600 hover:bg-zinc-100 transition-colors"
          >
            <span className="underline">Q</span>: Quit
          </button>
          <button
            onClick={() => onAccept(form)}
            className="px-4 py-1 text-[11px] text-zinc-600 hover:bg-zinc-100 transition-colors"
          >
            <span className="underline">A</span>: Accept
          </button>
        </div>
      </div>
    </div>
  );
}