import { useState, useEffect } from "react";

interface GSTRegistrationItem {
  gst_id?: number;
  gstin?: string;
  state_id?: string;
  trade_name?: string;
  legal_name?: string;
}

interface DownloadSettingsModalProps {
  isOpen: boolean;
  registrations: GSTRegistrationItem[];
  /** Comma-separated list of previously selected registrations (empty = All Registrations). */
  initialRegistration: string;
  /** Comma-separated list of previously selected return types (empty = All Returns). */
  initialReturnType: string;
  /** Both args are comma-separated strings (multi-select). */
  onSave: (registration: string, returnType: string) => void;
  onClose: () => void;
}

const ALL_REGISTRATIONS = "All Registrations";
const ALL_RETURNS = "All Returns";
const RETURN_TYPES = ["GSTR-1", "GSTR-2A", "GSTR-2B", "GSTR-3B"];
const END_OF_LIST = "End of List";

const splitValues = (raw: string): string[] =>
  raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : [];

export default function DownloadSettingsModal({
  isOpen,
  registrations,
  initialRegistration,
  initialReturnType,
  onSave,
  onClose,
}: DownloadSettingsModalProps) {
  const [activeField, setActiveField] = useState<"gstRegistration" | "returnType">("gstRegistration");
  const [regSelected, setRegSelected] = useState<string[]>([ALL_REGISTRATIONS]);
  const [returnSelected, setReturnSelected] = useState<string[]>([ALL_RETURNS]);
  const [listIndex, setListIndex] = useState(0);

  // Generate a readable label for each GST Registration
  const getRegLabel = (r: GSTRegistrationItem) => {
    if (r.state_id) {
      return r.state_id.includes("Registration") ? r.state_id : `${r.state_id} Registration`;
    }
    return r.gstin ? `GSTIN: ${r.gstin}` : "Primary Registration";
  };

  const regLabels = registrations.length > 0 ? registrations.map(getRegLabel) : ["Primary Registration"];

  // Build the dropdown options for the active field, TallyPrime multi-select style:
  //  • nothing picked yet → the "All …" shortcut first, then every item
  //  • specific items picked → only the remaining items, led by "End of List" to finish
  const buildOptions = (specifics: string[], allItems: string[], allOption: string): string[] => {
    if (specifics.length === 0) return [allOption, ...allItems];
    return [END_OF_LIST, ...allItems.filter((o) => !specifics.includes(o))];
  };

  const regSpecifics = regSelected.filter((v) => v !== ALL_REGISTRATIONS);
  const returnSpecifics = returnSelected.filter((v) => v !== ALL_RETURNS);
  const activeOptions =
    activeField === "gstRegistration"
      ? buildOptions(regSpecifics, regLabels, ALL_REGISTRATIONS)
      : buildOptions(returnSpecifics, RETURN_TYPES, ALL_RETURNS);

  useEffect(() => {
    if (isOpen) {
      const regs = splitValues(initialRegistration);
      const rets = splitValues(initialReturnType);
      setRegSelected(regs.length ? regs : [ALL_REGISTRATIONS]);
      setReturnSelected(rets.length ? rets : [ALL_RETURNS]);
      setActiveField("gstRegistration");
      setListIndex(0);
    }
  }, [isOpen, initialRegistration, initialReturnType]);

  // Finalize the current field — move to Return Type, or save + close after it.
  const advance = (finalReturns: string[]) => {
    if (activeField === "gstRegistration") {
      setActiveField("returnType");
      setListIndex(0);
    } else {
      onSave(regSelected.join(", "), finalReturns.join(", "));
      onClose();
    }
  };

  // Apply a chosen option to whichever field is active.
  const pickForField = (opt: string) => {
    const isReg = activeField === "gstRegistration";
    const selected = isReg ? regSelected : returnSelected;
    const setSelected = isReg ? setRegSelected : setReturnSelected;
    const allOption = isReg ? ALL_REGISTRATIONS : ALL_RETURNS;

    if (opt === END_OF_LIST) {
      advance(returnSelected);
      return;
    }

    if (opt === allOption) {
      setSelected([allOption]);
      advance([allOption]);
      return;
    }

    // Specific item — replace the lone "All …" default, then append.
    const base = selected.length === 1 && selected[0] === allOption ? [] : selected;
    if (base.includes(opt)) return;
    setSelected([...base, opt]);
    setListIndex(0); // re-anchor on "End of List" so Enter finishes the field
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setListIndex((p) => (p + 1) % activeOptions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setListIndex((p) => (p - 1 + activeOptions.length) % activeOptions.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        pickForField(activeOptions[listIndex]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, activeField, listIndex, activeOptions, regSelected, returnSelected]);

  if (!isOpen) return null;

  // Render a field's value: committed picks stacked; when active, an extra cursor slot.
  const renderFieldValue = (selected: string[], isActive: boolean, allOption: string) => {
    const specifics = selected.filter((v) => v !== allOption);
    if (!isActive) {
      return (
        <div className="flex flex-col px-2 py-0.5">
          {(selected.length ? selected : [allOption]).map((v) => (
            <div key={v} className="font-bold text-zinc-900 leading-tight">{v}</div>
          ))}
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-0.5">
        {specifics.map((v) => (
          <div key={v} className="font-bold text-zinc-900 leading-tight px-2">{v}</div>
        ))}
        <div className="px-2 py-0.5 border bg-[#ffea5d] border-[#e6c300] text-zinc-950 font-bold w-fit min-w-[150px]">
          {specifics.length === 0 ? `♦ ${allOption}` : " "}
        </div>
      </div>
    );
  };

  const headerTitle = activeField === "gstRegistration" ? "List of GST Registrations" : "Types of Return";

  return (
    <div className="fixed inset-0 bg-black/20 z-[11000] flex items-center justify-center font-mono text-[11px] backdrop-blur-[1px]">
      <div className="flex gap-4 items-stretch">

        {/* Main Settings Prompt Box */}
        <div className="relative bg-white border border-zinc-400 shadow-2xl w-[420px] flex flex-col pt-3 pb-8 px-6 min-h-[220px]">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="text-center font-bold text-xs pb-6 text-zinc-900 tracking-wide">
            Download Settings
          </div>

          <div className="space-y-4">
            {/* GST Registration (multi-select) */}
            <div className="grid" style={{ gridTemplateColumns: "130px 10px 1fr", alignItems: "start" }}>
              <span className="text-zinc-700 pt-0.5">GST Registration</span>
              <span className="text-zinc-400 text-center pt-0.5">:</span>
              <div
                onClick={() => { setActiveField("gstRegistration"); setListIndex(0); }}
                className="cursor-pointer select-none"
              >
                {renderFieldValue(regSelected, activeField === "gstRegistration", ALL_REGISTRATIONS)}
              </div>
            </div>

            {/* Return Type (multi-select) */}
            <div className="grid" style={{ gridTemplateColumns: "130px 10px 1fr", alignItems: "start" }}>
              <span className="text-zinc-700 pt-0.5">Return Type</span>
              <span className="text-zinc-400 text-center pt-0.5">:</span>
              <div
                onClick={() => { setActiveField("returnType"); setListIndex(0); }}
                className="cursor-pointer select-none"
              >
                {renderFieldValue(returnSelected, activeField === "returnType", ALL_RETURNS)}
              </div>
            </div>
          </div>
        </div>

        {/* Right list panel for the active field's options */}
        <div className="bg-white border border-zinc-400 w-[240px] flex flex-col shadow-2xl overflow-hidden min-h-[220px]">
          <div className="bg-[#4d66cc] text-white font-bold text-xs py-1.5 px-3 tracking-wide">
            <span>{headerTitle}</span>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {activeOptions.map((opt, index) => (
              <div
                key={opt}
                onClick={() => pickForField(opt)}
                className={`px-3 py-1 cursor-pointer font-mono text-[11px] ${
                  index === listIndex ? "bg-[#ffb62b] text-black font-bold" : "hover:bg-zinc-100 text-zinc-900"
                }`}
              >
                {opt === END_OF_LIST ? `♦ ${END_OF_LIST}` : opt}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
