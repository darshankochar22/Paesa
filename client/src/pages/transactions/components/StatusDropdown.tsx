import { useEffect, useState, useRef } from "react";

interface Props {
  status: "Regular" | "Post-Dated";
  onChange: (status: "Regular" | "Post-Dated") => void;
  disabled?: boolean;
}

export default function StatusDropdown({ status, onChange, disabled = false }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(status === "Regular" ? 0 : 1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const options: Array<"Regular" | "Post-Dated"> = ["Regular", "Post-Dated"];

  const handleSelect = (option: "Regular" | "Post-Dated") => {
    onChange(option);
    setIsOpen(false);
  };

  useEffect(() => {
    setHighlightedIndex(status === "Regular" ? 0 : 1);
  }, [status]);

  useEffect(() => {
    if (!isOpen) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleSelect(options[highlightedIndex]);
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex(prev => Math.min(prev + 1, options.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - 1, 0));
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, highlightedIndex, options]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</span>
        <span className="text-zinc-400">:</span>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className={`text-xs px-2 py-0.5 rounded transition-colors font-semibold ${
            status === "Post-Dated"
              ? "bg-white text-zinc-700 hover:bg-zinc-50"
              : "bg-white text-zinc-700 hover:bg-zinc-50"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          {status}
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-zinc-200 rounded shadow-lg z-50 min-w-[140px] overflow-hidden">
          <div className="bg-zinc-100 px-3 py-1.5 text-[10px] font-bold text-zinc-600 uppercase tracking-wider border-b border-zinc-200">
            Select Status
          </div>
          {options.map((option, idx) => (
            <div
              key={option}
              className={`px-3 py-2 text-xs cursor-pointer transition-colors ${
                idx === highlightedIndex
                  ? "bg-zinc-900 text-white font-semibold"
                  : "hover:bg-zinc-50 text-zinc-800"
              }`}
              onClick={() => handleSelect(option)}
              onMouseEnter={() => setHighlightedIndex(idx)}
            >
              {option}
            </div>
          ))}
          <div className="px-3 py-1.5 text-[10px] text-zinc-400 bg-zinc-50 border-t border-zinc-100">
            ↑↓ Navigate • Enter: Select
          </div>
        </div>
      )}
    </div>
  );
}
