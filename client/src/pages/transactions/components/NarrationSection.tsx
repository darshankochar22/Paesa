import { formatIndianCurrency } from "../utils/formatCurrency";

interface Props {
  value: string;
  totalAmount: number;
  onChange: (value: string) => void;
}

export default function NarrationSection({ value, totalAmount, onChange }: Props) {
  return (
    <div className="flex items-center border-t border-black px-3 py-1.5 bg-white">
      <label className="text-sm shrink-0 text-black">Narration</label>
      <span className="text-sm mr-2 shrink-0 w-3 text-black">:</span>
      <input
        type="text"
        className="flex-1 text-sm bg-transparent border border-transparent px-1 py-0.5 outline-none focus:bg-gray-100 focus:border-black"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter narration..."
      />
      <span className="text-sm font-medium tabular-nums w-40 text-right px-2 text-black">
        {formatIndianCurrency(totalAmount)}
      </span>
    </div>
  );
}
