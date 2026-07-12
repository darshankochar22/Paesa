import { PRIORITY, useShortcuts, type ShortcutBinding } from '@/lib/shortcuts';

// TallyPrime-style Yes/No confirmation — a plain centered box asking a question
// with "Yes or No" beneath it. Y confirms, N / Esc dismisses, Enter picks the
// default (No, the safe choice). Strict black/white/gray to match the theme.

interface Props {
  open: boolean;
  /** The question, e.g. "Cancel ?". */
  message?: string;
  onYes: () => void;
  onNo: () => void;
  /** Which choice Enter selects and which is emphasised. Default: 'no'. */
  defaultChoice?: 'yes' | 'no';
}

export default function TallyConfirm({
  open,
  message = 'Cancel ?',
  onYes,
  onNo,
  defaultChoice = 'no',
}: Props) {
  const bindings: ShortcutBinding[] = open
    ? [
        { keys: 'Y', handler: onYes },
        { keys: 'N', handler: onNo },
        { keys: 'Escape', handler: onNo },
        { keys: 'Enter', handler: () => (defaultChoice === 'yes' ? onYes() : onNo()) },
      ].map((b) => ({ ...b, capture: true, allowInInputs: true, allowInDialogs: true }))
    : [];
  // DIALOG priority + capture: these win over everything while the prompt is up.
  useShortcuts(bindings, { priority: PRIORITY.DIALOG, enabled: open });

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label={message}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/10"
    >
      <div className="bg-white border border-zinc-400 shadow-xl w-64 h-64 flex flex-col font-mono select-none">
        <div className="flex-1 flex items-center justify-center text-sm text-zinc-900">
          {message}
        </div>
        <div className="pb-5 text-center text-sm text-zinc-800">
          <button onClick={onYes} className="hover:underline focus:outline-none">
            <span className="underline">Y</span>es
          </button>
          <span className="text-zinc-500"> or </span>
          <button
            onClick={onNo}
            className={`focus:outline-none ${defaultChoice === 'no' ? 'font-bold underline' : 'hover:underline'}`}
          >
            <span className="underline">N</span>o
          </button>
        </div>
      </div>
    </div>
  );
}
