import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { LedgerType } from "../../../types/api";

interface Props {
  isOpen: boolean;
  ledgers: LedgerType[];
  loading: boolean;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onSelect: (ledger: LedgerType) => void;
  onClose: () => void;
}

export default function LedgerPanel({ isOpen, ledgers, loading, searchTerm, onSearchChange, onSelect, onClose }: Props) {
  const navigate = useNavigate();
  const [highlightIndex, setHighlightIndex] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = ledgers.filter(l =>
    !searchTerm ||
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.alias && l.alias.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  useEffect(() => {
    setHighlightIndex(0);
  }, [searchTerm]);

  useEffect(() => {
    if (isOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex(i => Math.min(i + 1, filtered.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex(i => Math.max(i - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (filtered.length > 0 && highlightIndex < filtered.length) {
          onSelect(filtered[highlightIndex]);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, filtered, highlightIndex, onSelect, onClose]);

  if (!isOpen) return null;

  return (
    <div className="w-64 border-l border-black flex flex-col shrink-0 bg-white">
      <div className="bg-black text-white px-2 py-1 text-sm font-medium flex justify-between items-center">
        <span>List of Ledger Accounts</span>
        <button onClick={onClose} className="text-xs hover:underline">&times;</button>
      </div>

      <div className="p-1 border-b border-gray-300">
        <input
          ref={searchRef}
          type="text"
          className="w-full text-sm px-2 py-0.5 border border-gray-300 outline-none focus:border-black"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div
          className="px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-100 text-black border-b border-gray-100 font-medium"
          onClick={() => navigate("/master/create/ledger")}
        >
          + Create Ledger
        </div>
        {loading && (
          <div className="px-2 py-2 text-xs text-gray-400">Loading...</div>
        )}
        {!loading && filtered.map((ledger, idx) => (
          <div
            key={ledger.ledger_id}
            className={`px-2 py-1 text-sm cursor-pointer flex justify-between items-center border-b border-gray-100 ${idx === highlightIndex ? "bg-gray-200" : "hover:bg-gray-100"}`}
            onClick={() => onSelect(ledger)}
            onMouseEnter={() => setHighlightIndex(idx)}
          >
            <span className="text-black truncate">{ledger.name}</span>
            {ledger.alias && <span className="text-xs text-gray-400 ml-1 shrink-0">{ledger.alias}</span>}
          </div>
        ))}
      </div>

      <div className="px-2 py-1 text-xs text-gray-400 border-t border-gray-200 bg-gray-50">
        &bull; End of List
      </div>
    </div>
  );
}
