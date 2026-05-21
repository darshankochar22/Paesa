import type { ReactNode } from "react";

interface Props {
  type: "error" | "success";
  message: string;
  onDismiss?: () => void;
  /** Extra buttons / links to render next to dismiss */
  actions?: ReactNode;
}

const STYLES = {
  error:   "border-zinc-300 bg-zinc-900 text-white",
  success: "border-zinc-200 bg-zinc-50 text-zinc-800",
};

const DISMISS_STYLES = {
  error:   "text-zinc-400 hover:text-white",
  success: "text-zinc-400 hover:text-zinc-900",
};

export default function AlertBanner({ type, message, onDismiss, actions }: Props) {
  return (
    <div
      className={`px-3 py-1.5 border-b text-xs flex justify-between items-center transition-all animate-slide-down ${STYLES[type]}`}
    >
      <span className="font-semibold">• {message}</span>
      <div className="flex items-center gap-3">
        {actions}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`font-bold font-sans ${DISMISS_STYLES[type]}`}
          >
            &times;
          </button>
        )}
      </div>
    </div>
  );
}
