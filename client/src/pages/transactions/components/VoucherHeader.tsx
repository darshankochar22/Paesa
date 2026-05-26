import { useState } from "react";
import DatePickerPopup from "./popups/DatePickerPopup";

interface Props {
  voucherType: string;
  voucherNumber: string;        // FIX #4 — was `number`, hook returns string
  dateDisplay: string;
  date: string;
  onDateChange: (date: string) => void;
  supplierInvoiceNo?: string;
  onSupplierInvoiceNoChange?: (value: string) => void;
  supplierInvoiceDate?: string;
  onSupplierInvoiceDateChange?: (date: string) => void;
}

export default function VoucherHeader({
  voucherType,
  voucherNumber,
  dateDisplay,
  date,
  onDateChange,
  supplierInvoiceNo,
  onSupplierInvoiceNoChange,
  supplierInvoiceDate,
  onSupplierInvoiceDateChange,
}: Props) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSupplierDatePicker, setShowSupplierDatePicker] = useState(false);

  const isPurchase = voucherType === "Purchase";

  return (
    <>
      {/* Voucher type badge + number + date */}
      <div className="flex items-center justify-between px-3 py-1 bg-white border-b border-gray-300">
        <div className="flex items-center gap-2 text-sm">
          <span className="bg-black text-white px-2 py-0.5 text-xs font-medium uppercase">
            {voucherType}
          </span>
          <span className="text-gray-600">No.</span>
          <span className="font-semibold text-black">{voucherNumber}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-600 text-sm">Date</span>
          <span className="text-gray-400 text-sm">:</span>
          <button
            onClick={() => setShowDatePicker(true)}
            className="text-xs px-1 py-0.5 hover:bg-zinc-100 transition-colors font-semibold text-zinc-800 bg-transparent border-none cursor-pointer"
            title="Click to change date (F2)"
          >
            {dateDisplay}
          </button>
        </div>
      </div>

      {/* Supplier Invoice fields — Purchase only */}
      {isPurchase && (
        <div className="flex items-center gap-6 px-3 py-2 bg-zinc-50 border-b border-zinc-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Supplier Invoice No.
            </span>
            <span className="text-zinc-400">:</span>
            <input
              type="text"
              value={supplierInvoiceNo ?? ""}
              onChange={(e) => onSupplierInvoiceNoChange?.(e.target.value)}
              className="text-xs px-2 py-0.5 border border-zinc-300 rounded focus:border-zinc-800 outline-none bg-white w-40 font-semibold"
              placeholder="Invoice Number"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Date
            </span>
            <span className="text-zinc-400">:</span>
            <button
              onClick={() => setShowSupplierDatePicker(true)}
              className="text-xs px-1 py-0.5 hover:bg-zinc-100 transition-colors font-semibold text-zinc-800 bg-transparent border-none cursor-pointer w-32 text-left"
            >
              {supplierInvoiceDate
                ? new Date(supplierInvoiceDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "Select Date"}
            </button>
          </div>
        </div>
      )}

      {showDatePicker && (
        <DatePickerPopup
          initialDate={date}
          onClose={() => setShowDatePicker(false)}
          onConfirm={onDateChange}
          label="Voucher Date"
        />
      )}

      {showSupplierDatePicker && (
        <DatePickerPopup
          initialDate={supplierInvoiceDate ?? new Date().toISOString().split("T")[0]}
          onClose={() => setShowSupplierDatePicker(false)}
          onConfirm={onSupplierInvoiceDateChange!}
          label="Supplier Invoice Date"
        />
      )}
    </>
  );
}