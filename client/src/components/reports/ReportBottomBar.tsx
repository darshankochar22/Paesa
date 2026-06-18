
interface ReportBottomBarProps {
  statusText?: string;
  totalText?: string;
  shortcuts?: Array<{ key: string; label: string }>;
}

export function ReportBottomBar({
  statusText = "Ready",
  totalText,
  shortcuts = [],
}: ReportBottomBarProps) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-[#006655] text-white font-mono text-[10px] select-none border-t border-[#005544] h-7 shrink-0">
      <div className="flex items-center gap-3">
        <span className="font-semibold text-emerald-200 uppercase">{statusText}</span>
        {totalText && (
          <span className="border-l border-emerald-700 pl-3 text-zinc-100 font-bold">
            {totalText}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4 overflow-hidden">
        {shortcuts.map((shortcut) => (
          <div key={shortcut.key} className="flex items-center gap-1.5 whitespace-nowrap">
            <kbd className="bg-emerald-800 text-emerald-100 px-1 py-0.5 rounded font-bold border border-emerald-700 text-[9px] shadow-sm">
              {shortcut.key}
            </kbd>
            <span className="text-zinc-200">{shortcut.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
