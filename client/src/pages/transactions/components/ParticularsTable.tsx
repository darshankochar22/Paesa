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
  onAmountConfirm?: (row: ParticularRow, index: number) => void;
  voucherType?: string;
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
  isJournal = false,
  onAmountConfirm,
  voucherType
}: Props) {

  const handleAmountChange = (rowId: string, value: string, type: 'Dr' | 'Cr') => {
    const newValue = value;
    onUpdateRow(rowId, { amountRaw: newValue, type });
  };

  const handleAmountKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === "Enter" || e.key === "Tab") {
      const row = rows[idx];
      if (row?.ledger) {
        if (onAmountConfirm) {
          e.preventDefault();
          onAmountConfirm(row, idx);
        } else if (Number(row.amountRaw) > 0 && idx === rows.length - 1) {
          e.preventDefault();
          onAddRow();
          setTimeout(() => {
            const nextInput = document.querySelector(`[data-particular-ledger="${rows.length + 1}"]`);
            (nextInput as HTMLInputElement)?.focus();
          }, 50);
        }
      }
    }
  };

  const formatAmount = (amount: string) => {
    if (!amount) return "";
    const num = parseFloat(amount);
    if (isNaN(num)) return amount;
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const isSingleEntry = ["Receipt", "Payment", "Contra"].includes(voucherType || "");

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white text-xs">
      {/* Table Header */}
      <div className="grid grid-cols-12 border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-600 font-bold uppercase tracking-wider select-none text-[10px]">
        <div className={isSingleEntry ? "col-span-1" : "col-span-1"}></div>
        <div className={isSingleEntry ? "col-span-7" : "col-span-7"}>Particulars</div>
        <div className="col-span-2 text-right">Debit</div>
        <div className="col-span-2 text-right">Credit</div>
      </div>

      {/* Row Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 min-h-0">
        {rows.map((row, idx) => {
          const isActive = activeRowId === row.id;
          return (
            <div
              key={row.id}
              className="grid grid-cols-12 items-center px-3 py-1.5 hover:bg-zinc-50/50 group transition-colors min-h-[42px]"
            >
              {/* 1. Dr/Cr dropdown - Inline before ledger name */}
              <div className={isSingleEntry ? "col-span-1" : "col-span-1"}>
                {isSingleEntry ? (
                  <div className="flex items-center gap-1">
                    <select
                      className="w-auto min-w-[48px] bg-zinc-100 hover:bg-zinc-200 focus:bg-white border border-zinc-300 rounded outline-none text-xs font-bold text-zinc-900 cursor-pointer py-1 px-2 transition-colors text-center"
                      value={row.type}
                      onChange={(e) => onUpdateRow(row.id, { type: e.target.value as 'Dr' | 'Cr' })}
                    >
                      <option value="Dr">Dr</option>
                      <option value="Cr">Cr</option>
                    </select>
                  </div>
                ) : (
                  <div className="text-center font-bold">
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
              </div>

              {/* 2. Particular (Ledger Selection) */}
              <div className={isSingleEntry ? "col-span-7 relative flex items-center gap-1" : "col-span-7 relative flex items-center gap-1"}>
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <input
                    data-particular-ledger={idx + 1}
                    type="text"
                    className="w-full bg-transparent border-b border-transparent outline-none focus:border-zinc-800 text-zinc-900 placeholder-zinc-400 py-0.5 font-semibold"
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
                {rows.length > 1 && (
                  <button
                    onClick={() => onRemoveRow(row.id)}
                    className="text-[10px] text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1 font-sans font-bold"
                  >
                    &times;
                  </button>
                )}
              </div>

              {/* 3. Debit Amount Input */}
              <div className="col-span-2 px-1">
                <input
                  data-particular-debit={idx + 1}
                  type="text"
                  className="w-full bg-transparent border-b border-transparent hover:border-zinc-200 focus:border-zinc-800 outline-none text-right px-1 py-0.5 text-zinc-900 font-bold"
                  value={row.type === 'Dr' ? row.amountRaw : ''}
                  placeholder="0.00"
                  onChange={(e) => handleAmountChange(row.id, e.target.value, 'Dr')}
                  onKeyDown={(e) => handleAmountKeyDown(e, idx)}
                />
              </div>

              {/* 4. Credit Amount Input */}
              <div className="col-span-2 px-1">
                <input
                  data-particular-credit={idx + 1}
                  type="text"
                  className="w-full bg-transparent border-b border-transparent hover:border-zinc-200 focus:border-zinc-800 outline-none text-right px-1 py-0.5 text-zinc-900 font-bold"
                  value={row.type === 'Cr' ? row.amountRaw : ''}
                  placeholder="0.00"
                  onChange={(e) => handleAmountChange(row.id, e.target.value, 'Cr')}
                  onKeyDown={(e) => handleAmountKeyDown(e, idx)}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Totals Row */}
      <div className="border-t-2 border-zinc-300 bg-zinc-50 px-3 py-2">
        <div className="grid grid-cols-12 items-center">
          <div className={isSingleEntry ? "col-span-8" : "col-span-8"}></div>
          <div className="col-span-2 text-right font-bold text-zinc-900">
            {formatAmount(String(rows.filter(r => r.type === 'Dr').reduce((sum, r) => sum + (Number(r.amountRaw) || 0), 0)))}
          </div>
          <div className="col-span-2 text-right font-bold text-zinc-900">
            {formatAmount(String(rows.filter(r => r.type === 'Cr').reduce((sum, r) => sum + (Number(r.amountRaw) || 0), 0)))}
          </div>
        </div>
      </div>
    </div>
  );
}
