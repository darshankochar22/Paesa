import type { ParticularRow, ActiveField } from "../hooks/useVoucherForm";

interface Props {
  rows: ParticularRow[];
  onUpdateRow: (id: string, updates: Partial<Omit<ParticularRow, 'id'>>) => void;
  onAddRow: () => void;
  onFieldFocus: (field: ActiveField) => void;
  onSearchChange: (term: string) => void;
  activeRowId: string | null;
}

export default function ParticularsTable({ rows, onUpdateRow, onAddRow, onFieldFocus, onSearchChange, activeRowId }: Props) {
  const handleAmountChange = (rowId: string, value: string) => {
    onUpdateRow(rowId, { amountRaw: value });
  };

  const handleAmountKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === "Enter" || e.key === "Tab") {
      const row = rows[idx];
      if (row?.ledger && Number(row.amountRaw) > 0 && idx === rows.length - 1) {
        onAddRow();
        setTimeout(() => {
          const nextInput = document.querySelector(`[data-particular-ledger="${rows.length + 1}"]`);
          (nextInput as HTMLInputElement)?.focus();
        }, 50);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center border-b border-black px-3 py-1 text-sm font-semibold text-black">
        <span className="flex-1">Particulars</span>
        <span className="w-40 text-right">Amount</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {rows.map((row, idx) => (
          <div key={row.id} className="flex items-stretch min-h-[26px] border-b border-gray-100">
            <div className="flex-1 flex flex-col justify-center">
              <div className="flex items-center min-h-[22px]">
                <input
                  data-particular-ledger={idx + 1}
                  type="text"
                  className="flex-1 text-sm px-1 py-0.5 border outline-none bg-transparent focus:bg-gray-100 focus:border-black"
                  value={row.ledger ? row.ledger.name : (activeRowId === row.id ? "" : "")}
                  placeholder={idx === 0 ? "Paticular" : ""}
                  onFocus={() => onFieldFocus({ type: 'particular', rowId: row.id })}
                  onChange={(e) => {
                    onSearchChange(e.target.value);
                    if (!row.ledger) onFieldFocus({ type: 'particular', rowId: row.id });
                  }}
                />
              </div>
              {row.ledgerBalance && (
                <span className="text-xs text-gray-500 italic pl-2">
                  Cur Bal: {row.ledgerBalance}
                </span>
              )}
            </div>
            <div className="w-40 flex items-center border-l border-gray-100">
              <input
                type="text"
                className="w-full text-sm text-right px-2 py-0.5 bg-transparent border border-transparent outline-none focus:bg-gray-100 focus:border-black"
                value={row.amountRaw}
                placeholder="0.00"
                onChange={(e) => handleAmountChange(row.id, e.target.value)}
                onKeyDown={(e) => handleAmountKeyDown(e, idx)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
