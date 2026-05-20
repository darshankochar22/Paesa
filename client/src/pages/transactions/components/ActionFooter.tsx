interface Props {
  onAccept: () => void;
  onCancelVch: () => void;
  onQuit: () => void;
  isSubmitting: boolean;
  canAccept: boolean;
}

export default function ActionFooter({ onAccept, onCancelVch, onQuit, isSubmitting, canAccept }: Props) {
  return (
    <div className="border-t border-black bg-white px-4 py-2 flex items-center justify-between">
      <button
        onClick={onQuit}
        className="text-sm px-3 py-1 text-gray-600 hover:text-black hover:underline"
      >
        <span className="underline decoration-dotted">Q</span>: Quit
      </button>

      <div className="flex items-center gap-3">
        <button
          onClick={onAccept}
          disabled={isSubmitting || !canAccept}
          className="text-sm px-5 py-1 rounded bg-black text-white font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span className="underline decoration-dotted">A</span>: Accept
        </button>
        <button
          onClick={onCancelVch}
          className="text-sm px-3 py-1 text-gray-600 hover:text-black"
        >
          Cancel Vch
        </button>
      </div>
    </div>
  );
}
