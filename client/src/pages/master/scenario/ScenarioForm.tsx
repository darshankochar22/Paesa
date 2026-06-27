import { useState, useEffect, useRef } from "react";
import { PageTitleBar, RightActionPanel, Select } from "@/components/ui";
import type { ScenarioType, ScenarioVoucher, VoucherTypeType } from "@/types/api";

const inputCls =
  "w-full bg-transparent text-[12px] font-bold text-zinc-950 font-mono outline-none py-1 px-1 border-b border-transparent focus:border-zinc-400 transition-colors";

interface Props {
  mode: "create" | "alter";
  companyId: number;
  voucherTypes: VoucherTypeType[];
  scenarios: ScenarioType[];
  initial?: ScenarioType;
  onSaved: (msg: string) => void;
  onCancel: () => void;
  onBack: () => void;
  onDelete?: () => void;
}

function Row({
  label,
  required,
  children,
  onClick,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      className={`flex items-start min-h-[36px] border-b border-zinc-100 last:border-0 ${onClick ? "cursor-pointer hover:bg-zinc-50" : ""}`}
      onClick={onClick}
    >
      <span className="w-56 text-[12px] text-zinc-600 shrink-0 py-1.5 pl-3 select-none">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <span className="text-zinc-400 mr-2 py-1.5 select-none">:</span>
      <div className="flex-1 py-1">{children}</div>
    </div>
  );
}

export default function ScenarioForm({
  mode,
  companyId,
  voucherTypes,
  scenarios,
  initial,
  onSaved,
  onCancel,
  onBack,
  onDelete,
}: Props) {
  void scenarios; // reserved for future duplicate-name hints

  const [name, setName] = useState(initial?.name ?? "");
  const [includeActuals, setIncludeActuals] = useState<boolean>(
    initial ? !!initial.include_actuals : true
  );

  const [includeRows, setIncludeRows] = useState<ScenarioVoucher[]>(initial?.includes ?? []);
  const [excludeRows, setExcludeRows] = useState<ScenarioVoucher[]>(initial?.excludes ?? []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const vtOptions = voucherTypes.map((v) => ({ value: v.vt_id!, label: v.name }));

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setLoading(true);
    setError(null);
    const payload: Partial<ScenarioType> = {
      company_id: companyId,
      name: name.trim(),
      include_actuals: includeActuals ? 1 : 0,
      includes: includeRows.filter((r) => r.voucher_type_id),
      excludes: excludeRows.filter((r) => r.voucher_type_id),
    };
    try {
      const res =
        mode === "create"
          ? await window.api.scenario.create(payload)
          : await window.api.scenario.update({ ...payload, scenario_id: initial!.scenario_id });
      if (res.success) {
        onSaved(`Scenario "${name.trim()}" ${mode === "create" ? "created" : "updated"}.`);
      } else {
        setError(res.error || "Failed to save scenario.");
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
        title={mode === "create" ? "Scenario Creation" : "Scenario Alteration"}
        subtitle={includeActuals ? "Include actuals" : undefined}
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
              {mode === "create" ? "Scenario Creation" : "Scenario Alteration"}
            </div>

            <div className="p-4 flex flex-col gap-1">
              <Row label="Name" required>
                <input ref={nameRef} className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
              </Row>
              <Row label="Include actuals">
                <button
                  onClick={() => setIncludeActuals((v) => !v)}
                  className="text-[12px] font-bold font-mono px-2 py-0.5 border border-zinc-300 rounded hover:bg-zinc-50"
                >
                  {includeActuals ? "Yes" : "No"}
                </button>
              </Row>
            </div>

            {/* Include / Exclude voucher type lists */}
            <div className="px-4 pb-5 flex flex-col gap-5">
              <VoucherList
                heading="Include"
                rows={includeRows}
                onChange={setIncludeRows}
                vtOptions={vtOptions}
              />
              <VoucherList
                heading="Exclude"
                rows={excludeRows}
                onChange={setExcludeRows}
                vtOptions={vtOptions}
              />
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

/* ───────────────────── Include / Exclude voucher grid ───────────────────── */

function VoucherList({
  heading,
  rows,
  onChange,
  vtOptions,
}: {
  heading: string;
  rows: ScenarioVoucher[];
  onChange: (rows: ScenarioVoucher[]) => void;
  vtOptions: { value: number; label: string }[];
}) {
  const update = (i: number, patch: Partial<ScenarioVoucher>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () =>
    onChange([...rows, { voucher_type_id: 0, vouchers_mode: "Optional Vouchers Only" }]);
  const removeRow = (i: number) => onChange(rows.filter((_, idx) => idx !== i));

  return (
    <div className="border border-zinc-300">
      <div className="bg-zinc-100 px-3 py-1.5 border-b border-zinc-300 text-[11px] font-bold text-zinc-700">
        {heading}
      </div>
      {rows.length === 0 && (
        <div className="py-5 text-center text-zinc-400 italic font-sans text-xs">
          No voucher types — add a row below.
        </div>
      )}
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[1fr_40px] border-b border-zinc-100 items-center">
          <div className="border-r border-zinc-100 px-1">
            <Select
              className="border-0 h-7"
              value={r.voucher_type_id || ""}
              onChange={(e) => update(i, { voucher_type_id: e.target.value ? Number(e.target.value) : 0 })}
              options={vtOptions}
              placeholder="Select voucher type…"
            />
          </div>
          <button onClick={() => removeRow(i)} className="text-zinc-400 hover:text-red-500 text-sm font-bold">
            &times;
          </button>
        </div>
      ))}
      <div className="p-2">
        <button
          onClick={addRow}
          className="text-xs px-3 py-1 rounded border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 shadow-sm transition-colors font-medium font-sans"
        >
          + Add Voucher Type
        </button>
      </div>
    </div>
  );
}
