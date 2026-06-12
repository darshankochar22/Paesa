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
    <div className="bg-white border border-zinc-400 w-[240px] flex flex-col shadow-2xl overflow-hidden min-h-[300px]">
      {/* Teal header — TallyPrime style */}
      <div className="bg-[#007a78] text-white font-bold text-xs py-2 px-3 tracking-wide">
        {title}
      </div>

      {/* Options list */}
      <div className="flex-1 overflow-y-auto py-1">
        {options.map((opt, index) => (
          <div
            key={opt}
            onClick={() => onSelect(opt)}
            className={`px-3 py-1 cursor-pointer font-bold font-mono text-[11px] ${
              index === selectedIndex
                ? "bg-[#0066cc] text-white"
                : "hover:bg-zinc-100 text-zinc-900"
            }`}
          >
            {opt}
          </div>
        ))}
      </div>
    </div>
  );
}
