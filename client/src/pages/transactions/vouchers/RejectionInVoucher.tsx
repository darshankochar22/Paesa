import type { useVoucherForm } from "../hooks/useVoucherForm";

interface Props {
  form: ReturnType<typeof useVoucherForm>;
  handleAmountConfirm: (row: any, idx: number) => void;
  focusStockQty: (idx: number) => void;
  focusStockRate: (idx: number) => void;
  proceedToNextStockRow: (idx: number) => void;
  /** Right-hand column label — "Customer's Name and Address" (Rejection In,
   *  customer returns goods) or "Supplier's Name and Address" (Rejection Out). */
  partyAddressLabel?: string;
}

<<<<<<< Updated upstream
export default function RejectionInVoucher({ handleAmountConfirm: _ignored, ...props }: Props) {
  // Non-accounting inventory voucher — no Sales Ledger row (Tally posts nothing here).
  return <StockTransferVoucherBody {...props} />;
=======
/**
 * TallyPrime "Rejections In" inventory voucher body. Two-column header —
 * Ledger Account (party picker) + Customer's Name and Address — over the
 * Name-of-Item grid (Actual/Billed/Rate/Disc%/Amount). Quantity & rate are
 * entered in the shared Stock Item Allocations popup (opened on item select,
 * reused from Purchase) and written back to each line.
 */
export default function RejectionInVoucher({
  form,
  focusStockQty,
  focusStockRate,
  proceedToNextStockRow,
  partyAddressLabel = "Customer's Name and Address",
}: Props) {
  const isPartyActive = form.activeField?.type === "party";

  return (
    <div className="flex flex-col min-h-0 flex-1">
      {/* ── Ledger Account | Customer's Name and Address ── */}
      <div className="flex border-b border-black shrink-0">
        {/* Ledger Account */}
        <div className="flex-1 border-r border-gray-300">
          <div className="text-center text-sm font-semibold py-0.5 border-b border-gray-300">Ledger Account</div>
          <div className="px-3 py-1 min-h-[56px]">
            <input
              type="text"
              data-field-type="party"
              className="w-full text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black font-semibold"
              placeholder="Select Ledger…"
              value={isPartyActive ? form.ledgerSearchTerm : (form.partyLedger?.name ?? "")}
              onFocus={() => form.handleFieldFocus({ type: "party" })}
              onChange={(e) => {
                form.setLedgerSearchTerm(e.target.value);
                form.handleFieldFocus({ type: "party" });
              }}
              autoComplete="off"
            />
            {form.partyBalance && (
              <div className="text-xs text-gray-500 italic px-1 mt-1">Current balance : {form.partyBalance}</div>
            )}
          </div>
        </div>

        {/* Customer's / Supplier's Name and Address */}
        <div className="flex-1">
          <div className="text-center text-sm font-semibold py-0.5 border-b border-gray-300">{partyAddressLabel}</div>
          <div className="px-3 py-1 min-h-[56px]">
            {form.partyLedger && (
              <>
                <div className="text-sm font-semibold">{form.partyLedger.name}</div>
                <textarea
                  className="w-full text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black resize-none h-10 mt-0.5"
                  placeholder="Address…"
                  value={form.partyDetails?.address ?? ""}
                  onChange={(e) => form.setPartyDetails({ ...(form.partyDetails ?? {}), address: e.target.value })}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Stock items table header (Actual/Billed sub-columns) ── */}
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

      {/* ── Stock item rows ── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {form.stockEntries.map((row, idx) => {
          const isActive =
            form.activeField?.type === "stockItem" && form.activeField.rowId === row.id;
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
                  onFocus={() => form.handleFieldFocus({ type: "stockItem", rowId: row.id })}
                  onChange={(e) => {
                    form.setStockSearchTerm(e.target.value);
                    if (!row.stockItem) form.handleFieldFocus({ type: "stockItem", rowId: row.id });
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

              {/* Quantity — Actual / Billed */}
              <div className="w-44 flex">
                <div className="flex-1 text-right pr-1">
                  <input
                    data-stock-qty={idx + 1}
                    type="text"
                    inputMode="decimal"
                    className="w-full text-right text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                    value={row.quantityRaw}
                    onChange={(e) => form.handleUpdateStockRow(row.id, { quantityRaw: e.target.value })}
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
                    onChange={(e) => form.handleUpdateStockRow(row.id, { billedQtyRaw: e.target.value })}
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
                  onChange={(e) => form.handleUpdateStockRow(row.id, { rateRaw: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    proceedToNextStockRow(idx);
                  }}
                />
              </div>

              <div className="w-12 text-center text-xs text-gray-500">{row.unit?.symbol ?? ""}</div>

              <div className="w-16 text-right pr-1">
                <input
                  type="text"
                  inputMode="decimal"
                  className="w-full text-right text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                  value={row.discPercentRaw ?? ""}
                  onChange={(e) => form.handleUpdateStockRow(row.id, { discPercentRaw: e.target.value })}
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

        {Array.from({ length: Math.max(0, 6 - form.stockEntries.length) }).map((_, i) => (
          <div key={`sf-${i}`} className="flex border-b border-gray-50 min-h-[22px] px-3" />
        ))}
      </div>

      {/* ── Grand total footer ── */}
      <div className="flex border-t border-black shrink-0 px-3 py-0.5 bg-white">
        <div className="flex-1 text-sm font-semibold text-black" />
        <div className="w-44" />
        <div className="w-20" />
        <div className="w-12" />
        <div className="w-16" />
        <div className="w-32 text-right text-sm font-semibold text-black">
          {form.totalAmount > 0
            ? form.totalAmount.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : ""}
        </div>
      </div>
    </div>
  );
>>>>>>> Stashed changes
}
