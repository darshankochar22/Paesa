import { useEffect, useRef, useState } from "react";

interface GSTEffectiveDatePromptProps {
  isOpen: boolean;
  onAccept: (dateStr: string) => void;
  onClose: () => void;
}

const PRESET_DATES = [
  { label: "1-Apr-26", desc: "Current Date of Company" },
  { label: "1-Apr-26", desc: "Date of Last Entry" },
  { label: "13-Jun-26", desc: "Today (Computer Date)" },
  { label: "14-Jun-26", desc: "Tomorrow (Computer Date)" },
];

export default function GSTEffectiveDatePrompt({ isOpen, onAccept, onClose }: GSTEffectiveDatePromptProps) {
  const [date, setDate] = useState("1-Apr-26");
  const [listOpen, setListOpen] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDate("1-Apr-26");
      setListOpen(true);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "ArrowDown" && listOpen) {
        e.preventDefault();
        setSelectedIndex((p) => (p + 1) % PRESET_DATES.length);
        return;
      }

      if (e.key === "ArrowUp" && listOpen) {
        e.preventDefault();
        setSelectedIndex((p) => (p - 1 + PRESET_DATES.length) % PRESET_DATES.length);
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        if (listOpen) {
          // If list is open, we can just accept the current input text or the selected list item
          // Tally usually takes the input text if it was modified, else the selected list item
          onAccept(date);
        } else {
          onAccept(date);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, listOpen, date, selectedIndex, onAccept, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/10 z-[11000] flex items-center justify-center font-mono text-[11px] backdrop-blur-[1px]">
      <div className="flex gap-4">
        {/* Main Prompt Box */}
        <div className="relative bg-white border border-zinc-400 shadow-2xl w-[400px] flex flex-col pt-3 pb-8 px-6">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="text-center font-bold text-xs pb-6 text-zinc-900 tracking-wide">
            Effective Date
          </div>

          <div className="flex items-center justify-between">
            <span className="text-zinc-800">Effective Date for revised GST details</span>
            <div className="flex items-center">
              <span className="mr-2 text-zinc-600">:</span>
              <input
                ref={inputRef}
                type="text"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setListOpen(false); // Hide list if they start typing manually (optional behavior)
                }}
                className="w-24 bg-[#ffea5d] border border-[#e6c300] outline-none px-2 py-0.5 text-right font-bold"
              />
            </div>
          </div>
        </div>

        {/* Right Panel */}
        {listOpen && (
          <div className="bg-white border border-zinc-400 w-[260px] flex flex-col shadow-2xl overflow-hidden min-h-[250px]">
            <div className="bg-[#4d66cc] text-white font-bold text-xs py-1.5 px-3 tracking-wide flex justify-between">
              <span>List of Effective Dates</span>
            </div>

            <div className="flex justify-end px-3 pt-1">
              <span className="text-[10px] italic text-zinc-600 font-sans">New Effective Date</span>
            </div>

            <div className="flex-1 overflow-y-auto py-1">
              {PRESET_DATES.map((opt, index) => (
                <div
                  key={index}
                  onClick={() => onAccept(opt.label)}
                  className={`px-3 py-1 cursor-pointer flex justify-between font-mono text-[11px] ${index === selectedIndex
                    ? "bg-[#ffb62b] text-black font-bold" // Tally yellow highlight
                    : "hover:bg-zinc-100 text-zinc-900"
                    }`}
                >
                  <span className="w-20">{opt.label}</span>
                  <span className="text-right italic text-zinc-700">{opt.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
