import { useState, useEffect } from "react";
import NewNumberPopup from "./NewNumberPopup";
import { VoucherPopupShell } from "@/components/tally-ui/VoucherPopupShell";

export interface OrderDetails {
  order_nos?: string;
  order_date?: string;
  mode_terms_of_payment?: string;
  other_references?: string;
  terms_of_delivery?: string;
  challan_nos?: string;
  dispatched_through?: string;
  destination?: string;
  carrier_name?: string;
  bill_of_lading_no?: string;
  bill_of_lading_date?: string;
  motor_vehicle_no?: string;
}

interface Props {
  initialDetails?: OrderDetails | null;
  onClose: () => void;
  onSave: (details: OrderDetails) => void;
  /** Inward vouchers (e.g. Receipt Note) label the 2nd block "Receipt Details"
   *  with "Receipt Doc No." instead of the outward "Dispatch Details". */
  receiptVariant?: boolean;
}

export default function OrderDetailsPopup({ initialDetails, onClose, onSave, receiptVariant }: Props) {
  const [form, setForm] = useState<OrderDetails>({
    order_nos: initialDetails?.order_nos ?? "",
    order_date: initialDetails?.order_date ?? "",
    mode_terms_of_payment: initialDetails?.mode_terms_of_payment ?? "",
    other_references: initialDetails?.other_references ?? "",
    terms_of_delivery: initialDetails?.terms_of_delivery ?? "",
    challan_nos: initialDetails?.challan_nos ?? "",
    dispatched_through: initialDetails?.dispatched_through ?? "",
    destination: initialDetails?.destination ?? "",
    carrier_name: initialDetails?.carrier_name ?? "",
    bill_of_lading_no: initialDetails?.bill_of_lading_no ?? "",
    bill_of_lading_date: initialDetails?.bill_of_lading_date ?? "",
    motor_vehicle_no: initialDetails?.motor_vehicle_no ?? "",
  });

  const [showOrderList, setShowOrderList] = useState(false);
  const [showNewNumber, setShowNewNumber] = useState(false);
  const [createdOrders, setCreatedOrders] = useState<string[]>([]);

  const set = (field: keyof OrderDetails, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = () => onSave(form);

  // Close the "List of Orders" dropdown on an outside click.
  useEffect(() => {
    if (!showOrderList) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-od-dd]")) setShowOrderList(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showOrderList]);

  const labelCls = "w-48 text-right text-sm text-black shrink-0";
  const dispLabel = "w-44 text-left text-sm text-black shrink-0";
  const inputCls = "flex-1 min-w-0 text-sm bg-white border border-gray-400 px-1 py-0 outline-none focus:border-black";

  return (
    <>
      <VoucherPopupShell
        title="Order Details"
        onClose={onClose}
        onAccept={handleSave}
      >
        <div className="max-w-[960px]">
          <div className="flex gap-8">
            {/* Left — Order No(s) + Date */}
            <div className="w-56 shrink-0 space-y-3">
              <div data-od-dd className="relative">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-black shrink-0">Order No(s)</span>
                  <span className="text-sm text-black shrink-0">:</span>
                </div>
                <input
                  type="text"
                  className="w-full text-sm bg-white border border-gray-400 px-1 py-0 outline-none focus:border-black"
                  value={form.order_nos ?? ""}
                  onFocus={() => setShowOrderList(true)}
                  onChange={(e) => set("order_nos", e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") setShowOrderList(false); }}
                  autoFocus
                />
                {showOrderList && (
                  <div className="absolute left-0 top-full mt-0.5 w-full bg-white border border-gray-400 shadow-xl z-40">
                    <div className="bg-white text-black text-[10px] font-bold px-2 py-1 border-b border-gray-300">List of Orders</div>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); setShowOrderList(false); setShowNewNumber(true); }}
                      className="block w-full text-right text-sm px-2 py-1 hover:bg-gray-100 font-semibold border-b border-gray-100"
                    >
                      New Number
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); set("order_nos", "♦ Not Applicable"); setShowOrderList(false); }}
                      className="block w-full text-left text-sm px-2 py-1 hover:bg-gray-100"
                    >
                      &#9670; Not Applicable
                    </button>
                    {createdOrders.filter((o) => o !== form.order_nos).map((o) => (
                      <button
                        key={o}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); set("order_nos", o); setShowOrderList(false); }}
                        className="block w-full text-left text-sm px-2 py-1 hover:bg-gray-100 border-t border-gray-100 font-semibold"
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-black shrink-0">Date</span>
                <span className="text-sm text-black shrink-0">:</span>
                <input
                  type="date"
                  className={inputCls}
                  value={form.order_date ?? ""}
                  onChange={(e) => set("order_date", e.target.value)}
                />
              </div>
            </div>

            {/* Right */}
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-center gap-2">
                <span className={labelCls}>Mode/Terms of Payment</span>
                <span className="text-sm text-black shrink-0">:</span>
                <input type="text" className={inputCls} value={form.mode_terms_of_payment ?? ""} onChange={(e) => set("mode_terms_of_payment", e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <span className={labelCls}>Other References</span>
                <span className="text-sm text-black shrink-0">:</span>
                <input type="text" className={inputCls} value={form.other_references ?? ""} onChange={(e) => set("other_references", e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <span className={labelCls}>Terms of Delivery</span>
                <span className="text-sm text-black shrink-0">:</span>
                <input type="text" className={inputCls} value={form.terms_of_delivery ?? ""} onChange={(e) => set("terms_of_delivery", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Section: Dispatch / Receipt Details — white sub-header, bold + divider */}
          <div className="mt-6 pb-1 border-b border-gray-300 text-sm font-bold text-black select-none">
            {receiptVariant ? "Receipt Details" : "Dispatch Details"}
          </div>

          <div className="pt-4">
            <div className="w-[620px] max-w-full space-y-3">
              <div className="flex items-center gap-2">
                <span className={dispLabel}>{receiptVariant ? "Receipt Doc No." : "Dispatch Doc No."}</span>
                <span className="text-sm text-black shrink-0">:</span>
                <input type="text" className={inputCls} value={form.challan_nos ?? ""} onChange={(e) => set("challan_nos", e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <span className={dispLabel}>Dispatched through</span>
                <span className="text-sm text-black shrink-0">:</span>
                <input type="text" className={inputCls} value={form.dispatched_through ?? ""} onChange={(e) => set("dispatched_through", e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <span className={dispLabel}>Destination</span>
                <span className="text-sm text-black shrink-0">:</span>
                <input type="text" className={inputCls} value={form.destination ?? ""} onChange={(e) => set("destination", e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <span className={dispLabel}>Carrier Name/Agent</span>
                <span className="text-sm text-black shrink-0">:</span>
                <input type="text" className={inputCls} value={form.carrier_name ?? ""} onChange={(e) => set("carrier_name", e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <span className={dispLabel}>Bill of Lading/LR-RR No.</span>
                <span className="text-sm text-black shrink-0">:</span>
                <input type="text" className={inputCls} value={form.bill_of_lading_no ?? ""} onChange={(e) => set("bill_of_lading_no", e.target.value)} />
                <span className="text-sm text-black shrink-0">Date</span>
                <span className="text-sm text-black shrink-0">:</span>
                <input
                  type="date"
                  className="w-36 shrink-0 text-sm bg-white border border-gray-400 px-1 py-0 outline-none focus:border-black"
                  value={form.bill_of_lading_date ?? ""}
                  onChange={(e) => set("bill_of_lading_date", e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className={dispLabel}>Motor Vehicle No.</span>
                <span className="text-sm text-black shrink-0">:</span>
                <input type="text" className={inputCls} value={form.motor_vehicle_no ?? ""} onChange={(e) => set("motor_vehicle_no", e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      </VoucherPopupShell>

      {showNewNumber && (
        <NewNumberPopup
          title="New Order Number"
          label="Order No."
          onClose={() => setShowNewNumber(false)}
          onConfirm={(value) => {
            setCreatedOrders((c) => (c.includes(value) ? c : [...c, value]));
            set("order_nos", value);
            setShowNewNumber(false);
          }}
        />
      )}
    </>
  );
}
