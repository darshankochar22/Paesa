import { useEffect, useState } from 'react';

export interface EffectiveDateOption {
  /** Description shown on the right, e.g. "Current Date of Company". */
  label: string;
  /** ISO date value (yyyy-mm-dd). Options with an empty val are hidden. */
  val: string;
}

const fmtDate = (dateStr?: string | null) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
};

/**
 * Tally "Effective Date" prompt — the Effective Date box + "List of Effective Dates"
 * side panel + nested "New Effective Date" entry. Shared by the MSME / GST / UOM-to-UQC
 * flows so the interaction is identical everywhere.
 */
export function EffectiveDatePrompt({
  open,
  label,
  presets,
  value,
  onAccept,
  onClose,
}: {
  open: boolean;
  label: string;
  presets: EffectiveDateOption[];
  value?: string;
  onAccept: (date: string) => void;
  onClose: () => void;
}) {
  const [date, setDate] = useState(value || '');
  const [showNew, setShowNew] = useState(false);
  const [newDate, setNewDate] = useState('');

  useEffect(() => {
    if (open) {
      setDate(value || '');
      setShowNew(false);
      setNewDate('');
    }
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showNew) setShowNew(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, showNew, onClose]);

  if (!open) return null;

  const options = presets.filter((o) => o.val);
  const inputCls =
    'w-36 border border-zinc-400 bg-white px-2 py-0.5 text-black text-right focus:outline-none focus:border-black';

  return (
    <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-black/20 text-xs font-sans">
      <div className="flex items-start gap-4">
        {/* Effective Date box */}
        <div className="w-[380px] bg-white border border-black shadow-xl">
          <div className="border-b border-black px-3 py-1.5 font-bold text-sm text-center">Effective Date</div>
          <div className="p-4 flex items-center justify-between gap-3">
            <label className="text-zinc-800">{label}</label>
            <input
              type="date"
              autoFocus
              value={date}
              onChange={(e) => setDate(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && date) onAccept(date); }}
              className={inputCls}
            />
          </div>
        </div>

        {/* List of Effective Dates */}
        <div className="w-[280px] bg-white border border-black shadow-xl">
          <div className="bg-zinc-800 text-white font-bold px-3 py-1.5">List of Effective Dates</div>
          <button
            type="button"
            onClick={() => { setNewDate(date || ''); setShowNew(true); }}
            className="w-full text-right px-3 py-1 italic text-zinc-600 hover:bg-zinc-100 border-b border-zinc-200"
          >
            New Effective Date
          </button>
          <div className="max-h-64 overflow-y-auto">
            {options.map((o) => (
              <button
                key={o.label}
                type="button"
                onClick={() => onAccept(o.val)}
                className="w-full flex justify-between gap-4 px-3 py-1 text-left hover:bg-zinc-100"
              >
                <span className="tabular-nums text-zinc-900">{fmtDate(o.val)}</span>
                <span className="italic text-zinc-600">{o.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* New Effective Date sub-popup */}
      {showNew && (
        <div className="absolute inset-0 z-[11010] flex items-center justify-center bg-black/20">
          <div className="w-64 bg-white border border-black shadow-xl">
            <div className="border-b border-black px-3 py-1.5 font-bold text-sm text-center">New Effective Date</div>
            <div className="p-4">
              <input
                type="date"
                autoFocus
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && newDate) onAccept(newDate); }}
                className="w-full border border-zinc-400 bg-white px-2 py-0.5 text-black focus:outline-none focus:border-black"
              />
              <div className="flex justify-end gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setShowNew(false)}
                  className="px-3 py-1 border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!newDate}
                  onClick={() => onAccept(newDate)}
                  className="px-3 py-1 bg-black text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  Accept
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
