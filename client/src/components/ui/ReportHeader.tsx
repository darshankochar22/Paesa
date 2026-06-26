import * as React from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

// The title strip at the top of every report / register panel.
// Title + optional company + period + breadcrumb, with an optional right slot
// (date-range control, actions) and a close (×) affordance.

export interface ReportHeaderCrumb {
  label: string;
  to?: string;
}

export interface ReportHeaderProps {
  title: string;
  companyName?: string;
  periodLabel?: string;
  breadcrumb?: ReportHeaderCrumb[];
  right?: React.ReactNode;
  onClose?: () => void;
  showClose?: boolean;
  className?: string;
}

export default function ReportHeader({
  title,
  companyName,
  periodLabel,
  breadcrumb,
  right,
  onClose,
  showClose = true,
  className,
}: ReportHeaderProps) {
  const navigate = useNavigate();
  const close = onClose ?? (() => navigate(-1));

  return (
    <div
      className={cn(
        "bg-zinc-900 text-white px-3 py-1.5 flex items-center justify-between select-none",
        className
      )}
    >
      <div className="flex flex-col min-w-0">
        {breadcrumb && breadcrumb.length > 0 && (
          <div className="flex items-center gap-1 text-[9px] text-zinc-400 mb-0.5">
            {breadcrumb.map((c, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="text-zinc-600">/</span>}
                {c.to ? (
                  <button
                    onClick={() => navigate(c.to!)}
                    className="hover:text-white transition-colors"
                  >
                    {c.label}
                  </button>
                ) : (
                  <span>{c.label}</span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-xs font-semibold uppercase tracking-wider truncate">
            {title}
          </span>
          {companyName && (
            <span className="text-[10px] text-zinc-400 truncate">{companyName}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {periodLabel && (
          <span className="text-[10px] text-zinc-400 font-mono">{periodLabel}</span>
        )}
        {right}
        {showClose && (
          <button
            onClick={close}
            className="text-zinc-400 hover:text-white text-base leading-none px-1"
            aria-label="Close"
            title="Close (Esc)"
          >
            &times;
          </button>
        )}
      </div>
    </div>
  );
}
