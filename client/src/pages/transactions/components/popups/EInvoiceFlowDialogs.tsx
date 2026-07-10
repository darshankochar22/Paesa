import { useEffect } from 'react';

// Tally's post-save "Do you want to generate e-Invoice?" Yes/No prompt.
export function EInvoiceGeneratePrompt({
  onYes,
  onNo,
  busy,
}: {
  onYes: () => void;
  onNo: () => void;
  busy?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40">
      <div className="min-w-[420px] bg-white border border-gray-400 shadow-2xl px-8 py-10 text-center">
        <div className="mb-8 text-base text-black">Do you want to generate e-Invoice?</div>
        <div className="flex items-center justify-center gap-6 text-sm font-semibold">
          <button
            disabled={busy}
            onClick={onYes}
            className="px-6 py-1 bg-black text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Yes
          </button>
          <span className="text-black">or</span>
          <button
            disabled={busy}
            onClick={onNo}
            className="px-6 py-1 bg-white text-black border border-black hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            No
          </button>
        </div>
        {busy && <div className="mt-6 text-xs italic text-gray-500">Generating e-Invoice…</div>}
      </div>
    </div>
  );
}

// Tally's "Information" popup after a successful generate — any key or click continues.
export function EInvoiceInfoPopup({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const h = () => onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="min-w-[380px] bg-white border border-gray-400 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center text-sm font-semibold text-black px-4 py-2 border-b border-gray-300">
          Information
        </div>
        <div className="px-8 py-8 text-center">
          <div className="text-sm font-semibold text-black">{message}</div>
          <div className="mt-3 text-sm text-black">The details are updated in the transaction</div>
          <div className="pt-6 text-xs italic text-gray-500">Press any key to continue</div>
        </div>
      </div>
    </div>
  );
}
