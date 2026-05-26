import { formatIndianCurrency } from "../utils/formatCurrency";

interface Props {
  value: string;
  totalAmount: number;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function NarrationSection({
  value,
  totalAmount,
  onChange,
  placeholder = "Enter narration…",
}: Props) {
  return (
    <div className="flex items-center border-t border-black shrink-0 px-3 py-1 bg-white">
      <span className="text-sm text-black shrink-0 w-24">Narration</span>
      <span className="text-sm text-black shrink-0 mr-2">:</span>
      <input
        type="text"
        className="flex-1 text-sm bg-transparent outline-none border-b border-transparent focus:border-black px-1 py-0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {totalAmount > 0 && (
        <span className="text-sm font-semibold text-black ml-4 shrink-0 tabular-nums">
          {formatIndianCurrency(totalAmount)}
        </span>
      )}
    </div>
  );
}