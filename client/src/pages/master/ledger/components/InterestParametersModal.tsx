import { useEffect, useRef } from "react";
import { FormRow } from "@/components/ui";
import type { InterestDetails } from "../hooks/useLedgerForm";

const inputCls =
  "flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";
const selectCls =
  "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";

export const INTEREST_STYLES = [
  "30-Day Month",
  "365-Day Year",
  "Calendar Month",
  "Calendar Year",
];

export const INTEREST_BALANCES = [
  "All Balances",
  "Credit Balances Only",
  "Debit Balances Only",
];

interface InterestParametersModalProps {
  isOpen: boolean;
  onClose: () => void;
  ledgerName?: string;
  interestForm: InterestDetails;
  setInterestForm: React.Dispatch<React.SetStateAction<InterestDetails>>;
}

export default function InterestParametersModal({
  isOpen,
  onClose,
  ledgerName,
  interestForm,
  setInterestForm,
}: InterestParametersModalProps) {
  const rateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Enter" || (e.ctrlKey && (e.key === "a" || e.key === "A"))) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => rateRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const setField = <K extends keyof InterestDetails>(
    key: K,
    value: InterestDetails[K],
  ) => setInterestForm((f) => ({ ...f, [key]: value }));


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white border border-zinc-300 shadow-2xl w-[560px] flex flex-col">
        <div className="px-4 py-2 border-b border-zinc-300 text-center">
          <span className="text-[13px] font-semibold text-zinc-900">
            Interest Parameters
            {ledgerName ? (
              <span className="text-zinc-500 font-normal"> for {ledgerName}</span>
            ) : null}
          </span>
        </div>

        <div className="px-6 py-4 bg-white space-y-1.5">
          <div className="text-[12px] text-zinc-700 font-medium mb-1">
            Include transaction date for interest calculation:
          </div>
          <FormRow
            label="For amounts added"
            labelWidth="w-44"
            className="flex items-center min-h-[26px]"
          >
            <select
              className={selectCls}
              value={interestForm.interest_include_added ? "Yes" : "No"}
              onChange={(e) =>
                setField("interest_include_added", e.target.value === "Yes" ? 1 : 0)
              }
            >
              <option>No</option>
              <option>Yes</option>
            </select>
          </FormRow>
          <FormRow
            label="For amounts deducted"
            labelWidth="w-44"
            className="flex items-center min-h-[26px]"
          >
            <select
              className={selectCls}
              value={interestForm.interest_include_deducted ? "Yes" : "No"}
              onChange={(e) =>
                setField(
                  "interest_include_deducted",
                  e.target.value === "Yes" ? 1 : 0,
                )
              }
            >
              <option>No</option>
              <option>Yes</option>
            </select>
          </FormRow>

          <div className="pt-2 mt-2 border-t border-zinc-100 flex items-center min-h-[26px] gap-2">
            <span className="text-[12px] text-zinc-700 font-medium w-12 shrink-0">
              Rate :
            </span>
            <input
              ref={rateRef}
              type="number"
              step="0.01"
              min="0"
              className={`${inputCls} text-right max-w-[80px]`}
              value={interestForm.interest_rate ?? 0}
              onChange={(e) =>
                setField(
                  "interest_rate",
                  e.target.value === "" ? 0 : Number(e.target.value),
                )
              }
            />
            <span className="text-[12px] text-zinc-600">% per</span>
            <select
              className={`${selectCls} max-w-[160px]`}
              value={interestForm.interest_style || "30-Day Month"}
              onChange={(e) => setField("interest_style", e.target.value)}
            >
              {INTEREST_STYLES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span className="text-[12px] text-zinc-600">on</span>
            <select
              className={`${selectCls} max-w-[180px]`}
              value={interestForm.interest_balances || "All Balances"}
              onChange={(e) => setField("interest_balances", e.target.value)}
            >
              {INTEREST_BALANCES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>
       <div className="px-4 py-2 border-t border-zinc-300 flex justify-end gap-2 bg-zinc-50">
          <button
            onClick={onClose}
            className="text-xs px-4 py-1.5 rounded border border-zinc-300 text-zinc-600 hover:bg-zinc-100 transition-colors font-medium"
          >
            Quit (Esc)
          </button>
          <button
            onClick={onClose}
            className="text-xs px-4 py-1.5 rounded bg-zinc-900 text-white hover:bg-zinc-800 transition-colors font-medium"
          >
            Accept (Ctrl+A)
          </button>
        </div>
      </div>
    </div>
  );
}
