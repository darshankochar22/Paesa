
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
    <div className="flex items-center justify-between px-2 py-1 bg-gradient-to-r from-[#1b5e20] to-[#2e7d32] text-white font-mono text-[10px] select-none border-t-2 border-[#0d47a1] h-8 shrink-0 shadow-inner">
      <div className="flex items-center gap-3">
        <span className="font-bold text-yellow-200 uppercase tracking-wide text-[11px]">{statusText}</span>
        {totalText && (
          <span className="border-l-2 border-green-400 pl-3 text-white font-bold text-[11px]">
            {totalText}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 overflow-hidden">
        {shortcuts.map((shortcut) => (
          <div key={shortcut.key} className="flex items-center gap-1 whitespace-nowrap group">
            <kbd className="bg-[#ffeb3b] text-[#1b5e20] px-1.5 py-0.5 rounded font-black border border-[#f9a825] text-[9px] shadow-sm group-hover:bg-[#fdd835] transition-colors">
              {shortcut.key}
            </kbd>
            <span className="text-green-100 font-medium text-[9px]">{shortcut.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
