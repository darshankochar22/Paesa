import { useState, useEffect, useRef } from "react";
import { PageTitleBar, RightActionPanel, Select } from "@/components/ui";
import type { ExciseDutyClassificationType } from "@/types/api";
import { EXCISE_DUTY_CODES, EXCISE_CALCULATION_METHODS } from "./exciseDutyOptions";

const inputCls =
  "w-full bg-transparent text-[12px] font-bold text-zinc-950 font-mono outline-none py-1 px-1 border-b border-transparent focus:border-zinc-400 transition-colors";

interface Props {
  mode: "create" | "alter";
  companyId: number;
  initial?: ExciseDutyClassificationType;
  onSaved: (msg: string) => void;
  onCancel: () => void;
  onBack: () => void;
  onDelete?: () => void;
}

function Row({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start min-h-[36px] border-b border-zinc-100 last:border-0">
      <span className="w-56 text-[12px] text-zinc-600 shrink-0 py-1.5 pl-3 select-none">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <span className="text-zinc-400 mr-2 py-1.5 select-none">:</span>
      <div className="flex-1 py-1">{children}</div>
    </div>
  );
}

export default function ExciseDutyClassificationForm({
  mode,
  companyId,
  initial,
  onSaved,
  onCancel,
  onBack,
  onDelete,
}: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [dutyCode, setDutyCode] = useState(initial?.duty_code ?? "");
  const [methods, setMethods] = useState<string[]>(initial?.calculation_methods ?? []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setLoading(true);
    setError(null);
    const payload: Partial<ExciseDutyClassificationType> = {
      company_id: companyId,
      name: name.trim(),
      duty_code: dutyCode || null,
      calculation_methods: methods.filter(Boolean),
    };
    try {
      const res =
        mode === "create"
          ? await window.api.exciseDutyClassification.create(payload)
          : await window.api.exciseDutyClassification.update({
              ...payload,
              excise_duty_classification_id: initial!.excise_duty_classification_id,
            });
      if (res.success) {
        onSaved(`Excise Duty Classification "${name.trim()}" ${mode === "create" ? "created" : "updated"}.`);
      } else {
        setError(res.error || "Failed to save excise duty classification.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  const formActions = [
    { key: "Ctrl+A", label: "Accept", onClick: handleSubmit },
    ...(onDelete ? [{ key: "Alt+D", label: "Delete", onClick: onDelete }] : []),
    { key: "Esc", label: mode === "alter" ? "Back" : "Quit", onClick: onBack },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-950 font-mono text-[12px]">
      <PageTitleBar
        title={mode === "create" ? "Excise Duty Classification Creation" : "Excise Duty Classification Alteration"}
      />

      {error && (
        <div className="mx-6 mt-4 p-2 border border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center font-sans">
          <span>• {error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold">
            &times;
          </button>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto bg-white border border-zinc-300 shadow-sm">
            <div className="bg-zinc-100 px-3 py-1.5 border-b border-zinc-200 text-center font-bold text-xs uppercase tracking-wider text-zinc-700">
              {mode === "create" ? "Excise Duty Classification Creation" : "Excise Duty Classification Alteration"}
            </div>

            <div className="p-4 flex flex-col gap-1">
              <Row label="Name" required>
                <input ref={nameRef} className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
              </Row>
              <Row label="Duty code">
                <Select
                  className="border-0 h-7 font-mono font-bold"
                  value={dutyCode}
                  onChange={(e) => setDutyCode(e.target.value)}
                  options={EXCISE_DUTY_CODES}
                  placeholder="Select duty code…"
                />
              </Row>
              <Row label="Calculation method">
                <CalculationMethodList methods={methods} onChange={setMethods} />
              </Row>
            </div>
          </div>
        </div>

        <RightActionPanel actions={formActions} />
      </div>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-zinc-200 flex justify-between items-center bg-zinc-50 shrink-0 font-sans">
        {onDelete ? (
          <button
            onClick={onDelete}
            disabled={loading}
            className="text-xs px-4 py-1.5 rounded border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 disabled:opacity-50 transition-colors font-medium shadow-sm"
          >
            Delete
          </button>
        ) : (
          <button onClick={onCancel} className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors font-medium">
            &larr; Back to Masters
          </button>
        )}
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 shadow-sm transition-colors font-medium"
          >
            Quit
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="text-xs px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 shadow-sm transition-colors font-medium"
          >
            {loading ? "Saving…" : "Accept"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────── Calculation method multi-row list ─────────────────
   Mirrors TallyPrime: pick a method from the list, a new entry line opens,
   keep adding until "End of List". Each chosen method shows as a bulleted
   row; the trailing entry row is the active picker. */

function CalculationMethodList({
  methods,
  onChange,
}: {
  methods: string[];
  onChange: (methods: string[]) => void;
}) {
  // The list of methods not yet chosen — what the trailing picker offers.
  const remaining = EXCISE_CALCULATION_METHODS.filter((o) => !methods.includes(o.value));

  const removeAt = (i: number) => onChange(methods.filter((_, idx) => idx !== i));
  const addMethod = (value: string) => {
    if (value && !methods.includes(value)) onChange([...methods, value]);
  };

  return (
    <div className="flex flex-col gap-0.5">
      {methods.map((m, i) => (
        <div key={`${m}-${i}`} className="flex items-center gap-2 group">
          <span className="text-[12px] font-bold text-zinc-950">• {m}</span>
          <button
            onClick={() => removeAt(i)}
            className="text-zinc-300 group-hover:text-red-500 text-sm font-bold leading-none"
            title="Remove"
          >
            &times;
          </button>
        </div>
      ))}

      {/* Trailing picker — "End of List" once everything is selected */}
      {remaining.length > 0 ? (
        <Select
          className="border-0 h-7 font-mono font-bold mt-0.5"
          value=""
          onChange={(e) => addMethod(e.target.value)}
          options={remaining}
          placeholder={methods.length ? "Add another method…" : "Select calculation method…"}
        />
      ) : (
        <span className="text-[11px] text-zinc-400 italic font-sans mt-1 pl-1 select-none">End of List</span>
      )}
    </div>
  );
}
