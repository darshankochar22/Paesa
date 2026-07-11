interface Props {
  onCancel: () => void;
  onSubmit: () => void;
  onDelete?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  deleteLabel?: string;
  loading?: boolean;
  disabled?: boolean;
}

export default function MasterFormFooter({
  onCancel,
  onSubmit,
  onDelete,
  submitLabel = 'Accept',
  cancelLabel = 'Back to Masters',
  deleteLabel = 'Delete',
  loading,
  disabled,
}: Props) {
  return (
    <div className="px-3 py-3 border-t border-zinc-200 flex justify-between items-center bg-zinc-50 shrink-0">
      {onDelete ? (
        <button
          onClick={onDelete}
          disabled={loading}
          className="text-xs px-4 py-1.5 rounded border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 disabled:opacity-50 transition-colors font-medium shadow-sm"
        >
          {deleteLabel}
        </button>
      ) : (
        <button
          onClick={onCancel}
          disabled={loading}
          className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors font-medium"
        >
          &larr; {cancelLabel}
        </button>
      )}

      <div className="flex gap-3">
        {onDelete && (
          <button
            onClick={onCancel}
            className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 shadow-sm transition-colors"
          >
            Back
          </button>
        )}
        <button
          data-enter-accept
          onClick={onSubmit}
          disabled={loading || disabled}
          className="text-xs px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 shadow-sm transition-colors font-medium"
        >
          {loading ? 'Saving…' : submitLabel}
        </button>
      </div>
    </div>
  );
}
