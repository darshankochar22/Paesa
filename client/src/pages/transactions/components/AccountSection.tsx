import { useRef, useEffect } from "react";
import type { LedgerType } from "../../../types/api";
import type { ActiveField } from "../hooks/useVoucherForm";

interface Props {
  ledger: LedgerType | null;
  balance: string;
  searchTerm: string;
  onFieldFocus: (field: ActiveField) => void;
  onSearchChange: (term: string) => void;
  // When true the input is focused automatically (e.g. on voucher type change)
  autoFocus?: boolean;
}

export default function AccountSection({
  ledger,
  balance,
  searchTerm,
  onFieldFocus,
  onSearchChange,
  autoFocus = false,
}: Props) {
  // FIX — inputRef is now actually used for autoFocus management
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  return (
    <div className="px-3 py-1">
      {/* Account : [input] */}
      <div className="flex items-center min-h-[22px]">
        <span className="w-40 text-sm text-black shrink-0">Account</span>
        <span className="text-sm text-black mr-2 shrink-0">:</span>
        <input
          ref={inputRef}
          type="text"
          className="w-64 text-sm border border-gray-400 bg-yellow-50 px-1 py-0 outline-none focus:border-black"
          value={ledger ? ledger.name : searchTerm}
          onFocus={() => onFieldFocus({ type: "account" })}
          onChange={(e) => {
            onSearchChange(e.target.value);
            if (!ledger) onFieldFocus({ type: "account" });
          }}
          placeholder="Select Cash / Bank account…"
          autoComplete="off"
        />
      </div>

      {/* Current balance line */}
      <div className="flex items-center min-h-[18px]">
        <span className="w-40 text-xs text-gray-500 shrink-0 italic">
          Current balance
        </span>
        <span className="text-xs text-gray-500 mr-2 shrink-0">:</span>
        <span className="text-xs text-gray-500 italic">{balance}</span>
      </div>
    </div>
  );
}