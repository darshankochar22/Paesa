import type { ReactNode } from 'react';

interface Props {
  type: 'error' | 'success';
  message: string;
  onDismiss?: () => void;
  actions?: ReactNode;
}

const STYLES = {
  error: { box: 'border-red-200 text-red-700', btn: 'text-red-500 hover:text-red-700' },
  success: { box: 'border-green-200 text-green-700', btn: 'text-green-500 hover:text-green-700' },
};

/**
 * Shared success/error notification banner.
 * Reproduces the Group Creation screen's inline banner: a bordered strip with a
 * message on the left and a "dismiss" link on the right. Colored (red = error,
 * green = success) by explicit product decision.
 */
export default function NotificationBanner({ type, message, onDismiss, actions }: Props) {
  const s = STYLES[type];
  return (
    <div
      className={`mt-4 mb-4 p-2 border ${s.box} text-sm flex justify-between items-center`}
      role={type === 'error' ? 'alert' : 'status'}
    >
      <span>{message}</span>
      <div className="flex items-center gap-3">
        {actions}
        {onDismiss && (
          <button onClick={onDismiss} className={`${s.btn} text-xs`}>
            dismiss
          </button>
        )}
      </div>
    </div>
  );
}
