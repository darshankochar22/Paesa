import { VoucherPopupShell } from "@/components/tally-ui/VoucherPopupShell";

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
    <VoucherPopupShell title="Change Company/Tax Registration" onClose={onClose}>
      <div className="max-w-3xl">
        {/* Column headers */}
        <div className="flex text-xs font-bold text-black bg-gray-100 border-b border-gray-400 px-2 py-1.5">
          <div className="w-[260px] shrink-0">Name</div>
          <div className="w-[180px] shrink-0">Tax Registration No.</div>
          <div className="w-[100px] shrink-0">Tax Type</div>
          <div className="w-[160px] shrink-0">State</div>
        </div>

        {/* Not Applicable */}
        <div
          className="flex px-2 py-1.5 text-sm hover:bg-gray-100 cursor-pointer border-b border-gray-200"
          onClick={() => onSelect(null)}
        >
          <div className="w-[260px] shrink-0">♦ Not Applicable</div>
          <div className="w-[180px] shrink-0" />
          <div className="w-[100px] shrink-0" />
          <div className="w-[160px] shrink-0" />
        </div>

        {/* Registration rows */}
        {options.map((opt) => (
          <div
            key={opt.key}
            className="flex px-2 py-1.5 text-sm hover:bg-gray-100 cursor-pointer border-b border-gray-200"
            onClick={() => onSelect(opt)}
          >
            <div className="w-[260px] shrink-0 truncate text-black">{opt.label}</div>
            <div className="w-[180px] shrink-0 italic text-gray-600 truncate">{opt.taxRegNo}</div>
            <div className="w-[100px] shrink-0 italic text-gray-600">{opt.taxType}</div>
            <div className="w-[160px] shrink-0 text-gray-600 truncate">{opt.state}</div>
          </div>
        ))}
      </div>
    </VoucherPopupShell>
  );
}
