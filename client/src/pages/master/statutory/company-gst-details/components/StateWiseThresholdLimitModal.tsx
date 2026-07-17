// Intrastate (state-wise) e-Way Bill threshold entry — TallyPrime keyboard flow.
//
// Behaviour mirrors Tally's "Intrastate Threshold Limit for e-Way Bill" screen:
//   • On open the cursor sits on the FIRST existing state row (or a fresh entry
//     row when none exist), with the "List of States" panel open on the right.
//   • Every row is editable: re-pick its state from the list, or overtype its
//     limit — existing entries are changeable, not just appendable.
//   • Enter walks the grid forward: State cell → Limit cell → next row's State
//     cell → … → the trailing new-entry row (add another) → End of List (done).
//   • A newly added state defaults its limit to `defaultLimit` (the parent
//     Interstate Threshold Limit); it can be overtyped per state.
//   • Selecting "End of List" (or Ctrl+A / Esc) accepts the whole list.

import { useState, useEffect, useRef } from 'react';
import GSTDetailsListPanel from './GSTDetailsListPanel';

export interface StateThresholdLimit {
  stateName: string;
  limit: number;
}

interface StateWiseThresholdLimitModalProps {
  isOpen: boolean;
  initialLimits: StateThresholdLimit[];
  /** Limit pre-filled on a newly added state row — mirrors the parent
   *  Interstate Threshold Limit field. User can overtype it per state. */
  defaultLimit?: number;
  onSave: (limits: StateThresholdLimit[]) => void;
  onClose: () => void;
}

const END_OF_LIST = 'End of List';
const FALLBACK_LIMIT = 50000;

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

// List of States for the row at index `r`: "Any" (unless another row already
// uses it), End of List, then every state not used by *other* rows. The row's
// own current state stays selectable so it can be re-picked/kept.
function stateListFor(rows: StateThresholdLimit[], r: number): string[] {
  const otherUsed = new Set(rows.filter((_, i) => i !== r).map((x) => x.stateName));
  return [
    ...(otherUsed.has('Any') ? [] : ['Any']),
    END_OF_LIST,
    ...TALLY_INDIAN_STATES.filter((s) => !otherUsed.has(s)),
  ];
}

// Where the list cursor lands when entering a State cell: on the row's current
// state (so Enter keeps it), else the top of the list.
function highlightFor(rows: StateThresholdLimit[], r: number, opts: string[]): number {
  const cur = rows[r]?.stateName;
  if (cur) {
    const idx = opts.indexOf(cur);
    return idx >= 0 ? idx : 0;
  }
  return 0;
}

export default function StateWiseThresholdLimitModal({
  isOpen,
  initialLimits,
  defaultLimit = FALLBACK_LIMIT,
  onSave,
  onClose,
}: StateWiseThresholdLimitModalProps) {
  const [rows, setRows] = useState<StateThresholdLimit[]>([]);
  // rowIndex spans 0..rows.length; rows.length is the trailing new-entry row.
  const [rowIndex, setRowIndex] = useState(0);
  // "state" = choosing/keeping this row's state (List of States open)
  // "limit" = editing this row's limit
  const [cell, setCell] = useState<'state' | 'limit'>('state');
  const [listSelectedIndex, setListSelectedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const limitRefs = useRef<(HTMLInputElement | null)[]>([]);

  const onNewRow = rowIndex === rows.length;
  const listOptions = stateListFor(rows, rowIndex);
  const previewState = cell === 'state' ? (listOptions[listSelectedIndex] ?? '') : '';

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const initial = initialLimits && initialLimits.length > 0 ? [...initialLimits] : [];
    setRows(initial);
    setRowIndex(0); // first existing row, or the new-entry row when empty
    setCell('state');
    setListSelectedIndex(highlightFor(initial, 0, stateListFor(initial, 0)));
    setTimeout(() => containerRef.current?.focus(), 50);
  }, [isOpen, initialLimits]);

  // ── Focus the limit input when editing a limit ───────────────────────────────
  useEffect(() => {
    if (cell === 'limit') {
      setTimeout(() => limitRefs.current[rowIndex]?.focus(), 20);
    }
  }, [cell, rowIndex]);

  // ── Navigation ────────────────────────────────────────────────────────────────
  const handleSave = () => {
    onSave(rows);
    onClose();
  };

  const goToStateCell = (r: number, rowsArr: StateThresholdLimit[] = rows) => {
    setRowIndex(r);
    setCell('state');
    setListSelectedIndex(highlightFor(rowsArr, r, stateListFor(rowsArr, r)));
    setTimeout(() => containerRef.current?.focus(), 20);
  };

  const goToLimitCell = (r: number) => {
    setRowIndex(r);
    setCell('limit');
  };

  const selectFromList = (value: string) => {
    if (value === END_OF_LIST) {
      handleSave();
      return;
    }
    if (onNewRow) {
      // Append a new state row and drop into its limit.
      setRows((prev) => [...prev, { stateName: value, limit: defaultLimit }]);
      goToLimitCell(rowIndex);
    } else {
      // Change the existing row's state (keeps it if the same value), then limit.
      setRows((prev) =>
        prev.map((row, i) => (i === rowIndex ? { ...row, stateName: value } : row)),
      );
      goToLimitCell(rowIndex);
    }
  };

  const confirmLimit = () => {
    // Move forward to the next row's State cell (an existing row or the new one).
    goToStateCell(rowIndex + 1);
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
        handleSave();
        return;
      }
      // Ctrl+A / Alt+A — accept the whole list
      if ((e.ctrlKey || e.altKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleSave();
        return;
      }

      if (cell === 'state') {
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

      if (cell === 'limit') {
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          confirmLimit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, cell, rowIndex, rows, listOptions, listSelectedIndex, defaultLimit]);

  if (!isOpen) return null;

  // ── Styling (matches SlabBasedRateDetails / main dialog) ─────────────────────
  const thCell = 'px-3 py-1 text-left font-bold text-[10px] text-zinc-800 border-b border-zinc-400';
  const tdBase = 'px-3 py-0.5 border-b border-zinc-200 text-[11px] font-mono';
  const highlight = 'bg-white text-black font-bold';

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
                  const stateActive = cell === 'state' && rowIndex === i;
                  const isLimitActive = cell === 'limit' && rowIndex === i;
                  return (
                    <tr key={i}>
                      <td
                        className={`${tdBase} ${stateActive ? `${highlight} cursor-default` : 'cursor-pointer'}`}
                        onClick={() => goToStateCell(i)}
                      >
                        {stateActive ? previewState : row.stateName}
                      </td>
                      <td className={`${tdBase} p-0 text-right ${isLimitActive ? highlight : ''}`}>
                        <input
                          ref={(el) => {
                            limitRefs.current[i] = el;
                          }}
                          type="text"
                          value={row.limit.toLocaleString('en-IN')}
                          onChange={(e) => updateLimit(i, e.target.value)}
                          onFocus={() => goToLimitCell(i)}
                          className={`w-full px-3 py-0.5 outline-none bg-transparent text-right font-mono text-[11px] font-bold ${
                            isLimitActive ? 'bg-white text-black font-bold' : 'bg-transparent'
                          }`}
                        />
                      </td>
                    </tr>
                  );
                })}

                {/* Trailing new-entry row — shows the highlighted list option. */}
                {onNewRow && cell === 'state' && (
                  <tr>
                    <td className={`${tdBase} font-bold ${highlight}`}>{previewState}</td>
                    <td className={`${tdBase} text-right text-zinc-400`}>
                      {previewState === END_OF_LIST ? '' : defaultLimit.toLocaleString('en-IN')}
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
                <span className="underline font-bold text-zinc-700">Enter</span>: keep / change /
                add
              </span>
              <span className="text-zinc-400">End of List: done</span>
            </div>
            <button
              onClick={handleSave}
              className="px-4 py-1 rounded bg-black text-white text-xs  font-medium"
            >
              Accept
            </button>
          </div>
        </div>

        {/* ── Right-side List of States panel (only while on a State cell) ──── */}
        {cell === 'state' && (
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
