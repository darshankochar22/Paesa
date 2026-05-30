// transaction/layouts/SingleEntryLayout.tsx
import type { LedgerType } from "../../../types/api";
import type { ParticularRow, ActiveField } from "../hooks/useVoucherRows";

interface Props {
  // account field
  accountLedger: LedgerType | null;
  accountBalance: string;
  activeField: ActiveField | null;
  ledgerSearchTerm: string;
  onAccountFocus: () => void;
  onAccountSearchChange: (v: string) => void;

  // particulars
  particulars: ParticularRow[];
  onUpdateParticular: (id: string, updates: Partial<Omit<ParticularRow, "id">>) => void;
  onRemoveParticular: (id: string) => void;
  onParticularFocus: (rowId: string) => void;
  onParticularSearchChange: (v: string) => void;
  onAmountConfirm: (row: ParticularRow, idx: number) => void;

  // totals
  particularsTotal: number;

  // balance indicator
  balanceIndicator: React.ReactNode;
}

const FILLER_ROWS = 10;

function formatTotal(n: number): string {
  return n > 0
    ? n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "";
}

export default function SingleEntryLayout({
  accountLedger,
  accountBalance,
  activeField,
  ledgerSearchTerm,
  onAccountFocus,
  onAccountSearchChange,
  particulars,
  onUpdateParticular,
  onRemoveParticular,
  onParticularFocus,
  onParticularSearchChange,
  onAmountConfirm,
  particularsTotal,
  balanceIndicator,
}: Props) {

  const isAccountActive = activeField?.type === "account";

  return (
    <>
      {/* ── Account field ────────────────────────────────────────────────── */}
      <div className="border-b border-gray-300 shrink-0 py-1">

        {/* Account : [input] */}
        <div className="flex items-center px-3 py-0 min-h-[22px]">
          <span className="w-40 text-sm text-black shrink-0">Account</span>
          <span className="text-sm text-black mr-2 shrink-0">:</span>
          <input
            type="text"
            className="w-64 text-sm border border-gray-400 bg-yellow-50 px-1 py-0 outline-none focus:border-black"
            value={isAccountActive ? ledgerSearchTerm : (accountLedger?.name ?? "")}
            onFocus={onAccountFocus}
            onChange={(e) => {
              onAccountSearchChange(e.target.value);
              if (!accountLedger) onAccountFocus();
            }}
            placeholder="Select Cash / Bank account…"
            autoComplete="off"
          />
        </div>

        {/* Current balance */}
        <div className="flex items-center px-3 py-0 min-h-[18px]">
          <span className="w-40 text-xs text-gray-500 shrink-0 italic">
            Current balance
          </span>
          <span className="text-xs text-gray-500 mr-2 shrink-0">:</span>
          <span className="text-xs text-gray-500 italic">
            {accountBalance}
          </span>
        </div>
      </div>

      {/* ── Particulars table header ──────────────────────────────────────── */}
      <div className="flex border-b border-black shrink-0 px-3 py-0.5 bg-white">
        <div className="flex-1 text-sm font-semibold text-black">Particulars</div>
        <div className="w-40 text-right text-sm font-semibold text-black">Amount</div>
      </div>

      {/* ── Particulars rows ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {particulars.map((row, idx) => {
          const isActive =
            activeField?.type === "particular" &&
            activeField.rowId === row.id;

          return (
            <div
              key={row.id}
              className="flex items-center border-b border-gray-100 min-h-[22px] group"
            >
              {/* Ledger input */}
              <div className="flex-1 flex items-center px-3 gap-1">
                <input
                  data-particular-ledger={idx + 1}
                  type="text"
                  className="flex-1 text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                  value={isActive ? ledgerSearchTerm : (row.ledger?.name ?? "")}
                  placeholder={idx === 0 ? "Select Ledger…" : ""}
                  onFocus={() => onParticularFocus(row.id)}
                  onChange={(e) => {
                    onParticularSearchChange(e.target.value);
                    if (!row.ledger) onParticularFocus(row.id);
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

                {/* Remove button */}
                {particulars.length > 1 && (
                  <button
                    tabIndex={-1}
                    onClick={() => onRemoveParticular(row.id)}
                    className="text-xs text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 shrink-0 ml-1"
                  >
                    &times;
                  </button>
                )}
              </div>

              {/* Amount input */}
              <div className="w-40 pr-3">
                <input
                  type="text"
                  inputMode="decimal"
                  className="w-full text-right text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                  value={row.amountRaw}
                  placeholder=""
                  onChange={(e) =>
                    onUpdateParticular(row.id, { amountRaw: e.target.value })
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

        {/* Filler rows */}
        {Array.from({
          length: Math.max(0, FILLER_ROWS - particulars.length),
        }).map((_, i) => (
          <div
            key={`ep-${i}`}
            className="flex border-b border-gray-50 min-h-[22px]"
          >
            <div className="flex-1 px-3" />
            <div className="w-40 pr-3" />
          </div>
        ))}
      </div>

      {/* ── Footer — balance indicator + total ───────────────────────────── */}
      <div className="flex border-t border-black shrink-0 px-3 py-0.5 bg-white">
        <div className="flex-1 text-xs text-gray-600">
          {balanceIndicator}
        </div>
        <div className="w-40 text-right text-sm font-semibold text-black">
          {formatTotal(particularsTotal)}
        </div>
      </div>
    </>
  );
}
