import { useState, useEffect } from "react";
import { VoucherPopupShell } from "@/components/tally-ui/VoucherPopupShell";

// Small Tally-style "New Number" entry popup. Opened when the user picks
// "New Number" from a Tracking No. / Order No. / Batch-Lot list — a single
// text field to type the new number, Accept/Cancel. Renders above the parent
// allocation popup.
interface Props {
  title?: string;
  label?: string;
  initial?: string;
  onConfirm: (value: string) => void;
  onClose: () => void;
}

export default function NewNumberPopup({
  title = "New Number",
  label = "Number",
  initial = "",
  onConfirm,
  onClose,
}: Props) {
  const [value, setValue] = useState(initial);

  const confirm = () => {
    const v = value.trim();
    if (v) onConfirm(v);
  };

  // Capture-phase Escape handler: closes only this popup and stops the event
  // before the parent allocation popup's own window listener sees it. This is
  // NOT a duplicate of the shell's bubble-phase handler — it shields the parent.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); }
    };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [onClose]);

  return (
    <VoucherPopupShell size="compact" title={title} onClose={onClose} onAccept={confirm}>
      <div className="flex items-center gap-2">
        <span className="text-sm text-black shrink-0">{label}</span>
        <span className="text-sm text-black shrink-0">:</span>
        <input
          autoFocus
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirm(); } }}
          className="flex-1 min-w-0 text-sm font-mono bg-white border border-gray-400 px-2 py-1 outline-none focus:border-black"
        />
      </div>
    </VoucherPopupShell>
  );
}
