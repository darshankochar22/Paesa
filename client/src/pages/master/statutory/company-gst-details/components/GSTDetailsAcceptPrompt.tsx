// TallyPrime-style "Accept?" confirmation popup shown at end of field navigation.

interface GSTDetailsAcceptPromptProps {
  loading: boolean;
  onAccept: () => void;
  onCancel: () => void;
}

export default function GSTDetailsAcceptPrompt({
  loading,
  onAccept,
  onCancel,
}: GSTDetailsAcceptPromptProps) {
  return (
    <div className="absolute bottom-6 right-6 bg-white border-2 border-sky-400 w-[160px] rounded shadow-2xl p-3 flex flex-col items-center z-[10000] font-sans animate-fade-in">
      <h4 className="font-bold text-zinc-900 text-[11px] mb-3">Accept?</h4>
      <div className="flex items-center gap-4 w-full justify-center">
        <button
          onClick={onAccept}
          disabled={loading}
          className="text-xs px-3 py-0.5 border border-zinc-300 hover:bg-zinc-50 text-zinc-800 font-bold focus:outline-none min-w-[50px] text-center disabled:opacity-50 transition-colors"
        >
          <span className="text-zinc-500 font-extrabold mr-1">Y:</span>Yes
        </button>
        <button
          onClick={onCancel}
          className="text-xs px-3 py-0.5 border border-zinc-300 hover:bg-zinc-50 text-zinc-800 font-bold focus:outline-none min-w-[50px] text-center transition-colors"
        >
          <span className="text-zinc-500 font-extrabold mr-1">N:</span>No
        </button>
      </div>
    </div>
  );
}
