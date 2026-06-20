
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
    { label: "Period", key: "F2", action: onPeriodSelect, color: "blue" },
    { label: "Company", key: "F3", action: onCompanySelect, color: "blue" },
    { label: "Config", key: "F4", action: onContextSelect, color: "blue" },
    { label: isDetailed ? "Condensed" : "Detailed", key: "Alt+F5", action: onToggleDetailed, color: "green" },
    { label: "New Col", key: "Alt+C", action: onAddColumn, color: "purple" },
    { label: "Del Col", key: "Alt+N", action: onDeleteColumn, color: "red" },
    { label: "Basis", key: "Ctrl+B", action: onBasisOfValues, color: "orange" },
    { label: "Go To", key: "Ctrl+H", action: onChangeView, color: "teal" },
    { label: "Exception", key: "Ctrl+J", action: onExceptionReports, color: "red" },
    { label: "Save View", key: "Ctrl+L", action: onSaveView, color: "green" },
    { label: "Remove", key: "Space", action: onRemoveLine, color: "orange" },
    { label: "Restore", key: "Alt+U", action: onRestoreLine, disabled: !canRestore, color: "purple" },
    { label: "Export", key: "Alt+E", action: onExportCSV, color: "blue" },
    { label: "Print", key: "Alt+P", action: onPrint, color: "green" },
    { label: "Copilot", key: "Alt+A", action: onAskAI, color: "teal" },
  ];

  const colorMap: Record<string, string> = {
    blue: "from-[#e3f2fd] to-[#bbdefb] border-[#1976d2] text-[#0d47a1]",
    green: "from-[#e8f5e9] to-[#c8e6c9] border-[#388e3c] text-[#1b5e20]",
    purple: "from-[#f3e5f5] to-[#e1bee7] border-[#7b1fa2] text-[#4a148c]",
    red: "from-[#ffebee] to-[#ffcdd2] border-[#d32f2f] text-[#b71c1c]",
    orange: "from-[#fff3e0] to-[#ffe0b2] border-[#f57c00] text-[#e65100]",
    teal: "from-[#e0f2f1] to-[#b2dfdb] border-[#00796b] text-[#004d40]",
  };

  return (
    <div className="w-28 bg-gradient-to-b from-[#e8eaf6] to-[#c5cae9] border-l-2 border-[#7986cb] flex flex-col gap-0.5 p-1 select-none h-full shrink-0 shadow-inner">
      {buttons.map((btn) => (
        <button
          key={btn.key}
          onClick={btn.action}
          disabled={btn.disabled}
          className={`w-full text-left px-1.5 py-1 flex flex-col justify-center border-2 rounded-md shadow-sm bg-gradient-to-b ${
            colorMap[btn.color]
          } hover:shadow-md hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer ${
            btn.disabled ? "opacity-40" : ""
          }`}
        >
          <span className="font-black text-[8px] leading-tight">{btn.key}</span>
          <span className="font-bold text-[9px] leading-tight line-clamp-1 mt-0.5">
            {btn.label}
          </span>
        </button>
      ))}
    </div>
  );
}
