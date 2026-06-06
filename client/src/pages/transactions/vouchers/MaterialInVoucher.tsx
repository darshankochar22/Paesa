import type { useVoucherForm } from "../hooks/useVoucherForm";

interface Props {
  form: ReturnType<typeof useVoucherForm>;
  focusStockQty: (idx: number) => void;
  focusStockRate: (idx: number) => void;
  proceedToNextStockRow: (idx: number) => void;
}

export default function MaterialInVoucher({
  form,
  focusStockQty,
  focusStockRate,
  proceedToNextStockRow,
}: Props) {
  return (
    <>
      {/* Party A/c Name */}
      <div className="flex items-center border-b border-zinc-200 px-3 py-1 bg-white shrink-0">
        <span className="text-xs text-zinc-600 w-24 shrink-0">Party A/c Name</span>
        <span className="text-xs text-zinc-400 mr-2">:</span>
        <input
          type="text"
          className="flex-1 text-xs bg-transparent outline-none px-1 border border-transparent focus:border-zinc-800 font-mono font-semibold"
          value={form.partyLedger?.name ?? ""}
          placeholder="Select Party…"
          onFocus={() => form.handleFieldFocus({ type: "party" })}
          onChange={(_e) => {
            if (!form.partyLedger) form.handleFieldFocus({ type: "party" });
          }}
          autoComplete="off"
        />
        {form.partyBalance && (
          <span className="text-xs text-zinc-500 ml-2 shrink-0 tabular-nums">{form.partyBalance}</span>
        )}
      </div>

      {/* Stock Items Table Header */}
      <div className="flex border-b border-black shrink-0 px-3 py-0.5 bg-zinc-100 text-xs font-bold text-zinc-800">
        <div className="flex-1 min-w-[200px]">Name of Item</div>
        <div className="w-24">Godown</div>
        <div className="w-20 text-right">Quantity</div>
        <div className="w-20 text-right">Rate</div>
        <div className="w-24 text-right">Amount</div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 bg-white">
        {form.stockEntries.map((row, idx) => {
          const isItemActive =
            form.activeField?.type === "stockItem" &&
            form.activeField.rowId === row.id;
          const isGodownActive =
            form.activeField?.type === "stockGodown" &&
            form.activeField.rowId === row.id;

          return (
            <div
              key={row.id}
              className="flex items-center border-b border-zinc-100 min-h-[26px] group px-3 py-1 hover:bg-zinc-50"
            >
              <div className="flex-1 min-w-[200px] flex items-center gap-1">
                <input
                  data-stock-item={idx + 1}
                  type="text"
                  className="flex-1 text-xs bg-transparent outline-none px-1 border border-transparent focus:border-zinc-800 font-mono"
                  value={isItemActive ? form.stockSearchTerm : (row.stockItem?.name ?? "")}
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
                    if (e.key === "Enter" && row.stockItem) {
                      e.preventDefault();
                      const nextEl = document.querySelector(`[data-stock-godown="${idx + 1}"]`) as HTMLInputElement;
                      if (nextEl) nextEl.focus();
                    }
                  }}
                  autoComplete="off"
                />
                {form.stockEntries.length > 1 && (
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => form.handleRemoveStockRow(row.id)}
                    className="text-xs text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 shrink-0"
                  >
                    &times;
                  </button>
                )}
              </div>

              <div className="w-24">
                <input
                  data-stock-godown={idx + 1}
                  type="text"
                  className="w-full text-xs bg-transparent outline-none px-1 border border-transparent focus:border-zinc-800 font-mono"
                  value={isGodownActive ? form.ledgerSearchTerm : (row.godown?.name ?? "")}
                  placeholder="Godown…"
                  onFocus={() =>
                    form.handleFieldFocus({ type: "stockGodown", rowId: row.id })
                  }
                  onChange={(e) => {
                    form.setLedgerSearchTerm(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      focusStockQty(idx);
                    }
                  }}
                  autoComplete="off"
                />
              </div>

              <div className="w-20 text-right pr-1">
                <input
                  data-stock-qty={idx + 1}
                  type="text"
                  inputMode="decimal"
                  className="w-full text-right text-xs bg-transparent outline-none px-1 border border-transparent focus:border-zinc-800 font-mono font-semibold"
                  value={row.quantityRaw}
                  onChange={(e) =>
                    form.handleUpdateStockRow(row.id, { quantityRaw: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      focusStockRate(idx);
                    }
                  }}
                />
              </div>

              <div className="w-20 text-right pr-1">
                <input
                  data-stock-rate={idx + 1}
                  type="text"
                  inputMode="decimal"
                  className="w-full text-right text-xs bg-transparent outline-none px-1 border border-transparent focus:border-zinc-800 font-mono"
                  value={row.rateRaw}
                  onChange={(e) =>
                    form.handleUpdateStockRow(row.id, { rateRaw: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      proceedToNextStockRow(idx);
                    }
                  }}
                />
              </div>

              <div className="w-24 text-right text-xs font-semibold font-mono text-zinc-900 select-none">
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

        {Array.from({ length: Math.max(0, 8 - form.stockEntries.length) }).map((_, i) => (
          <div
            key={`sf-${i}`}
            className="flex border-b border-zinc-50 min-h-[26px] px-3"
          />
        ))}
      </div>

      <div className="flex border-t border-zinc-300 shrink-0 px-3 py-1 bg-zinc-50 border-b border-zinc-200">
        <div className="flex-1 text-xs font-bold text-zinc-700">Total</div>
        <div className="w-24 text-right text-xs font-bold font-mono text-zinc-900 pr-0">
          {form.totalAmount > 0
            ? form.totalAmount.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : "0.00"}
        </div>
      </div>
    </>
  );
}
