
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
    <div className="flex items-center justify-between px-2 py-1 bg-white text-zinc-700 font-mono text-[10px] select-none border-t border-zinc-300 h-8 shrink-0">
      <div className="flex items-center gap-3">
        <span className="font-bold text-zinc-900 uppercase tracking-wide text-[11px]">{statusText}</span>
        {totalText && (
          <span className="border-l border-zinc-300 pl-3 text-zinc-900 font-bold text-[11px]">
            {totalText}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 overflow-hidden">
        {shortcuts.map((shortcut) => (
          <div key={shortcut.key} className="flex items-center gap-1 whitespace-nowrap">
            <kbd className="bg-zinc-100 text-zinc-700 px-1.5 py-0.5 rounded font-black border border-zinc-300 text-[9px]">
              {shortcut.key}
            </kbd>
            <span className="text-zinc-600 font-medium text-[9px]">{shortcut.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
