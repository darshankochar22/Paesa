

// vouchers/DebitNoteVoucher.tsx
import { useState } from "react";
import type { useVoucherForm } from "../hooks/useVoucherForm";
import FieldRow from "../components/FieldRow";

interface Props {
  form: ReturnType<typeof useVoucherForm>;
  handleAmountConfirm: (row: any, idx: number) => void;
  focusStockQty: (idx: number) => void;
  focusStockRate: (idx: number) => void;
  proceedToNextStockRow: (idx: number) => void;
}

export default function DebitNoteVoucher({
  form,
  focusStockQty,
  focusStockRate,
  proceedToNextStockRow,
}: Props) {
  return (
    <>
      {/* Party */}
      <div className="border-b border-gray-300 shrink-0 py-1">
        <FieldRow
          label="Party A/c name"
          fieldType="party"
          ledger={form.partyLedger}
          balance={form.partyBalance}
          form={form}
        />
      </div>

      {/* Ledger account */}
      <div className="border-b border-gray-300 shrink-0 py-1">
        <FieldRow
          label="Ledger account"
          fieldType="salesPurchase"
          ledger={form.salesPurchaseLedger}
          balance={form.salesPurchaseBalance}
          form={form}
        />
      </div>

      {/* Separator line like Tally */}
      <div className="border-b border-black shrink-0" />

      {/* Stock items table header — two rows: main labels, then Actual/Billed sub-labels */}
      <div className="border-b border-black shrink-0 bg-white">
        <div className="flex px-3 py-0.5">
          <div className="flex-1 text-sm font-semibold text-black">Name of Item</div>
          <div className="w-44 text-center text-sm font-semibold text-black">Quantity</div>
          <div className="w-20 text-right text-sm font-semibold text-black">Rate</div>
          <div className="w-12 text-center text-sm font-semibold text-black">per</div>
          <div className="w-16 text-right text-sm font-semibold text-black">Disc %</div>
          <div className="w-32 text-right text-sm font-semibold text-black">Amount</div>
        </div>
        <div className="flex px-3 py-0.5 border-t border-gray-200">
          <div className="flex-1" />
          <div className="w-44 flex">
            <div className="flex-1 text-center text-xs text-zinc-600">Actual</div>
            <div className="flex-1 text-center text-xs text-zinc-600">Billed</div>
          </div>
          <div className="w-20" />
          <div className="w-12" />
          <div className="w-16" />
          <div className="w-32" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Stock item rows */}
        {form.stockEntries.map((row, idx) => {
          const isActive =
            form.activeField?.type === "stockItem" &&
            form.activeField.rowId === row.id;
          return (
            <div
              key={row.id}
              className="flex items-center border-b border-gray-100 min-h-[22px] group px-3 py-0"
            >
              <div className="flex-1 flex items-center gap-1">
                <input
                  data-stock-item={idx + 1}
                  type="text"
                  className="flex-1 text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                  value={isActive ? form.stockSearchTerm : (row.stockItem?.name ?? "")}
                  placeholder={idx === 0 ? "Select Item…" : ""}
                  onFocus={() =>
                    form.handleFieldFocus({ type: "stockItem", rowId: row.id })
                  }
                  onChange={(e) => {
                    form.setStockSearchTerm(e.target.value);
                    if (!row.stockItem)
                      form.handleFieldFocus({ type: "stockItem", rowId: row.id });
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" || !row.stockItem) return;
                    e.preventDefault();
                    focusStockQty(idx);
                  }}
                  autoComplete="off"
                />
                {form.stockEntries.length > 1 && (
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => form.handleRemoveStockRow(row.id)}
                    className="text-xs text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 shrink-0"
                  >
                    &times;
                  </button>
                )}
              </div>

              {/* Quantity: Actual / Billed split */}
              <div className="w-44 flex">
                <div className="flex-1 text-right pr-1">
                  <input
                    data-stock-qty={idx + 1}
                    type="text"
                    inputMode="decimal"
                    className="w-full text-right text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                    value={row.quantityRaw}
                    placeholder=""
                    onChange={(e) =>
                      form.handleUpdateStockRow(row.id, { quantityRaw: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      focusStockRate(idx);
                    }}
                  />
                </div>
                <div className="flex-1 text-right pr-1">
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full text-right text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                    value={row.billedQtyRaw ?? row.quantityRaw}
                    placeholder=""
                    onChange={(e) =>
                      form.handleUpdateStockRow(row.id, { billedQtyRaw: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="w-20 text-right pr-1">
                <input
                  data-stock-rate={idx + 1}
                  type="text"
                  inputMode="decimal"
                  className="w-full text-right text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                  value={row.rateRaw}
                  placeholder=""
                  onChange={(e) =>
                    form.handleUpdateStockRow(row.id, { rateRaw: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    proceedToNextStockRow(idx);
                  }}
                />
              </div>

              <div className="w-12 text-center text-xs text-gray-500">
                {row.unit?.symbol ?? ""}
              </div>

              <div className="w-16 text-right pr-1">
                <input
                  type="text"
                  inputMode="decimal"
                  className="w-full text-right text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                  value={row.discPercentRaw ?? ""}
                  placeholder=""
                  onChange={(e) =>
                    form.handleUpdateStockRow(row.id, { discPercentRaw: e.target.value })
                  }
                />
              </div>

              <div className="w-32 text-right text-sm font-semibold text-black select-none">
                {row.amountRaw
                  ? Number(row.amountRaw).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : ""}
              </div>
            </div>
          );
        })}

        {/* Filler rows */}
        {Array.from({ length: Math.max(0, 5 - form.stockEntries.length) }).map((_, i) => (
          <div
            key={`dnf-${i}`}
            className="flex border-b border-gray-50 min-h-[22px] px-3"
          />
        ))}

        {/* Stock subtotal */}
        {form.stockEntries.reduce((s, r) => s + (Number(r.amountRaw) || 0), 0) > 0 && (
          <div className="flex border-t border-gray-300 border-b border-gray-300 px-3 py-0.5 bg-white">
            <div className="flex-1 text-xs text-gray-700">Subtotal</div>
            <div className="w-44" />
            <div className="w-20" />
            <div className="w-12" />
            <div className="w-16" />
            <div className="w-32 text-right text-sm font-semibold text-black">
              {form.stockEntries
                .reduce((s, r) => s + (Number(r.amountRaw) || 0), 0)
                .toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
            </div>
          </div>
        )}
      </div>

 {/* Grand total footer */}
      <div className="flex border-t border-black shrink-0 px-3 py-0.5 bg-white">
        <div className="flex-1 text-sm font-semibold text-black" />
        <div className="w-32 text-right text-sm font-semibold text-black">
          {form.totalAmount > 0
            ? form.totalAmount.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : ""}
        </div>
      </div>

      <DebitNoteGSTDetails form={form} />
    </>
  );
}

// ── GST Details component ─────────────────────────────────────────────────────
function DebitNoteGSTDetails({ form }: { form: any }) {
  const [provideGST, setProvideGST] = useState<"Yes" | "No">("No");
  const [showGSTPopup, setShowGSTPopup] = useState(false);
  const [reasonForNote, setReasonForNote] = useState("");
  const [supplierNoteNo, setSupplierNoteNo] = useState("");

  const REASONS = [
    "Not Applicable",
    "01-Sales Return",
    "02-Post Sale Discount",
    "03-Deficiency in services",
    "04-Correction in Invoice",
    "05-Change in POS",
    "06-Finalization of Provisional assessment",
    "07-Others",
  ];

  return (
    <>
      <div className="flex items-center border-t border-gray-200 shrink-0 px-3 py-1 bg-white gap-3">
        <span className="text-sm text-black">Provide GST details</span>
        <span className="text-sm text-black">:</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setProvideGST("Yes"); setShowGSTPopup(true); }}
            className={`text-sm px-2 py-0 border ${provideGST === "Yes" ? "bg-black text-white border-black" : "border-gray-400 text-black"}`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => { setProvideGST("No"); setShowGSTPopup(false); }}
            className={`text-sm px-2 py-0 border ${provideGST === "No" ? "bg-black text-white border-black" : "border-gray-400 text-black"}`}
          >
            No
          </button>
        </div>
      </div>

      {showGSTPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white border border-gray-400 shadow-xl w-96">
            <div className="bg-blue-700 text-white text-sm font-semibold px-3 py-1">
              Additional Details
            </div>
            <div className="px-4 py-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="text-sm w-44 shrink-0">Reason for Issuing Note</span>
                <span className="text-sm">:</span>
                <select
                  className="flex-1 border border-gray-400 px-2 py-1 text-sm outline-none focus:border-black"
                  value={reasonForNote}
                  onChange={(e) => setReasonForNote(e.target.value)}
                >
                  {REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm w-44 shrink-0">Supplier's Debit/Credit Note No.</span>
                <span className="text-sm">:</span>
                <input
                  type="text"
                  className="flex-1 border border-gray-400 px-2 py-1 text-sm outline-none focus:border-black"
                  value={supplierNoteNo}
                  onChange={(e) => setSupplierNoteNo(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => setShowGSTPopup(false)}
                  className="text-xs border border-gray-400 px-3 py-1 hover:bg-gray-100"
                >
                  Esc: Cancel
                </button>
                <button
                  onClick={() => {
                    form.setDebitNoteDetails({
                      ...form.debitNoteDetails,
                      reason_for_note: reasonForNote,
                      supplier_note_no: supplierNoteNo,
                    });
                    setShowGSTPopup(false);
                  }}
                  className="text-xs bg-black text-white px-3 py-1 hover:bg-gray-800"
                >
                  A: Accept
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}