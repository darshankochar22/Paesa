
interface ReportRightPanelProps {
  onPeriodSelect: () => void;
  onCompanySelect: () => void;
  onContextSelect: () => void;
  onBasisOfValues: () => void;
  onChangeView: () => void;
  onExceptionReports: () => void;
  onSaveView: () => void;
  onToggleDetailed: () => void;
  isDetailed: boolean;
  onAddColumn: () => void;
  onDeleteColumn: () => void;
  onRemoveLine: () => void;
  onRestoreLine: () => void;
  canRestore: boolean;
  onExportCSV?: () => void;
  onPrint?: () => void;
  onAskAI?: () => void;
}

export function ReportRightPanel({
  onPeriodSelect,
  onCompanySelect,
  onContextSelect,
  onBasisOfValues,
  onChangeView,
  onExceptionReports,
  onSaveView,
  onToggleDetailed,
  isDetailed,
  onAddColumn,
  onDeleteColumn,
  onRemoveLine,
  onRestoreLine,
  canRestore,
  onExportCSV,
  onPrint,
  onAskAI,
}: ReportRightPanelProps) {
  const buttons = [
    { label: "Period", key: "F2", action: onPeriodSelect },
    { label: "Company", key: "F3", action: onCompanySelect },
    { label: "Configuration", key: "F4", action: onContextSelect },
    { label: isDetailed ? "Condensed" : "Detailed", key: "Alt+F5", action: onToggleDetailed },
    { label: "New Column", key: "Alt+C", action: onAddColumn },
    { label: "Delete Column", key: "Alt+N", action: onDeleteColumn },
    { label: "Basis of Values", key: "Ctrl+B", action: onBasisOfValues },
    { label: "Change View", key: "Ctrl+H", action: onChangeView },
    { label: "Exception Report", key: "Ctrl+J", action: onExceptionReports },
    { label: "Save View", key: "Ctrl+L", action: onSaveView },
    { label: "Remove Line", key: "Space/Del", action: onRemoveLine },
    { label: "Restore Line", key: "Alt+U", action: onRestoreLine, disabled: !canRestore },
    { label: "Export CSV", key: "Alt+E", action: onExportCSV },
    { label: "Print Report", key: "Alt+P", action: onPrint },
    { label: "Ask Copilot", key: "Alt+A", action: onAskAI },
  ];

  return (
    <div className="w-32 bg-[#D1DCE3] border-l border-zinc-300 flex flex-col gap-0.5 p-0.5 select-none h-full shrink-0">
      {buttons.map((btn) => (
        <button
          key={btn.key}
          onClick={btn.action}
          disabled={btn.disabled}
          className={`w-full text-left px-2 py-1 text-[10px] font-sans flex flex-col justify-between border border-[#A7B9C7] rounded shadow-xs bg-[#EAF0F6] hover:bg-[#D5E1ED] disabled:opacity-50 disabled:pointer-events-none transition-colors group cursor-pointer ${
            btn.disabled ? "opacity-40" : ""
          }`}
        >
          <span className="font-bold text-[#003366] text-[9px]">{btn.key}</span>
          <span className="font-semibold text-zinc-800 uppercase text-[9px] leading-tight line-clamp-2 mt-0.5">
            {btn.label}
          </span>
        </button>
      ))}
    </div>
  );
}
