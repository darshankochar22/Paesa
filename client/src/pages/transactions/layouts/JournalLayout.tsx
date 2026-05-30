// transactions/layouts/JournalLayout.tsx
import React, { useEffect, useRef } from "react";
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
  onAddRow: () => void;
  debitTotal: number;
  creditTotal: number;
  balanceIndicator: React.ReactNode;
  // Narration
  narration: string;
  onNarrationChange: (v: string) => void;
}

const FILLER_ROWS = 6;

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
  onAddRow,
  debitTotal,
  creditTotal,
  balanceIndicator,
  narration,
  onNarrationChange,
}: Props) {
  // Auto-focus the first row's ledger input on mount
  const firstInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const t = setTimeout(() => firstInputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      {/* ── Table header ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-12 border-b border-black shrink-0 px-3 py-1 bg-zinc-50">
        {/* Type label col */}
        <div className="col-span-1" />
        <div className="col-span-7 text-xs font-bold text-black uppercase tracking-wider">
          Particulars
        </div>
        <div className="col-span-2 text-right text-xs font-bold text-black uppercase tracking-wider">
          Debit
        </div>
        <div className="col-span-2 text-right text-xs font-bold text-black uppercase tracking-wider">
          Credit
        </div>
      </div>

      {/* ── Entry rows ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {journalRows.map((row, idx) => {
          const isActive =
            activeField?.type === "particular" &&
            activeField.rowId === row.id;

          const isDr = row.type === "Dr";

          return (
            <div
              key={row.id}
              className="grid grid-cols-12 items-center border-b border-gray-100 min-h-[28px] group px-3 py-0"
            >
              {/* ── By / To toggle ──────────────────────────────── */}
              <div className="col-span-1 flex items-center">
                <button
                  tabIndex={-1}
                  title="Click to toggle Debit / Credit"
                  onClick={() =>
                    onUpdateRow(row.id, { type: isDr ? "Cr" : "Dr" })
                  }
                  className={`text-xs font-bold w-6 text-center rounded select-none transition-colors ${
                    isDr
                      ? "text-blue-700 hover:bg-blue-50"
                      : "text-emerald-700 hover:bg-emerald-50"
                  }`}
                >
                  {isDr ? "By" : "To"}
                </button>
              </div>

              {/* ── Ledger input ─────────────────────────────────── */}
              <div className="col-span-7 flex items-center gap-1.5 pr-1">
                <input
                  ref={idx === 0 ? firstInputRef : undefined}
                  data-particular-ledger={idx + 1}
                  type="text"
                  className="flex-1 text-sm bg-transparent outline-none px-1 py-0.5 border border-transparent focus:border-black rounded-sm transition-colors"
                  value={isActive ? ledgerSearchTerm : (row.ledger?.name ?? "")}
                  placeholder={idx === 0 ? "Select Ledger…" : ""}
                  onFocus={() => onRowFocus(row.id)}
                  onChange={(e) => {
                    onSearchChange(e.target.value);
                    if (!row.ledger) onRowFocus(row.id);
                  }}
                  autoComplete="off"
                  spellCheck={false}
                />

                {/* Running balance */}
                {row.ledgerBalance ? (
                  <span className="text-[10px] text-gray-400 italic shrink-0 font-mono">
                    ({row.ledgerBalance})
                  </span>
                ) : null}

                {/* Bill-wise / cost-centre indicators */}
                {(row.billReferences?.length || row.costCentres?.length) ? (
                  <span className="text-[9px] select-none flex gap-1.5 shrink-0">
                    {row.billReferences?.length ? (
                      <span className="text-teal-600 font-semibold">
                        ✓ {row.billReferences.length}B
                      </span>
                    ) : null}
                    {row.costCentres?.length ? (
                      <span className="text-blue-600 font-semibold">
                        ✓ {row.costCentres.length}CC
                      </span>
                    ) : null}
                  </span>
                ) : null}

                {/* Remove row — only visible on hover, keep min 2 rows */}
                {journalRows.length > 2 && (
                  <button
                    tabIndex={-1}
                    onClick={() => onRemoveRow(row.id)}
                    className="text-[10px] text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 shrink-0 leading-none transition-opacity"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* ── Debit column — Dr rows only ──────────────────── */}
              <div className="col-span-2 text-right pr-1">
                {isDr ? (
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full text-right text-sm bg-transparent outline-none px-1 py-0.5 border border-transparent focus:border-black rounded-sm font-mono transition-colors"
                    value={row.amountRaw}
                    placeholder={isActive ? "0.00" : ""}
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
                  <span className="text-gray-200 text-sm select-none">—</span>
                )}
              </div>

              {/* ── Credit column — Cr rows only ─────────────────── */}
              <div className="col-span-2 text-right">
                {!isDr ? (
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full text-right text-sm bg-transparent outline-none px-1 py-0.5 border border-transparent focus:border-black rounded-sm font-mono transition-colors"
                    value={row.amountRaw}
                    placeholder={isActive ? "0.00" : ""}
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
                  <span className="text-gray-200 text-sm select-none">—</span>
                )}
              </div>
            </div>
          );
        })}

        {/* ── Filler rows — clearly lighter than real rows ──────── */}
        {Array.from({
          length: Math.max(0, FILLER_ROWS - journalRows.length),
        }).map((_, i) => (
          <div
            key={`fj-${i}`}
            className="grid grid-cols-12 border-b border-gray-50 min-h-[28px] bg-zinc-50/30"
          />
        ))}

        {/* ── Add row button ────────────────────────────────────── */}
        <div className="px-3 py-1 border-b border-gray-100">
          <button
            tabIndex={-1}
            onClick={onAddRow}
            className="text-[11px] text-zinc-400 hover:text-zinc-700 flex items-center gap-1 transition-colors"
          >
            <span className="text-base leading-none font-light">+</span>
            <span>Add Row</span>
          </button>
        </div>

        {/* ── Narration ─────────────────────────────────────────── */}
        <div className="px-3 py-1.5 border-b border-black flex items-start gap-3 bg-white">
          <span className="text-xs font-semibold text-black shrink-0 pt-0.5 min-w-[64px]">
            Narration:
          </span>
          <textarea
            rows={2}
            value={narration}
            onChange={(e) => onNarrationChange(e.target.value)}
            placeholder="Brief description of this journal entry…"
            className="flex-1 text-xs bg-transparent outline-none border border-transparent focus:border-black rounded-sm resize-none font-mono text-black placeholder:text-gray-300 leading-relaxed transition-colors"
            spellCheck={false}
          />
        </div>
      </div>

      {/* ── Footer — totals + balance status ──────────────────────── */}
      <div className="grid grid-cols-12 border-t border-black shrink-0 px-3 py-1 bg-white items-center">
        {/* Balance indicator — left side */}
        <div className="col-span-8 text-xs flex items-center gap-2">
          {debitTotal > 0 && (
            <span className="text-zinc-500 font-mono text-[10px]">
              Dr: {formatTotal(debitTotal)} &nbsp;|&nbsp; Cr: {formatTotal(creditTotal)}
            </span>
          )}
          {balanceIndicator && (
            <span className="ml-1">{balanceIndicator}</span>
          )}
        </div>
        {/* Dr total */}
        <div className="col-span-2 text-right text-sm font-bold text-black font-mono">
          {formatTotal(debitTotal)}
        </div>
        {/* Cr total */}
        <div className="col-span-2 text-right text-sm font-bold text-black font-mono">
          {formatTotal(creditTotal)}
        </div>
      </div>
    </>
  );
}
