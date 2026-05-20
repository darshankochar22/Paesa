import { useRef } from "react";
import type { LedgerType } from "../../../types/api";
import type { ActiveField } from "../hooks/useVoucherForm";

interface Props {
  ledger: LedgerType | null;
  balance: string;
  searchTerm: string;
  onFieldFocus: (field: ActiveField) => void;
  onSearchChange: (term: string) => void;
}

export default function AccountSection({ ledger, balance, searchTerm, onFieldFocus, onSearchChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="p-2">
      <div className="flex items-center min-h-[22px]">
        <label className="w-20 text-sm shrink-0 text-black">Account</label>
        <span className="text-sm mr-2 shrink-0 w-3 text-black">:</span>
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            className="w-full text-sm px-1 py-0.5 border outline-none bg-transparent focus:bg-gray-100 focus:border-black"
            value={ledger ? ledger.name : searchTerm}
            onFocus={() => onFieldFocus({ type: 'account' })}
            onChange={(e) => {
              onSearchChange(e.target.value);
              if (!ledger) onFieldFocus({ type: 'account' });
            }}
            placeholder="Account"
          />
        </div>
      </div>
      {balance && (
        <div className="flex items-center mt-0.5">
          <label className="w-20 text-sm shrink-0" />
          <span className="text-sm mr-2 shrink-0 w-3" />
          <span className="text-xs text-gray-500 italic">
            Current balance : {balance}
          </span>
        </div>
      )}
    </div>
  );
}
