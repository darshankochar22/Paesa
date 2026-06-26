import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import type { StockItemType } from "@/types/api";
import StockItemAlter from "@/pages/master/inventory/stock-item/StockItemAlter";
import StockItemCreate from "@/pages/master/inventory/stock-item/StockItemCreate";

type ActiveView = { mode: "list" } | { mode: "alter"; itemId: number } | { mode: "create" };

export default function StockItemSelectionLayout() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [stockItems, setStockItems] = useState<StockItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeView, setActiveView] = useState<ActiveView>({ mode: "list" });

  const refreshList = () => {
    if (!companyId) return;
    window.api.stockItem.getAll(companyId).then(r => {
      if (r.success) setStockItems(r.stockItems ?? []);
    });
  };

  useEffect(() => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true);
    window.api.stockItem.getAll(companyId).then(r => {
      if (r.success) setStockItems(r.stockItems ?? []);
      setLoading(false);
    });
  }, [companyId]);

  const filtered = useMemo(() => {
    const list = [...stockItems].sort((a, b) => a.name.localeCompare(b.name));
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(i => i.name.toLowerCase().includes(q) || (i.alias && i.alias.toLowerCase().includes(q)));
  }, [stockItems, search]);

  const totalRows = filtered.length + 1;

  useEffect(() => { setSelectedIndex(0); }, [search]);

  const goToItem = (item: StockItemType) => setActiveView({ mode: "alter", itemId: item.item_id });
  const goToCreate = () => setActiveView({ mode: "create" });
  const backToList = () => { refreshList(); setActiveView({ mode: "list" }); };

  useEffect(() => {
    if (activeView.mode !== "list") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); navigate(-1); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex(p => Math.min(p + 1, totalRows - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex(p => Math.max(p - 1, 0)); return; }
      if (e.key === "Enter" || (e.altKey && e.key.toLowerCase() === "a")) {
        e.preventDefault();
        if (selectedIndex === 0) goToCreate();
        else goToItem(filtered[selectedIndex - 1]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeView.mode, selectedIndex, filtered, totalRows, navigate]);

  // ✅ Full page — no wrapper
  if (activeView.mode === "alter") {
    return (
      <div className="h-full w-full">
        <StockItemAlter initialItemId={activeView.itemId} onDone={backToList} onCancel={backToList} />
      </div>
    );
  }

  if (activeView.mode === "create") {
    return (
      <div className="h-full w-full">
        <StockItemCreate onDone={backToList} onCancel={backToList} />
      </div>
    );
  }

  // List view — centered narrow panel
  return (
    <div className="flex h-full w-full items-start justify-center bg-gray-100 select-none" style={{ fontFamily: "system-ui, sans-serif" }}>
      <div className="flex flex-col w-[380px] h-full border-x border-zinc-300 bg-white">

        <div className="px-3 py-2 border-b border-zinc-300">
          <div className="text-center text-sm font-semibold mb-1">Name of Item</div>
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-zinc-300 px-2 py-1 text-sm outline-none focus:border-zinc-500 bg-white"
            placeholder=""
          />
        </div>

        <div className="bg-zinc-800 text-white text-sm font-semibold px-3 py-1">
          List of Stock Items
        </div>

        <div className="flex-1 overflow-y-auto">
          <div
            onClick={goToCreate}
            className={`px-3 py-1 text-sm cursor-pointer border-b border-zinc-100 ${
              selectedIndex === 0 ? "bg-zinc-200 font-semibold" : "hover:bg-zinc-50"
            }`}
          >
            Create
          </div>

          {loading ? (
            <div className="px-3 py-4 text-xs text-zinc-400 italic">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-4 text-xs text-zinc-400 italic">No stock items found.</div>
          ) : (
            filtered.map((item, idx) => {
              const rowIndex = idx + 1;
              const isSelected = rowIndex === selectedIndex;
              return (
                <div
                  key={item.item_id}
                  onClick={() => goToItem(item)}
                  onMouseEnter={() => setSelectedIndex(rowIndex)}
                  className={`px-3 py-1 text-sm cursor-pointer border-b border-zinc-100 ${
                    isSelected ? "bg-zinc-200 font-semibold" : "hover:bg-zinc-50"
                  }`}
                >
                  {item.name}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}