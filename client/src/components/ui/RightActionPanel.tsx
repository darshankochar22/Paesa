import { PRIORITY, useShortcuts, type ShortcutBinding } from '@/lib/shortcuts';

export interface RightPanelAction {
  key: string; // Keyboard shortcut label, e.g. "F4", "F5", "Esc", "Ctrl+A"
  label: string; // Description, e.g. "Contra", "Payment", "Quit", "Accept"
  onClick: () => void; // Action callback
  active?: boolean; // Whether this is the active mode/state
  disabled?: boolean; // Whether this action is disabled
  shortcutKey?: string; // Optional combo to bind when it differs from `key`, e.g. "Alt+F5"
  /** Fire this action's shortcut even while typing in an input (see lib/shortcuts defaults). */
  allowInInputs?: boolean;
}

interface Props {
  actions: RightPanelAction[];
  title?: string;
  className?: string;
  /**
   * Register each action's `shortcutKey ?? key` on the central shortcut
   * registry so the keys actually work — the badge and the handler stay one
   * source of truth. Opt-in: leave off for screens that still wire their own
   * keydown listeners for these keys (double-fire).
   */
  autoShortcuts?: boolean;
  /** Registry priority when autoShortcuts is on. Default PRIORITY.PANEL. */
  shortcutPriority?: number;
}

/**
 * Beautiful, premium Black & White Tally-style Right Action Panel.
 * Provides quick clickable action buttons with keyboard shortcut indicators.
 */
export default function RightActionPanel({
  actions,
  title = 'Actions',
  className = '',
  autoShortcuts = false,
  shortcutPriority = PRIORITY.PANEL,
}: Props) {
  const bindings: ShortcutBinding[] = autoShortcuts
    ? actions
        .filter((act) => !act.disabled && (act.shortcutKey ?? act.key))
        .map((act) => ({
          keys: act.shortcutKey ?? act.key,
          handler: act.onClick,
          allowInInputs: act.allowInInputs,
        }))
    : [];
  useShortcuts(bindings, { priority: shortcutPriority, enabled: autoShortcuts });

  return (
    <div
      className={`w-44 border-l border-gray-200 flex flex-col shrink-0 bg-white select-none sticky right-0 top-0 h-full z-20 ${className}`}
    >
      {/* Header */}
      <div className="bg-white text-black px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-center border-b border-gray-200">
        {title}
      </div>

      {/* Buttons List */}
      <div className="flex-1 flex flex-col divide-y divide-gray-200 overflow-y-auto min-h-0 bg-white">
        {actions.map((act) => {
          const btnClass = act.active
            ? 'text-black font-bold border-l-4 border-gray-200 bg-white'
            : act.disabled
              ? 'text-black bg-white cursor-not-allowed'
              : 'text-black hover:text-black hover:bg-black/[0.03]/50 bg-white active:bg-black/[0.06] border-l-4 border-transparent';

          return (
            <button
              key={`${act.key}-${act.label}`}
              data-enter-accept={act.label.toLowerCase() === 'accept' ? true : undefined}
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
                    ? 'bg-black text-white border-gray-200'
                    : act.disabled
                      ? 'border-gray-200 text-black bg-white'
                      : 'bg-white text-black border-gray-200'
                }`}
              >
                {act.key}
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-2 border-t border-gray-200 bg-white text-[9px] text-black font-bold uppercase text-center tracking-wider">
        &bull; ACTION BAR &bull;
      </div>
    </div>
  );
}
