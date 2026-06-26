import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/shadcn/dialog";
import { Input } from "@/components/shadcn/input";

interface CommandItem {
  title: string;
  path: string;
  category: string;
  description?: string;
}

interface ReportCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  items: CommandItem[];
}

export function ReportCommandPalette({
  isOpen,
  onClose,
  onSelect,
  items,
}: ReportCommandPaletteProps) {
  const [search, setSearch] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);

  const filteredItems = React.useMemo(() => {
    if (!search.trim()) return items;
    const s = search.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(s) ||
        (item.description && item.description.toLowerCase().includes(s)) ||
        item.category.toLowerCase().includes(s)
    );
  }, [items, search]);

  React.useEffect(() => {
    if (isOpen) {
      setSearch("");
      setActiveIndex(0);
    }
  }, [isOpen]);

  React.useEffect(() => {
    setActiveIndex(0);
  }, [filteredItems]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[activeIndex]) {
        onSelect(filteredItems[activeIndex].path);
        onClose();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-white text-zinc-900 border border-zinc-200 p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-zinc-200">
          <DialogTitle className="text-zinc-900 font-bold text-sm">Go To Report / Search</DialogTitle>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type report name, category..."
            className="mt-2 text-xs h-9 border-zinc-300 focus:border-zinc-800 focus:ring-zinc-400 text-zinc-900"
            autoFocus
            onKeyDown={handleKeyDown}
          />
        </DialogHeader>
        <div className="max-h-72 overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <div className="text-xs text-zinc-500 text-center py-6">No matching reports found</div>
          ) : (
            filteredItems.map((item, idx) => {
              const isActive = idx === activeIndex;
              return (
                <div
                  key={item.path}
                  onClick={() => {
                    onSelect(item.path);
                    onClose();
                  }}
                  className={`flex flex-col px-3 py-2 rounded-md cursor-pointer select-none text-left ${
                    isActive ? "bg-zinc-100 text-zinc-900 border border-zinc-200" : "hover:bg-zinc-50 text-zinc-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{item.title}</span>
                    <span className="text-[10px] text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded uppercase font-bold">
                      {item.category}
                    </span>
                  </div>
                  {item.description && (
                    <span className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">{item.description}</span>
                  )}
                </div>
              );
            })
          )}
        </div>
        <div className="bg-zinc-50 border-t border-zinc-200 px-4 py-2 flex items-center justify-between text-[10px] text-zinc-500 font-medium">
          <span>Use ↑↓ arrows to navigate, Enter to select, Esc to close</span>
          <span>{filteredItems.length} reports</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
