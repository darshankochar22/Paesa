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
    { label: 'Period', key: 'F2', action: onPeriodSelect },
    { label: 'Company', key: 'F3', action: onCompanySelect },
    { label: 'Config', key: 'F4', action: onContextSelect },
    { label: isDetailed ? 'Condensed' : 'Detailed', key: 'Alt+F5', action: onToggleDetailed },
    { label: 'New Col', key: 'Alt+C', action: onAddColumn },
    { label: 'Del Col', key: 'Alt+N', action: onDeleteColumn },
    { label: 'Basis', key: 'Ctrl+B', action: onBasisOfValues },
    { label: 'Go To', key: 'Ctrl+H', action: onChangeView },
    { label: 'Exception', key: 'Ctrl+J', action: onExceptionReports },
    { label: 'Save View', key: 'Ctrl+L', action: onSaveView },
    { label: 'Remove', key: 'Space', action: onRemoveLine },
    { label: 'Restore', key: 'Alt+U', action: onRestoreLine, disabled: !canRestore },
    { label: 'Export', key: 'Alt+E', action: onExportCSV },
    { label: 'Print', key: 'Alt+P', action: onPrint },
    { label: 'Copilot', key: 'Alt+A', action: onAskAI },
  ];

  return (
    <div className="w-28 bg-white border-l border-gray-200 flex flex-col gap-0.5 p-1 select-none h-full shrink-0">
      {buttons.map((btn) => (
        <button
          key={btn.key}
          onClick={btn.action}
          disabled={btn.disabled}
          className="w-full text-left px-1.5 py-1 flex flex-col justify-center border border-gray-200 rounded-sm bg-white hover:bg-black/[0.03] active:bg-black/[0.06] disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
        >
          <span className="font-bold text-[8px] leading-tight text-black">{btn.key}</span>
          <span className="font-semibold text-[9px] leading-tight line-clamp-1 mt-0.5 text-black">
            {btn.label}
          </span>
        </button>
      ))}
    </div>
  );
}
