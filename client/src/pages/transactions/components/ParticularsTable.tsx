import type { ParticularRow, ActiveField } from "../hooks/useVoucherForm";

interface Props {
  rows: ParticularRow[];
  onUpdateRow: (id: string, updates: Partial<Omit<ParticularRow, 'id'>>) => void;
  onAddRow: () => void;
  onRemoveRow: (id: string) => void;
  onFieldFocus: (field: ActiveField) => void;
  onSearchChange: (term: string) => void;
  searchTerm: string;
  activeRowId: string | null;
  isJournal?: boolean;
}

export default function ParticularsTable({
  rows,
  onUpdateRow,
  onAddRow,
  onRemoveRow,
  onFieldFocus,
  onSearchChange,
  searchTerm,
  activeRowId,
  isJournal = false
}: Props) {

  const handleAmountChange = (rowId: string, value: string) => {
    onUpdateRow(rowId, { amountRaw: value });
  };

  const handleAmountKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === "Enter" || e.key === "Tab") {
      const row = rows[idx];
      if (row?.ledger && Number(row.amountRaw) > 0 && idx === rows.length - 1) {
        e.preventDefault();
        onAddRow();
        setTimeout(() => {
          const nextInput = document.querySelector(`[data-particular-ledger="${rows.length + 1}"]`);
          (nextInput as HTMLInputElement)?.focus();
        }, 50);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white text-xs">
      {/* Table Header */}
      <div className="grid grid-cols-12 border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-600 font-bold uppercase tracking-wider select-none text-[10px]">
        {isJournal && <div className="col-span-1 text-center">Dr/Cr</div>}
        <div className={isJournal ? "col-span-8" : "col-span-9"}>Particulars</div>
        <div className="col-span-3 text-right">Amount</div>
      </div>

      {/* Row Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 min-h-0">
        {rows.map((row, idx) => {
          const isActive = activeRowId === row.id;
          return (
            <div
              key={row.id}
              className="grid grid-cols-12 items-center px-3 py-1.5 hover:bg-zinc-50/50 group transition-colors min-h-[38px]"
            >
              {/* 1. Dr/Cr column if Journal */}
              {isJournal && (
                <div className="col-span-1 text-center font-bold">
                  <select
                    className="bg-transparent font-bold outline-none text-zinc-900 cursor-pointer"
                    value={row.type}
                    onChange={(e) => onUpdateRow(row.id, { type: e.target.value as 'Dr' | 'Cr' })}
                  >
                    <option value="Dr">Dr</option>
                    <option value="Cr">Cr</option>
                  </select>
                </div>
              )}

              {/* 2. Particular (Ledger Selection) */}
              <div className={isJournal ? "col-span-8 relative flex items-center gap-1" : "col-span-9 relative flex items-center gap-1"}>
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <input
                    data-particular-ledger={idx + 1}
                    type="text"
                    className="w-full bg-transparent border-b border-transparent outline-none focus:border-zinc-800 text-zinc-900 placeholder-zinc-400 py-0.5"
                    value={isActive ? searchTerm : (row.ledger ? row.ledger.name : "")}
                    placeholder={idx === 0 ? "Select Particular Ledger..." : ""}
                    onFocus={() => onFieldFocus({ type: 'particular', rowId: row.id })}
                    onChange={(e) => {
                      onSearchChange(e.target.value);
                      if (!row.ledger) onFieldFocus({ type: 'particular', rowId: row.id });
                    }}
                  />
                  {row.ledgerBalance && (
                    <span className="text-[10px] text-zinc-400 font-sans italic select-none">
                      Current Bal: {row.ledgerBalance}
                    </span>
                  )}
                </div>
                {rows.length > (isJournal ? 2 : 1) && (
                  <button
                    onClick={() => onRemoveRow(row.id)}
                    className="text-[10px] text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1 font-sans font-bold"
                  >
                    &times;
                  </button>
                )}
              </div>

              {/* 3. Amount Input */}
              <div className="col-span-3 px-1">
                <input
                  type="text"
                  className="w-full bg-transparent border-b border-transparent hover:border-zinc-200 focus:border-zinc-800 outline-none text-right px-1 py-0.5 text-zinc-900 font-bold"
                  value={row.amountRaw}
                  placeholder="0.00"
                  onChange={(e) => handleAmountChange(row.id, e.target.value)}
                  onKeyDown={(e) => handleAmountKeyDown(e, idx)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
