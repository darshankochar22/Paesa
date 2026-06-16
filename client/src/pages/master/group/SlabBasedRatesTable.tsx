import type { SlabBasedRate } from "@/types/api";

interface SlabBasedRatesTableProps {
  rows: SlabBasedRate[];
  onChange: (rows: SlabBasedRate[]) => void;
}

const TAXABILITY_OPTIONS = ["Taxable", "Exempt", "Nil Rated"];

export default function SlabBasedRatesTable({ rows, onChange }: SlabBasedRatesTableProps) {
  const update = (idx: number, patch: Partial<SlabBasedRate>) => {
    onChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const remove = (idx: number) => {
    onChange(rows.filter((_, i) => i !== idx));
  };

  return (
    <div className="border border-zinc-200 mt-2">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-zinc-100 text-zinc-700">
            <th className="border-b border-r border-zinc-200 px-2 py-1 text-center font-semibold w-12">#</th>
            <th className="border-b border-r border-zinc-200 px-2 py-1 text-left font-semibold">Slab-wise Item Rate<br /><span className="text-[10px] font-normal text-zinc-500">Greater Than</span></th>
            <th className="border-b border-r border-zinc-200 px-2 py-1 text-left font-semibold">Up To</th>
            <th className="border-b border-r border-zinc-200 px-2 py-1 text-left font-semibold">Taxability<br /><span className="text-[10px] font-normal text-zinc-500">Type</span></th>
            <th className="border-b border-r border-zinc-200 px-2 py-1 text-left font-semibold">GST<br /><span className="text-[10px] font-normal text-zinc-500">Rate</span></th>
            <th className="border-b border-zinc-200 px-2 py-1 w-8"></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="px-2 py-2 text-center text-zinc-400 italic">
                No slab rows.
              </td>
            </tr>
          )}
          {rows.map((row, idx) => (
            <tr key={idx} className="hover:bg-zinc-50">
              <td className="border-b border-r border-zinc-200 px-2 py-1 text-center text-zinc-500 tabular-nums">
                {idx + 1}
              </td>
              <td className="border-b border-r border-zinc-200 px-1 py-1">
                <input
                  className="w-full bg-transparent text-xs outline-none tabular-nums"
                  type="number"
                  min="0"
                  value={row.greater_than ?? 0}
                  onChange={(e) => update(idx, { greater_than: Number(e.target.value) })}
                />
              </td>
              <td className="border-b border-r border-zinc-200 px-1 py-1">
                <input
                  className="w-full bg-transparent text-xs outline-none tabular-nums"
                  type="number"
                  min="0"
                  value={row.up_to ?? ""}
                  placeholder="Above"
                  onChange={(e) => {
                    const v = e.target.value;
                    update(idx, { up_to: v === "" ? null : Number(v) });
                  }}
                />
              </td>
              <td className="border-b border-r border-zinc-200 px-1 py-1">
                <select
                  className="w-full bg-transparent text-xs outline-none cursor-pointer"
                  value={row.taxability_type || "Taxable"}
                  onChange={(e) => update(idx, { taxability_type: e.target.value })}
                >
                  {TAXABILITY_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </td>
              <td className="border-b border-r border-zinc-200 px-1 py-1">
                <div className="flex items-center gap-1">
                  <input
                    className="w-full bg-transparent text-xs outline-none tabular-nums"
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.gst_rate ?? 0}
                    onChange={(e) => update(idx, { gst_rate: Number(e.target.value) })}
                  />
                  <span className="text-zinc-500">%</span>
                </div>
              </td>
              <td className="border-b border-zinc-200 px-1 py-1 text-center">
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="text-zinc-400 hover:text-red-600 text-xs"
                  title="Remove row"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
