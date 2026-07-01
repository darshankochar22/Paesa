import { useState } from "react";
import { VoucherPopupShell } from "@/components/tally-ui/VoucherPopupShell";
import type { OrderDetails } from "./OrderDetailsPopup";

interface Props {
  initialDetails?: OrderDetails | null;
  onClose: () => void;
  onSave: (details: OrderDetails) => void;
}

// Purchase Order "Order Details" sub-screen (Tally-faithful). A compact Order
// Details block (Mode/Terms of Payment, Other References, Terms of Delivery) over
// a Receipt Details block (Dispatch through, Destination, Carrier Name/Agent,
// Bill of Lading/LR-RR No. + Date, Motor Vehicle No.). Deliberately omits the
// Order No(s)/Date and Doc No. fields the shared OrderDetailsPopup carries — hence
// a dedicated popup rather than a prop on the shared one.
export default function PurchaseOrderDetailsPopup({ initialDetails, onClose, onSave }: Props) {
  const [form, setForm] = useState<OrderDetails>({
    mode_terms_of_payment: initialDetails?.mode_terms_of_payment ?? "",
    other_references: initialDetails?.other_references ?? "",
    terms_of_delivery: initialDetails?.terms_of_delivery ?? "",
    dispatched_through: initialDetails?.dispatched_through ?? "",
    destination: initialDetails?.destination ?? "",
    carrier_name: initialDetails?.carrier_name ?? "",
    bill_of_lading_no: initialDetails?.bill_of_lading_no ?? "",
    bill_of_lading_date: initialDetails?.bill_of_lading_date ?? "",
    motor_vehicle_no: initialDetails?.motor_vehicle_no ?? "",
  });

  const set = (field: keyof OrderDetails, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = () => onSave(form);

  const labelCls = "w-56 text-sm text-black shrink-0";
  const colonCls = "text-sm text-black shrink-0";
  const inputCls =
    "min-w-0 flex-1 text-sm bg-white border border-gray-400 px-2 py-1 outline-none focus:border-black";

  const row = (label: string, field: keyof OrderDetails, autoFocus = false) => (
    <div className="flex items-center gap-2">
      <span className={labelCls}>{label}</span>
      <span className={colonCls}>:</span>
      <input
        autoFocus={autoFocus}
        type="text"
        className={inputCls}
        value={(form[field] as string) ?? ""}
        onChange={(e) => set(field, e.target.value)}
      />
    </div>
  );

  return (
    <VoucherPopupShell title="Order Details" onClose={onClose} onAccept={handleSave}>
      <div className="max-w-2xl space-y-3">
        {row("Mode/Terms of Payment", "mode_terms_of_payment", true)}
        {row("Other References", "other_references")}
        {row("Terms of Delivery", "terms_of_delivery")}

        {/* Receipt Details section */}
        <div className="pt-5 pb-1 border-b border-gray-300">
          <span className="text-sm font-semibold text-black">Receipt Details</span>
        </div>

        {row("Dispatch through", "dispatched_through")}
        {row("Destination", "destination")}
        {row("Carrier Name/Agent", "carrier_name")}
        <div className="flex items-center gap-2">
          <span className={labelCls}>Bill of Lading/LR-RR No.</span>
          <span className={colonCls}>:</span>
          <input
            type="text"
            className={inputCls}
            value={form.bill_of_lading_no ?? ""}
            onChange={(e) => set("bill_of_lading_no", e.target.value)}
          />
          <span className={colonCls}>Date</span>
          <span className={colonCls}>:</span>
          <input
            type="date"
            className="w-40 shrink-0 text-sm bg-white border border-gray-400 px-2 py-1 outline-none focus:border-black"
            value={form.bill_of_lading_date ?? ""}
            onChange={(e) => set("bill_of_lading_date", e.target.value)}
          />
        </div>
        {row("Motor Vehicle No.", "motor_vehicle_no")}
      </div>
    </VoucherPopupShell>
  );
}
