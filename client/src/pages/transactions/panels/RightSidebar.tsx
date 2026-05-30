import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface Props {
  voucherType: string;
  onTypeChange: (t: any) => void;
  status: string;
  onStatusChange: () => void;
  entryMode: "single" | "double";
  onEntryModeChange: () => void;
  onDateClick: () => void;
  onCreateLedger: () => void;
  onOtherVouchers: () => void;
  onAccept: () => void;
  onQuit: () => void;
  canAccept: boolean;
  isSubmitting?: boolean;
}

const VOUCHER_TYPES = [
  { key: "F4", label: "Contra" },
  { key: "F5", label: "Payment" },
  { key: "F6", label: "Receipt" },
  { key: "F7", label: "Journal" },
  { key: "F8", label: "Sales" },
  { key: "F9", label: "Purchase" },
  { key: "F10", label: "Other Vouchers" },
] as const;


function SidebarRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ borderBottom: "1px solid #e0e0e0", backgroundColor: "#ffffff" }}>
      {children}
    </div>
  );
}

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  dimmed?: boolean;
}

function SidebarBtn({ children, active, dimmed, style, disabled, ...props }: BtnProps) {
  const isDimmed = dimmed || disabled;
  return (
    <button
      {...props}
      disabled={disabled}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "6px 8px",
        border: "none",
        cursor: isDimmed ? "not-allowed" : "pointer",
        transition: "background-color 0.2s",
        backgroundColor: active ? "#000000" : "#ffffff",
        color: active ? "#ffffff" : isDimmed ? "#8c8c8c" : "#000000",
        fontWeight: active ? "bold" : "normal",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!active && !isDimmed) e.currentTarget.style.backgroundColor = "#f0f0f0";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.backgroundColor = "#ffffff";
      }}
    >
      {children}
    </button>
  );
}

function FKey({ children, active, dimmed }: { children: React.ReactNode; active?: boolean; dimmed?: boolean }) {
  return (
    <span
      style={{
        fontWeight: "bold",
        color: active ? "#ffffff" : dimmed ? "#8c8c8c" : "#000000",
      }}
    >
      {children}
    </span>
  );
}

function Gap() {
  return <div style={{ height: "12px", backgroundColor: "#f5f5f5", borderBottom: "1px solid #e0e0e0" }} />;
}


export default function RightSidebar({
  voucherType,
  onTypeChange,
  status,
  onStatusChange,
  entryMode,
  onEntryModeChange,
  onDateClick,
  onCreateLedger,
  onOtherVouchers,
  onAccept,
  onQuit,
  canAccept,
  isSubmitting = false,
}: Props) {
  const navigate = useNavigate();

  // F10 shortcut — open Other Vouchers modal inline
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "F10") {
        e.preventDefault();
        if (!isSubmitting) onOtherVouchers();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [isSubmitting, onOtherVouchers]);

  return (
    <div
      className="flex flex-col shrink-0"
      style={{
        width: 160,
        borderLeft: "1px solid #000000",
        backgroundColor: "#ffffff",
        fontFamily: "'Segoe UI', Tahoma, sans-serif",
        fontSize: 12,
        userSelect: "none",
        height: "100%",
      }}
     >
      <SidebarRow>
        <SidebarBtn onClick={onDateClick} disabled={isSubmitting} dimmed={isSubmitting}>
          <FKey dimmed={isSubmitting}>F2</FKey>: Date
        </SidebarBtn>
      </SidebarRow>

      <SidebarRow>
        <SidebarBtn onClick={() => navigate("/company")} disabled={isSubmitting} dimmed={isSubmitting}>
          <FKey dimmed={isSubmitting}>F3</FKey>: Company
        </SidebarBtn>
      </SidebarRow>

      <Gap />

      {VOUCHER_TYPES.map(({ key, label }) => (
        <SidebarRow key={key}>
          <SidebarBtn 
            onClick={() => {
              if (label === "Other Vouchers") {
                onOtherVouchers();
              } else {
                onTypeChange(label);
              }
            }} 
            active={voucherType === label && !isSubmitting}
            disabled={isSubmitting}
            dimmed={isSubmitting}
          >
            <FKey active={voucherType === label && !isSubmitting} dimmed={isSubmitting}>{key}</FKey>: {label}
          </SidebarBtn>
        </SidebarRow>
      ))}

      <Gap />

      <SidebarRow>
        <SidebarBtn onClick={onCreateLedger} disabled={isSubmitting} dimmed={isSubmitting}>
          <span className={`font-semibold ${isSubmitting ? "text-gray-400" : "text-black"}`}><span className="text-gray-500">Alt+C</span>: Create Ldgr</span>
        </SidebarBtn>
      </SidebarRow>

      <SidebarRow>
        <SidebarBtn onClick={onStatusChange} active={status === "Post-Dated" && !isSubmitting} disabled={isSubmitting} dimmed={isSubmitting}>
          <FKey active={status === "Post-Dated" && !isSubmitting} dimmed={isSubmitting}>T</FKey>: Post-Dated
        </SidebarBtn>
      </SidebarRow>

      {voucherType === "Contra" ? (
        <SidebarRow>
          <SidebarBtn onClick={onEntryModeChange} active={entryMode === "double" && !isSubmitting} disabled={isSubmitting} dimmed={isSubmitting}>
            <FKey active={entryMode === "double" && !isSubmitting} dimmed={isSubmitting}>H</FKey>: Double Entry
          </SidebarBtn>
        </SidebarRow>
      ) : (
        <SidebarRow>
          <SidebarBtn onClick={onEntryModeChange} disabled={isSubmitting} dimmed={isSubmitting}>
            <FKey dimmed={isSubmitting}>H</FKey>: Change Mode
          </SidebarBtn>
        </SidebarRow>
      )}

      <SidebarRow>
        <SidebarBtn disabled={isSubmitting} dimmed={isSubmitting}>
          <FKey dimmed={isSubmitting}>I</FKey>: More Details
        </SidebarBtn>
      </SidebarRow>

      <SidebarRow>
        <SidebarBtn dimmed>
          <FKey dimmed>O</FKey>: Related Reports
        </SidebarBtn>
      </SidebarRow>

      <div className="flex-1" />

      <SidebarRow>
        <SidebarBtn onClick={onAccept} disabled={!canAccept || isSubmitting} dimmed={!canAccept || isSubmitting} active={canAccept && !isSubmitting} style={{ borderTop: "1px solid #000000" }}>
          <FKey active={canAccept && !isSubmitting} dimmed={!canAccept || isSubmitting}>A</FKey>: {isSubmitting ? "Saving..." : "Accept"}
        </SidebarBtn>
      </SidebarRow>

      <SidebarRow>
        <SidebarBtn onClick={onQuit} disabled={isSubmitting} dimmed={isSubmitting} style={{ borderTop: "1px solid #e0e0e0" }}>
          <FKey dimmed={isSubmitting}>Q</FKey>: Quit
        </SidebarBtn>
      </SidebarRow>
    </div>
  );
}
