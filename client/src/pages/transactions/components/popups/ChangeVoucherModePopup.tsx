import { useEffect, useState } from 'react';
import { useEscape } from '@/hooks/useEscape';

/**
 * TallyPrime "Change Voucher Mode" popup (Ctrl+H) — small panel at the TOP CENTER
 * of the screen (not a centered modal): current mode shown in the field at the
 * top, then a "List of Modes/Usages" section listing every mode available for
 * the active voucher type. ↑↓ move, Enter selects, Esc closes.
 */
interface Props {
  modes: string[];
  currentMode: string;
  onSelect: (mode: string) => void;
  onClose: () => void;
}

export default function ChangeVoucherModePopup({ modes, currentMode, onSelect, onClose }: Props) {
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, modes.indexOf(currentMode)));

  useEscape(onClose);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % modes.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + modes.length) % modes.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        const mode = modes[activeIndex];
        if (mode) {
          onSelect(mode);
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [modes, activeIndex, onSelect, onClose]);

  return (
    <div
      data-voucher-popup
      className="fixed inset-0 z-50 flex items-start justify-center select-none"
      onMouseDown={onClose}
    >
      <div
        className="mt-24 w-64 bg-white border border-black shadow-2xl flex flex-col"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-3 py-1.5 border-b border-gray-300 bg-white">
          <span className="block text-sm font-semibold text-black text-center">
            Change Voucher Mode
          </span>
        </div>

        {/* Current mode — the "field" row at the top */}
        <div className="px-3 py-1 border-b border-gray-300">
          <div className="px-2 py-0.5 text-sm font-bold text-black bg-gray-200 border border-gray-400">
            {currentMode}
          </div>
        </div>

        {/* Section bar */}
        <div className="px-3 py-0.5 bg-black">
          <span className="text-xs font-semibold text-white">List of Modes/Usages</span>
        </div>

        {/* Modes list */}
        <div className="py-1">
          {modes.map((mode, idx) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                onSelect(mode);
                onClose();
              }}
              onMouseEnter={() => setActiveIndex(idx)}
              className={`w-full text-left px-3 py-1 text-sm ${
                mode === currentMode ? 'font-bold text-black' : 'text-black'
              } ${
                idx === activeIndex
                  ? 'bg-gray-200 outline outline-1 -outline-offset-1 outline-black'
                  : 'hover:bg-gray-50'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
