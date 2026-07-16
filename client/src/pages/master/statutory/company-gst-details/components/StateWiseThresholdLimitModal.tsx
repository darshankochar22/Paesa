// Intrastate (state-wise) e-Way Bill threshold entry — TallyPrime keyboard flow.
//
// Behaviour mirrors Tally's "Intrastate Threshold Limit for e-Way Bill" screen:
//   • A right-side "List of States" panel is shown while entering a State.
//   • The list offers "Any", then "End of List", then every state not yet added.
//   • Enter on a state adds a row (default limit 50,000) and moves to its Limit.
//   • Enter on the Limit confirms the row and returns to a fresh State entry.
//   • Selecting "End of List" (or Ctrl+A) accepts the whole list and closes.
// Add as many states as needed — the flow repeats until End of List.

import { useState, useEffect, useRef } from 'react';
import GSTDetailsListPanel from './GSTDetailsListPanel';

export interface StateThresholdLimit {
  stateName: string;
  limit: number;
}

interface StateWiseThresholdLimitModalProps {
  isOpen: boolean;
  initialLimits: StateThresholdLimit[];
  onSave: (limits: StateThresholdLimit[]) => void;
  onClose: () => void;
}

const END_OF_LIST = 'End of List';
const DEFAULT_LIMIT = 50000;

// Order matches TallyPrime's List of States (states + union territories).
const TALLY_INDIAN_STATES = [
  'Andaman & Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra & Nagar Haveli and Daman & Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu & Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttarakhand',
  'Uttar Pradesh',
  'West Bengal',
];

export default function StateWiseThresholdLimitModal({
  isOpen,
  initialLimits,
  onSave,
  onClose,
}: StateWiseThresholdLimitModalProps) {
  const [rows, setRows] = useState<StateThresholdLimit[]>([]);
  // "state" = choosing a state for the new entry row (List of States open)
  // "limit" = editing the limit of rows[activeLimitRow]
  const [phase, setPhase] = useState<'state' | 'limit'>('state');
  const [activeLimitRow, setActiveLimitRow] = useState(0);
  const [listSelectedIndex, setListSelectedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const limitRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Build the List of States: "Any" (unless taken), then End of List, then unused states.
  const usedStates = new Set(rows.map((r) => r.stateName));
  const listOptions: string[] = [
    ...(usedStates.has('Any') ? [] : ['Any']),
    END_OF_LIST,
    ...TALLY_INDIAN_STATES.filter((s) => !usedStates.has(s)),
  ];

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setRows(initialLimits && initialLimits.length > 0 ? [...initialLimits] : []);
      setPhase('state');
      setActiveLimitRow(0);
      setListSelectedIndex(0);
      setTimeout(() => containerRef.current?.focus(), 50);
    }
  }, [isOpen, initialLimits]);

  // ── Focus the limit input when editing a limit ───────────────────────────────
  useEffect(() => {
    if (phase === 'limit') {
      setTimeout(() => limitRefs.current[activeLimitRow]?.focus(), 20);
    }
  }, [phase, activeLimitRow]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleSave = () => {
    onSave(rows);
    onClose();
  };

  const addState = (stateName: string) => {
    const newIndex = rows.length;
    setRows((prev) => [...prev, { stateName, limit: DEFAULT_LIMIT }]);
    setActiveLimitRow(newIndex);
    setPhase('limit');
  };

  const selectFromList = (value: string) => {
    if (value === END_OF_LIST) {
      handleSave();
      return;
    }
    if (usedStates.has(value)) return; // guard — shouldn't be offered
    addState(value);
  };

  const confirmLimit = () => {
    // Limit is already bound via onChange; just return to state entry.
    setPhase('state');
    setListSelectedIndex(0);
    setTimeout(() => containerRef.current?.focus(), 20);
  };

  const updateLimit = (index: number, raw: string) => {
    const num = Number(raw.replace(/,/g, ''));
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], limit: isNaN(num) ? 0 : num };
      return next;
    });
  };

  // ── Keyboard ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        // Escape keeps the confirmed rows and returns (nothing to discard —
        // the new entry row isn't committed until a state is chosen).
        handleSave();
        return;
      }

      // Ctrl+A / Alt+A — accept the whole list
      if ((e.ctrlKey || e.altKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleSave();
        return;
      }

      if (phase === 'state') {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setListSelectedIndex((p) => (p + 1) % listOptions.length);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setListSelectedIndex((p) => (p - 1 + listOptions.length) % listOptions.length);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          selectFromList(listOptions[listSelectedIndex]);
        }
        return;
      }

      if (phase === 'limit') {
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          confirmLimit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, phase, listOptions, listSelectedIndex, activeLimitRow, rows]);

  if (!isOpen) return null;

  // ── Styling (matches SlabBasedRateDetails / main dialog) ─────────────────────
  const thCell = 'px-3 py-1 text-left font-bold text-[10px] text-zinc-800 border-b border-zinc-400';
  const tdBase = 'px-3 py-0.5 border-b border-zinc-200 text-[11px] font-mono';
  const highlight = 'bg-[#ffea5d]';

  const previewState = phase === 'state' ? listOptions[listSelectedIndex] : '';

  return (
    <div className="fixed inset-0 bg-black/50 z-[10500] flex items-center justify-center font-mono text-[11px] text-zinc-950">
      <div
        ref={containerRef}
        tabIndex={-1}
        className="outline-none flex gap-4 items-start animate-fade-in"
      >
        {/* ── Main table ──────────────────────────────────────────────────── */}
        <div
          className="bg-white border border-zinc-400 shadow-2xl flex flex-col"
          style={{ width: 380 }}
        >
          {/* Title */}
          <div className="text-center font-bold text-xs py-3 border-b border-zinc-200 text-zinc-900 tracking-wide">
            <span className="underline decoration-1 underline-offset-4">
              Intrastate Threshold Limit for e-Way Bill
            </span>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-y-auto px-4 py-3 min-h-[180px] max-h-[60vh]">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={`${thCell} w-2/3`}>State</th>
                  <th className={`${thCell} text-right w-1/3`}>Limit</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const isLimitActive = phase === 'limit' && activeLimitRow === i;
                  return (
                    <tr key={row.stateName}>
                      <td className={`${tdBase}`}>{row.stateName}</td>
                      <td className={`${tdBase} p-0 text-right ${isLimitActive ? highlight : ''}`}>
                        <input
                          ref={(el) => {
                            limitRefs.current[i] = el;
                          }}
                          type="text"
                          value={row.limit.toLocaleString('en-IN')}
                          onChange={(e) => updateLimit(i, e.target.value)}
                          onFocus={() => {
                            setPhase('limit');
                            setActiveLimitRow(i);
                          }}
                          className={`w-full px-3 py-0.5 outline-none bg-transparent text-right font-mono text-[11px] font-bold ${
                            isLimitActive ? 'bg-[#ffea5d]' : 'bg-transparent'
                          }`}
                        />
                      </td>
                    </tr>
                  );
                })}

                {/* New-entry row — shows the highlighted list option (♦ End of List by default) */}
                {phase === 'state' && (
                  <tr>
                    <td className={`${tdBase} font-bold ${highlight}`}>♦ {previewState}</td>
                    <td className={`${tdBase} text-right text-zinc-400`}>
                      {previewState === END_OF_LIST ? '' : DEFAULT_LIMIT.toLocaleString('en-IN')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-zinc-200 bg-zinc-50 flex justify-between items-center font-sans text-[10px] text-zinc-500 shrink-0">
            <div className="flex gap-3">
              <span>
                <span className="underline font-bold text-zinc-700">Enter</span>: add / accept
              </span>
              <span className="text-zinc-400">End of List: done</span>
            </div>
            <button
              onClick={handleSave}
              className="px-4 py-1 rounded bg-black text-white text-xs hover:bg-zinc-800 font-medium"
            >
              Accept
            </button>
          </div>
        </div>

        {/* ── Right-side List of States panel ──────────────────────────────── */}
        {phase === 'state' && (
          <GSTDetailsListPanel
            title="List of States"
            options={listOptions}
            selectedIndex={listSelectedIndex}
            onSelect={(val) => selectFromList(val)}
          />
        )}
      </div>
    </div>
  );
}
