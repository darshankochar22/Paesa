import { useEffect, useState, useCallback } from "react";

interface Props {
  initialDate: string;
  onClose: () => void;
  onConfirm: (date: string) => void;
  label?: string;
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function DatePickerPopup({
  initialDate,
  onClose,
  onConfirm,
  label = "Date",
}: Props) {
  const parsed = new Date(initialDate || Date.now());
  const safeDate = isNaN(parsed.getTime()) ? new Date() : parsed;

  const [viewYear, setViewYear] = useState(safeDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(safeDate.getMonth());
  const [selectedDate, setSelectedDate] = useState(safeDate);
  // highlightedDay is 0-based index within the current month (0 = day 1)
  const [highlightedDay, setHighlightedDay] = useState(safeDate.getDate() - 1);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();

  const today = new Date();

  const isToday = (day: number) =>
    day === today.getDate() &&
    viewMonth === today.getMonth() &&
    viewYear === today.getFullYear();

  const isSelected = (day: number) =>
    day === selectedDate.getDate() &&
    viewMonth === selectedDate.getMonth() &&
    viewYear === selectedDate.getFullYear();

  // FIX #10 — when navigating months, reset highlightedDay to 0 (first day)
  const handlePrevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) { setViewYear((y) => y - 1); return 11; }
      return m - 1;
    });
    setHighlightedDay(0);
  }, []);

  const handleNextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) { setViewYear((y) => y + 1); return 0; }
      return m + 1;
    });
    setHighlightedDay(0);
  }, []);

  // Select a day in the currently-viewed month and keep highlight in sync
  const selectDay = useCallback(
    (day: number) => {
      setSelectedDate(new Date(viewYear, viewMonth, day));
      setHighlightedDay(day - 1);
    },
    [viewYear, viewMonth]
  );

  const handleConfirm = useCallback(() => {
    const iso = selectedDate.toISOString().split("T")[0];
    onConfirm(iso);
    onClose();
  }, [selectedDate, onConfirm, onClose]);

  // FIX #10 — arrow keys update BOTH highlightedDay AND selectedDate so
  // pressing Enter immediately after navigating always confirms the right day
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key === "Enter") { e.preventDefault(); handleConfirm(); return; }
      if (e.key === "PageUp") { e.preventDefault(); handlePrevMonth(); return; }
      if (e.key === "PageDown") { e.preventDefault(); handleNextMonth(); return; }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        setHighlightedDay((prev) => {
          const next = Math.min(prev + 1, daysInMonth - 1);
          setSelectedDate(new Date(viewYear, viewMonth, next + 1));
          return next;
        });
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setHighlightedDay((prev) => {
          const next = Math.max(prev - 1, 0);
          setSelectedDate(new Date(viewYear, viewMonth, next + 1));
          return next;
        });
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedDay((prev) => {
          const next = Math.min(prev + 7, daysInMonth - 1);
          setSelectedDate(new Date(viewYear, viewMonth, next + 1));
          return next;
        });
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedDay((prev) => {
          const next = Math.max(prev - 7, 0);
          setSelectedDate(new Date(viewYear, viewMonth, next + 1));
          return next;
        });
      }
      if (e.key === "Home") {
        e.preventDefault();
        setHighlightedDay(0);
        setSelectedDate(new Date(viewYear, viewMonth, 1));
      }
      if (e.key === "End") {
        e.preventDefault();
        setHighlightedDay(daysInMonth - 1);
        setSelectedDate(new Date(viewYear, viewMonth, daysInMonth));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, handleConfirm, handlePrevMonth, handleNextMonth, daysInMonth, viewYear, viewMonth]);

  // Build the calendar grid weeks
  const renderCalendar = () => {
    const weeks: JSX.Element[] = [];
    let dayCounter = 1;
    let nextMonthDay = 1;
    let weekIndex = 0;

    while (dayCounter <= daysInMonth) {
      const week: JSX.Element[] = [];

      for (let col = 0; col < 7; col++) {
        if (weekIndex === 0 && col < firstWeekday) {
          // Previous month overflow
          const prevDay = daysInPrevMonth - firstWeekday + col + 1;
          week.push(
            <div key={`prev-${col}`} className="h-8 w-8 flex items-center justify-center text-xs text-zinc-400">
              {prevDay}
            </div>
          );
        } else if (dayCounter > daysInMonth) {
          // Next month overflow
          week.push(
            <div key={`next-${nextMonthDay}`} className="h-8 w-8 flex items-center justify-center text-xs text-zinc-400">
              {nextMonthDay++}
            </div>
          );
        } else {
          const d = dayCounter;
          const isHi = highlightedDay === d - 1;
          const isSel = isSelected(d);
          const isTod = isToday(d);

          week.push(
            <div
              key={`day-${d}`}
              className={`h-8 w-8 flex items-center justify-center text-xs cursor-pointer rounded transition-colors ${
                isHi
                  ? "bg-zinc-900 text-white font-bold"
                  : isSel
                  ? "bg-blue-600 text-white font-bold"
                  : isTod
                  ? "bg-blue-100 text-blue-700 font-bold border border-blue-300"
                  : "hover:bg-zinc-100 text-zinc-800"
              }`}
              onClick={() => selectDay(d)}
              onMouseEnter={() => setHighlightedDay(d - 1)}
            >
              {d}
            </div>
          );
          dayCounter++;
        }
      }

      weeks.push(
        <div key={`week-${weekIndex}`} className="flex">
          {week}
        </div>
      );
      weekIndex++;
      if (dayCounter > daysInMonth) break;
    }
    return weeks;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl border border-zinc-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-zinc-900 text-white px-4 py-2 text-xs font-semibold uppercase tracking-wider flex justify-between items-center">
          <span>{label} Selection</span>
          <button
            onClick={onClose}
            className="text-sm font-bold hover:text-zinc-300 transition-colors"
          >
            &times;
          </button>
        </div>

        <div className="p-4">
          {/* Month / Year navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handlePrevMonth}
              className="p-1 hover:bg-zinc-100 rounded transition-colors"
              aria-label="Previous month"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-sm font-bold text-zinc-800">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </div>
            <button
              onClick={handleNextMonth}
              className="p-1 hover:bg-zinc-100 rounded transition-colors"
              aria-label="Next month"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day name headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAY_NAMES.map((day) => (
              <div
                key={day}
                className="h-8 flex items-center justify-center text-[10px] font-bold text-zinc-500 uppercase"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="flex flex-col">{renderCalendar()}</div>

          {/* Selected date display + actions */}
          <div className="mt-4 pt-3 border-t border-zinc-200">
            <div className="flex items-center justify-between">
              <div className="text-xs text-zinc-600">
                Selected:{" "}
                <span className="font-bold text-zinc-900">
                  {selectedDate.toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-100 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-4 py-1 text-xs bg-zinc-900 text-white hover:bg-zinc-800 rounded transition-colors font-semibold"
                >
                  Accept
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Keyboard hints */}
        <div className="px-4 py-2 bg-zinc-50 border-t border-zinc-200">
          <div className="text-[10px] text-zinc-500 flex justify-between">
            <span>↑↓←→ Navigate</span>
            <span>PgUp/Dn: Month</span>
            <span>Enter: Accept</span>
            <span>Esc: Cancel</span>
          </div>
        </div>
      </div>
    </div>
  );
}