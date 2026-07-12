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
    <div className="px-3 py-3 border-t border-gray-200 flex justify-between items-center bg-white shrink-0">
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
          className="text-xs text-black hover:text-black transition-colors font-medium"
        >
          &larr; {cancelLabel}
        </button>
      )}

      <div className="flex gap-3">
        {onDelete && (
          <button
            onClick={onCancel}
            className="text-xs px-4 py-1.5 rounded border border-gray-200 bg-white text-black hover:bg-black/[0.03] shadow-sm transition-colors"
          >
            Back
          </button>
        )}
        <button
          data-enter-accept
          onClick={onSubmit}
          disabled={loading || disabled}
          className="text-xs px-5 py-1.5 rounded bg-black text-white hover:bg-black/[0.03] disabled:opacity-50 shadow-sm transition-colors font-medium"
        >
          {loading ? 'Saving…' : submitLabel}
        </button>
      </div>
    </div>
  );
}
