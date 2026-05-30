import { useRef, useEffect } from "react";

interface StockItemFormState {
  name: string;
  alias: string;
  sg_id: string;
  unit_id: string;
  opening_qty: number;
  opening_rate: number;
  opening_value: number;
}

interface StockGroup {
  sg_id: number;
  name: string;
}

interface Unit {
  unit_id: number;
  symbol: string;
  formal_name: string;
}

interface Props {
  form: StockItemFormState;
  onChange: (updates: Partial<StockItemFormState>) => void;
  stockGroups: StockGroup[];
  units: Unit[];
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

export default function StockItemForm({ form, onChange, stockGroups, units }: Props) {
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  return (
    <div className="space-y-3">
      <Field label="Item Name">
        <input
          ref={nameRef}
          type="text"
          value={form.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Dell Monitor 24"
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

      <div className="grid grid-cols-2 gap-3">
        <Field label="Stock Group">
          <select
            value={form.sg_id}
            onChange={(e) => onChange({ sg_id: e.target.value })}
            className={inputCls}
          >
            {stockGroups.map((sg) => (
              <option key={sg.sg_id} value={sg.sg_id}>
                {sg.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Unit">
          <select
            value={form.unit_id}
            onChange={(e) => onChange({ unit_id: e.target.value })}
            className={inputCls}
          >
            {units.map((u) => (
              <option key={u.unit_id} value={u.unit_id}>
                {u.symbol} ({u.formal_name})
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="pt-2 border-t border-zinc-100" />
      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
        Opening Balance
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Field label="Qty">
          <input
            type="number"
            value={form.opening_qty}
            onChange={(e) => {
              const qty = Number(e.target.value) || 0;
              onChange({
                opening_qty: qty,
                opening_value: qty * form.opening_rate,
              });
            }}
            className={inputCls + " text-right"}
          />
        </Field>

        <Field label="Rate">
          <input
            type="number"
            value={form.opening_rate}
            onChange={(e) => {
              const rate = Number(e.target.value) || 0;
              onChange({
                opening_rate: rate,
                opening_value: form.opening_qty * rate,
              });
            }}
            className={inputCls + " text-right"}
          />
        </Field>

        <Field label="Value">
          <input
            type="number"
            value={form.opening_value}
            onChange={(e) => onChange({ opening_value: Number(e.target.value) || 0 })}
            className={inputCls + " text-right"}
          />
        </Field>
      </div>
    </div>
  );
}
