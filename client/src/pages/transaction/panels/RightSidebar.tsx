interface Props {
  voucherType: string;
  onTypeChange: (t: string) => void;
  status: string;
  onStatusChange: () => void;
  entryMode: "single" | "double";
  onEntryModeChange: () => void;
  onDateClick: () => void;
  onCreateLedger: () => void;
  onAccept: () => void;
  onQuit: () => void;
  canAccept: boolean;
}

const VOUCHER_TYPES = [
  { key: "F4", label: "Contra" },
  { key: "F5", label: "Payment" },
  { key: "F6", label: "Receipt" },
  { key: "F7", label: "Journal" },
  { key: "F8", label: "Sales" },
  { key: "F9", label: "Purchase" },
] as const;

export default function RightSidebar({
  voucherType,
  onTypeChange,
  status,
  onStatusChange,
  entryMode,
  onEntryModeChange,
  onDateClick,
  onCreateLedger,
  onAccept,
  onQuit,
  canAccept,
}: Props) {
  return (
    <div className="w-36 border-l border-black flex flex-col shrink-0 bg-white">
      {/* F2: Date */}
      <div className="border-b border-black px-2 py-1">
        <button
          onClick={onDateClick}
          className="w-full text-left text-xs text-black hover:underline"
        >
          <span className="text-gray-500">F2</span>: Date
        </button>
      </div>

      {VOUCHER_TYPES.map(({ key, label }) => (
        <div key={key} className="border-b border-gray-200">
          <button
            onClick={() => onTypeChange(label)}
            className={`w-full text-left px-2 py-1 text-xs ${
              voucherType === label
                ? "bg-black text-white font-semibold"
                : "text-black hover:bg-gray-100"
            }`}
          >
            <span className={voucherType === label ? "text-gray-300" : "text-gray-500"}>
              {key}
            </span>
            : {label}
          </button>
        </div>
      ))}

      <div className="border-b border-gray-200">
        <button
          onClick={onCreateLedger}
          className="w-full text-left px-2 py-1 text-xs text-black hover:bg-gray-100"
        >
          <span className="text-gray-500">Alt+C</span>: Create Ldgr
        </button>
      </div>

      <div className="border-b border-gray-200">
        <button
          onClick={onStatusChange}
          className="w-full text-left px-2 py-1 text-xs text-black hover:bg-gray-100"
        >
          <span className="text-gray-500">T</span>:{" "}
          {status === "Post-Dated" ? "✓ " : ""}Post-Dated
        </button>
      </div>

      {voucherType === "Contra" && (
        <div className="border-b border-gray-200">
          <button
            onClick={onEntryModeChange}
            className="w-full text-left px-2 py-1 text-xs text-black hover:bg-gray-100"
          >
            <span className="text-gray-500">H</span>:{" "}
            {entryMode === "double" ? "✓ " : ""}Double Entry
          </button>
        </div>
      )}

      <div className="flex-1" />
      <div className="border-t border-black px-2 py-1">
        <button
          onClick={onAccept}
          disabled={!canAccept}
          className="w-full text-left text-xs text-black hover:underline disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          <span className="text-gray-500">A</span>: Accept
        </button>
      </div>

      <div className="border-t border-gray-300 px-2 py-1">
        <button
          onClick={onQuit}
          className="w-full text-left text-xs text-black hover:underline"
        >
          <span className="text-gray-500">Q</span>: Quit
        </button>
      </div>
    </div>
  );
}