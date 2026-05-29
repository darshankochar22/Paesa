export interface RightPanelAction {
  key: string;           
  label: string;         
  onClick: () => void;   
  active?: boolean;      
  disabled?: boolean;   
  shortcutKey?: string; 
}

interface Props {
  actions: RightPanelAction[];
  title?: string;
  className?: string;
}

export default function RightActionPanel({ actions, title = "Actions", className = "" }: Props) {
  return (
    <div className={`w-44 border-l border-zinc-200 flex flex-col shrink-0 bg-white select-none sticky right-0 top-0 h-full z-20 ${className}`}>
      {/* Header */}
      <div className="bg-white text-zinc-800 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-center border-b border-zinc-200">
        {title}
      </div>

      {/* Buttons List */}
      <div className="flex-1 flex flex-col divide-y divide-zinc-100 overflow-y-auto min-h-0 bg-white">
        {actions.map((act) => {
          const btnClass = act.active
            ? "text-zinc-950 font-bold border-l-4 border-zinc-950 bg-white"
            : act.disabled
            ? "text-zinc-300 bg-white cursor-not-allowed"
            : "text-zinc-650 hover:text-zinc-950 hover:bg-zinc-50/50 bg-white active:bg-zinc-100 border-l-4 border-transparent";

          return (
            <button
              key={`${act.key}-${act.label}`}
              onClick={() => {
                if (!act.disabled) act.onClick();
              }}
              disabled={act.disabled}
              className={`w-full py-2.5 px-3 flex items-center justify-between text-left transition-all focus:outline-none ${btnClass}`}
              title={act.disabled ? undefined : `Press ${act.key} on keyboard`}
            >
              {/* Action Description */}
              <span className="text-[10px] font-bold uppercase tracking-wide font-sans truncate pr-2">
                {act.label}
              </span>

              {/* Shortcut Key Badge */}
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider shrink-0 ${
                  act.active
                    ? "bg-zinc-950 text-white border-zinc-950"
                    : act.disabled
                    ? "border-zinc-200 text-zinc-300 bg-white"
                    : "bg-white text-zinc-700 border-zinc-300"
                }`}
              >
                {act.key}
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-2 border-t border-zinc-200 bg-white text-[9px] text-zinc-400 font-bold uppercase text-center tracking-wider">
        &bull; TALLY BAR &bull;
      </div>
    </div>
  );
}
