import type { LedgerType, GodownType, UnitType } from "../../../types/api";
import type { ParticularRow, StockEntryRow, ActiveField } from "../hooks/useVoucherRows";
import { INDIAN_STATES } from "../../../constants/states";

interface Props {
  voucherType: "Sales" | "Purchase";
  supplierInvoiceNo: string;
  supplierInvoiceDate: string;
  onSupplierInvoiceNoChange: (v: string) => void;
  onSupplierInvoiceDateChange: (v: string) => void;
  partyLedger: LedgerType | null;
  partyBalance: string;
  activeField: ActiveField | null;
  ledgerSearchTerm: string;
  onPartyFocus: () => void;
  onPartySearchChange: (v: string) => void;
  salesPurchaseLedger: LedgerType | null;
  salesPurchaseBalance: string;
  onSalesPurchaseFocus: () => void;
  onSalesPurchaseSearchChange: (v: string) => void;
  referenceNumber: string;
  onReferenceNumberChange: (v: string) => void;
  placeOfSupply: string;
  onPlaceOfSupplyChange: (v: string) => void;

  // stock entries
  stockEntries: StockEntryRow[];
  stockSearchTerm: string;
  onUpdateStockRow: (id: string, updates: Partial<Omit<StockEntryRow, "id">>) => void;
  onRemoveStockRow: (id: string) => void;
  onStockItemFocus: (rowId: string) => void;
  onStockSearchChange: (v: string) => void;
  allGodowns: GodownType[];
  allUnits: UnitType[];

  // additional ledger rows
  additionalEntries: ParticularRow[];
  onUpdateAdditionalRow: (id: string, updates: Partial<Omit<ParticularRow, "id">>) => void;
  onRemoveAdditionalRow: (id: string) => void;
  onAddAdditionalRow: () => void;
  onAdditionalFocus: (rowId: string) => void;
  onAdditionalSearchChange: (v: string) => void;
  onAmountConfirm: (row: ParticularRow, idx: number) => void;

  // totals
  totalAmount: number;
}

const STOCK_FILLER_ROWS = 5;

function formatTotal(n: number): string {
  return n > 0
    ? n.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "";
}

function FieldRow({
  label,
  ledger,
  balance,
  isActive,
  searchTerm,
  onFocus,
  onSearchChange,
}: {
  label: string;
  ledger: LedgerType | null;
  balance: string;
  isActive: boolean;
  searchTerm: string;
  onFocus: () => void;
  onSearchChange: (v: string) => void;
}) {
  return (
    <div className="border-b border-gray-300 shrink-0 py-1">
      <div className="flex items-center px-3 py-0 min-h-[22px]">
        <span className="w-40 text-sm text-black shrink-0">{label}</span>
        <span className="text-sm text-black mr-2 shrink-0">:</span>
        <input
          type="text"
          className="w-64 text-sm border border-gray-400 px-1 py-0 outline-none focus:border-black"
          value={isActive ? searchTerm : (ledger?.name ?? "")}
          onFocus={onFocus}
          onChange={(e) => {
            onSearchChange(e.target.value);
            if (!ledger) onFocus();
          }}
          autoComplete="off"
        />
      </div>
      <div className="flex items-center px-3 py-0 min-h-[18px]">
        <span className="w-40 text-xs text-gray-500 shrink-0 italic">
          Current balance
        </span>
        <span className="text-xs text-gray-500 mr-2 shrink-0">:</span>
        <span className="text-xs text-gray-500 italic">{balance}</span>
      </div>
    </div>
  );
}

export default function SalesPurchaseLayout({
  voucherType,
  supplierInvoiceNo,
  supplierInvoiceDate,
  onSupplierInvoiceNoChange,
  onSupplierInvoiceDateChange,
  partyLedger,
  partyBalance,
  activeField,
  ledgerSearchTerm,
  onPartyFocus,
  onPartySearchChange,
  salesPurchaseLedger,
  salesPurchaseBalance,
  onSalesPurchaseFocus,
  onSalesPurchaseSearchChange,
  referenceNumber,
  onReferenceNumberChange,
  placeOfSupply,
  onPlaceOfSupplyChange,
  stockEntries,
  stockSearchTerm,
  onUpdateStockRow,
  onRemoveStockRow,
  onStockItemFocus,
  onStockSearchChange,
  allGodowns,
  allUnits,
  additionalEntries,
  onUpdateAdditionalRow,
  onRemoveAdditionalRow,
  onAddAdditionalRow,
  onAdditionalFocus,
  onAdditionalSearchChange,
  onAmountConfirm,
  totalAmount,
}: Props) {

  const isPartyActive        = activeField?.type === "party";
  const isSalesPurchaseActive = activeField?.type === "salesPurchase";

  const stockSubtotal = stockEntries.reduce(
    (s, r) => s + (Number(r.amountRaw) || 0),
    0
  );

  return (
    <>
      {/* ── Purchase: supplier invoice fields ────────────────────────────── */}
      {voucherType === "Purchase" && (
        <div className="flex items-center border-b border-gray-300 shrink-0 px-3 py-1 gap-6 bg-white">
          <div className="flex items-center gap-2">
            <span className="text-sm text-black shrink-0">
              Supplier Invoice No.
            </span>
            <span className="text-sm text-black shrink-0">:</span>
            <input
              type="text"
              className="text-sm border border-gray-400 px-1 py-0 outline-none focus:border-black w-36"
              value={supplierInvoiceNo}
              onChange={(e) => onSupplierInvoiceNoChange(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-black shrink-0">Date</span>
            <span className="text-sm text-black shrink-0">:</span>
            <input
              type="date"
              className="text-sm border border-gray-400 px-1 py-0 outline-none focus:border-black"
              value={supplierInvoiceDate}
              onChange={(e) => onSupplierInvoiceDateChange(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* ── Party field ───────────────────────────────────────────────────── */}
      <FieldRow
        label="Party A/c name"
        ledger={partyLedger}
        balance={partyBalance}
        isActive={isPartyActive}
        searchTerm={ledgerSearchTerm}
        onFocus={onPartyFocus}
        onSearchChange={onPartySearchChange}
      />

      {/* ── Sales / Purchase ledger field ─────────────────────────────────── */}
      <FieldRow
        label={`${voucherType} ledger`}
        ledger={salesPurchaseLedger}
        balance={salesPurchaseBalance}
        isActive={isSalesPurchaseActive}
        searchTerm={ledgerSearchTerm}
        onFocus={onSalesPurchaseFocus}
        onSearchChange={onSalesPurchaseSearchChange}
      />

      {/* ── Ref no. + place of supply ─────────────────────────────────────── */}
      <div className="flex items-center gap-6 border-b border-gray-300 shrink-0 px-3 py-1 bg-white">
        <div className="flex items-center gap-2">
          <span className="text-sm text-black shrink-0 w-28">Ref No.</span>
          <span className="text-sm text-black shrink-0">:</span>
          <input
            type="text"
            className="text-sm border border-gray-300 bg-transparent px-1 py-0 outline-none focus:border-black w-32"
            value={referenceNumber}
            onChange={(e) => onReferenceNumberChange(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-black shrink-0">Place of Supply</span>
          <span className="text-sm text-black shrink-0">:</span>
          <select
            className="text-sm border border-gray-300 bg-transparent px-1 py-0 outline-none focus:border-black"
            value={placeOfSupply}
            onChange={(e) => onPlaceOfSupplyChange(e.target.value)}
          >
            <option value="Select">Select</option>
            {INDIAN_STATES.map((s: string) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Stock items table header ──────────────────────────────────────── */}
      <div className="grid grid-cols-12 border-b border-black shrink-0 px-3 py-0.5 bg-white">
        <div className="col-span-4 text-sm font-semibold text-black">
          Name of Item
        </div>
        <div className="col-span-2 text-sm font-semibold text-black">
          Godown
        </div>
        <div className="col-span-2 text-right text-sm font-semibold text-black">
          Quantity
        </div>
        <div className="col-span-1 text-right text-sm font-semibold text-black">
          Rate
        </div>
        <div className="col-span-1 text-center text-sm font-semibold text-black">
          per
        </div>
        <div className="col-span-2 text-right text-sm font-semibold text-black">
          Amount
        </div>
      </div>

      {/* ── Scrollable body ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">

        {/* Stock item rows */}
        {stockEntries.map((row, idx) => {
          const isActive =
            activeField?.type === "stockItem" &&
            activeField.rowId === row.id;

          return (
            <div
              key={row.id}
              className="grid grid-cols-12 items-center border-b border-gray-100 min-h-[22px] group px-3 py-0"
            >
              {/* Item name */}
              <div className="col-span-4 flex items-center gap-1">
                <input
                  data-stock-item={idx + 1}
                  type="text"
                  className="flex-1 text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                  value={isActive ? stockSearchTerm : (row.stockItem?.name ?? "")}
                  placeholder={idx === 0 ? "Select Item…" : ""}
                  onFocus={() => onStockItemFocus(row.id)}
                  onChange={(e) => {
                    onStockSearchChange(e.target.value);
                    if (!row.stockItem) onStockItemFocus(row.id);
                  }}
                  autoComplete="off"
                />
                {stockEntries.length > 1 && (
                  <button
                    tabIndex={-1}
                    onClick={() => onRemoveStockRow(row.id)}
                    className="text-xs text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 shrink-0"
                  >
                    &times;
                  </button>
                )}
              </div>

              {/* Godown */}
              <div className="col-span-2 px-1">
                <select
                  className="w-full text-sm bg-transparent outline-none border-b border-transparent focus:border-black"
                  value={row.godown?.godown_id ?? ""}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    onUpdateStockRow(row.id, {
                      godown: allGodowns.find((g) => g.godown_id === id) ?? null,
                    });
                  }}
                >
                  <option value="">—</option>
                  {allGodowns.map((g) => (
                    <option key={g.godown_id} value={g.godown_id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div className="col-span-2 text-right pr-1">
                <input
                  type="text"
                  inputMode="decimal"
                  className="w-full text-right text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                  value={row.quantityRaw}
                  placeholder=""
                  onChange={(e) =>
                    onUpdateStockRow(row.id, { quantityRaw: e.target.value })
                  }
                />
              </div>

              {/* Rate */}
              <div className="col-span-1 text-right pr-1">
                <input
                  type="text"
                  inputMode="decimal"
                  className="w-full text-right text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                  value={row.rateRaw}
                  placeholder=""
                  onChange={(e) =>
                    onUpdateStockRow(row.id, { rateRaw: e.target.value })
                  }
                />
              </div>

              {/* Unit */}
              <div className="col-span-1 text-center px-1">
                <select
                  className="w-full text-sm bg-transparent outline-none"
                  value={row.unit?.unit_id ?? ""}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    onUpdateStockRow(row.id, {
                      unit: allUnits.find((u) => u.unit_id === id) ?? null,
                    });
                  }}
                >
                  <option value="">—</option>
                  {allUnits.map((u) => (
                    <option key={u.unit_id} value={u.unit_id}>
                      {u.symbol}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div className="col-span-2 text-right text-sm font-semibold text-black select-none">
                {formatTotal(Number(row.amountRaw) || 0)}
              </div>
            </div>
          );
        })}

        {/* Filler rows */}
        {Array.from({
          length: Math.max(0, STOCK_FILLER_ROWS - stockEntries.length),
        }).map((_, i) => (
          <div
            key={`sf-${i}`}
            className="grid grid-cols-12 border-b border-gray-50 min-h-[22px]"
          />
        ))}

        {/* Stock subtotal */}
        {stockSubtotal > 0 && (
          <div className="grid grid-cols-12 border-t border-gray-300 border-b border-gray-300 px-3 py-0.5 bg-white">
            <div className="col-span-10 text-xs text-gray-700">Subtotal</div>
            <div className="col-span-2 text-right text-sm font-semibold text-black">
              {formatTotal(stockSubtotal)}
            </div>
          </div>
        )}

        {/* ── Additional ledger rows (taxes, freight, discounts) ────────── */}
        {additionalEntries.map((row, idx) => {
          const isAddActive =
            activeField?.type === "additional" &&
            activeField.rowId === row.id;

          return (
            <div
              key={row.id}
              className="grid grid-cols-12 items-center border-b border-gray-100 min-h-[22px] group px-3 py-0"
            >
              {/* Ledger input */}
              <div className="col-span-5 flex items-center gap-1 pl-4">
                <input
                  data-additional-ledger={idx + 1}
                  type="text"
                  className="flex-1 text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                  value={
                    isAddActive
                      ? ledgerSearchTerm
                      : (row.ledger?.name ?? "")
                  }
                  placeholder="Tax / Ledger…"
                  onFocus={() => onAdditionalFocus(row.id)}
                  onChange={(e) => {
                    onAdditionalSearchChange(e.target.value);
                    if (!row.ledger) onAdditionalFocus(row.id);
                  }}
                  autoComplete="off"
                />
                <button
                  tabIndex={-1}
                  onClick={() => onRemoveAdditionalRow(row.id)}
                  className="text-xs text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 shrink-0"
                >
                  &times;
                </button>
              </div>

              {/* Dr/Cr selector */}
              <div className="col-span-1 text-center">
                <select
                  className="text-xs bg-transparent outline-none font-semibold text-black"
                  value={row.type}
                  onChange={(e) =>
                    onUpdateAdditionalRow(row.id, {
                      type: e.target.value as "Dr" | "Cr",
                    })
                  }
                >
                  <option value="Dr">Dr</option>
                  <option value="Cr">Cr</option>
                </select>
              </div>

              <div className="col-span-4" />


              <div className="col-span-2 text-right">
                <input
                  type="text"
                  inputMode="decimal"
                  className="w-full text-right text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black font-semibold"
                  value={row.amountRaw}
                  placeholder=""
                  onChange={(e) =>
                    onUpdateAdditionalRow(row.id, { amountRaw: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    onAmountConfirm(row, idx);
                  }}
                />
              </div>
            </div>
          );
        })}


        <div className="px-3 py-1 border-b border-gray-100">
          <button
            type="button"
            onClick={onAddAdditionalRow}
            className="text-xs text-gray-500 hover:text-black border border-gray-300 px-2 py-0.5"
          >
            + Add Tax / Ledger Row
          </button>
        </div>
      </div>


      <div className="grid grid-cols-12 border-t border-black shrink-0 px-3 py-0.5 bg-white">
        <div className="col-span-10 text-sm font-semibold text-black" />
        <div className="col-span-2 text-right text-sm font-semibold text-black">
          {formatTotal(totalAmount)}
        </div>
      </div>
    </>
  );
}