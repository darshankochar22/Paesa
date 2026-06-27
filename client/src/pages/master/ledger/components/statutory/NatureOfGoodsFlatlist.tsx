import type { TCSNatureOfGoodsType } from "@/types/entities/TCSNatureOfGoods";

/** Virtual entries Tally always shows first, regardless of saved data. */
const PINNED_VALUES = ["Any", "Undefined"] as const;

interface NatureOfGoodsFlatListProps {
  items: TCSNatureOfGoodsType[];
  selectedValue?: string | null;
  onSelect?: (value: string, record?: TCSNatureOfGoodsType) => void;
  onCreate?: () => void;
  onClose?: () => void;
  title?: string;
  showHeader?: boolean;
  loading?: boolean;
}

export default function NatureOfGoodsFlatList({
  items,
  selectedValue,
  onSelect,
  onCreate,
  onClose,
  title,
  showHeader = true,
  loading = false,
}: NatureOfGoodsFlatListProps) {
  const sortedItems = items
    .filter((item): item is TCSNatureOfGoodsType & { name: string } => Boolean(item.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  const Header = showHeader && (
    <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 bg-zinc-50 select-none">
      <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
        {title || "List of Nature of Goods"}
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
  );

  const renderRow = (key: string, label: string, isSelected: boolean, onClick: () => void) => (
    <div
      key={key}
      className={`flex items-center min-h-[28px] px-3 cursor-pointer text-[13px] select-none ${
        isSelected ? "bg-zinc-100 font-semibold text-black" : "text-zinc-700 hover:bg-zinc-50"
      }`}
      onClick={onClick}
    >
      <span className="truncate">{label}</span>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white">
      {Header}
      <div className="flex-1 overflow-y-auto">
        {PINNED_VALUES.map((label) =>
          renderRow(`pinned-${label}`, label, selectedValue === label, () => onSelect?.(label))
        )}

        {loading && <div className="text-sm text-zinc-400 px-3 py-2">Loading…</div>}

        {!loading && sortedItems.length === 0 && (
          <div className="text-sm text-zinc-400 px-3 py-2">No saved Nature of Goods</div>
        )}

        {!loading &&
          sortedItems.map((item) =>
            renderRow(
              String(item.tcs_id ?? item.name),
              item.name,
              selectedValue === item.name,
              () => onSelect?.(item.name, item)
            )
          )}
      </div>
    </div>
  );
}
