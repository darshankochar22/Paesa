// transaction/layouts/JournalLayout.tsx
import type { ParticularRow, ActiveField } from "../hooks/useVoucherRows";

interface Props {
  journalRows: ParticularRow[];
  activeField: ActiveField | null;
  ledgerSearchTerm: string;
  onUpdateRow: (id: string, updates: Partial<Omit<ParticularRow, "id">>) => void;
  onRemoveRow: (id: string) => void;
  onRowFocus: (rowId: string) => void;
  onSearchChange: (v: string) => void;
  onAmountConfirm: (row: ParticularRow, idx: number) => void;
  debitTotal: number;
  creditTotal: number;
  balanceIndicator: React.ReactNode;
}

const FILLER_ROWS = 10;

function formatTotal(n: number): string {
  return n > 0
    ? n.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "";
}

export default function JournalLayout({
  journalRows,
  activeField,
  ledgerSearchTerm,
  onUpdateRow,
  onRemoveRow,
  onRowFocus,
  onSearchChange,
  onAmountConfirm,
  debitTotal,
  creditTotal,
  balanceIndicator,
}: Props) {
  return (
    <>
      {/* ── Table header ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-12 border-b border-black shrink-0 px-3 py-0.5 bg-white">
        <div className="col-span-1" />
        <div className="col-span-7 text-sm font-semibold text-black">
          Particulars
        </div>
        <div className="col-span-2 text-right text-sm font-semibold text-black">
          Debit
        </div>
        <div className="col-span-2 text-right text-sm font-semibold text-black">
          Credit
        </div>
      </div>

      {/* ── Rows ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {journalRows.map((row, idx) => {
          const isActive =
            activeField?.type === "particular" &&
            activeField.rowId === row.id;

          return (
            <div
              key={row.id}
              className="grid grid-cols-12 items-center border-b border-gray-100 min-h-[22px] group px-3 py-0"
            >
              {/* By / To label */}
              <div className="col-span-1 text-sm font-semibold text-black select-none">
                {row.type === "Dr" ? "By" : "To"}
              </div>

              {/* Ledger input */}
              <div className="col-span-7 flex items-center gap-1">
                <input
                  data-particular-ledger={idx + 1}
                  type="text"
                  className="flex-1 text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                  value={isActive ? ledgerSearchTerm : (row.ledger?.name ?? "")}
                  placeholder={idx === 0 ? "Select Ledger…" : ""}
                  onFocus={() => onRowFocus(row.id)}
                  onChange={(e) => {
                    onSearchChange(e.target.value);
                    if (!row.ledger) onRowFocus(row.id);
                  }}
                  autoComplete="off"
                />

                {/* Balance */}
                {row.ledgerBalance ? (
                  <span className="text-xs text-gray-500 italic shrink-0">
                    ({row.ledgerBalance})
                  </span>
                ) : null}

                {/* Bill / cost-centre indicators */}
                {(row.billReferences?.length || row.costCentres?.length) ? (
                  <span className="text-[9px] select-none flex gap-2 shrink-0">
                    {row.billReferences?.length ? (
                      <span className="text-teal-600">
                        ✓ {row.billReferences.length} bill ref
                        {row.billReferences.length > 1 ? "s" : ""}
                      </span>
                    ) : null}
                    {row.costCentres?.length ? (
                      <span className="text-blue-600">
                        ✓ {row.costCentres.length} cost centre
                        {row.costCentres.length > 1 ? "s" : ""}
                      </span>
                    ) : null}
                  </span>
                ) : null}

                {/* Remove button — keep min 2 rows */}
                {journalRows.length > 2 && (
                  <button
                    tabIndex={-1}
                    onClick={() => onRemoveRow(row.id)}
                    className="text-xs text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 shrink-0"
                  >
                    &times;
                  </button>
                )}
              </div>

              {/* Debit column — Dr rows only */}
              <div className="col-span-2 text-right pr-1">
                {row.type === "Dr" ? (
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full text-right text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                    value={row.amountRaw}
                    placeholder=""
                    onChange={(e) =>
                      onUpdateRow(row.id, { amountRaw: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      onAmountConfirm(row, idx);
                    }}
                  />
                ) : (
                  <span className="text-gray-300 text-sm select-none">—</span>
                )}
              </div>

              {/* Credit column — Cr rows only */}
              <div className="col-span-2 text-right">
                {row.type === "Cr" ? (
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full text-right text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                    value={row.amountRaw}
                    placeholder=""
                    onChange={(e) =>
                      onUpdateRow(row.id, { amountRaw: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      onAmountConfirm(row, idx);
                    }}
                  />
                ) : (
                  <span className="text-gray-300 text-sm select-none">—</span>
                )}
              </div>
            </div>
          );
        })}

        {/* Filler rows */}
        {Array.from({
          length: Math.max(0, FILLER_ROWS - journalRows.length),
        }).map((_, i) => (
          <div
            key={`ej-${i}`}
            className="grid grid-cols-12 border-b border-gray-50 min-h-[22px]"
          />
        ))}
      </div>

      {/* ── Footer — balance indicator + Dr/Cr totals ─────────────────────── */}
      <div className="grid grid-cols-12 border-t border-black shrink-0 px-3 py-0.5 bg-white">
        <div className="col-span-8 text-xs text-gray-600">
          {balanceIndicator}
        </div>
        <div className="col-span-2 text-right text-sm font-semibold text-black">
          {formatTotal(debitTotal)}
        </div>
        <div className="col-span-2 text-right text-sm font-semibold text-black">
          {formatTotal(creditTotal)}
        </div>
      </div>
    </>
  );
}
