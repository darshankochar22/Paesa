interface Props {
  title: string;
  subtitle?: string;
  infoBar?: React.ReactNode;
  children: React.ReactNode;
  onClose: () => void;
  onAccept: () => void;
  acceptDisabled?: boolean;
  acceptLabel?: string;
  width?: string;
}

export default function PopupShell({
  title,
  subtitle,
  infoBar,
  children,
  onClose,
  onAccept,
  acceptDisabled = false,
  acceptLabel = "Accept",
  width = "w-[500px]",
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm">
      <div className={`bg-white border border-zinc-300 rounded-lg shadow-2xl ${width} flex flex-col max-h-[85vh] overflow-hidden`}>

        <div className="bg-zinc-900 px-4 py-2 text-white flex justify-between items-center select-none shrink-0">
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider">{title}</span>
            {subtitle && (
              <span className="text-[10px] text-zinc-400 font-mono">{subtitle}</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white font-bold text-sm leading-none"
          >
            &times;
          </button>
        </div>

        {infoBar && (
          <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-2 shrink-0">
            {infoBar}
          </div>
        )}

        <div className="p-4 flex-1 overflow-y-auto min-h-0 space-y-4">
          {children}
        </div>

        <div className="border-t border-zinc-200 p-3 bg-zinc-50 flex justify-between items-center select-none shrink-0">
          <span className="text-[10px] text-zinc-500">
            Alt+A: Accept &nbsp;·&nbsp; Esc: Close
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-xs px-3 py-1.5 border border-zinc-300 rounded text-zinc-700 bg-white hover:bg-zinc-100 font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={onAccept}
              disabled={acceptDisabled}
              className="text-xs px-5 py-1.5 rounded bg-zinc-950 text-white hover:bg-zinc-800 disabled:opacity-50 font-semibold shadow-sm active:scale-95"
            >
              {acceptLabel}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
