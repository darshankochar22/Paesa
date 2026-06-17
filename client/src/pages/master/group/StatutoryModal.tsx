import { useEffect } from "react";
import { TOGGLE_META, type StatutoryToggle } from "@/config/statutoryConfig";

interface StatutoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupName?: string;
  toggles: StatutoryToggle[];
  /** Current toggle values from parent form (0 or 1) */
  values: Record<StatutoryToggle, number>;
  /** Called when a toggle is clicked */
  onToggle: (key: StatutoryToggle) => void;
  /** Called to open the sub-modal for a toggle (only when setting to Yes) */
  onOpenSubModal: (key: StatutoryToggle) => void;
}

export default function StatutoryModal({
  isOpen,
  onClose,
  groupName,
  toggles,
  values,
  onToggle,
  onOpenSubModal,
}: StatutoryModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white border border-zinc-300 shadow-2xl w-[480px] flex flex-col">
        <div className="px-4 py-2 border-b border-zinc-300 text-center">
          <span className="text-[13px] font-semibold text-zinc-900">
            Tax Details for {groupName || "Group"}
          </span>
        </div>

        <div className="px-6 py-5 bg-white">
          {toggles.length === 0 ? (
            <div className="text-sm text-zinc-500 text-center py-4">
              No applicable tax details
            </div>
          ) : (
            toggles.map((key) => {
              const current = values[key] === 1;
              const meta = TOGGLE_META[key];
              const handleClick = () => {
                onToggle(key);
                if (!current) setTimeout(() => onOpenSubModal(key), 0);
              };
              return (
                <div key={key} className="flex items-center gap-2 mb-3 last:mb-0">
                  <span className="text-[13px] text-zinc-700 w-60 shrink-0">
                    {meta.label}
                  </span>
                  <span className="text-zinc-400 mr-3">:</span>
                  <button
                    type="button"
                    onClick={handleClick}
                    className="text-[13px] py-0.5 px-2 min-w-[28px] text-center font-medium hover:bg-zinc-100"
                  >
                    {current ? "Yes" : "No"}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="px-4 py-3 border-t border-zinc-300 flex justify-end gap-2 bg-zinc-50">
          <button
            onClick={onClose}
            className="text-xs px-5 py-1.5 border border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
