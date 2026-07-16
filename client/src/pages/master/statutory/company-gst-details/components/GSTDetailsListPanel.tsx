// Right-side floating list/dropdown panel — mirrors TallyPrime's selection panel.
// Shown alongside the dialog whenever a dropdown field is focused.

interface GSTDetailsListPanelProps {
  title: string;
  options: string[];
  selectedIndex: number;
  onSelect: (value: string) => void;
}

export default function GSTDetailsListPanel({
  title,
  options,
  selectedIndex,
  onSelect,
}: GSTDetailsListPanelProps) {
  return (
    <div className="self-stretch w-64 bg-white border-l border-zinc-200 flex flex-col shadow-xl overflow-hidden shrink-0">
      {/* Header — matches GroupFlatList */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 bg-zinc-50 select-none shrink-0">
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{title}</span>
      </div>

      {/* Options list — GroupFlatList row styling */}
      <div className="flex-1 overflow-y-auto">
        {options.map((opt, index) => {
          const isFocused = index === selectedIndex;
          return (
            <div
              key={opt}
              onClick={() => onSelect(opt)}
              className={`flex items-center min-h-[28px] px-3 cursor-pointer text-[13px] select-none ${
                isFocused ? 'bg-zinc-900 text-white font-medium' : 'text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              <span className="truncate">{opt}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
