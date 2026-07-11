import { useEffect, useRef, useState } from 'react';

export const UQC_LIST = [
  'Not Applicable',
  'BAG-BAGS',
  'BALE-BALE',
  'BDL-BUNDLES',
  'BKL-BUCKLES',
  'BOU-BILLION OF UNITS',
  'BOX-BOX',
  'BTL-BOTTLES',
  'BUN-BUNCHES',
  'CAN-CANS',
  'CBM-CUBIC METERS',
  'CCM-CUBIC CENTIMETERS',
  'CMS-CENTIMETERS',
  'CTN-CARTONS',
  'DOZ-DOZENS',
  'DRM-DRUMS',
  'GGK-GREAT GROSS',
  'GMS-GRAMMES',
  'GRS-GROSS',
  'GYD-GROSS YARDS',
  'KGS-KILOGRAMS',
  'KLR-KILOLITRE',
  'KME-KILOMETRE',
  'LTR-LITRES',
  'MLT-MILILITRE',
  'MTR-METERS',
  'MTS-METRIC TON',
  'NOS-NUMBERS',
  'OTH-OTHERS',
  'PAC-PACKS',
  'PCS-PIECES',
  'PRS-PAIRS',
  'QTL-QUINTAL',
  'ROL-ROLLS',
  'SET-SETS',
  'SQF-SQUARE FEET',
  'SQM-SQUARE METERS',
  'SQY-SQUARE YARDS',
  'TBS-TABLETS',
  'TGM-TEN GROSS',
  'THD-THOUSANDS',
  'TON-TONNES',
  'TUB-TUBES',
  'UGS-US GALLONS',
  'UNT-UNITS',
  'YDS-YARDS',
];

export function UqcPopup({
  selected,
  onSelect,
  onClose,
}: {
  selected: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = UQC_LIST.filter((u) => u.toLowerCase().includes(search.toLowerCase()));

  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    const idx = filtered.findIndex((u) => u === selected || (u === 'Not Applicable' && !selected));
    setFocusedIndex(idx !== -1 ? idx : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, search]);

  useEffect(() => {
    itemRefs.current[focusedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [focusedIndex]);

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-50 bg-white border border-zinc-300 shadow-xl"
      style={{ minWidth: 220, maxHeight: 320, display: 'flex', flexDirection: 'column' }}
      data-enter-nav-ignore
    >
      {/* Header */}
      <div className="bg-zinc-800 text-white text-xs font-bold px-3 py-1.5 flex justify-between items-center shrink-0">
        <span>List of UQCs</span>
        <span
          className="text-zinc-300 font-normal cursor-pointer hover:text-white"
          onClick={onClose}
        >
          New UQC
        </span>
      </div>
      {/* Search */}
      <input
        ref={inputRef}
        data-enter-skip
        className="px-3 py-1.5 text-xs outline-none border-b border-zinc-200 placeholder-zinc-400 bg-zinc-50 focus:bg-white transition-colors shrink-0"
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (filtered.length) setFocusedIndex((prev) => (prev + 1) % filtered.length);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (filtered.length)
              setFocusedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
          } else if (e.key === 'Enter') {
            e.preventDefault();
            const uqc = filtered[focusedIndex];
            if (uqc) onSelect(uqc);
          }
        }}
      />
      {/* List */}
      <div className="overflow-y-auto flex-1">
        {filtered.map((uqc, idx) => {
          const isSelected = selected === uqc || (uqc === 'Not Applicable' && !selected);
          return (
            <div
              key={uqc}
              ref={(el) => {
                itemRefs.current[idx] = el;
              }}
              className={[
                'px-3 py-0.5 text-sm cursor-pointer border-b border-zinc-50 select-none',
                idx === focusedIndex
                  ? 'bg-zinc-900 text-white font-semibold'
                  : isSelected
                    ? 'bg-zinc-200 text-zinc-900 font-semibold'
                    : 'hover:bg-zinc-100 text-zinc-800',
              ].join(' ')}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(uqc);
              }}
              onMouseEnter={() => setFocusedIndex(idx)}
            >
              {uqc === 'Not Applicable' ? `◆ ${uqc}` : uqc}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="px-3 py-2 text-xs text-zinc-400 italic">No matches</div>
        )}
      </div>
    </div>
  );
}
