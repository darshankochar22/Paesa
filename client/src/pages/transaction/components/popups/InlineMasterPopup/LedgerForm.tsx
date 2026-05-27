import type { GroupType } from "@/types/api";
import Field from "../shared/Field";

const inputCls =
  "text-xs px-2.5 py-1.5 border border-zinc-300 rounded outline-none focus:border-zinc-800 w-full font-medium bg-white transition-colors";

interface LedgerFormState {
  name: string;
  alias: string;
  group_id: string;
  opening_balance: number;
  is_bill_wise: number;
  allow_cost_centres: number;
}

interface Props {
  form: LedgerFormState;
  groups: GroupType[];
  nameInputRef: React.RefObject<HTMLInputElement>;
  onChange: (updates: Partial<LedgerFormState>) => void;
}

function ToggleField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between border border-zinc-200 rounded p-2 bg-zinc-50">
      <span className="text-xs font-semibold text-zinc-600">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="text-xs outline-none bg-transparent font-bold text-zinc-800 cursor-pointer"
      >
        <option value={0}>No</option>
        <option value={1}>Yes</option>
      </select>
    </div>
  );
}

export default function LedgerForm({ form, groups, nameInputRef, onChange }: Props) {
  return (
    <div className="space-y-3">
      <Field label="Name">
        <input
          ref={nameInputRef}
          type="text"
          value={form.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Sales Account"
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

      <Field label="Under Group">
        <select
          value={form.group_id}
          onChange={(e) => onChange({ group_id: e.target.value })}
          className={inputCls}
        >
          {groups.map((g) => (
            <option key={g.group_id} value={g.group_id}>
              {g.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Opening Balance">
        <input
          type="number"
          step="0.01"
          value={form.opening_balance}
          onChange={(e) => onChange({ opening_balance: Number(e.target.value) || 0 })}
          className={inputCls + " text-right"}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <ToggleField
          label="Bill-wise Details?"
          value={form.is_bill_wise}
          onChange={(v) => onChange({ is_bill_wise: v })}
        />
        <ToggleField
          label="Cost Centres?"
          value={form.allow_cost_centres}
          onChange={(v) => onChange({ allow_cost_centres: v })}
        />
      </div>
    </div>
  );
}