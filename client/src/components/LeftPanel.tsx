import { useEffect, useRef, useState } from "react";
import { useCompany } from "@/context/CompanyContext";

export default function LeftPanel() {
  const [currentTime, setCurrentTime] = useState("");
  const { selectedCompany, activeFY, availableFYs, switchFY } = useCompany();
  const [showFYDropdown, setShowFYDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "medium",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!showFYDropdown) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowFYDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showFYDropdown]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });


  const periodLabel = activeFY
    ? `${formatDate(activeFY.start_date)} — ${formatDate(activeFY.end_date)}`
    : selectedCompany?.financial_year_beginning_from
    ? (() => {
        const [y] = selectedCompany.financial_year_beginning_from.split("-");
        return `1 Apr ${y} — 31 Mar ${Number(y) + 1}`;
      })()
    : "No period set";

  const canSwitch = availableFYs.length >= 1;

  return (
    <div className="rounded h-full px-4 py-3 flex flex-col gap-4 w-full">
      <div className="flex flex-row justify-between gap-6">

        <div className="flex flex-col relative" ref={dropdownRef}>
          <span className="text-sm text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            Current Period
          </span>

          {canSwitch ? (
            <button
              onClick={() => setShowFYDropdown((p) => !p)}
              className="text-left hover:text-black-600 dark:hover:text-black-400 transition-colors flex items-center gap-1 font-medium"
              title="Click to switch financial year"
            >
              <span>{periodLabel}</span>
              <span className="text-xs leading-none mt-0.5">
                {showFYDropdown ? "▴" : "▾"}
              </span>
            </button>
          ) : (
            <span className="font-medium">{periodLabel}</span>
          )}

          {activeFY?.is_closed === 1 && (
            <span className="text-xs text-amber-500 font-medium mt-0.5">
              ⚠ Closed Year — entries allowed
            </span>
          )}


          {showFYDropdown && canSwitch && (
            <div className="absolute top-full left-0 mt-1 z-50 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-xl bg-white dark:bg-zinc-900 min-w-[240px] max-h-60 overflow-y-auto">
              <div className="px-3 py-1.5 text-xs text-zinc-400 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800">
                Select Financial Year
              </div>
              {availableFYs.map((fy) => {
                const isSelected = activeFY?.fy_id === fy.fy_id;
                return (
                  <button
                    key={fy.fy_id}
                    onClick={() => {
                      switchFY(fy);
                      setShowFYDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between gap-2 ${
                      isSelected
                        ? "bg-black-600 text-white"
                        : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                    }`}
                  >
                    <span>
                      {formatDate(fy.start_date)} — {formatDate(fy.end_date)}
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                      {fy.is_closed === 1 && (
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            isSelected
                              ? "bg-black-500 text-black-100"
                              : "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
                          }`}
                        >
                          Closed
                        </span>
                      )}
                      {isSelected && (
                        <span className="text-xs opacity-80">✓</span>
                      )}
                    </span>
                  </button>
                );
              })}
              <div className="border-t border-zinc-100 dark:border-zinc-800 px-3 py-1.5">
                <a
                  href="#/master/financial-years"
                  onClick={() => setShowFYDropdown(false)}
                  className="text-xs text-black-600 hover:text-black-800 dark:text-black-400 dark:hover:text-black-300 transition-colors"
                >
                  + Manage Financial Years
                </a>
              </div>
            </div>
          )}
        </div>


        <div className="flex flex-col text-right">
          <span className="text-sm text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            Current Date
          </span>
          <span className="font-medium tabular-nums">{currentTime}</span>
        </div>
      </div>

      <div className="flex flex-row justify-between gap-6">


        <div className="flex flex-col">
          <span className="text-sm text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            Name of Company
          </span>
          <span className="font-medium">{selectedCompany?.name ?? "—"}</span>
        </div>

        {/* ── DATE OF LAST ENTRY ── */}
        {/* 
          TODO: Replace currentTime below with the actual last entry date 
          fetched from your backend, filtered by activeFY.
          e.g. const { lastEntryDate } = useLastEntry(activeFY?.fy_id);
        */}
        <div className="flex flex-col text-right">
          <span className="text-sm text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
            Date of Last Entry
          </span>
          <span className="font-medium tabular-nums">{currentTime}</span>
        </div>

      </div>
    </div>
  );
}