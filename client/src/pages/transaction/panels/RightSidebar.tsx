import React from "react";
import { useNavigate } from "react-router-dom";
 
interface Props {
  voucherType: string;
  onTypeChange: (t: string) => void;
  status: string;
  onStatusChange: () => void;
  entryMode: "single" | "double";
  onEntryModeChange: () => void;
  onDateClick: () => void;
  onCompanyClick: () => void;
  onCreateLedger: () => void;
  onAccept: () => void;
  onQuit: () => void;
  canAccept: boolean;
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

function SidebarBtn({ children, active, dimmed, style, ...props }: BtnProps) {
  return (
    <button
      {...props}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "6px 8px",
        border: "none",
        cursor: dimmed ? "not-allowed" : "pointer",
        transition: "background-color 0.2s",
        backgroundColor: active ? "#000000" : "#ffffff",
        color: active ? "#ffffff" : dimmed ? "#8c8c8c" : "#000000",
        fontWeight: active ? "bold" : "normal",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!active && !dimmed) e.currentTarget.style.backgroundColor = "#f0f0f0";
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
  onCompanyClick,
  onCreateLedger,
  onAccept,
  onQuit,
  canAccept,
}: Props) {
  const navigate = useNavigate();

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
        <SidebarBtn onClick={onDateClick}>
          <FKey>F2</FKey>: Date
        </SidebarBtn>
      </SidebarRow>

      <SidebarRow>
        <SidebarBtn onClick={() => navigate("/company")}>
          <FKey>F3</FKey>: Company
        </SidebarBtn>
      </SidebarRow>

      <Gap />

      {VOUCHER_TYPES.map(({ key, label }) => (
        <SidebarRow key={key}>
          <SidebarBtn 
            onClick={() => {
              if (label === "Other Vouchers") {
                navigate("/transaction/voucher-type-modal"); 
              } else {
                onTypeChange(label); 
              }
            }} 
            active={voucherType === label}
          >
            <FKey active={voucherType === label}>{key}</FKey>: {label}
          </SidebarBtn>
        </SidebarRow>
      ))}

      <Gap />

      <SidebarRow>
        <SidebarBtn>
          <FKey>F</FKey>: Autofill
        </SidebarBtn>
      </SidebarRow>

      <SidebarRow>
        <SidebarBtn onClick={onEntryModeChange}>
          <FKey>H</FKey>: Change Mode
        </SidebarBtn>
      </SidebarRow>

      <SidebarRow>
        <SidebarBtn>
          <FKey>I</FKey>: More Details
        </SidebarBtn>
      </SidebarRow>

      <SidebarRow>
        <SidebarBtn dimmed>
          <FKey dimmed>Q</FKey>: Related Reports
        </SidebarBtn>
      </SidebarRow>

      <Gap />
    </div>
  );
}
