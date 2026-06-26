import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import ReportHeader, { type ReportHeaderCrumb } from "./ReportHeader";

// The single shared full-screen panel for ALL reports, vouchers, and ledger
// detail views — the TallyPrime interaction pattern: a full-height view that
// replaces the current screen, with its own header (title + period + close),
// a scrollable body, and an optional sticky footer. Esc closes.
//
// No screen should hand-roll its own `h-screen` shell + header + Esc handler
// again — compose this instead.

export interface FullScreenPanelProps {
  title: string;
  companyName?: string;        // defaults to the selected company
  periodLabel?: string;
  breadcrumb?: ReportHeaderCrumb[];
  onClose?: () => void;        // defaults to navigate(-1)
  toolbar?: React.ReactNode;   // right-aligned header actions (date range, etc.)
  footer?: React.ReactNode;    // sticky bottom bar
  /** Remove default body padding (tables manage their own). Default true. */
  noPadding?: boolean;
  className?: string;
  children: React.ReactNode;
}

export default function FullScreenPanel({
  title,
  companyName,
  periodLabel,
  breadcrumb,
  onClose,
  toolbar,
  footer,
  noPadding = true,
  className,
  children,
}: FullScreenPanelProps) {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const close = React.useCallback(() => (onClose ? onClose() : navigate(-1)), [onClose, navigate]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const el = document.activeElement;
        // don't hijack Esc while typing in a field or with a dialog open
        if (
          el &&
          (el.tagName === "INPUT" ||
            el.tagName === "SELECT" ||
            el.tagName === "TEXTAREA" ||
            el.closest("[role='dialog']"))
        )
          return;
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white font-mono">
      <ReportHeader
        title={title}
        companyName={companyName ?? selectedCompany?.name}
        periodLabel={periodLabel}
        breadcrumb={breadcrumb}
        right={toolbar}
        onClose={close}
      />
      <div className={`flex-1 min-h-0 overflow-y-auto ${noPadding ? "" : "p-3"} ${className ?? ""}`}>
        {children}
      </div>
      {footer && (
        <div className="border-t border-zinc-200 bg-zinc-50">{footer}</div>
      )}
    </div>
  );
}
