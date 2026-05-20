interface Props {
  voucherType: string;
  voucherNumber: number;
  dateDisplay: string;
}

export default function VoucherHeader({ voucherType, voucherNumber, dateDisplay }: Props) {
  return (
    <div className="flex items-center justify-between px-3 py-1 bg-white border-b border-gray-300">
      <div className="flex items-center gap-2 text-sm">
        <span className="bg-black text-white px-2 py-0.5 text-xs font-medium">{voucherType}</span>
        <span className="text-gray-600">No.</span>
        <span className="font-semibold text-black">{voucherNumber}</span>
      </div>
      <div className="text-sm text-black font-medium">
        {dateDisplay}
      </div>
    </div>
  );
}
