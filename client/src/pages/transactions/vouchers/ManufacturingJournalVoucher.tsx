import type { useVoucherForm } from "../hooks/useVoucherForm";

interface Props {
  form: ReturnType<typeof useVoucherForm>;
}

export default function ManufacturingJournalVoucher({ form }: Props) {
  const focusSourceQty = (idx: number) => {
    setTimeout(() => {
      (document.querySelector(`[data-source-qty="${idx + 1}"]`) as HTMLInputElement | null)?.focus();
    }, 50);
  };

  const focusSourceRate = (idx: number) => {
    setTimeout(() => {
      (document.querySelector(`[data-source-rate="${idx + 1}"]`) as HTMLInputElement | null)?.focus();
    }, 50);
  };

  const proceedToNextSourceRow = (idx: number) => {
    if (idx === form.sourceStockEntries.length - 1) {
      form.handleAddSourceStockRow();
    }
    setTimeout(() => {
      (document.querySelector(`[data-source-item="${idx + 2}"]`) as HTMLInputElement | null)?.focus();
    }, 50);
  };

  const focusDestQty = (idx: number) => {
    setTimeout(() => {
      (document.querySelector(`[data-dest-qty="${idx + 1}"]`) as HTMLInputElement | null)?.focus();
    }, 50);
  };

  const focusDestRate = (idx: number) => {
    setTimeout(() => {
      (document.querySelector(`[data-dest-rate="${idx + 1}"]`) as HTMLInputElement | null)?.focus();
    }, 50);
  };

  const proceedToNextDestRow = (idx: number) => {
    if (idx === form.destinationStockEntries.length - 1) {
      form.handleAddDestinationStockRow();
    }
    setTimeout(() => {
      (document.querySelector(`[data-dest-item="${idx + 2}"]`) as HTMLInputElement | null)?.focus();
    }, 50);
  };

  return (
    <div className="flex flex-1 divide-x divide-zinc-300 min-h-0 bg-white select-none">
      {/* LEFT SIDE: Source (Consumption) */}
      <div className="w-1/2 flex flex-col min-h-0">
        <div className="bg-zinc-800 text-white font-semibold text-xs py-1 px-3 uppercase tracking-wider text-center shrink-0">
          Source (Consumption)
        </div>

        <div className="flex border-b border-zinc-300 shrink-0 px-3 py-0.5 bg-zinc-100 text-[10px] font-bold text-zinc-700">
          <div className="flex-1 min-w-[120px]">Name of Item</div>
          <div className="w-24">Godown</div>
          <div className="w-20 text-right">Quantity</div>
          <div className="w-20 text-right">Rate</div>
          <div className="w-24 text-right">Amount</div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-zinc-100">
          {form.sourceStockEntries.map((row, idx) => {
            const isItemActive =
              form.activeField?.type === "stockItem" &&
              form.activeField.rowId === row.id;
            const isGodownActive =
              form.activeField?.type === "stockGodown" &&
              form.activeField.rowId === row.id;

            return (
              <div
                key={row.id}
                className="flex items-center min-h-[26px] group px-3 py-1 hover:bg-zinc-50"
              >
                <div className="flex-1 min-w-[120px] flex items-center gap-1">
                  <input
                    data-source-item={idx + 1}
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
                        const nextEl = document.querySelector(`[data-source-godown="${idx + 1}"]`) as HTMLInputElement;
                        if (nextEl) nextEl.focus();
                      }
                    }}
                    autoComplete="off"
                  />
                  {form.sourceStockEntries.length > 1 && (
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => form.handleRemoveSourceStockRow(row.id)}
                      className="text-xs text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 shrink-0"
                    >
                      &times;
                    </button>
                  )}
                </div>

                <div className="w-24">
                  <input
                    data-source-godown={idx + 1}
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
                        focusSourceQty(idx);
                      }
                    }}
                    autoComplete="off"
                  />
                </div>

                <div className="w-20 text-right pr-1">
                  <input
                    data-source-qty={idx + 1}
                    type="text"
                    inputMode="decimal"
                    className="w-full text-right text-xs bg-transparent outline-none px-1 border border-transparent focus:border-zinc-800 font-mono font-semibold"
                    value={row.quantityRaw}
                    onChange={(e) =>
                      form.handleUpdateSourceStockRow(row.id, { quantityRaw: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        focusSourceRate(idx);
                      }
                    }}
                  />
                </div>

                <div className="w-20 text-right pr-1">
                  <input
                    data-source-rate={idx + 1}
                    type="text"
                    inputMode="decimal"
                    className="w-full text-right text-xs bg-transparent outline-none px-1 border border-transparent focus:border-zinc-800 font-mono"
                    value={row.rateRaw}
                    onChange={(e) =>
                      form.handleUpdateSourceStockRow(row.id, { rateRaw: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        proceedToNextSourceRow(idx);
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

          {Array.from({ length: Math.max(0, 8 - form.sourceStockEntries.length) }).map((_, i) => (
            <div key={`sf-l-${i}`} className="min-h-[26px] border-b border-zinc-50" />
          ))}
        </div>

        <div className="bg-zinc-50 border-t border-zinc-200 py-1 px-3 flex justify-between font-bold text-xs shrink-0">
          <span>Source Subtotal</span>
          <span className="font-mono">
            {form.sourceStockEntries
              .reduce((s, r) => s + (Number(r.amountRaw) || 0), 0)
              .toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
          </span>
        </div>
      </div>

      {/* RIGHT SIDE: Destination (Production) */}
      <div className="w-1/2 flex flex-col min-h-0">
        <div className="bg-zinc-800 text-white font-semibold text-xs py-1 px-3 uppercase tracking-wider text-center shrink-0">
          Destination (Production)
        </div>

        <div className="flex border-b border-zinc-300 shrink-0 px-3 py-0.5 bg-zinc-100 text-[10px] font-bold text-zinc-700">
          <div className="flex-1 min-w-[120px]">Name of Item</div>
          <div className="w-24">Godown</div>
          <div className="w-20 text-right">Quantity</div>
          <div className="w-20 text-right">Rate</div>
          <div className="w-24 text-right">Amount</div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-zinc-100">
          {form.destinationStockEntries.map((row, idx) => {
            const isItemActive =
              form.activeField?.type === "stockItem" &&
              form.activeField.rowId === row.id;
            const isGodownActive =
              form.activeField?.type === "stockGodown" &&
              form.activeField.rowId === row.id;

            return (
              <div
                key={row.id}
                className="flex items-center min-h-[26px] group px-3 py-1 hover:bg-zinc-50"
              >
                <div className="flex-1 min-w-[120px] flex items-center gap-1">
                  <input
                    data-dest-item={idx + 1}
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
                        const nextEl = document.querySelector(`[data-dest-godown="${idx + 1}"]`) as HTMLInputElement;
                        if (nextEl) nextEl.focus();
                      }
                    }}
                    autoComplete="off"
                  />
                  {form.destinationStockEntries.length > 1 && (
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => form.handleRemoveDestinationStockRow(row.id)}
                      className="text-xs text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 shrink-0"
                    >
                      &times;
                    </button>
                  )}
                </div>

                <div className="w-24">
                  <input
                    data-dest-godown={idx + 1}
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
                        focusDestQty(idx);
                      }
                    }}
                    autoComplete="off"
                  />
                </div>

                <div className="w-20 text-right pr-1">
                  <input
                    data-dest-qty={idx + 1}
                    type="text"
                    inputMode="decimal"
                    className="w-full text-right text-xs bg-transparent outline-none px-1 border border-transparent focus:border-zinc-800 font-mono font-semibold"
                    value={row.quantityRaw}
                    onChange={(e) =>
                      form.handleUpdateDestinationStockRow(row.id, { quantityRaw: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        focusDestRate(idx);
                      }
                    }}
                  />
                </div>

                <div className="w-20 text-right pr-1">
                  <input
                    data-dest-rate={idx + 1}
                    type="text"
                    inputMode="decimal"
                    className="w-full text-right text-xs bg-transparent outline-none px-1 border border-transparent focus:border-zinc-800 font-mono"
                    value={row.rateRaw}
                    onChange={(e) =>
                      form.handleUpdateDestinationStockRow(row.id, { rateRaw: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        proceedToNextDestRow(idx);
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

          {Array.from({ length: Math.max(0, 8 - form.destinationStockEntries.length) }).map((_, i) => (
            <div key={`sf-r-${i}`} className="min-h-[26px] border-b border-zinc-50" />
          ))}
        </div>

        <div className="bg-zinc-50 border-t border-zinc-200 py-1 px-3 flex justify-between font-bold text-xs shrink-0">
          <span>Destination Subtotal</span>
          <span className="font-mono">
            {form.destinationStockEntries
              .reduce((s, r) => s + (Number(r.amountRaw) || 0), 0)
              .toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
          </span>
        </div>
      </div>
    </div>
  );
}
