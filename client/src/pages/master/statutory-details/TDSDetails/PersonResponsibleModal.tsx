import { useState, useEffect, useRef } from "react";
import { FormRow } from "@/components/ui";

const activeClass = "bg-[#ffea5d] border-[#e6c300] text-zinc-950 px-2 py-0.5 outline-none border w-64 font-mono font-bold text-xs";
const inactiveClass = "border-transparent bg-transparent text-zinc-900 px-2 py-0.5 outline-none border w-64 font-mono font-bold text-xs";

// Data-driven field list — order matches TallyPrime's Person Responsible Details.
// `gap` marks the start of a new visual block (blank line in Tally).
interface FieldDef {
  key: string;
  label: string;
  upper?: boolean;
  maxLength?: number;
  placeholder?: string;
  gap?: boolean;
}

const PR_FIELDS: FieldDef[] = [
  { key: "personResponsibleName", label: "Name" },
  { key: "personResponsibleSonOf", label: "Son/daughter of" },
  { key: "personResponsibleDesignation", label: "Designation" },
  { key: "personResponsiblePan", label: "PAN", upper: true, maxLength: 10, placeholder: "e.g. ABCDE1234F" },

  { key: "personResponsibleFlatNo", label: "Flat no.", gap: true },
  { key: "personResponsiblePremises", label: "Name of the premises/building" },
  { key: "personResponsibleRoad", label: "Road/Street/Lane" },
  { key: "personResponsibleArea", label: "Area/Location" },
  { key: "personResponsibleCity", label: "Town/City/District" },
  { key: "personResponsibleState", label: "State" },
  { key: "personResponsiblePincode", label: "Pincode", maxLength: 6 },

  { key: "personResponsiblePhone", label: "Mobile no.", gap: true },
  { key: "personResponsibleStdCode", label: "STD code" },
  { key: "personResponsibleTelephone", label: "Telephone" },
  { key: "personResponsibleEmail", label: "E-mail ID" },
];

interface PersonResponsibleModalProps {
  form: any;
  setField: (field: any, val: any) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export default function PersonResponsibleModal({
  form,
  setField,
  onSubmit,
  onClose,
}: PersonResponsibleModalProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[activeIndex]?.focus();
  }, [activeIndex]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
        e.preventDefault();
        if (activeIndex >= PR_FIELDS.length - 1) onSubmit();
        else setActiveIndex((i) => i + 1);
        return;
      }
      if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
        e.preventDefault();
        if (activeIndex > 0) setActiveIndex((i) => i - 1);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeIndex, onSubmit, onClose]);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999] font-mono text-[11px]">
      <div className="bg-white border-4 border-double border-zinc-400 shadow-2xl w-[640px] max-h-[88vh] flex flex-col">
        <div className="text-center font-bold text-xs py-3 border-b border-zinc-200 uppercase tracking-wide shrink-0">
          Person Responsible Details
        </div>

        <div className="px-6 py-4 space-y-1 overflow-y-auto">
          {PR_FIELDS.map((f, i) => (
            <div key={f.key} className={f.gap ? "pt-3" : ""}>
              <FormRow label={f.label} labelWidth="w-56">
                <input
                  ref={(el) => { inputRefs.current[i] = el; }}
                  className={activeIndex === i ? activeClass : inactiveClass}
                  value={form[f.key] ?? ""}
                  maxLength={f.maxLength}
                  placeholder={f.placeholder}
                  onChange={(e) =>
                    setField(f.key, f.upper ? e.target.value.toUpperCase() : e.target.value)
                  }
                  onFocus={() => setActiveIndex(i)}
                />
              </FormRow>
            </div>
          ))}

          <div className="pt-3 text-[10px] italic text-zinc-500">
            (Note: All the above details will be used in Challan, Forms &amp; Returns)
          </div>
        </div>

        <div className="border-t border-zinc-200 px-6 py-3 flex justify-end gap-3 shrink-0 font-sans">
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] px-4 py-1 border border-zinc-300 hover:bg-zinc-100 text-zinc-800 font-bold focus:outline-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="text-[11px] px-4 py-1 border border-zinc-300 hover:bg-zinc-100 text-zinc-800 font-bold focus:outline-none"
          >
            Ok
          </button>
        </div>
      </div>
    </div>
  );
}
