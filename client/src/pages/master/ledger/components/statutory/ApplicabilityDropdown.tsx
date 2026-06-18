import { useEffect, useRef, useState } from "react";

/**
 * Tally-style "Applicability" row:
 *   Label   :   <clickable cell with current value, highlighted on hover>
 *
 * Clicking the row (or the value cell) opens a fixed-position popup on the
 * right side of the page with the list of options, the current one highlighted
 * in zinc (matches the Tally.ERP 9 reference). Selecting a row writes the
 * value and closes the popup; pressing Escape closes it.
 *
 * Used by the "Is service tax applicable", "Is TDS applicable",
 * "Is Excise applicable" and "Is VAT/CST applicable" rows in
 * `OtherStatutoryModal`.
 */
export const APPLICABILITY_OPTIONS = [
  "Applicable",
  "Not Applicable",
  "Undefined",
] as const;

export type ApplicabilityValue = (typeof APPLICABILITY_OPTIONS)[number];

interface ApplicabilityDropdownProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options?: readonly string[];
  /** Optional helper text rendered under the label (italic). */
  helper?: string;
  labelWidth?: string;
  /** When true, the label and value text are bolded (used inside section headings). */
  emphasized?: boolean;
}

export default function ApplicabilityDropdown({
  label,
  value,
  onChange,
  options = APPLICABILITY_OPTIONS,
  helper,
  labelWidth = "w-56",
  emphasized = false,
}: ApplicabilityDropdownProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState<string>(value);
  const valueRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHighlight(value);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        valueRef.current && !valueRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);

  return (
    <>
      <div
        className="flex items-start min-h-[26px] cursor-pointer hover:bg-zinc-50 px-1 -mx-1 rounded-sm"
        onClick={() => setOpen((o) => !o)}
      >
        <span
          className={`${labelWidth} text-[12px] shrink-0 pt-0.5 leading-tight ${
            emphasized ? "text-zinc-800 font-bold" : "text-zinc-700"
          }`}
        >
          {label}
          {helper && (
            <span className="block text-[11px] text-zinc-500 italic mt-0.5">
              {helper}
            </span>
          )}
        </span>
        <span
          className={`text-zinc-400 mr-2 shrink-0 pt-0.5 ${
            emphasized ? "font-bold" : ""
          }`}
        >
          :
        </span>
        <span
          ref={valueRef}
          className={`text-[12px] px-1.5 -mx-1 rounded-sm transition-colors select-none ${
            open
              ? "bg-zinc-200 text-zinc-900"
              : "text-zinc-800 hover:bg-zinc-100"
          } ${emphasized ? "font-bold" : "font-medium"}`}
        >
          ♦ {value}
        </span>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-[65] bg-transparent" aria-hidden />
          <div
            ref={panelRef}
            className="fixed top-1/2 right-6 -translate-y-1/2 z-[66] w-72 bg-white border border-zinc-400 shadow-2xl flex flex-col"
          >
            <div className="px-3 py-1.5 border-b border-zinc-300 bg-zinc-700 text-white text-[12px] font-bold tracking-wide">
              Applicability
            </div>
            <ul className="flex-1 overflow-y-auto max-h-80">
              {options.map((opt) => {
                const active = opt === highlight;
                return (
                  <li
                    key={opt}
                    onClick={() => {
                      onChange(opt);
                      setOpen(false);
                    }}
                    className={`px-3 py-1.5 text-[12px] cursor-pointer select-none border-b border-zinc-100 last:border-0 ${
                      active
                        ? "bg-zinc-200 text-zinc-900 font-medium"
                        : "text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    {opt}
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </>
  );
}
