import { useEffect, useState, useCallback } from "react";
import { VoucherPopupShell } from "@/components/tally-ui/VoucherPopupShell";

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
  // pressing Enter immediately after navigating always confirms the right day.
  // Escape + Alt+A are handled by VoucherPopupShell.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
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
  }, [handleConfirm, handlePrevMonth, handleNextMonth, daysInMonth, viewYear, viewMonth]);

  // Build the calendar grid weeks
  const renderCalendar = () => {
    const weeks: React.ReactElement[] = [];
    let dayCounter = 1;
    let nextMonthDay = 1;
    let weekIndex = 0;

    while (dayCounter <= daysInMonth) {
      const week: React.ReactElement[] = [];

      for (let col = 0; col < 7; col++) {
        if (weekIndex === 0 && col < firstWeekday) {
          // Previous month overflow
          const prevDay = daysInPrevMonth - firstWeekday + col + 1;
          week.push(
            <div key={`prev-${col}`} className="h-8 w-8 flex items-center justify-center text-xs text-gray-400">
              {prevDay}
            </div>
          );
        } else if (dayCounter > daysInMonth) {
          // Next month overflow
          week.push(
            <div key={`next-${nextMonthDay}`} className="h-8 w-8 flex items-center justify-center text-xs text-gray-400">
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
              className={`h-8 w-8 flex items-center justify-center text-xs cursor-pointer ${
                isHi
                  ? "bg-black text-white font-bold"
                  : isSel
                  ? "border border-black text-black font-bold"
                  : isTod
                  ? "text-black font-bold underline"
                  : "hover:bg-gray-100 text-gray-800"
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
    <VoucherPopupShell
      size="compact"
      title={`${label} Selection`}
      headerRight={
        <span className="font-bold text-black">
          {selectedDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      }
      onClose={onClose}
      onAccept={handleConfirm}
      hint="↑↓←→ Navigate · PgUp/PgDn: Month · Enter: Accept · Esc: Cancel"
    >
      {/* Month / Year navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          className="p-1 hover:bg-gray-100"
          aria-label="Previous month"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-sm font-bold text-black">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </div>
        <button
          onClick={handleNextMonth}
          className="p-1 hover:bg-gray-100"
          aria-label="Next month"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day name headers */}
      <div className="grid grid-cols-7 mb-2 border-b border-gray-300">
        {DAY_NAMES.map((day) => (
          <div
            key={day}
            className="h-8 flex items-center justify-center text-[10px] font-bold text-gray-600 uppercase"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex flex-col">{renderCalendar()}</div>
    </VoucherPopupShell>
  );
}
