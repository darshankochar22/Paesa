import React from "react";
import { useNavigate, Link } from "react-router-dom";

interface TallyReportLayoutProps {
  title: string;
  companyName: string;
  leftSubtitle?: React.ReactNode;
  rightSubtitle?: React.ReactNode;
  children: React.ReactNode;
  onQuit?: () => void;
  footerControls?: React.ReactNode;
  breadcrumb?: Array<{ label: string; to?: string }>;
}

export function TallyReportLayout({
  title,
  companyName,
  leftSubtitle,
  rightSubtitle,
  children,
  onQuit,
  footerControls,
  breadcrumb,
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
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-900 font-sans text-[11px]">
      {/* Tally Prime Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-zinc-900 text-zinc-900">
        <div className="flex items-center gap-2 flex-1">
          <span className="font-bold text-sm tracking-wide">{title}</span>
        </div>
        <div className="flex items-center gap-2 flex-1 justify-center">
          <span className="font-bold text-sm text-zinc-900">{companyName}</span>
        </div>
        <div className="flex items-center gap-3 flex-1 justify-end">
          {footerControls}
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      {breadcrumb && breadcrumb.length > 0 && (
        <div className="flex items-center gap-1 px-3 py-1 bg-white border-b border-zinc-300 text-[10px]">
          {breadcrumb.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-zinc-400 mx-1">›</span>}
              {crumb.to ? (
                <Link to={crumb.to} className="text-zinc-700 hover:underline font-medium">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-zinc-600 font-medium">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Subtitle Info Area - Period and Context */}
      <div className="flex justify-between items-center px-3 py-1 bg-white border-b border-zinc-300">
        <div className="flex items-center gap-3 text-[10px] text-zinc-700">
          {leftSubtitle}
        </div>
        <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-900">
          {rightSubtitle}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto bg-white">
        {children}
      </div>
    </div>
  );
}