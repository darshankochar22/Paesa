import type { NumberingRestartRow, NumberingAffixRow } from '@/types/entities/VoucherType';

const cellCls =
  'w-full bg-transparent text-[12px] text-zinc-950 font-mono outline-none py-1 px-1.5 border border-transparent focus:border-zinc-400 transition-colors';

const EMPTY_RESTART: NumberingRestartRow = {
  applicable_from: '',
  starting_number: 1,
  particulars: '',
};
const EMPTY_AFFIX: NumberingAffixRow = { applicable_from: '', particulars: '' };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center min-h-[28px]">
      <span className="w-52 text-[12px] text-zinc-700 shrink-0 select-none">{label}</span>
      <span className="text-zinc-400 mr-2 select-none">:</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function YesNoSelect({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <select
      className="bg-transparent text-[12px] font-mono outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 rounded w-20"
      value={value ? 'Yes' : 'No'}
      onChange={(e) => onChange(e.target.value === 'Yes')}
    >
      <option>Yes</option>
      <option>No</option>
    </select>
  );
}

const colHdr =
  'py-1.5 px-2 text-[11px] font-bold text-zinc-600 border-r border-zinc-200 last:border-r-0';
const colCell = 'border-r border-zinc-100 last:border-r-0';

function RestartSection({
  rows,
  onChange,
}: {
  rows: NumberingRestartRow[];
  onChange: (rows: NumberingRestartRow[]) => void;
}) {
  const all = [...rows, { ...EMPTY_RESTART }];
  const setCell = (i: number, patch: Partial<NumberingRestartRow>) => {
    const next = all.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    onChange(next.filter((r) => r.applicable_from.trim() || r.particulars.trim()));
  };
  const removeAt = (i: number) => onChange(rows.filter((_, idx) => idx !== i));

  return (
    <div className="flex-1 flex flex-col min-w-0 border-r border-zinc-300">
      <div className="bg-zinc-50 border-b border-zinc-200 text-center font-bold text-[11px] uppercase tracking-wider text-zinc-700 py-1.5">
        Restart Numbering
      </div>
      <div className="grid grid-cols-[1fr_80px_1fr_24px] bg-zinc-100 border-b border-zinc-200">
        <div className={colHdr}>Applicable From</div>
        <div className={colHdr}>Starting No.</div>
        <div className={colHdr}>Periodicity</div>
        <div className="py-1.5 px-1" />
      </div>
      <div className="flex-1">
        {all.map((r, i) => {
          const isBlank = i === all.length - 1;
          return (
            <div
              key={i}
              className="grid grid-cols-[1fr_80px_1fr_24px] border-b border-zinc-100 items-center"
            >
              <input
                type="date"
                className={`${cellCls} ${colCell}`}
                value={r.applicable_from}
                onChange={(e) => setCell(i, { applicable_from: e.target.value })}
              />
              <input
                type="number"
                className={`${cellCls} ${colCell}`}
                value={r.starting_number}
                onChange={(e) => setCell(i, { starting_number: Number(e.target.value) })}
              />
              <select
                className={`${cellCls} ${colCell}`}
                value={r.particulars}
                onChange={(e) => setCell(i, { particulars: e.target.value })}
              >
                <option value="">—</option>
                <option>Daily</option>
                <option>Monthly</option>
                <option>Never</option>
                <option>Weekly</option>
                <option>Yearly</option>
              </select>
              <button
                onClick={() => !isBlank && removeAt(i)}
                className={`text-sm font-bold leading-none text-center ${isBlank ? 'text-transparent cursor-default' : 'text-zinc-300 hover:text-zinc-900'}`}
                title="Remove"
              >
                &times;
              </button>
            </div>
          );
        })}
      </div>
      <div className="px-3 py-1 text-[11px] text-zinc-400 italic font-sans select-none border-t border-zinc-100">
        End of List
      </div>
    </div>
  );
}

function AffixSection({
  title,
  rows,
  onChange,
}: {
  title: string;
  rows: NumberingAffixRow[];
  onChange: (rows: NumberingAffixRow[]) => void;
}) {
  const all = [...rows, { ...EMPTY_AFFIX }];
  const setCell = (i: number, patch: Partial<NumberingAffixRow>) => {
    const next = all.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    onChange(next.filter((r) => r.applicable_from.trim() || r.particulars.trim()));
  };
  const removeAt = (i: number) => onChange(rows.filter((_, idx) => idx !== i));

  return (
    <div className="flex-1 flex flex-col min-w-0 border-r border-zinc-300 last:border-r-0">
      <div className="bg-zinc-50 border-b border-zinc-200 text-center font-bold text-[11px] uppercase tracking-wider text-zinc-700 py-1.5">
        {title}
      </div>
      <div className="grid grid-cols-[1fr_1.4fr_24px] bg-zinc-100 border-b border-zinc-200">
        <div className={colHdr}>Applicable From</div>
        <div className={colHdr}>Particulars</div>
        <div className="py-1.5 px-1" />
      </div>
      <div className="flex-1">
        {all.map((r, i) => {
          const isBlank = i === all.length - 1;
          return (
            <div
              key={i}
              className="grid grid-cols-[1fr_1.4fr_24px] border-b border-zinc-100 items-center"
            >
              <input
                type="date"
                className={`${cellCls} ${colCell}`}
                value={r.applicable_from}
                onChange={(e) => setCell(i, { applicable_from: e.target.value })}
              />
              <input
                className={`${cellCls} ${colCell}`}
                value={r.particulars}
                onChange={(e) => setCell(i, { particulars: e.target.value })}
              />
              <button
                onClick={() => !isBlank && removeAt(i)}
                className={`text-sm font-bold leading-none text-center ${isBlank ? 'text-transparent cursor-default' : 'text-zinc-300 hover:text-zinc-900'}`}
                title="Remove"
              >
                &times;
              </button>
            </div>
          );
        })}
      </div>
      <div className="px-3 py-1 text-[11px] text-zinc-400 italic font-sans select-none border-t border-zinc-100">
        End of List
      </div>
    </div>
  );
}

export interface AdditionalNumberingValue {
  starting_number: number;
  width_of_numerical_part: number;
  prefill_with_zero: boolean;
  restart_numbering: NumberingRestartRow[];
  prefix_details: NumberingAffixRow[];
  suffix_details: NumberingAffixRow[];
}

export default function AdditionalNumberingPopup({
  value,
  onChange,
  onClose,
}: {
  value: AdditionalNumberingValue;
  onChange: (patch: Partial<AdditionalNumberingValue>) => void;
  onClose: () => void;
}) {
  return (
    <div
      data-enter-nav-ignore
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="bg-white border border-zinc-800 w-[1080px] max-h-[88vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title — white bg, bottom border only */}
        <div className="border-b border-zinc-800 px-4 py-2 flex justify-between items-center">
          <span className="font-bold text-sm text-zinc-900 tracking-wide">
            Voucher Type Creation (Secondary)
          </span>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-900 font-bold text-lg leading-none"
          >
            &times;
          </button>
        </div>

        <div className="px-5 pt-3 pb-2 flex flex-col gap-3 overflow-y-auto flex-1">
          {/* Top fields */}
          <div className="flex flex-col gap-0.5">
            <Field label="Starting Number">
              <input
                type="number"
                className="w-28 bg-transparent text-[12px] font-mono text-zinc-950 outline-none py-0.5 px-1.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 rounded"
                value={value.starting_number}
                onChange={(e) => onChange({ starting_number: Number(e.target.value) })}
              />
            </Field>
            <Field label="Width of Numerical Part">
              <input
                type="number"
                className="w-28 bg-transparent text-[12px] font-mono text-zinc-950 outline-none py-0.5 px-1.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 rounded"
                value={value.width_of_numerical_part}
                onChange={(e) => onChange({ width_of_numerical_part: Number(e.target.value) })}
              />
            </Field>
            <Field label="Prefill with zero">
              <YesNoSelect
                value={value.prefill_with_zero}
                onChange={(v) => onChange({ prefill_with_zero: v })}
              />
            </Field>
          </div>

          {/* Three sections side-by-side */}
          <div className="flex flex-row border border-zinc-300 overflow-hidden flex-1 min-h-[200px]">
            <RestartSection
              rows={value.restart_numbering}
              onChange={(restart_numbering) => onChange({ restart_numbering })}
            />
            <AffixSection
              title="Prefix Details"
              rows={value.prefix_details}
              onChange={(prefix_details) => onChange({ prefix_details })}
            />
            <AffixSection
              title="Suffix Details"
              rows={value.suffix_details}
              onChange={(suffix_details) => onChange({ suffix_details })}
            />
          </div>
        </div>

        <div className="border-t border-zinc-200 px-5 py-2.5 flex justify-end">
          <button
            onClick={onClose}
            className="text-sm px-8 py-1.5 bg-black text-white hover:bg-zinc-800 transition-colors font-medium font-sans"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
