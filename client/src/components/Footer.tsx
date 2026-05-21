import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCompany } from "../context/CompanyContext";

export default function Footer() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedCompany, activeFY } = useCompany();

  // F12 Configuration drawer state
  const [showConfigure, setShowConfigure] = useState(false);

  // Configuration preferences
  const [enableSound, setEnableSound] = useState(true);
  const [highDensity, setHighDensity] = useState(false);
  const [showSubBadges, setShowSubBadges] = useState(true);

  // Helper to programmatically dispatch KeyboardEvents on the global window
  const dispatchKey = (
    key: string,
    modifiers: { ctrlKey?: boolean; altKey?: boolean; metaKey?: boolean } = {}
  ) => {
    const event = new KeyboardEvent("keydown", {
      key: key,
      code: key,
      bubbles: true,
      cancelable: true,
      ctrlKey: modifiers.ctrlKey || false,
      altKey: modifiers.altKey || false,
      metaKey: modifiers.metaKey || false,
    });
    window.dispatchEvent(event);
  };

  // Keyboard listener for global F12 triggers
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F12" || e.key === "f12") {
        e.preventDefault();
        setShowConfigure((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Action Click Dispatchers
  const handleQuit = () => {
    const currentPath = location.pathname;
    dispatchKey("Escape");

    // If Escape didn't handle/navigate us away, fallback to smart routing
    setTimeout(() => {
      if (location.pathname === currentPath && currentPath !== "/") {
        if (currentPath.startsWith("/master/coa/")) {
          navigate("/master/coa");
        } else if (currentPath.startsWith("/master/")) {
          navigate("/");
        } else if (currentPath.startsWith("/transactions/")) {
          navigate("/");
        } else if (currentPath.startsWith("/utilities/")) {
          navigate("/");
        } else if (currentPath.startsWith("/data/")) {
          navigate("/");
        } else {
          navigate(-1);
        }
      }
    }, 60);
  };

  const handleAccept = () => {
    dispatchKey("a", { ctrlKey: true });
  };

  const handleDelete = () => {
    dispatchKey("d", { altKey: true });
  };

  const handleCancel = () => {
    dispatchKey("Escape");
  };

  const handleVch = () => {
    dispatchKey("F8");

    // Fallback: Navigate directly to Vouchers if no voucher entry catches it
    setTimeout(() => {
      if (location.pathname !== "/transactions/vouchers") {
        navigate("/transactions/vouchers");
      }
    }, 60);
  };

  const handleConfigure = () => {
    dispatchKey("F12");
    setShowConfigure(true);
  };

  const formatDate = (d: string) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <>
      {/* Premium Tallybottom Status bar */}
      <footer className="bg-zinc-900 border-t border-zinc-800 text-zinc-300 font-mono text-[11px] select-none shadow-2xl relative select-none">
        
        {/* Buttons Flex Row */}
        <div className="flex flex-wrap items-center justify-between px-6 py-2 gap-y-2">
          
          {/* Quit Button */}
          <button
            onClick={handleQuit}
            className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-zinc-800 hover:text-white transition-all border border-transparent hover:border-zinc-700/60 cursor-pointer active:scale-95 duration-100 group"
          >
            <span className="bg-zinc-800 text-zinc-400 group-hover:bg-zinc-750 group-hover:text-zinc-200 border border-zinc-700 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase select-none tracking-wider">
              Esc
            </span>
            <span className="font-semibold text-zinc-300">Quit</span>
          </button>

          {/* Accept Button */}
          <button
            onClick={handleAccept}
            className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-zinc-800 hover:text-white transition-all border border-transparent hover:border-zinc-700/60 cursor-pointer active:scale-95 duration-100 group"
          >
            <span className="bg-zinc-800 text-zinc-400 group-hover:bg-zinc-750 group-hover:text-zinc-200 border border-zinc-700 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase select-none tracking-wider">
              Ctrl+A
            </span>
            <span className="font-semibold text-zinc-300">Accept</span>
          </button>

          {/* Delete Button */}
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-zinc-800 hover:text-white transition-all border border-transparent hover:border-zinc-700/60 cursor-pointer active:scale-95 duration-100 group"
          >
            <span className="bg-zinc-800 text-zinc-400 group-hover:bg-zinc-750 group-hover:text-zinc-200 border border-zinc-700 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase select-none tracking-wider">
              Alt+D
            </span>
            <span className="font-semibold text-zinc-300">Delete</span>
          </button>

          {/* Cancel Button */}
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-zinc-800 hover:text-white transition-all border border-transparent hover:border-zinc-700/60 cursor-pointer active:scale-95 duration-100 group"
          >
            <span className="bg-zinc-800 text-zinc-400 group-hover:bg-zinc-750 group-hover:text-zinc-200 border border-zinc-700 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase select-none tracking-wider">
              Esc
            </span>
            <span className="font-semibold text-zinc-300">Cancel</span>
          </button>

          {/* Vch Button */}
          <button
            onClick={handleVch}
            className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-zinc-800 hover:text-white transition-all border border-transparent hover:border-zinc-700/60 cursor-pointer active:scale-95 duration-100 group"
          >
            <span className="bg-zinc-800 text-zinc-400 group-hover:bg-zinc-750 group-hover:text-zinc-200 border border-zinc-700 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase select-none tracking-wider">
              F8
            </span>
            <span className="font-semibold text-zinc-300">Vch</span>
          </button>

          {/* Configure Button */}
          <button
            onClick={handleConfigure}
            className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-zinc-800 hover:text-white transition-all border border-transparent hover:border-zinc-700/60 cursor-pointer active:scale-95 duration-100 group"
          >
            <span className="bg-zinc-800 text-zinc-400 group-hover:bg-zinc-750 group-hover:text-zinc-200 border border-zinc-700 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase select-none tracking-wider">
              F12
            </span>
            <span className="font-semibold text-zinc-300">Configure</span>
          </button>

        </div>
      </footer>

      {/* Overlay Drawer: F12 Configuration Modal */}
      {showConfigure && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white border border-zinc-300 rounded-lg shadow-2xl w-96 overflow-hidden select-none flex flex-col font-sans">
            
            {/* Header */}
            <div className="bg-zinc-100 px-4 py-3 text-sm font-bold text-zinc-800 border-b border-zinc-200 flex justify-between items-center font-mono">
              <div className="flex items-center gap-2">
                <span className="bg-black text-white text-[10px] px-1.5 py-0.5 rounded">F12</span>
                <span>System Configuration</span>
              </div>
              <button
                onClick={() => setShowConfigure(false)}
                className="text-zinc-450 hover:text-black font-semibold font-mono text-xs"
              >
                ✕
              </button>
            </div>

            {/* Form Settings Content */}
            <div className="p-5 flex flex-col gap-5 text-xs text-zinc-700 flex-1 overflow-y-auto">
              
              {/* Preferences Section */}
              <div className="flex flex-col gap-2.5">
                <h4 className="font-bold text-[10px] uppercase tracking-wider text-zinc-400 font-mono">
                  User Preferences
                </h4>
                <label className="flex items-center gap-2.5 cursor-pointer hover:text-black select-none">
                  <input
                    type="checkbox"
                    checked={enableSound}
                    onChange={(e) => setEnableSound(e.target.checked)}
                    className="rounded border-zinc-300 focus:ring-black text-black"
                  />
                  <span>Enable Beep Audio Alerts</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer hover:text-black select-none">
                  <input
                    type="checkbox"
                    checked={highDensity}
                    onChange={(e) => setHighDensity(e.target.checked)}
                    className="rounded border-zinc-300 focus:ring-black text-black"
                  />
                  <span>High Density Layout View</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer hover:text-black select-none">
                  <input
                    type="checkbox"
                    checked={showSubBadges}
                    onChange={(e) => setShowSubBadges(e.target.checked)}
                    className="rounded border-zinc-300 focus:ring-black text-black"
                  />
                  <span>Show Hotkey Shortcut Badges</span>
                </label>
              </div>

              <hr className="border-zinc-100" />

              {/* Active State Diagnosis Details */}
              <div className="flex flex-col gap-2 font-mono text-[11px] bg-zinc-50 p-3.5 border border-zinc-200/60 rounded-md">
                <h4 className="font-bold text-[9px] uppercase tracking-wider text-zinc-400 select-none mb-1">
                  Active Context Diagnosis
                </h4>
                <div className="flex justify-between border-b border-zinc-100 pb-1.5">
                  <span className="text-zinc-450">Active Company</span>
                  <span className="font-bold text-zinc-900">{selectedCompany?.name || "None Selected"}</span>
                </div>
                <div className="flex justify-between border-b border-zinc-100 pb-1.5">
                  <span className="text-zinc-450">Company Database</span>
                  <span className="text-zinc-600 font-semibold">{selectedCompany?.company_id ? `Active (ID: ${selectedCompany.company_id})` : "No Connection"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-450">Active FY Period</span>
                  <span className="text-zinc-700 font-semibold">
                    {activeFY ? `${formatDate(activeFY.start_date)}` : "Not Configured"}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Action buttons */}
            <div className="bg-zinc-50 border-t border-zinc-200 px-4 py-2.5 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setShowConfigure(false)}
                className="font-semibold text-white bg-black hover:bg-zinc-800 px-4 py-1.5 rounded transition-all shadow-sm"
              >
                Apply Settings
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}