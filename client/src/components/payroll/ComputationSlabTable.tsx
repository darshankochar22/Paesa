import type { PayHeadSlabLineType } from "@/types/entities/Payroll";

const inputCls = "flex-1 bg-transparent text-sm outline-none px-1 py-0.5 border border-zinc-200 focus:border-zinc-800 transition-colors bg-white rounded";

interface Props {
  slabs: PayHeadSlabLineType[];
  onAdd: () => void;
  onDelete: (index: number) => void;
  onChange: (index: number, field: keyof PayHeadSlabLineType, value: string | number) => void;
}

export default function ComputationSlabTable({ slabs, onAdd, onDelete, onChange }: Props) {
  return (
    <div className="border border-zinc-200 rounded overflow-hidden">
      <div className="bg-zinc-50 border-b border-zinc-200 px-2 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider grid grid-cols-12 gap-1">
        <span className="col-span-3">Effective From</span>
        <span className="col-span-2">Amount GT</span>
        <span className="col-span-2">Amount Up To</span>
        <span className="col-span-2">Slab Type</span>
        <span className="col-span-2">Value</span>
        <span className="col-span-1"></span>
      </div>
      <div className="max-h-48 overflow-y-auto">
        {slabs.map((slab, i) => (
          <div key={i} className="grid grid-cols-12 gap-1 px-1 py-0.5 border-b border-zinc-100 items-center hover:bg-zinc-50/50">
            <input
              type="date"
              className={`${inputCls} col-span-3`}
              value={slab.effective_from || ""}
              onChange={(e) => onChange(i, "effective_from", e.target.value)}
            />
            <input
              type="number"
              className={`${inputCls} col-span-2`}
              value={slab.amount_gt ?? 0}
              onChange={(e) => onChange(i, "amount_gt", Number(e.target.value))}
            />
            <input
              type="number"
              className={`${inputCls} col-span-2`}
              value={slab.amount_up_to ?? 0}
              onChange={(e) => onChange(i, "amount_up_to", Number(e.target.value))}
            />
            <select
              className={`${inputCls} col-span-2 bg-transparent`}
              value={slab.slab_type || "Percentage"}
              onChange={(e) => onChange(i, "slab_type", e.target.value)}
            >
              <option value="Percentage">Percentage</option>
              <option value="Value">Value</option>
            </select>
            <input
              type="number"
              className={`${inputCls} col-span-2`}
              value={slab.value ?? 0}
              onChange={(e) => onChange(i, "value", Number(e.target.value))}
            />
            <button
              onClick={() => onDelete(i)}
              className="col-span-1 text-red-500 hover:text-red-700 text-xs font-bold"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={onAdd}
        className="w-full text-xs text-zinc-500 hover:text-zinc-800 py-1 hover:bg-zinc-50 transition-colors border-t border-zinc-100"
      >
        + Add Slab Line
      </button>
    </div>
  );
}
