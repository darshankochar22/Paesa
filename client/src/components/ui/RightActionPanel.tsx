export interface RightPanelAction {
  key: string;           // Keyboard shortcut label, e.g. "F4", "F5", "Esc", "Ctrl+A"
  label: string;         // Description, e.g. "Contra", "Payment", "Quit", "Accept"
  onClick: () => void;   // Action callback
  active?: boolean;      // Whether this is the active mode/state
  disabled?: boolean;    // Whether this action is disabled
  shortcutKey?: string;  // Optional actual event.key code to match, e.g. "F4", "F5"
}

interface Props {
  actions: RightPanelAction[];
  title?: string;
  className?: string;
}

/**
 * Beautiful, premium Black & White Tally-style Right Action Panel.
 * Provides quick clickable action buttons with keyboard shortcut indicators.
 */
export default function RightActionPanel({ actions, title = "Actions", className = "" }: Props) {
  return (
    <div className={`w-32 border-l border-zinc-200 flex flex-col shrink-0 bg-zinc-50 select-none ${className}`}>
      {/* Header */}
      <div className="bg-zinc-900 text-white px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider text-center border-b border-zinc-800">
        {title}
      </div>

      {/* Buttons List */}
      <div className="flex-1 flex flex-col divide-y divide-zinc-200 overflow-y-auto min-h-0">
        {actions.map((act) => {
          const btnClass = act.active
            ? "bg-zinc-950 text-white hover:bg-zinc-900"
            : act.disabled
            ? "text-zinc-300 bg-zinc-50 cursor-not-allowed"
            : "hover:bg-zinc-200 text-zinc-700 bg-white active:bg-zinc-300";

          return (
            <button
              key={`${act.key}-${act.label}`}
              onClick={() => {
                if (!act.disabled) act.onClick();
              }}
              disabled={act.disabled}
              className={`w-full py-2 px-1.5 flex flex-col items-center justify-center text-center transition-all focus:outline-none ${btnClass}`}
              title={act.disabled ? undefined : `Press ${act.key} on keyboard`}
            >
              {/* Shortcut Key Badge */}
              <span
                className={`text-[9px] font-bold px-1 py-0.5 rounded font-mono border uppercase mb-1 tracking-wider ${
                  act.active
                    ? "bg-white text-zinc-950 border-white"
                    : act.disabled
                    ? "border-zinc-200 text-zinc-300"
                    : "bg-zinc-900 text-white border-zinc-900"
                }`}
              >
                {act.key}
              </span>

              {/* Action Description */}
              <span className="text-[10px] font-bold uppercase tracking-wide font-sans truncate w-full">
                {act.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-1 border-t border-zinc-200 bg-zinc-100 text-[8px] text-zinc-400 font-bold uppercase text-center tracking-wider font-mono">
        &bull; TALLY BAR &bull;
      </div>
    </div>
  );
}
