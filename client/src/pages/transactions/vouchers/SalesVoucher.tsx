// // vouchers/SalesVoucher.tsx
// import type { useVoucherForm } from "../hooks/useVoucherForm";
// import FieldRow from "../components/FieldRow";

// interface Props {
//   form: ReturnType<typeof useVoucherForm>;
//   handleAmountConfirm: (row: any, idx: number) => void;
//   focusStockQty: (idx: number) => void;
//   focusStockRate: (idx: number) => void;
//   proceedToNextStockRow: (idx: number) => void;
// }

// export default function SalesVoucher({
//   form,
//   handleAmountConfirm,
//   focusStockQty,
//   focusStockRate,
//   proceedToNextStockRow,
// }: Props) {
//   return (
//     <>
//       {/* Party */}
//       <div className="border-b border-gray-300 shrink-0 py-1">
//         <FieldRow
//           label="Party A/c name"
//           fieldType="party"
//           ledger={form.partyLedger}
//           balance={form.partyBalance}
//           form={form}
//         />
//       </div>

//       {/* Sales ledger */}
//       <div className="border-b border-gray-300 shrink-0 py-1">
//         <FieldRow
//           label="Sales ledger"
//           fieldType="salesPurchase"
//           ledger={form.salesPurchaseLedger}
//           balance={form.salesPurchaseBalance}
//           form={form}
//         />
//       </div>

//       {/* Separator line like Tally */}
//       <div className="border-b border-black shrink-0" />

//       {/* Stock items table header */}
//       <div className="flex border-b border-black shrink-0 px-3 py-0.5 bg-white">
//         <div className="flex-1 text-sm font-semibold text-black">Name of Item</div>
//         <div className="w-24 text-right text-sm font-semibold text-black">Quantity</div>
//         <div className="w-32 text-right text-sm font-semibold text-black">Rate per</div>
//         <div className="w-32 text-right text-sm font-semibold text-black">Amount</div>
//       </div>

//       <div className="flex-1 overflow-y-auto min-h-0">
//         {/* Stock item rows */}
//         {form.stockEntries.map((row, idx) => {
//           const isActive =
//             form.activeField?.type === "stockItem" &&
//             form.activeField.rowId === row.id;
//           return (
//             <div
//               key={row.id}
//               className="flex items-center border-b border-gray-100 min-h-[22px] group px-3 py-0"
//             >
//               <div className="flex-1 flex items-center gap-1">
//                 <input
//                   data-stock-item={idx + 1}
//                   type="text"
//                   className="flex-1 text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
//                   value={isActive ? form.stockSearchTerm : (row.stockItem?.name ?? "")}
//                   placeholder={idx === 0 ? "Select Item…" : ""}
//                   onFocus={() =>
//                     form.handleFieldFocus({ type: "stockItem", rowId: row.id })
//                   }
//                   onChange={(e) => {
//                     form.setStockSearchTerm(e.target.value);
//                     if (!row.stockItem)
//                       form.handleFieldFocus({ type: "stockItem", rowId: row.id });
//                   }}
//                   onKeyDown={(e) => {
//                     if (e.key !== "Enter" || !row.stockItem) return;
//                     e.preventDefault();
//                     focusStockQty(idx);
//                   }}
//                   autoComplete="off"
//                 />
//                 {form.stockEntries.length > 1 && (
//                   <button
//                     type="button"
//                     tabIndex={-1}
//                     onClick={() => form.handleRemoveStockRow(row.id)}
//                     className="text-xs text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 shrink-0"
//                   >
//                     &times;
//                   </button>
//                 )}
//               </div>

//               <div className="w-24 text-right pr-1">
//                 <input
//                   data-stock-qty={idx + 1}
//                   type="text"
//                   inputMode="decimal"
//                   className="w-full text-right text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
//                   value={row.quantityRaw}
//                   placeholder=""
//                   onChange={(e) =>
//                     form.handleUpdateStockRow(row.id, { quantityRaw: e.target.value })
//                   }
//                   onKeyDown={(e) => {
//                     if (e.key !== "Enter") return;
//                     e.preventDefault();
//                     focusStockRate(idx);
//                   }}
//                 />
//               </div>

//               <div className="w-32 text-right pr-1 flex items-center gap-1">
//                 <input
//                   data-stock-rate={idx + 1}
//                   type="text"
//                   inputMode="decimal"
//                   className="flex-1 text-right text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
//                   value={row.rateRaw}
//                   placeholder=""
//                   onChange={(e) =>
//                     form.handleUpdateStockRow(row.id, { rateRaw: e.target.value })
//                   }
//                   onKeyDown={(e) => {
//                     if (e.key !== "Enter") return;
//                     e.preventDefault();
//                     proceedToNextStockRow(idx);
//                   }}
//                 />
//                 <span className="text-xs text-gray-500">{row.unit?.symbol ?? ""}</span>
//               </div>

//               <div className="w-32 text-right text-sm font-semibold text-black select-none">
//                 {row.amountRaw
//                   ? Number(row.amountRaw).toLocaleString("en-IN", {
//                       minimumFractionDigits: 2,
//                       maximumFractionDigits: 2,
//                     })
//                   : ""}
//               </div>
//             </div>
//           );
//         })}

//         {/* Filler rows */}
//         {Array.from({ length: Math.max(0, 5 - form.stockEntries.length) }).map((_, i) => (
//           <div
//             key={`sf-${i}`}
//             className="flex border-b border-gray-50 min-h-[22px] px-3"
//           />
//         ))}

//         {/* Stock subtotal */}
//         {form.stockEntries.reduce((s, r) => s + (Number(r.amountRaw) || 0), 0) > 0 && (
//           <div className="flex border-t border-gray-300 border-b border-gray-300 px-3 py-0.5 bg-white">
//             <div className="flex-1 text-xs text-gray-700">Subtotal</div>
//             <div className="w-24 text-right pr-1" />
//             <div className="w-32 text-right pr-1" />
//             <div className="w-32 text-right text-sm font-semibold text-black">
//               {form.stockEntries
//                 .reduce((s, r) => s + (Number(r.amountRaw) || 0), 0)
//                 .toLocaleString("en-IN", {
//                   minimumFractionDigits: 2,
//                   maximumFractionDigits: 2,
//                 })}
//             </div>
//           </div>
//         )}

//         {/* Additional ledger rows (taxes, freight, discounts) */}
//         {form.additionalEntries.map((row, idx) => {
//           const isAddActive =
//             form.activeField?.type === "additional" &&
//             form.activeField.rowId === row.id;
//           return (
//             <div
//               key={row.id}
//               className="flex items-center border-b border-gray-100 min-h-[22px] group px-3 py-0"
//             >
//               <div className="w-10 text-center">
//                 <select
//                   className="text-xs bg-transparent outline-none font-semibold text-black"
//                   value={row.type}
//                   onChange={(e) =>
//                     form.handleUpdateAdditionalRow(row.id, {
//                       type: e.target.value as "Dr" | "Cr",
//                     })
//                   }
//                 >
//                   <option value="Dr">Dr</option>
//                   <option value="Cr">Cr</option>
//                 </select>
//               </div>

//               <div className="flex-1 flex items-center gap-1 pl-2">
//                 <input
//                   data-additional-ledger={idx + 1}
//                   type="text"
//                   className="flex-1 text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
//                   value={isAddActive ? form.ledgerSearchTerm : (row.ledger?.name ?? "")}
//                   placeholder="Tax / Ledger…"
//                   onFocus={() =>
//                     form.handleFieldFocus({ type: "additional", rowId: row.id })
//                   }
//                   onChange={(e) => {
//                     form.setLedgerSearchTerm(e.target.value);
//                     if (!row.ledger)
//                       form.handleFieldFocus({ type: "additional", rowId: row.id });
//                   }}
//                   autoComplete="off"
//                 />
//                 <button
//                   type="button"
//                   tabIndex={-1}
//                   onClick={() => form.handleRemoveAdditionalRow(row.id)}
//                   className="text-xs text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 shrink-0"
//                 >
//                   &times;
//                 </button>
//               </div>

//               <div className="w-32 text-right">
//                 <input
//                   type="text"
//                   inputMode="decimal"
//                   className="w-full text-right text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black font-semibold"
//                   value={row.amountRaw}
//                   placeholder=""
//                   onChange={(e) =>
//                     form.handleUpdateAdditionalRow(row.id, { amountRaw: e.target.value })
//                   }
//                   onKeyDown={(e) => {
//                     if (e.key !== "Enter") return;
//                     e.preventDefault();
//                     handleAmountConfirm(row, idx);
//                   }}
//                 />
//               </div>
//             </div>
//           );
//         })}

//         <div className="px-3 py-1 border-b border-gray-100">
//           <button
//             type="button"
//             onClick={form.handleAddAdditionalRow}
//             className="text-xs text-gray-500 hover:text-black border border-gray-300 px-2 py-0.5"
//           >
//             + Add Tax / Ledger Row
//           </button>
//         </div>
//       </div>

//       {/* Grand total footer */}
//       <div className="flex border-t border-black shrink-0 px-3 py-0.5 bg-white">
//         <div className="flex-1 text-sm font-semibold text-black" />
//         <div className="w-32 text-right text-sm font-semibold text-black">
//           {form.totalAmount > 0
//             ? form.totalAmount.toLocaleString("en-IN", {
//                 minimumFractionDigits: 2,
//                 maximumFractionDigits: 2,
//               })
//             : ""}
//         </div>
//       </div>
//     </>
//   );
// }

// vouchers/SalesVoucher.tsx
import { useState } from "react";
import type { useVoucherForm } from "../hooks/useVoucherForm";
import FieldRow from "../components/FieldRow";
import VatAdditionalDetailsPopup from "../components/popups/VatAdditionalDetailsPopup";

interface Props {
  form: ReturnType<typeof useVoucherForm>;
  handleAmountConfirm: (row: any, idx: number) => void;
  focusStockQty: (idx: number) => void;
  focusStockRate: (idx: number) => void;
  proceedToNextStockRow: (idx: number) => void;
  /** Hide the "Provide VAT details" toggle (irrelevant for pure goods-movement
   *  vouchers like Delivery Note). */
  hideVatDetails?: boolean;
  /** Hide the item subtotal + additional tax/ledger rows (a Delivery Note is
   *  inventory-only — additional ledger lines aren't persisted for it). */
  hideAdditionalLedgers?: boolean;
}

export default function SalesVoucher({
  form,
  handleAmountConfirm,
  focusStockQty,
  focusStockRate,
  proceedToNextStockRow,
  hideVatDetails = false,
  hideAdditionalLedgers = false,
}: Props) {
  // ASSUMED: GST Registration / Tax Unit live on selectedCompany.
  // Confirm actual field names — these are guesses based on the screenshot labels.
  const [openList, setOpenList] = useState<null | "regTax" | "priceLevel">(null);





  const priceLevelLabel = form.priceLevel || "♦ Not Applicable";

  return (
    <div>
      {/* Party / Sales ledger block, with Price Level on the right */}
      <div className="border-b border-gray-300 shrink-0 py-1 flex items-start">
        <div className="flex-1">
          <FieldRow
            label="Party A/c name"
            fieldType="party"
            ledger={form.partyLedger}
            balance={form.partyBalance}
            form={form}
          />
          <FieldRow
            label="Sales ledger"
            fieldType="salesPurchase"
            ledger={form.salesPurchaseLedger}
            balance={form.salesPurchaseBalance}
            form={form}
          />
        </div>
      
        {/* ASSUMED field — confirm form.priceLevel exists on your hook */}
       <div className="relative px-3 text-sm shrink-0">
          <span className="text-black">Price Level</span>
          <span className="text-black mx-2">:</span>
          <span
            className="text-zinc-500 cursor-pointer"
            onClick={() => setOpenList(openList === "priceLevel" ? null : "priceLevel")}
          >
            {priceLevelLabel}
          </span>

          {openList === "priceLevel" && (
            <div className="absolute top-full right-0 z-50 w-56 bg-white border border-gray-400 shadow-lg">
              <div className="bg-blue-700 text-white text-sm font-semibold px-2 py-1">
                List of Price Levels
              </div>
              <div className="max-h-60 overflow-y-auto">
                <div
                  className="px-2 py-1 text-sm hover:bg-orange-200 cursor-pointer"
                  onClick={() => { form.setPriceLevel(""); setOpenList(null); }}
                >
                  ♦ Not Applicable
                </div>
                {form.allPriceLevels.map((name: string) => (
                  <div
                    key={name}
                    className="px-2 py-1 text-sm hover:bg-orange-200 cursor-pointer"
                    onClick={() => { form.setPriceLevel(name); setOpenList(null); }}
                  >
                    {name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
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
                  {/* ASSUMED — falls back to Actual qty if your hook has no separate Billed field */}
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full text-right text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                    value={(row as any).billedQtyRaw ?? row.quantityRaw}
                    placeholder=""
                    onChange={(e) =>
                      form.handleUpdateStockRow(row.id, { billedQtyRaw: e.target.value } as any)
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

              {/* Disc % — ASSUMED field, add discPercentRaw to your hook's row type if missing */}
              <div className="w-16 text-right pr-1">
                <input
                  type="text"
                  inputMode="decimal"
                  className="w-full text-right text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                  value={(row as any).discPercentRaw ?? ""}
                  placeholder=""
                  onChange={(e) =>
                    form.handleUpdateStockRow(row.id, { discPercentRaw: e.target.value } as any)
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
            key={`sf-${i}`}
            className="flex border-b border-gray-50 min-h-[22px] px-3"
          />
        ))}

        {/* Stock subtotal */}
        {!hideAdditionalLedgers && form.stockEntries.reduce((s, r) => s + (Number(r.amountRaw) || 0), 0) > 0 && (
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

        {/* Additional ledger rows (taxes, freight, discounts) */}
        {!hideAdditionalLedgers && form.additionalEntries.map((row, idx) => {
          const isAddActive =
            form.activeField?.type === "additional" &&
            form.activeField.rowId === row.id;
          return (
            <div
              key={row.id}
              className="flex items-center border-b border-gray-100 min-h-[22px] group px-3 py-0"
            >
              <div className="w-10 text-center">
                <select
                  className="text-xs bg-transparent outline-none font-semibold text-black"
                  value={row.type}
                  onChange={(e) =>
                    form.handleUpdateAdditionalRow(row.id, {
                      type: e.target.value as "Dr" | "Cr",
                    })
                  }
                >
                  <option value="Dr">Dr</option>
                  <option value="Cr">Cr</option>
                </select>
              </div>

              <div className="flex-1 flex items-center gap-1 pl-2">
                <input
                  data-additional-ledger={idx + 1}
                  type="text"
                  className="flex-1 text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                  value={isAddActive ? form.ledgerSearchTerm : (row.ledger?.name ?? "")}
                  placeholder="Tax / Ledger…"
                  onFocus={() =>
                    form.handleFieldFocus({ type: "additional", rowId: row.id })
                  }
                  onChange={(e) => {
                    form.setLedgerSearchTerm(e.target.value);
                    if (!row.ledger)
                      form.handleFieldFocus({ type: "additional", rowId: row.id });
                  }}
                  autoComplete="off"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => form.handleRemoveAdditionalRow(row.id)}
                  className="text-xs text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 shrink-0"
                >
                  &times;
                </button>
              </div>

              <div className="w-32 text-right">
                <input
                  type="text"
                  inputMode="decimal"
                  className="w-full text-right text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black font-semibold"
                  value={row.amountRaw}
                  placeholder=""
                  onChange={(e) =>
                    form.handleUpdateAdditionalRow(row.id, { amountRaw: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    handleAmountConfirm(row, idx);
                  }}
                />
              </div>
            </div>
          );
        })}

        {!hideAdditionalLedgers && (
          <div className="px-3 py-1 border-b border-gray-100">
            <button
              type="button"
              onClick={form.handleAddAdditionalRow}
              className="text-xs text-gray-500 hover:text-black border border-gray-300 px-2 py-0.5"
            >
              + Add Tax / Ledger Row
            </button>
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

      {/* Provide GST/e-Way Bill details */}
      {!hideAdditionalLedgers && <SalesGstEwayRow form={form} />}

      {!hideVatDetails && <SalesVATDetails form={form} />}
    </div>
  );
}

function SalesGstEwayRow({ form }: { form: any }) {
  const [provide, setProvide] = useState<"Yes" | "No">("No");
  return (
    <div className="flex items-center border-t border-gray-200 shrink-0 px-3 py-1 bg-white gap-3">
      <span className="text-sm text-black">Provide GST/e-Way Bill details</span>
      <span className="text-sm text-black">:</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setProvide("Yes")}
          className={`text-sm px-2 py-0 border ${provide === "Yes" ? "bg-black text-white border-black" : "border-gray-400 text-black"}`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => setProvide("No")}
          className={`text-sm px-2 py-0 border ${provide === "No" ? "bg-black text-white border-black" : "border-gray-400 text-black"}`}
        >
          No
        </button>
      </div>
      {form.placeOfSupply !== undefined && (
        <span className="ml-6 text-sm text-black/60">
          Place of Supply : {form.placeOfSupply || "—"}
        </span>
      )}
    </div>
  );
}

// ── VAT Details (Statutory → Additional Details : Sales Taxable) ───────────────
function SalesVATDetails({ form }: { form: any }) {
  const [provideVAT, setProvideVAT] = useState<"Yes" | "No">("No");
  const [showPopup, setShowPopup] = useState(false);

  return (
    <>
      <div className="flex items-center border-t border-gray-200 shrink-0 px-3 py-1 bg-white gap-3">
        <span className="text-sm text-black">Provide VAT details</span>
        <span className="text-sm text-black">:</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setProvideVAT("Yes"); setShowPopup(true); }}
            className={`text-sm px-2 py-0 border ${provideVAT === "Yes" ? "bg-black text-white border-black" : "border-gray-400 text-black"}`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => { setProvideVAT("No"); setShowPopup(false); }}
            className={`text-sm px-2 py-0 border ${provideVAT === "No" ? "bg-black text-white border-black" : "border-gray-400 text-black"}`}
          >
            No
          </button>
        </div>
      </div>

      {showPopup && (
        <VatAdditionalDetailsPopup
          initialDetails={form.vatDetails}
          onClose={() => { setProvideVAT("No"); setShowPopup(false); }}
          onSave={(details) => {
            form.setVatDetails({ ...form.vatDetails, ...details });
            setShowPopup(false);
          }}
        />
      )}
    </>
  );
}