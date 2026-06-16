import React from "react";
import { useNavigate } from "react-router-dom";

interface TallyReportLayoutProps {
  title: string;
  companyName: string;
  leftSubtitle?: React.ReactNode;
  rightSubtitle?: React.ReactNode;
  children: React.ReactNode;
  onQuit?: () => void;
  footerControls?: React.ReactNode;
}

export function TallyReportLayout({
  title,
  companyName,
  leftSubtitle,
  rightSubtitle,
  children,
  onQuit,
  footerControls,
}: TallyReportLayoutProps) {
  const navigate = useNavigate();

  const handleQuit = () => {
    if (onQuit) {
      onQuit();
    } else {
      navigate(-1);
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleQuit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleQuit]);

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-900 font-sans text-xs">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 bg-zinc-50">
        <div className="font-bold text-lg">{title}</div>
        <div className="font-bold text-lg text-center text-zinc-500">{companyName}</div>
        <div className="flex gap-4">
          <button onClick={handleQuit} className="px-3 py-1 bg-white border border-zinc-300 rounded hover:bg-zinc-100 font-semibold shadow-sm">
            Quit
          </button>
          {footerControls}
        </div>
      </div>

      {/* Subtitle Info Area */}
      <div className="flex justify-between items-start px-2 py-1.5 bg-zinc-50 border-b border-zinc-200">
        <div className="flex flex-col gap-0.5 text-[11px]">
          {leftSubtitle}
        </div>
        <div className="flex flex-col gap-0.5 text-[11px] items-end font-bold text-zinc-800">
          {rightSubtitle}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto bg-white border-t border-zinc-200">
        {children}
      </div>
    </div>
  );
}
