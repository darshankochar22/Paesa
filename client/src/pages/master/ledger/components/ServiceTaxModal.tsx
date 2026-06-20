import { useState, useEffect } from "react";

export type TypeOfService = "Undefined" | "Exempt" | "Pure Agent" | "Taxable";

export interface ServiceTaxDetails {
  service_tax_registration_number: string;
  type_of_service: TypeOfService;
  notification_number: string;
  notification_serial_number: string;
  is_party_an_associated_enterprise: "Yes" | "No";
  does_party_belong_to_non_taxable_territory: "Yes" | "No";
}

export const EMPTY_SERVICE_TAX_DETAILS: ServiceTaxDetails = {
  service_tax_registration_number: "",
  type_of_service: "Undefined",
  notification_number: "",
  notification_serial_number: "",
  is_party_an_associated_enterprise: "No",
  does_party_belong_to_non_taxable_territory: "No",
};

interface Props {
  isOpen: boolean;
  ledgerName?: string;
  value: ServiceTaxDetails;
  onClose: () => void;
  onAccept: (state: ServiceTaxDetails) => void;
}

const rowCls = "flex items-center min-h-[22px] px-3 py-[2px]";
const labelCls = "text-[11px] text-zinc-700 w-64 shrink-0";
const sepCls = "text-[11px] text-zinc-500 mr-3 shrink-0";
const selectCls =
  "text-[11px] text-zinc-900 bg-white border border-zinc-300 px-1 py-[1px] outline-none focus:border-zinc-500 transition-colors";
const inputCls =
  "text-[11px] text-zinc-900 bg-white border border-zinc-300 px-1.5 py-[1px] outline-none focus:border-zinc-500 transition-colors flex-1";

export default function ServiceTaxDetailsModal({
  isOpen,
  ledgerName,
  value,
  onClose,
  onAccept,
}: Props) {
  const [form, setForm] = useState<ServiceTaxDetails>(value);

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

  const set = <K extends keyof ServiceTaxDetails>(key: K, val: ServiceTaxDetails[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const showNotificationFields = form.type_of_service === "Exempt";

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/10 pt-32">
      <div className="bg-white border border-zinc-400 shadow-lg flex flex-col" style={{ width: 520 }}>

        {/* Title */}
        <div className="border-b border-zinc-300 text-center py-1 select-none bg-white">
          <span className="text-[11px] text-zinc-700">Service Tax Details</span>
          {ledgerName && (
            <span className="text-[11px] font-semibold text-zinc-900"> — {ledgerName}</span>
          )}
        </div>

        {/* Body */}
        <div className="py-2">
          <div className={rowCls}>
            <span className={labelCls}>Service tax registration number</span>
            <span className={sepCls}>:</span>
            <input
              autoFocus
              className={inputCls}
              value={form.service_tax_registration_number}
              onChange={(e) => set("service_tax_registration_number", e.target.value)}
            />
          </div>

          <div className={rowCls}>
            <span className={labelCls}>Type of service</span>
            <span className={sepCls}>:</span>
            <select
              className={selectCls}
              value={form.type_of_service}
              onChange={(e) => set("type_of_service", e.target.value as TypeOfService)}
            >
              <option value="Undefined">Undefined</option>
              <option value="Exempt">Exempt</option>
              <option value="Pure Agent">Pure Agent</option>
              <option value="Taxable">Taxable</option>
            </select>
          </div>

          {showNotificationFields && (
            <>
              <div className={`${rowCls} bg-[#fffde7]`}>
                <span className={labelCls}>&nbsp;&nbsp;Notification number</span>
                <span className={sepCls}>:</span>
                <input
                  className={inputCls}
                  value={form.notification_number}
                  onChange={(e) => set("notification_number", e.target.value)}
                />
              </div>
              <div className={`${rowCls} bg-[#fffde7]`}>
                <span className={labelCls}>&nbsp;&nbsp;Notification serial number</span>
                <span className={sepCls}>:</span>
                <input
                  className={inputCls}
                  value={form.notification_serial_number}
                  onChange={(e) => set("notification_serial_number", e.target.value)}
                />
              </div>
            </>
          )}

          <div className={`${rowCls} bg-[#fffde7]`}>
            <span className={labelCls}>Is party an associated enterprise</span>
            <span className={sepCls}>:</span>
            <select
              className={selectCls}
              value={form.is_party_an_associated_enterprise}
              onChange={(e) =>
                set("is_party_an_associated_enterprise", e.target.value as "Yes" | "No")
              }
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>

          <div className={`${rowCls} bg-[#fffde7]`}>
            <span className={labelCls}>Does party belong to non-taxable territory</span>
            <span className={sepCls}>:</span>
            <select
              className={selectCls}
              value={form.does_party_belong_to_non_taxable_territory}
              onChange={(e) =>
                set("does_party_belong_to_non_taxable_territory", e.target.value as "Yes" | "No")
              }
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-300 flex select-none">
          <button onClick={onClose} className="px-4 py-1 text-[11px] text-zinc-600 hover:bg-zinc-100 transition-colors">
            <span className="underline">Q</span>: Quit
          </button>
          <button onClick={() => onAccept(form)} className="px-4 py-1 text-[11px] text-zinc-600 hover:bg-zinc-100 transition-colors">
            <span className="underline">A</span>: Accept
          </button>
        </div>
      </div>
    </div>
  );
}