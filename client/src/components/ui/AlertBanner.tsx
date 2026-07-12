import type { ReactNode } from 'react';

interface Props {
  type: 'error' | 'success' | 'warning';
  message: string;
  onDismiss?: () => void;
  actions?: ReactNode;
}

const STYLES = {
  error: 'border-gray-200 bg-black text-white',
  success: 'border-gray-200 bg-white text-black',
  warning: 'border-gray-200 border-l-4 bg-white text-black font-bold',
};

const DISMISS_STYLES = {
  error: 'text-black hover:text-white',
  success: 'text-black hover:text-black',
  warning: 'text-black hover:text-black',
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
          <button onClick={onDismiss} className={`font-bold font-sans ${DISMISS_STYLES[type]}`}>
            &times;
          </button>
        )}
      </div>
    </div>
  );
}
