import { useState, useEffect, useRef } from "react";
import { PageTitleBar, FormRow, RightActionPanel } from "@/components/ui";
import RightPanel from "@/components/RightPanel";

interface ExciseTariffData {
  tax_unit_id: number;
  tariff_description: string;
  applicability: string;
  tariff_type: string;
  particulars: string;
  igst_rate: number;
  cgst_rate: number;
  sgst_rate: number;
}

export default function ExciseTariffDetails({
  taxUnitId,
  onClose,
}: {
  taxUnitId: number;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ExciseTariffData>({
    tax_unit_id: taxUnitId,
    tariff_description: "",
    applicability: "All",
    tariff_type: "Standard",
    particulars: "",
    igst_rate: 0,
    cgst_rate: 0,
    sgst_rate: 0,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeField, setActiveField] = useState("tariffDescription");
  const [showAccept, setShowAccept] = useState(false);

  const descRef = useRef<HTMLInputElement>(null);
  const applicabilityRef = useRef<HTMLSelectElement>(null);
  const typeRef = useRef<HTMLSelectElement>(null);
  const particularsRef = useRef<HTMLInputElement>(null);
  const igstRef = useRef<HTMLInputElement>(null);
  const cgstRef = useRef<HTMLInputElement>(null);
  const sgstRef = useRef<HTMLInputElement>(null);

  const FIELDS = [
    "tariffDescription",
    "applicability",
    "tariffType",
    "particulars",
    "igstRate",
    "cgstRate",
    "sgstRate",
  ];

  const handleSave = async () => {
    if (!form.tariff_description.trim()) {
      setError("Tariff description is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const result = await window.api.taxUnits.saveTariffDetails(form);
      if (result.success) {
        onClose();
      } else {
        setError(result.error || "Failed to save tariff details");
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (showAccept) {
      const handler = (e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        if (key === "y" || e.key === "Enter") {
          e.preventDefault();
          setShowAccept(false);
          handleSave();
        } else if (key === "n" || e.key === "Escape") {
          e.preventDefault();
          setShowAccept(false);
        }
      };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setShowAccept(true);
        return;
      }

      const idx = FIELDS.indexOf(activeField);
      if (idx !== -1) {
        if (e.key === "Enter" || e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
          e.preventDefault();
          if (idx === FIELDS.length - 1) {
            setShowAccept(true);
          } else {
            setActiveField(FIELDS[idx + 1]);
          }
          return;
        }
        if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
          e.preventDefault();
          if (idx > 0) {
            setActiveField(FIELDS[idx - 1]);
          }
          return;
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeField, showAccept, onClose]);

  useEffect(() => {
    const refMap: Record<string, React.RefObject<HTMLInputElement | HTMLSelectElement | null>> = {
      tariffDescription: descRef,
      applicability: applicabilityRef,
      tariffType: typeRef,
      particulars: particularsRef,
      igstRate: igstRef,
      cgstRate: cgstRef,
      sgstRate: sgstRef,
    };
    refMap[activeField]?.current?.focus();
  }, [activeField]);

  const activeClass = "bg-[#ffea5d] border-[#e6c300] text-zinc-950 px-2 py-0.5 outline-none border w-64 font-mono font-bold text-xs uppercase";
  const inactiveClass = "border-transparent bg-transparent text-zinc-900 px-2 py-0.5 outline-none border w-64 font-mono font-bold text-xs uppercase";
  const getInputCls = (isActive: boolean) => isActive ? activeClass : inactiveClass;

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-100 font-mono text-[11px] select-none text-zinc-950">
      <PageTitleBar title="Excise Tariff Details" />

      <div className="flex flex-1 min-h-0 relative">
        <div className="flex-1 bg-white border-r border-zinc-300 flex flex-col overflow-y-auto">
          <div className="p-6 space-y-1.5 flex-1 max-w-2xl">
            {error && (
              <div className="mb-2 px-2 py-1 text-xs text-red-700 bg-red-50 border border-red-200 rounded">
                {error}
              </div>
            )}

            <FormRow label="Tariff Description" labelWidth="w-56">
              <input
                ref={descRef}
                className={getInputCls(activeField === "tariffDescription")}
                value={form.tariff_description}
                onChange={(e) => setForm({ ...form, tariff_description: e.target.value })}
                onFocus={() => setActiveField("tariffDescription")}
              />
            </FormRow>

            <FormRow label="Applicability" labelWidth="w-56">
              <select
                ref={applicabilityRef}
                className={getInputCls(activeField === "applicability")}
                value={form.applicability}
                onChange={(e) => setForm({ ...form, applicability: e.target.value })}
                onFocus={() => setActiveField("applicability")}
              >
                <option value="All">All</option>
                <option value="Specific">Specific</option>
                <option value="Category">Category</option>
              </select>
            </FormRow>

            <FormRow label="Tariff Type" labelWidth="w-56">
              <select
                ref={typeRef}
                className={getInputCls(activeField === "tariffType")}
                value={form.tariff_type}
                onChange={(e) => setForm({ ...form, tariff_type: e.target.value })}
                onFocus={() => setActiveField("tariffType")}
              >
                <option value="Standard">Standard</option>
                <option value="Concessional">Concessional</option>
                <option value="Exempted">Exempted</option>
              </select>
            </FormRow>

            <FormRow label="Particulars" labelWidth="w-56">
              <input
                ref={particularsRef}
                className={getInputCls(activeField === "particulars")}
                value={form.particulars}
                onChange={(e) => setForm({ ...form, particulars: e.target.value })}
                onFocus={() => setActiveField("particulars")}
              />
            </FormRow>

            <div className="py-2" />

            <FormRow label="IGST Rate (%)" labelWidth="w-56">
              <input
                ref={igstRef}
                type="number"
                step="0.01"
                className={getInputCls(activeField === "igstRate")}
                value={form.igst_rate}
                onChange={(e) => setForm({ ...form, igst_rate: parseFloat(e.target.value) || 0 })}
                onFocus={() => setActiveField("igstRate")}
              />
            </FormRow>

            <FormRow label="CGST Rate (%)" labelWidth="w-56">
              <input
                ref={cgstRef}
                type="number"
                step="0.01"
                className={getInputCls(activeField === "cgstRate")}
                value={form.cgst_rate}
                onChange={(e) => setForm({ ...form, cgst_rate: parseFloat(e.target.value) || 0 })}
                onFocus={() => setActiveField("cgstRate")}
              />
            </FormRow>

            <FormRow label="SGST Rate (%)" labelWidth="w-56">
              <input
                ref={sgstRef}
                type="number"
                step="0.01"
                className={getInputCls(activeField === "sgstRate")}
                value={form.sgst_rate}
                onChange={(e) => setForm({ ...form, sgst_rate: parseFloat(e.target.value) || 0 })}
                onFocus={() => setActiveField("sgstRate")}
              />
            </FormRow>
          </div>

          <div className="border-t border-zinc-200 flex text-xs shrink-0 font-sans">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-2 text-center hover:bg-zinc-100 border-r border-zinc-200 disabled:opacity-50"
            >
              Quit (Esc)
            </button>
            <button
              onClick={() => setShowAccept(true)}
              disabled={saving}
              className="flex-1 py-2 text-center hover:bg-zinc-100 disabled:opacity-50 font-bold"
            >
              Accept (Alt+A)
            </button>
          </div>
        </div>

        <div className="w-64 flex-shrink-0 bg-zinc-50 border-l border-zinc-300 flex flex-col font-sans">
          <RightPanel />
          <RightActionPanel
            actions={[
              {
                key: "Alt+A",
                label: saving ? "Saving..." : "Accept",
                onClick: () => setShowAccept(true),
              },
              {
                key: "Esc",
                label: "Quit",
                onClick: onClose,
              },
            ]}
          />
        </div>
      </div>

      {showAccept && (
        <div className="absolute bottom-16 right-72 bg-white border-2 border-[#4c90e2] w-[165px] rounded shadow-2xl p-3 flex flex-col items-center z-[10000] font-mono animate-fade-in text-zinc-950">
          <h4 className="font-bold text-[11px] mb-3">Accept?</h4>
          <div className="flex items-center gap-3 w-full justify-center">
            <button
              onClick={() => {
                setShowAccept(false);
                handleSave();
              }}
              disabled={saving}
              className="text-[11px] px-3 py-0.5 border border-zinc-300 hover:bg-zinc-100 text-zinc-800 font-bold focus:outline-none min-w-[55px] text-center disabled:opacity-50 transition-colors"
            >
              Yes
            </button>
            <button
              onClick={() => setShowAccept(false)}
              className="text-[11px] px-3 py-0.5 border border-zinc-300 hover:bg-zinc-100 text-zinc-800 font-bold focus:outline-none min-w-[55px] text-center transition-colors cursor-pointer"
            >
              No
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
