import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { LedgerType, StockItemType, GodownType } from "../../../types/api";
import type { ActiveField } from "../hooks/useVoucherForm";
import { SearchInput } from "../../../components/ui";

interface Props {
  isOpen: boolean;
  activeField: ActiveField | null;
  ledgers: LedgerType[];
  stockItems: StockItemType[];
  godowns: GodownType[];
  loading: boolean;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onSelect: (item: any) => void;
  onClose: () => void;
  checkIsCashOrBank: (ledger: LedgerType | null) => boolean;
  checkLedgerGroup: (ledger: LedgerType | null, targetGroupNames: string[]) => boolean;
  voucherType: string;
  onInlineCreate?: (type: "ledger" | "stockItem" | "godown") => void;
}

export default function LedgerPanel({
  isOpen,
  activeField,
  ledgers,
  stockItems,
  godowns,
  loading,
  searchTerm,
  onSearchChange,
  onSelect,
  onClose,
  checkIsCashOrBank,
  checkLedgerGroup,
  voucherType,
  onInlineCreate
}: Props) {
  const navigate = useNavigate();
  const [highlightIndex, setHighlightIndex] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  // 1. Determine what content we are listing
  const isStockItem = activeField?.type === "stockItem";
  const isGodown = activeField?.type === "stockGodown";

  // 2. Filter the items list based on search and context-aware business rules
  let itemsList: any[] = [];
  let title = "List of Ledger Accounts";
  let createPath = "/master/create/ledger";
  let createLabel = "+ Create Ledger";

  if (isStockItem) {
    title = "List of Stock Items";
    createPath = "/master/create/stock-item";
    createLabel = "+ Create Stock Item";
    itemsList = stockItems.filter(item =>
      !searchTerm ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.alias && item.alias.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  } else if (isGodown) {
    title = "List of Godowns";
    createPath = "/master/create/godown";
    createLabel = "+ Create Godown";
    itemsList = godowns.filter(godown =>
      !searchTerm ||
      godown.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  } else {
    // Ledgers filtering logic
    let tempLedgers = ledgers;

    if (activeField?.type === "particular") {
      if (voucherType === "Contra") {
        tempLedgers = ledgers.filter(l => checkIsCashOrBank(l));
      }
    } else if (activeField?.type === "party") {
      title = "List of Party Ledgers";
      tempLedgers = ledgers.filter(l => checkLedgerGroup(l, ["bank accounts", "bank od accounts", "bank od a/c", "bank od account", "cash-in-hand", "sundry debtors", "sundry creditors"]));
    } else if (activeField?.type === "salesPurchase") {
      title = `List of ${voucherType} Ledgers`;
      tempLedgers = ledgers.filter(l => checkLedgerGroup(l, voucherType === "Sales" ? ["sales accounts"] : ["purchase accounts"]));
    }

    itemsList = tempLedgers.filter(l =>
      !searchTerm ||
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.alias && l.alias.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }

  useEffect(() => {
    setHighlightIndex(0);
  }, [searchTerm, activeField]);

  useEffect(() => {
    if (isOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen, activeField]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex(i => Math.min(i + 1, itemsList.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex(i => Math.max(i - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (itemsList.length > 0 && highlightIndex < itemsList.length) {
          onSelect(itemsList[highlightIndex]);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, itemsList, highlightIndex, onSelect, onClose]);

  if (!isOpen) return null;

  return (
    <div className="w-80 border-l border-zinc-200 flex flex-col shrink-0 bg-white shadow-lg animate-fade-in font-sans">
      <div className="bg-zinc-900 text-white px-3 py-2 text-xs font-semibold uppercase tracking-wider flex justify-between items-center select-none">
        <span>{title}</span>
        <button onClick={onClose} className="text-sm font-bold hover:text-zinc-300 transition-colors">&times;</button>
      </div>

      <div className="p-2 border-b border-zinc-100 bg-zinc-50/50">
        <SearchInput
          value={searchTerm}
          onChange={onSearchChange}
          placeholder={`Search ${isStockItem ? 'items' : isGodown ? 'godowns' : 'accounts'}...`}
        />
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-zinc-100">
        <div
          className="px-3 py-2 text-xs cursor-pointer hover:bg-zinc-50 text-zinc-900 font-semibold flex items-center gap-1.5 transition-colors"
          onClick={() => {
            if (onInlineCreate) {
              const targetType = isStockItem ? "stockItem" : isGodown ? "godown" : "ledger";
              onInlineCreate(targetType);
            } else {
              navigate(createPath);
            }
          }}
        >
          <span className="text-zinc-400 font-normal">+</span> {createLabel}
        </div>
        {loading && (
          <div className="px-3 py-3 text-xs text-zinc-400 italic">Loading list...</div>
        )}
        {!loading && itemsList.length === 0 && (
          <div className="px-3 py-3 text-xs text-zinc-400 italic">No matching items found</div>
        )}
          {!loading && itemsList.map((item, idx) => {
            const isSelected = idx === highlightIndex;
            const balance = (item as LedgerType).closing_balance || (item as LedgerType).opening_balance;
            const balanceDisplay = balance ? (balance > 0 ? `${Math.abs(balance).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Dr` : `${Math.abs(balance).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`) : '';
            return (
              <div
                key={item.ledger_id || item.item_id || item.godown_id}
                className={`px-3 py-2 text-xs cursor-pointer flex justify-between items-center transition-colors ${
                  isSelected ? "bg-zinc-900 text-white font-medium" : "hover:bg-zinc-50 text-zinc-800"
                }`}
                onClick={() => onSelect(item)}
                onMouseEnter={() => setHighlightIndex(idx)}
              >
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="truncate text-xs">{item.name}</span>
                  {item.alias && (
                    <span className={`text-[10px] truncate ${isSelected ? "text-zinc-300" : "text-zinc-400"}`}>
                      ({item.alias})
                    </span>
                  )}
                  {!isStockItem && !isGodown && balanceDisplay && (
                    <span className={`text-[10px] ${isSelected ? "text-zinc-300" : "text-zinc-500"} font-sans italic`}>
                      Bal: {balanceDisplay}
                    </span>
                  )}
                </div>
                {/* Extra context metadata based on type */}
                {!isStockItem && !isGodown && item.group_name && (
                  <span className={`text-[10px] shrink-0 ml-2 font-sans px-1.5 py-0.5 rounded ${
                    isSelected ? "bg-zinc-800 text-zinc-300" : "bg-zinc-100 text-zinc-600"
                  }`}>
                    {item.group_name}
                  </span>
                )}
                {isStockItem && item.part_number && (
                  <span className={`text-[10px] shrink-0 ml-2 font-sans px-1.5 py-0.5 rounded ${
                    isSelected ? "bg-zinc-800 text-zinc-300" : "bg-zinc-100 text-zinc-600"
                  }`}>
                    {item.part_number}
                  </span>
                )}
              </div>
            );
          })}
      </div>

      <div className="px-3 py-1.5 text-[10px] text-zinc-400 border-t border-zinc-100 bg-zinc-50 select-none uppercase tracking-wider font-semibold">
        &bull; End of List
      </div>
    </div>
  );
}
