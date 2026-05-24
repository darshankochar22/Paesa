import type { GroupType } from "@/types/api";

interface GroupFlatListProps {
  groups: GroupType[];
  selectedId?: number | null;
  onSelect?: (group: GroupType) => void;
  onCreate?: () => void;
  onClose?: () => void;
  title?: string;
  showHeader?: boolean;
}

export default function GroupFlatList({
  groups,
  selectedId,
  onSelect,
  onCreate,
  onClose,
  title,
  showHeader = true,
}: GroupFlatListProps) {
  const sortedGroups = [...groups].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  if (!groups || groups.length === 0) {
    return (
      <div className="flex flex-col h-full bg-white">
        {showHeader && (
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 bg-zinc-50 select-none">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              {title || "List of Groups"}
            </span>
            <div className="flex items-center gap-3">
              {onCreate && (
                <button
                  onClick={onCreate}
                  className="text-[11px] text-zinc-500 hover:text-zinc-800 font-medium transition-colors"
                >
                  + Create
                </button>
              )}
              {onClose && (
                <button
                  onClick={onClose}
                  className="text-sm font-bold text-zinc-400 hover:text-zinc-800 transition-colors"
                >
                  &times;
                </button>
              )}
            </div>
          </div>
        )}
        <div className="text-sm text-zinc-400 p-4">No groups found</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {showHeader && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 bg-zinc-50 select-none">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
            {title || "List of Groups"}
          </span>
          <div className="flex items-center gap-3">
            {onCreate && (
              <button
                onClick={onCreate}
                className="text-[11px] text-zinc-500 hover:text-zinc-800 font-medium transition-colors"
              >
                + Create
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="text-sm font-bold text-zinc-400 hover:text-zinc-800 transition-colors"
              >
                &times;
              </button>
            )}
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {sortedGroups.map((group) => {
          const isSelected = group.group_id === selectedId;
          return (
            <div
              key={group.group_id}
              className={`flex items-center min-h-[28px] px-3 cursor-pointer text-[13px] select-none ${
                isSelected
                  ? "bg-zinc-100 font-semibold text-black"
                  : "text-zinc-700 hover:bg-zinc-50"
              }`}
              onClick={() => onSelect?.(group)}
            >
              <span className="truncate">{group.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
