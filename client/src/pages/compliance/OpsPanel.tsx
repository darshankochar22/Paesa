import { useMemo, useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';

// A single schema-driven operation: pick one from the dropdown, fill its fields, run it.
// Each op owns its own API call + body-building in `run`, so this panel stays dumb and is reused
// verbatim for e-Way lookups, e-Way write actions, and e-Invoice utilities.
export type OpField = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'select';
  options?: { value: string; label: string }[];
  placeholder?: string;
  optional?: boolean;
  width?: string; // tailwind width class; defaults to w-44
};

export type OpResult = { success?: boolean; data?: unknown; error?: string } & Record<
  string,
  unknown
>;

export type Op = {
  value: string;
  label: string;
  fields?: OpField[];
  run: (v: Record<string, string>) => Promise<OpResult>;
  /** Return a confirm-message for destructive ops; runs window.confirm before firing. */
  confirm?: (v: Record<string, string>) => string;
  submitLabel?: string;
  note?: string;
};

export default function OpsPanel({
  title,
  ops,
  disabled,
  onSuccess,
}: {
  title: string;
  ops: Op[];
  /** Integration not configured — greys the run button. */
  disabled?: boolean;
  /** Called after a successful run (e.g. to refresh the records table). */
  onSuccess?: () => void;
}) {
  const [opValue, setOpValue] = useState(ops[0]!.value);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);

  const op = useMemo(() => ops.find((o) => o.value === opValue)!, [ops, opValue]);
  const fields = op.fields ?? [];

  const reset = () => {
    setVals({});
    setMsg(null);
    setResult(null);
  };

  const run = async () => {
    const missing = fields.find((f) => !f.optional && !(vals[f.key] || '').trim());
    if (missing) {
      setMsg(`Enter ${missing.label}.`);
      return;
    }
    if (op.confirm && !window.confirm(op.confirm(vals))) return;
    setBusy(true);
    setMsg(null);
    setResult(null);
    try {
      const res = await op.run(vals);
      if (res.success) {
        const data = res.data ?? null;
        const n = Array.isArray(data) ? data.length : null;
        setResult(data);
        setMsg(`OK${n != null ? ` — ${n} row(s)` : ''}`);
        onSuccess?.();
      } else {
        setMsg(res.error || 'Request failed');
      }
    } catch (err) {
      setMsg((err as Error).message);
    }
    setBusy(false);
  };

  return (
    <div className="border border-zinc-200 p-3 mb-4">
      <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-2">{title}</h3>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-56">
          <label className="text-[10px] text-zinc-500 block mb-0.5">Operation</label>
          <Select
            value={opValue}
            onChange={(e) => {
              setOpValue(e.target.value);
              reset();
            }}
            options={ops.map((o) => ({ value: o.value, label: o.label }))}
          />
        </div>
        {fields.map((f) => (
          <div key={f.key} className={f.width || 'w-44'}>
            <label className="text-[10px] text-zinc-500 block mb-0.5">
              {f.label}
              {f.optional && <span className="text-zinc-400"> (optional)</span>}
            </label>
            {f.type === 'select' ? (
              <Select
                value={vals[f.key] ?? f.options?.[0]?.value ?? ''}
                onChange={(e) => setVals((s) => ({ ...s, [f.key]: e.target.value }))}
                options={f.options || []}
              />
            ) : (
              <Input
                value={vals[f.key] ?? ''}
                onChange={(e) => setVals((s) => ({ ...s, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
              />
            )}
          </div>
        ))}
        <Button variant="primary" size="sm" onClick={run} disabled={busy || disabled}>
          {busy ? 'Working…' : op.submitLabel || 'Run'}
        </Button>
        {msg && <span className="text-[11px] text-zinc-700 pb-2">{msg}</span>}
      </div>
      {op.note && <p className="text-[10px] text-zinc-400 mt-2">{op.note}</p>}
      {result != null && (
        <pre className="border border-zinc-200 bg-zinc-50 text-[11px] text-zinc-800 font-mono p-3 mt-2 overflow-auto max-h-[40vh] whitespace-pre-wrap break-words">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
