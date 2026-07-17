import { useState, useEffect } from 'react';

interface GSTRegistrationItem {
  gst_id?: number;
  gstin?: string;
  state_id?: string;
  trade_name?: string;
  legal_name?: string;
}

interface DownloadSettingsModalProps {
  isOpen: boolean;
  registrations: GSTRegistrationItem[];
  /** Comma-separated list of previously selected registrations (empty = All Registrations). */
  initialRegistration: string;
  /** Comma-separated list of previously selected return types (empty = All Returns). */
  initialReturnType: string;
  /** Both args are comma-separated strings (multi-select). */
  onSave: (registration: string, returnType: string) => void;
  onClose: () => void;
}

type Field = 'gstRegistration' | 'returnType';

const ALL_REGISTRATIONS = 'All Registrations';
const ALL_RETURNS = 'All Returns';
const RETURN_TYPES = ['GSTR-1', 'GSTR-2A', 'GSTR-2B', 'GSTR-3B'];
const END_OF_LIST = 'End of List';

const splitValues = (raw: string): string[] =>
  raw
    ? raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

const allSentinel = (field: Field) =>
  field === 'gstRegistration' ? ALL_REGISTRATIONS : ALL_RETURNS;

// Options offered for a field's row `r`, TallyPrime multi-select style:
//  • The "All …" shortcut is ALWAYS offered (it is a unique member, not filtered).
//  • Specific items already chosen on OTHER rows are hidden — no repetition.
//  • The row's own current value stays selectable so it can be kept/changed.
//  • The trailing new-entry row leads with "End of List" (finish); other rows
//    put "All …" first and "End of List" last.
const buildOptions = (field: Field, selections: string[], r: number, items: string[]): string[] => {
  const allVal = allSentinel(field);
  const usedByOthers = new Set(selections.filter((_, i) => i !== r));
  const availableItems = items.filter((it) => !usedByOthers.has(it));
  const onNew = r === selections.length;
  if (onNew && selections.length > 0) {
    return [END_OF_LIST, allVal, ...availableItems];
  }
  return [allVal, ...availableItems, END_OF_LIST];
};

// Where the list cursor lands when entering a row: on its current value (Enter
// keeps it) for existing rows; on the top option for the new-entry row.
const highlightIndex = (field: Field, selections: string[], r: number, items: string[]): number => {
  if (r < selections.length) {
    const idx = buildOptions(field, selections, r, items).indexOf(selections[r]);
    return idx >= 0 ? idx : 0;
  }
  return 0;
};

export default function DownloadSettingsModal({
  isOpen,
  registrations,
  initialRegistration,
  initialReturnType,
  onSave,
  onClose,
}: DownloadSettingsModalProps) {
  const [activeField, setActiveField] = useState<Field>('gstRegistration');
  // Committed selections per field — each entry is a specific item or the
  // "All …" sentinel (a unique member). Empty = the "All …" default.
  const [regSelections, setRegSelections] = useState<string[]>([]);
  const [returnSelections, setReturnSelections] = useState<string[]>([]);
  const [rowIndex, setRowIndex] = useState(0);
  const [listIndex, setListIndex] = useState(0);

  // Generate a readable label for each GST Registration
  const getRegLabel = (rr: GSTRegistrationItem) => {
    if (rr.state_id) {
      return rr.state_id.includes('Registration') ? rr.state_id : `${rr.state_id} Registration`;
    }
    return rr.gstin ? `GSTIN: ${rr.gstin}` : 'Primary Registration';
  };

  const regLabels =
    registrations.length > 0 ? registrations.map(getRegLabel) : ['Primary Registration'];

  const itemsFor = (field: Field) => (field === 'gstRegistration' ? regLabels : RETURN_TYPES);
  const selectionsFor = (field: Field) =>
    field === 'gstRegistration' ? regSelections : returnSelections;
  const setSelectionsFor = (field: Field) =>
    field === 'gstRegistration' ? setRegSelections : setReturnSelections;

  const activeItems = itemsFor(activeField);
  const activeSelections = selectionsFor(activeField);
  const onNewRow = rowIndex === activeSelections.length;
  const activeOptions = buildOptions(activeField, activeSelections, rowIndex, activeItems);
  const previewValue = activeOptions[listIndex] ?? '';

  useEffect(() => {
    if (!isOpen) return;
    const regs = splitValues(initialRegistration);
    const rets = splitValues(initialReturnType);
    setRegSelections(regs);
    setReturnSelections(rets);
    setActiveField('gstRegistration');
    setRowIndex(0); // first existing registration, or the new-entry row when none
    setListIndex(highlightIndex('gstRegistration', regs, 0, regLabels));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialRegistration, initialReturnType]);

  // Move the cursor to a field/row and anchor the list on the right option.
  const goToRow = (field: Field, r: number, sel: string[]) => {
    setActiveField(field);
    setRowIndex(r);
    setListIndex(highlightIndex(field, sel, r, itemsFor(field)));
  };

  // Finalize the current field — move to Return Type, or save + close after it.
  const advanceField = (finalReturns: string[]) => {
    if (activeField === 'gstRegistration') {
      goToRow('returnType', 0, returnSelections);
    } else {
      const regOut = regSelections.length ? regSelections.join(', ') : ALL_REGISTRATIONS;
      const retOut = finalReturns.length ? finalReturns.join(', ') : ALL_RETURNS;
      onSave(regOut, retOut);
      onClose();
    }
  };

  // Apply a chosen option to the active field/row.
  const pickForField = (opt: string) => {
    if (opt === END_OF_LIST) {
      advanceField(activeSelections);
      return;
    }
    const sel = activeSelections;
    const existsElsewhere = sel.some((v, i) => v === opt && i !== rowIndex);

    let next: string[];
    let nextRow: number;
    if (onNewRow) {
      // Append — unless it is already selected (e.g. "All …" picked twice).
      if (existsElsewhere) {
        next = sel;
        nextRow = rowIndex;
      } else {
        next = [...sel, opt];
        nextRow = rowIndex + 1;
      }
    } else if (existsElsewhere) {
      // The value already lives on another row → drop this row (no repetition);
      // its previous value returns to the list.
      next = sel.filter((_, i) => i !== rowIndex);
      nextRow = rowIndex;
    } else {
      // Change this row's value (previous value returns to the list).
      next = sel.map((v, i) => (i === rowIndex ? opt : v));
      nextRow = rowIndex + 1;
    }

    setSelectionsFor(activeField)(next);
    goToRow(activeField, nextRow, next);
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setListIndex((p) => (p + 1) % activeOptions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setListIndex((p) => (p - 1 + activeOptions.length) % activeOptions.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        pickForField(activeOptions[listIndex]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeField, rowIndex, listIndex, activeOptions, regSelections, returnSelections]);

  if (!isOpen) return null;

  // Render a field's value: committed picks stacked; the active row shows the
  // highlighted list preview; a trailing cursor slot appears on the new row.
  const renderFieldValue = (field: Field) => {
    const isActive = activeField === field;
    const selections = selectionsFor(field);
    const allVal = allSentinel(field);

    if (!isActive) {
      const shown = selections.length ? selections : [allVal];
      return (
        <div className="flex flex-col px-2 py-0.5">
          {shown.map((v, i) => (
            <div key={i} className="font-bold text-zinc-900 leading-tight">
              {v}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-0.5">
        {selections.map((v, i) => {
          const rowActive = rowIndex === i;
          return (
            <div
              key={i}
              onClick={() => goToRow(field, i, selections)}
              className={`px-2 py-0.5 leading-tight font-bold w-fit min-w-[150px] ${
                rowActive ? 'border bg-white border-black text-black' : 'text-zinc-900'
              }`}
            >
              {rowActive ? previewValue : v}
            </div>
          );
        })}
        {onNewRow && (
          <div className="px-2 py-0.5 border bg-white border-black text-black font-bold w-fit min-w-[150px]">
            {previewValue === END_OF_LIST ? ' ' : previewValue}
          </div>
        )}
      </div>
    );
  };

  const headerTitle =
    activeField === 'gstRegistration' ? 'List of GST Registrations' : 'Types of Return';

  return (
    <div className="fixed inset-0 bg-black/20 z-[11000] flex items-center justify-center font-mono text-[11px] backdrop-blur-[1px]">
      <div className="flex gap-4 items-stretch">
        {/* Main Settings Prompt Box */}
        <div className="relative bg-white border border-zinc-400 shadow-2xl w-[420px] flex flex-col pt-3 pb-8 px-6 min-h-[220px]">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="text-center font-bold text-xs pb-6 text-zinc-900 tracking-wide">
            Download Settings
          </div>

          <div className="space-y-4">
            {/* GST Registration (multi-select) */}
            <div
              className="grid"
              style={{ gridTemplateColumns: '130px 10px 1fr', alignItems: 'start' }}
            >
              <span className="text-zinc-700 pt-0.5">GST Registration</span>
              <span className="text-zinc-400 text-center pt-0.5">:</span>
              <div
                onClick={() => goToRow('gstRegistration', 0, regSelections)}
                className="cursor-pointer select-none"
              >
                {renderFieldValue('gstRegistration')}
              </div>
            </div>

            {/* Return Type (multi-select) */}
            <div
              className="grid"
              style={{ gridTemplateColumns: '130px 10px 1fr', alignItems: 'start' }}
            >
              <span className="text-zinc-700 pt-0.5">Return Type</span>
              <span className="text-zinc-400 text-center pt-0.5">:</span>
              <div
                onClick={() => goToRow('returnType', 0, returnSelections)}
                className="cursor-pointer select-none"
              >
                {renderFieldValue('returnType')}
              </div>
            </div>
          </div>
        </div>

        {/* Right list panel for the active field's options */}
        <div className="bg-white border border-zinc-400 w-[240px] flex flex-col shadow-2xl overflow-hidden min-h-[220px]">
          <div className="bg-black text-white font-bold text-xs py-1.5 px-3 tracking-wide">
            <span>{headerTitle}</span>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {activeOptions.map((opt, index) => (
              <div
                key={opt}
                onClick={() => pickForField(opt)}
                className={`px-3 py-1 cursor-pointer font-mono text-[11px] ${
                  index === listIndex ? 'font-bold underline' : ' text-black'
                }`}
              >
                {opt}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
