interface RegistrationOption {
  key: string;
  label: string;
  taxRegNo: string;
  taxType: string;
  state: string;
  kind: "gst" | "tax";
  raw: any;
}

interface Props {
  gstRegistrations: any[];
  taxUnits: any[];
  onClose: () => void;
  onSelect: (opt: RegistrationOption | null) => void;
}

export default function CompanyTaxRegistrationPopup({
  gstRegistrations,
  taxUnits,
  onClose,
  onSelect,
}: Props) {
  const options: RegistrationOption[] = [
    ...gstRegistrations.map((r: any) => {
      const state = r.state_id ?? r.state ?? "";
      return {
        key: `gst-${r.gst_id}`,
        label: state
          ? `${state} Registration`
          : (r.legal_name ?? r.trade_name ?? r.name ?? `Registration #${r.gst_id}`),
        taxRegNo: r.gstin ?? "",
        taxType: "GST",
        state,
        kind: "gst" as const,
        raw: r,
      };
    }),
    ...taxUnits.map((t: any) => ({
      key: `tax-${t.tax_unit_id}`,
      label: t.name ?? "",
      taxRegNo: t.ecc_number ?? t.registration_no ?? "",
      taxType: t.registered_for ?? "Excise",
      state: t.state ?? "",
      kind: "tax" as const,
      raw: t,
    })),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-24">
      <div className="w-[680px] bg-white border border-gray-400 shadow-xl">

        {/* Header */}
        <div className="bg-zinc-800 text-white text-sm font-semibold px-3 py-1 flex justify-between items-center">
          <span>Change Company/Tax Registration</span>
          <button onClick={onClose} className="text-white hover:opacity-70 text-xs">✕</button>
        </div>

        {/* Column headers */}
        <div className="flex text-xs font-bold text-black bg-zinc-200 border-b border-zinc-400 px-2 py-1">
          <div className="w-[220px] shrink-0">Name</div>
          <div className="w-[160px] shrink-0">Tax Registration No.</div>
          <div className="w-[80px] shrink-0">Tax Type</div>
          <div className="w-[160px] shrink-0">State</div>
        </div>

        {/* Rows */}
        <div className="max-h-96 overflow-y-auto">

          {/* Not Applicable */}
          <div
            className="flex px-2 py-1 text-sm hover:bg-orange-200 cursor-pointer border-b border-gray-100"
            onClick={() => onSelect(null)}
          >
            <div className="w-[220px] shrink-0">♦ Not Applicable</div>
            <div className="w-[160px] shrink-0" />
            <div className="w-[80px] shrink-0" />
            <div className="w-[160px] shrink-0" />
          </div>

          {/* Registration rows */}
          {options.map((opt) => (
            <div
              key={opt.key}
              className="flex px-2 py-1 text-sm hover:bg-orange-200 cursor-pointer border-b border-gray-100"
              onClick={() => onSelect(opt)}
            >
              <div className="w-[220px] shrink-0 truncate">{opt.label}</div>
              <div className="w-[160px] shrink-0 italic text-zinc-600 truncate">{opt.taxRegNo}</div>
              <div className="w-[80px] shrink-0 italic text-zinc-600">{opt.taxType}</div>
              <div className="w-[160px] shrink-0 text-zinc-600 truncate">{opt.state}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-300 px-3 py-1 flex justify-end">
          <button
            onClick={onClose}
            className="text-xs border border-gray-400 px-3 py-1 hover:bg-gray-100"
          >
            Esc: Cancel
          </button>
        </div>
      </div>
    </div>
  );
}