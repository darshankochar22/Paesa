import * as React from 'react';
import { useEscape } from '@/hooks/useEscape';

export interface ScaleFactor {
  label: string;
  divisor: number;
  suffix: string; // appended after scaled values, e.g. " Cr"
}

export const SCALE_FACTORS: ScaleFactor[] = [
  { label: 'Default', divisor: 1, suffix: '' },
  { label: 'Hundreds', divisor: 100, suffix: ' (00s)' },
  { label: 'Thousands', divisor: 1_000, suffix: ' (000s)' },
  { label: 'Ten Thousands', divisor: 10_000, suffix: ' (0000s)' },
  { label: 'Lakhs', divisor: 100_000, suffix: ' L' },
  { label: 'Ten Lakhs', divisor: 1_000_000, suffix: ' (10L)' },
  { label: 'Millions', divisor: 1_000_000, suffix: ' Mn' },
  { label: 'Ten Millions', divisor: 10_000_000, suffix: ' (10Mn)' },
  { label: 'Crores', divisor: 10_000_000, suffix: ' Cr' },
];

interface Props {
  current: ScaleFactor;
  onSelect: (sf: ScaleFactor) => void;
  onClose: () => void;
}

/**
 * TallyPrime "Basis of Values" → Scale Factor picker. Small centered overlay.
 * Selecting a factor divides every VALUE column by its divisor and appends the
 * suffix. Quantities are not scaled. Strict gray theme.
 */
export default function ScaleFactorPopup({ current, onSelect, onClose }: Props) {
  const initial = Math.max(
    0,
    SCALE_FACTORS.findIndex((s) => s.label === current.label),
  );
  const [idx, setIdx] = React.useState(initial);

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setIdx((p) => Math.min(SCALE_FACTORS.length - 1, p + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setIdx((p) => Math.max(0, p - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onSelect(SCALE_FACTORS[idx]);
      }
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [idx, onSelect]);

  useEscape(onClose);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/20"
      onClick={onClose}
    >
      <div
        className="mt-24 w-64 bg-white border border-zinc-900 shadow-lg flex flex-col select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-1.5 bg-white border-b-2 border-zinc-900">
          <span className="font-bold text-xs tracking-wide">Basis of Values — Scale Factor</span>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {SCALE_FACTORS.map((s, i) => (
            <button
              key={s.label}
              onClick={() => onSelect(s)}
              onMouseEnter={() => setIdx(i)}
              className={`w-full text-left px-4 py-1 text-[11px] flex items-center justify-between ${
                i === idx ? 'bg-zinc-200 text-zinc-950 font-bold' : 'hover:bg-zinc-50 text-zinc-800'
              }`}
            >
              <span>{s.label}</span>
              {s.label === current.label && (
                <span className="text-[9px] text-zinc-500">(current)</span>
              )}
            </button>
          ))}
        </div>
        <div className="px-3 py-1 border-t border-zinc-200 flex justify-end gap-3 text-[10px] font-semibold text-zinc-600">
          <button onClick={onClose} className="hover:text-zinc-900">
            Esc: Quit
          </button>
          <span className="text-zinc-400">Enter: Accept</span>
        </div>
      </div>
    </div>
  );
}
