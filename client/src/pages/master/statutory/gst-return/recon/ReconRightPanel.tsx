import { cn } from '@/lib/utils';

export interface ReconPeriod {
  // MMYYYY — the GST return period, as the portal APIs expect it.
  period: string;
  label: string;
  // A portal statement for this month has already been fetched into the books.
  fetched?: boolean;
}

interface ReconRightPanelProps {
  periods: ReconPeriod[];
  // null = the whole financial year.
  selected: string | null;
  onSelect: (period: string | null) => void;
  onFetchPortal: () => void;
  disabled?: boolean;
}

const ITEM =
  'w-full text-left px-2 py-1 text-xs border-b border-black/10 disabled:opacity-40 ' +
  'hover:bg-black/[0.06] flex items-center justify-between gap-1';

// Period selector for the GSTR-2A/2B reconciliation screens. Tally exposes the period
// on the right of the report; picking a month narrows BOTH the books and the portal
// side to that return period. Months already fetched from the portal are marked so it
// is obvious which ones still need a download.
export default function ReconRightPanel({
  periods,
  selected,
  onSelect,
  onFetchPortal,
  disabled,
}: ReconRightPanelProps) {
  return (
    <div className="w-36 bg-white border-l border-black flex flex-col select-none h-full shrink-0">
      <div className="px-2 py-1 text-xs font-bold border-b border-black">Period</div>

      <div className="flex-1 overflow-y-auto">
        <button
          type="button"
          onClick={() => onSelect(null)}
          disabled={disabled}
          className={cn(ITEM, selected === null && 'bg-black text-white hover:bg-black')}
        >
          <span>Whole Year</span>
        </button>

        {periods.map((p) => (
          <button
            key={p.period}
            type="button"
            onClick={() => onSelect(p.period)}
            disabled={disabled}
            className={cn(ITEM, selected === p.period && 'bg-black text-white hover:bg-black')}
          >
            <span>{p.label}</span>
            {/* Fetched marker — a dot, not a colour, per the B/W theme. */}
            <span
              className="text-[10px] leading-none"
              title={p.fetched ? 'Fetched' : 'Not fetched'}
            >
              {p.fetched ? '●' : '○'}
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onFetchPortal}
        disabled={disabled}
        className="px-2 py-1.5 text-xs font-bold border-t border-black hover:bg-black/[0.06] disabled:opacity-40"
      >
        Fetch from Portal
      </button>
    </div>
  );
}
