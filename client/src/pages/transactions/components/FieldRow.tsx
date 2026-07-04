// components/FieldRow.tsx
import type { useVoucherForm } from "../hooks/useVoucherForm";

interface FieldRowProps {
  label: string;
  fieldType: "account" | "party" | "salesPurchase";
  ledger: any;
  balance: string;
  form: ReturnType<typeof useVoucherForm>;
  onEnterCommit?: () => void;
  /** Bug 9: suppress the "Current balance" line (kept out of the Sales/Purchase invoice body). */
  hideBalance?: boolean;
}

export default function FieldRow({ label, fieldType, ledger, balance, form, onEnterCommit, hideBalance = false }: FieldRowProps) {
  const isActive = form.activeField?.type === fieldType;
  const st = isActive ? form.ledgerSearchTerm : "";

  return (
    <>
      <div className="flex items-center px-3 py-0 min-h-[22px]">
        <span className="w-40 text-sm text-black shrink-0">{label}</span>
        <span className="text-sm text-black mr-2 shrink-0">:</span>
        <input
          type="text"
          data-field-type={fieldType}
          className="w-64 text-sm border border-gray-400 px-1 py-0 outline-none focus:border-black"
          value={isActive ? st : (ledger?.name ?? "")}
          onFocus={() => form.handleFieldFocus({ type: fieldType })}
          onChange={(e) => {
            form.setLedgerSearchTerm(e.target.value);
            form.handleFieldFocus({ type: fieldType });
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || isActive) return;
            e.preventDefault();
            onEnterCommit?.();
          }}
          autoComplete="off"
        />
      </div>
      {!hideBalance && (
        <div className="flex items-center px-3 py-0 min-h-[18px]">
          <span className="w-40 text-xs text-gray-500 shrink-0 italic">Current balance</span>
          <span className="text-xs text-gray-500 mr-2 shrink-0">:</span>
          <span className="text-xs text-gray-500 italic">{balance || ""}</span>
        </div>
      )}
    </>
  );
}
