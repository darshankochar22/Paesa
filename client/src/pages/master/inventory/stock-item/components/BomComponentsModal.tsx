import { useState, useEffect, useRef } from "react";
import type { StockItemType } from "@/types/entities/StockItem";
import type { GodownType } from "@/types/entities/Godown";

export interface BomEntry {
  bomName: string;
  unitOfManufacture: string;
  items: { item: string; godown: string; quantity: string }[];
}

interface BomComponentsModalProps {
  bomName: string;
  stockItemName: string;
  stockItems: StockItemType[];
  godowns: GodownType[];
  onClose: () => void;
  onAccept: (entry: BomEntry) => void;
}

const EMPTY_ROW = { item: "", godown: "", quantity: "" };

type ActivePopup = { rowIndex: number; field: "item" | "godown" } | null;

export default function BomComponentsModal({
  bomName,
  stockItemName,
  stockItems,
  godowns,
  onClose,
  onAccept,
}: BomComponentsModalProps) {
  const [unitOfManufacture, setUnitOfManufacture] = useState("");
  const [items, setItems] = useState([{ ...EMPTY_ROW }, { ...EMPTY_ROW }, { ...EMPTY_ROW }]);
  const [activePopup, setActivePopup] = useState<ActivePopup>(null);
  const unitRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => { unitRef.current?.focus(); }, []);

  const updateItem = (i: number, key: keyof typeof EMPTY_ROW, v: string) =>
    setItems(prev => prev.map((x, j) => (j === i ? { ...x, [key]: v } : x)));

  const addRowIfNeeded = (i: number) => {
    if (i === items.length - 1) {
      setItems(prev => [...prev, { ...EMPTY_ROW }]);
    }
  };

  const accept = () => {
    onAccept({
      bomName,
      unitOfManufacture,
      items: items.filter(r => r.item.trim()),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      if (activePopup) { setActivePopup(null); return; }
      e.preventDefault(); onClose();
    }
    if (e.altKey && e.key.toLowerCase() === "a") { e.preventDefault(); accept(); }
  };

  const selectStockItem = (name: string) => {
    if (activePopup) {
      updateItem(activePopup.rowIndex, "item", name);
      addRowIfNeeded(activePopup.rowIndex);
    }
    setActivePopup(null);
  };

  const selectGodown = (name: string) => {
    if (activePopup) {
      updateItem(activePopup.rowIndex, "godown", name);
    }
    setActivePopup(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* BOM detail modal */}
      <div className="bg-white border border-zinc-400 w-[480px] flex flex-col shadow-xl" style={{ minHeight: 300 }}>
        {/* Header fields */}
        <div className="px-4 pt-3 pb-2 border-b border-zinc-200 space-y-0.5">
          <div className="flex items-center min-h-[22px] text-sm">
            <span className="w-44 text-zinc-600 shrink-0">BoM Name</span>
            <span className="text-zinc-400 mr-2">:</span>
            <span className="font-semibold text-zinc-900">{bomName}</span>
          </div>
          <div className="flex items-center min-h-[22px] text-sm">
            <span className="w-44 text-zinc-600 shrink-0">Components of</span>
            <span className="text-zinc-400 mr-2">:</span>
            <span className="font-semibold text-zinc-900">{stockItemName}</span>
          </div>
          <div className="flex items-center min-h-[22px] text-sm">
            <span className="w-44 text-zinc-600 shrink-0">Unit of manufacture</span>
            <span className="text-zinc-400 mr-2">:</span>
            <input
              ref={unitRef}
              className="flex-1 border-b border-zinc-400 bg-yellow-50 px-1 py-0 text-sm outline-none"
              value={unitOfManufacture}
              onChange={e => setUnitOfManufacture(e.target.value)}
            />
          </div>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[2fr_1.5fr_1fr] border-b border-zinc-300 px-0 bg-zinc-50">
          <div className="text-xs font-bold text-zinc-700 px-3 py-1.5 border-r border-zinc-200">Item</div>
          <div className="text-xs font-bold text-zinc-700 px-3 py-1.5 border-r border-zinc-200">Godown</div>
          <div className="text-xs font-bold text-zinc-700 px-3 py-1.5 text-right">Quantity</div>
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-y-auto" style={{ minHeight: 120 }}>
          {items.map((r, i) => (
            <div key={i} className="grid grid-cols-[2fr_1.5fr_1fr] border-b border-zinc-100 items-center">
              <input
                className="px-3 py-0.5 text-sm outline-none bg-transparent hover:bg-zinc-50 focus:bg-yellow-50 border-r border-zinc-200"
                value={r.item}
                onChange={e => updateItem(i, "item", e.target.value)}
                onFocus={() => setActivePopup({ rowIndex: i, field: "item" })}
              />
              <input
                className="px-3 py-0.5 text-sm outline-none bg-transparent hover:bg-zinc-50 focus:bg-yellow-50 border-r border-zinc-200"
                value={r.godown}
                onChange={e => updateItem(i, "godown", e.target.value)}
                onFocus={() => setActivePopup({ rowIndex: i, field: "godown" })}
              />
              <input
                className="px-3 py-0.5 text-sm outline-none bg-transparent text-right hover:bg-zinc-50 focus:bg-yellow-50 tabular-nums"
                value={r.quantity}
                onChange={e => updateItem(i, "quantity", e.target.value)}
                onFocus={() => setActivePopup(null)}
                onKeyDown={e => {
                  if (e.key === "Tab" && !e.shiftKey && i === items.length - 1) {
                    setItems(prev => [...prev, { ...EMPTY_ROW }]);
                  }
                }}
              />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-300 flex text-xs bg-zinc-50 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-1.5 border-r border-zinc-300 hover:bg-zinc-100 text-left px-3 transition-colors"
          >
            <span className="font-bold">Q</span>: Quit
          </button>
          <button
            onClick={accept}
            className="flex-1 py-1.5 hover:bg-zinc-100 text-left px-3 transition-colors"
          >
            <span className="font-bold">A</span>: Accept
          </button>
        </div>
      </div>

      {/* Stock Items selection panel */}
      {activePopup?.field === "item" && (
        <div
          ref={popupRef}
          className="absolute top-1/2 -translate-y-1/2 bg-white border border-zinc-300 shadow-xl flex flex-col"
          style={{ left: "calc(50% + 248px)", width: 240, maxHeight: 400 }}
        >
          <div className="bg-zinc-800 text-white text-xs font-bold px-3 py-1.5 flex justify-between items-center shrink-0">
            <span>List of Stock Items</span>
            <button onClick={() => setActivePopup(null)} className="text-white/70 hover:text-white font-bold">&times;</button>
          </div>
          <div className="px-3 py-1 text-xs text-zinc-500 border-b border-zinc-200 bg-zinc-50 text-right font-semibold shrink-0">
            Create
          </div>
          <div className="overflow-y-auto flex-1">
            <div className="px-3 py-1 text-xs text-zinc-500 border-b border-zinc-100 select-none">• End of List</div>
            {stockItems.map((s, idx) => (
              <div
                key={idx}
                className={[
                  "flex items-center justify-between px-3 py-0.5 text-sm cursor-pointer border-b border-zinc-50",
                  items[activePopup.rowIndex]?.item === s.name
                    ? "bg-amber-400 text-zinc-900 font-semibold"
                    : "hover:bg-zinc-100 text-zinc-800",
                ].join(" ")}
                onMouseDown={(e) => { e.preventDefault(); selectStockItem(s.name); }}
              >
                <span className="truncate">{s.name}</span>
                {s.opening_quantity != null && (
                  <span className="ml-2 text-xs tabular-nums shrink-0 text-zinc-500">
                    {s.opening_quantity < 0 ? `(-)${Math.abs(s.opening_quantity)}` : s.opening_quantity} nos
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Godowns selection panel */}
      {activePopup?.field === "godown" && godowns.length > 0 && (
        <div
          className="absolute top-1/2 -translate-y-1/2 bg-white border border-zinc-300 shadow-xl flex flex-col"
          style={{ left: "calc(50% + 248px)", width: 200, maxHeight: 320 }}
        >
          <div className="bg-zinc-800 text-white text-xs font-bold px-3 py-1.5 flex justify-between items-center shrink-0">
            <span>List of Godowns</span>
            <button onClick={() => setActivePopup(null)} className="text-white/70 hover:text-white font-bold">&times;</button>
          </div>
          <div className="overflow-y-auto flex-1">
            <div className="px-3 py-1 text-xs text-zinc-500 border-b border-zinc-100 select-none">• End of List</div>
            {godowns.map((g, idx) => (
              <div
                key={idx}
                className={[
                  "px-3 py-0.5 text-sm cursor-pointer border-b border-zinc-50",
                  items[activePopup.rowIndex]?.godown === g.name
                    ? "bg-amber-400 text-zinc-900 font-semibold"
                    : "hover:bg-zinc-100 text-zinc-800",
                ].join(" ")}
                onMouseDown={(e) => { e.preventDefault(); selectGodown(g.name); }}
              >
                {g.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
