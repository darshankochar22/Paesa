import { useEffect, useState, useCallback } from "react";

interface Props {
  initialDate: string;
  onClose: () => void;
  onConfirm: (date: string) => void;
  label?: string;
}

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DatePickerPopup({ initialDate, onClose, onConfirm, label = "Date" }: Props) {
  const [viewDate, setViewDate] = useState(new Date(initialDate || Date.now()));
  const [selectedDate, setSelectedDate] = useState(new Date(initialDate || Date.now()));
  const [highlightedDay, setHighlightedDay] = useState(0);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const startingDay = firstDayOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const today = new Date();
  const isToday = (day: number) => {
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  const isSelected = (day: number) => {
    return day === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear();
  };

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleDaySelect = useCallback((day: number) => {
    const newDate = new Date(year, month, day);
    setSelectedDate(newDate);
  }, [year, month]);

  const handleConfirm = () => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    onConfirm(dateStr);
    onClose();
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Enter") {
        e.preventDefault();
        handleConfirm();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setHighlightedDay(prev => Math.min(prev + 1, daysInMonth - 1));
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setHighlightedDay(prev => Math.max(prev - 1, 0));
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedDay(prev => Math.min(prev + 7, daysInMonth - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedDay(prev => Math.max(prev - 7, 0));
      }
      if (e.key === "Home") {
        e.preventDefault();
        setHighlightedDay(0);
      }
      if (e.key === "End") {
        e.preventDefault();
        setHighlightedDay(daysInMonth - 1);
      }
      if (e.key === "PageUp") {
        e.preventDefault();
        handlePrevMonth();
      }
      if (e.key === "PageDown") {
        e.preventDefault();
        handleNextMonth();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, handleConfirm, daysInMonth, year, month]);

  const renderCalendarDays = () => {
    const weeks = [];
    let dayCounter = 1;
    let nextMonthDay = 1;
    let weekIndex = 0;

    while (dayCounter <= daysInMonth || weekIndex < startingDay / 7 + 1) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        if (weekIndex === 0 && i < startingDay) {
          const prevMonthDay = daysInPrevMonth - startingDay + i + 1;
          week.push(
            <div
              key={`prev-${i}`}
              className="h-8 w-8 flex items-center justify-center text-xs text-zinc-400"
            >
              {prevMonthDay}
            </div>
          );
        } else if (dayCounter > daysInMonth) {
          week.push(
            <div
              key={`next-${nextMonthDay}`}
              className="h-8 w-8 flex items-center justify-center text-xs text-zinc-400"
            >
              {nextMonthDay++}
            </div>
          );
        } else {
          const isHighlighted = dayCounter - 1 === highlightedDay;
          week.push(
            <div
              key={`day-${dayCounter}`}
              className={`h-8 w-8 flex items-center justify-center text-xs cursor-pointer transition-colors ${
                isHighlighted
                  ? "bg-zinc-900 text-white font-bold"
                  : isSelected(dayCounter)
                  ? "bg-blue-600 text-white font-bold"
                  : isToday(dayCounter)
                  ? "bg-blue-100 text-blue-700 font-bold border border-blue-300"
                  : "hover:bg-zinc-100 text-zinc-800"
              }`}
              onClick={() => {
                handleDaySelect(dayCounter);
                setHighlightedDay(dayCounter - 1);
              }}
              onMouseEnter={() => setHighlightedDay(dayCounter - 1)}
            >
              {dayCounter}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-2xl border border-zinc-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-zinc-900 text-white px-4 py-2 text-xs font-semibold uppercase tracking-wider flex justify-between items-center">
          <span>{label} Selection</span>
          <button onClick={onClose} className="text-sm font-bold hover:text-zinc-300 transition-colors">&times;</button>
        </div>

        <div className="p-4">
          {/* Month/Year Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handlePrevMonth}
              className="p-1 hover:bg-zinc-100 rounded transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-sm font-bold text-zinc-800">
              {monthNames[month]} {year}
            </div>
            <button
              onClick={handleNextMonth}
              className="p-1 hover:bg-zinc-100 rounded transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day Names Header */}
          <div className="grid grid-cols-7 mb-2">
            {dayNames.map(day => (
              <div key={day} className="h-8 flex items-center justify-center text-[10px] font-bold text-zinc-500 uppercase">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="flex flex-col">
            {renderCalendarDays()}
          </div>

          {/* Selected Date Display */}
          <div className="mt-4 pt-3 border-t border-zinc-200">
            <div className="flex items-center justify-between">
              <div className="text-xs text-zinc-600">
                Selected: <span className="font-bold text-zinc-900">{selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
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

        <div className="px-4 py-2 bg-zinc-50 border-t border-zinc-200">
          <div className="text-[10px] text-zinc-500 flex justify-between">
            <span>↑↓←→ Navigate</span>
            <span>Enter: Accept</span>
            <span>Esc: Cancel</span>
          </div>
        </div>
      </div>
    </div>
  );
}
