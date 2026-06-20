import { useState, useEffect } from "react";

export interface VATDetails {
  type_of_dealer: string;
  vat_tin_no: string;
  cst_no: string;
  sales_purchases_against_form_c: "Yes" | "No";
}

export const EMPTY_VAT_DETAILS: VATDetails = {
  type_of_dealer: "Unknown",
  vat_tin_no: "",
  cst_no: "",
  sales_purchases_against_form_c: "No",
};

interface Props {
  isOpen: boolean;
  ledgerName?: string;
  value: VATDetails;
  onClose: () => void;
  onAccept: (state: VATDetails) => void;
}

const rowCls = "flex items-center min-h-[22px] px-3 py-[2px]";
const labelCls = "text-[11px] text-zinc-700 w-52 shrink-0";
const sepCls = "text-[11px] text-zinc-500 mr-3 shrink-0";
const selectCls =
  "text-[11px] text-zinc-900 bg-white border border-zinc-300 px-1 py-[1px] outline-none focus:border-zinc-500 transition-colors";
const inputCls =
  "text-[11px] text-zinc-900 bg-white border border-zinc-300 px-1.5 py-[1px] outline-none focus:border-zinc-500 transition-colors flex-1";

export default function VATDetailsModal({
  isOpen,
  ledgerName,
  value,
  onClose,
  onAccept,
}: Props) {
  const [form, setForm] = useState<VATDetails>(value);

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

  const set = <K extends keyof VATDetails>(key: K, val: VATDetails[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/10 pt-32">
      <div className="bg-white border border-zinc-400 shadow-lg flex flex-col" style={{ width: 480 }}>

        {/* Title */}
        <div className="border-b border-zinc-300 text-center py-1 select-none bg-white">
          <span className="text-[11px] text-zinc-700">VAT Details</span>
          {ledgerName && (
            <span className="text-[11px] font-semibold text-zinc-900"> — {ledgerName}</span>
          )}
        </div>

        {/* Body */}
        <div className="py-2">

          {/* Type of Dealer */}
          <div className={`${rowCls} bg-[#fffde7]`}>
            <span className={labelCls}>Type of Dealer</span>
            <span className={sepCls}>:</span>
            <select
              autoFocus
              className={selectCls}
              value={form.type_of_dealer}
              onChange={(e) => set("type_of_dealer", e.target.value)}
            >
              <option value="Unknown">Unknown</option>
              <option value="Regular">Regular</option>
              <option value="Unregistered">Unregistered</option>
            </select>
          </div>

          {/* VAT TIN No. */}
          <div className={rowCls}>
            <span className={labelCls}>VAT TIN No.</span>
            <span className={sepCls}>:</span>
            <input
              className={inputCls}
              value={form.vat_tin_no}
              onChange={(e) => set("vat_tin_no", e.target.value)}
              maxLength={15}
            />
          </div>

          {/* CST No. */}
          <div className={rowCls}>
            <span className={labelCls}>CST No.</span>
            <span className={sepCls}>:</span>
            <input
              className={inputCls}
              value={form.cst_no}
              onChange={(e) => set("cst_no", e.target.value)}
              maxLength={15}
            />
          </div>

          {/* Sales/purchases against Form C */}
          <div className={rowCls}>
            <span className={labelCls}>Sales/purchases against Form C</span>
            <span className={sepCls}>:</span>
            <select
              className={selectCls}
              value={form.sales_purchases_against_form_c}
              onChange={(e) =>
                set("sales_purchases_against_form_c", e.target.value as "Yes" | "No")
              }
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
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