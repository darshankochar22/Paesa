import { useRef, useEffect } from "react";

interface GodownFormState {
  name: string;
  alias: string;
  address: string;
}

interface Props {
  form: GodownFormState;
  onChange: (updates: Partial<GodownFormState>) => void;
}

const inputCls =
  "text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full font-medium bg-white transition-colors";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function GodownForm({ form, onChange }: Props) {
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  return (
    <div className="space-y-3">
      <Field label="Godown Name">
        <input
          ref={nameRef}
          type="text"
          value={form.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Warehouse A"
          className={inputCls}
        />
      </Field>

      <Field label="Alias">
        <input
          type="text"
          value={form.alias}
          onChange={(e) => onChange({ alias: e.target.value })}
          placeholder="Optional alias"
          className={inputCls}
        />
      </Field>

      <Field label="Address">
        <textarea
          value={form.address}
          onChange={(e) => onChange({ address: e.target.value })}
          placeholder="Street, city, etc."
          rows={3}
          className={inputCls + " resize-none"}
        />
      </Field>
    </div>
  );
}
