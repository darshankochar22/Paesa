import { useState } from 'react';

// Tally-style "Voucher Printing" Print dialog. Cosmetic config (Title / Printer /
// Paper Size / Print area / Copies) then the three actions: Configure, Preview, Print.
// Printer/paper values are app-appropriate (we render to PDF), not Windows driver names.
interface Props {
  title?: string;
  onConfigure?: () => void;
  onPreview: () => void;
  onPrint: (copies: number) => void;
  onClose: () => void;
}

export default function VoucherPrintPopup({
  title = 'Tax Invoice',
  onConfigure,
  onPreview,
  onPrint,
  onClose,
}: Props) {
  const [copies, setCopies] = useState(1);

  const rowLabel = 'w-40 text-sm text-black shrink-0';
  const rowValue = 'text-sm font-semibold text-black';

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="min-w-[560px] max-w-[680px] bg-white border border-gray-400 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-4 pb-2 border-b border-gray-300">
          <span className="text-base font-semibold text-black">Print</span>
        </div>

        <div className="px-6 py-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className={rowLabel}>Title</span>
            <span className="text-sm text-black shrink-0">:</span>
            <span className={rowValue}>{title}</span>
          </div>
          <div className="pt-2 space-y-2">
            <div className="flex items-center gap-2">
              <span className={rowLabel}>Printer</span>
              <span className="text-sm text-black shrink-0">:</span>
              <span className="text-sm text-black">Save as PDF</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={rowLabel}>Paper Size</span>
              <span className="text-sm text-black shrink-0">:</span>
              <span className="text-sm text-black">A4 (210 mm x 297 mm)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`${rowLabel} pl-4`}>Print area</span>
              <span className="text-sm text-black shrink-0">:</span>
              <span className="text-sm text-black">A4 (210 mm x 297 mm)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={rowLabel}>Number of Copies</span>
              <span className="text-sm text-black shrink-0">:</span>
              <input
                type="number"
                min={1}
                value={copies}
                onChange={(e) => setCopies(Math.max(1, Number(e.target.value) || 1))}
                className="w-16 text-sm text-black bg-white border border-gray-400 px-2 py-0.5 outline-none focus:border-black"
              />
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 pt-4">
            <button
              onClick={onConfigure}
              className="px-6 py-1.5 text-sm text-black border border-gray-400 hover:bg-gray-100 disabled:opacity-40"
              disabled={!onConfigure}
            >
              <span className="underline">C</span>: Configure
            </button>
            <button
              onClick={onPreview}
              className="px-6 py-1.5 text-sm text-black border border-gray-400 hover:bg-gray-100"
            >
              <span className="underline">I</span>: Preview
            </button>
            <button
              onClick={() => onPrint(copies)}
              className="px-6 py-1.5 text-sm font-semibold bg-black text-white hover:bg-gray-800"
            >
              <span className="underline">P</span>: Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
