const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formatDateDisplay = (dateStr: string | undefined): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()}-${monthNames[d.getMonth()]}-${String(d.getFullYear())}`;
};

interface Props {
  voucher: any;
  grandTotal: number;
  allGodowns: any[];
  allUnits: any[];
  onClose: () => void;
  onCancel: (voucherId: number) => void;
}

export default function DaybookDetail({
  voucher,
  grandTotal,
  allGodowns,
  allUnits,
  onClose,
  onCancel,
}: Props) {
  return (
    <>
      {/* Glassmorphism backdrop */}
      <div
        className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs z-40 transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Slide-over drawer */}
      <div className="fixed inset-y-0 right-0 w-[550px] bg-white shadow-2xl border-l border-zinc-200 z-50 flex flex-col animate-slide-left text-xs text-zinc-800">

        {/* Drawer Header */}
        <div className="bg-zinc-900 text-white px-4 py-3 flex justify-between items-center shadow-md shrink-0 select-none">
          <div className="flex flex-col">
            <span className="uppercase tracking-wider font-bold text-xs">
              {voucher.voucher_type} Voucher Details
            </span>
            <span className="text-[10px] text-zinc-400 mt-0.5">
              Voucher No. {voucher.voucher_number}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-lg font-bold font-sans transition-colors"
          >
            &times;
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-white">

          {/* Meta Info Grid */}
          <div className="grid grid-cols-2 gap-3 p-3 border border-zinc-100 bg-zinc-50/50 rounded">
            <div className="space-y-1">
              <div className="flex">
                <span className="w-20 text-zinc-400">Date</span>
                <span className="font-semibold">{formatDateDisplay(voucher.date)}</span>
              </div>
              <div className="flex">
                <span className="w-20 text-zinc-400">Ref No.</span>
                <span>{voucher.reference_number || "—"}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex">
                <span className="w-20 text-zinc-400">Supply State</span>
                <span className="font-semibold">{voucher.place_of_supply || "—"}</span>
              </div>
              {voucher.party_name && (
                <div className="flex">
                  <span className="w-20 text-zinc-400">Party</span>
                  <span className="font-semibold truncate">{voucher.party_name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Inventory Stock Entries */}
          {voucher.stock_entries && voucher.stock_entries.length > 0 && (
            <div className="border border-zinc-200 rounded overflow-hidden">
              <div className="bg-zinc-50 border-b border-zinc-200 px-3 py-1.5 font-bold uppercase text-[9px] text-zinc-500 tracking-wider">
                Inventory Stock Particulars
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-zinc-50/40 border-b border-zinc-100 text-[9px] uppercase text-zinc-400 font-bold font-sans">
                    <th className="px-3 py-1.5">Item Name</th>
                    <th className="px-2 py-1.5">Godown</th>
                    <th className="px-2 py-1.5 text-right">Quantity</th>
                    <th className="px-2 py-1.5 text-right">Rate</th>
                    <th className="px-3 py-1.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {voucher.stock_entries.map((item: any, idx: number) => {
                    const godownName =
                      allGodowns.find((g) => g.godown_id === item.godown_id)?.name ||
                      "Main Location";
                    const unitSymbol =
                      allUnits.find((u) => u.unit_id === item.unit_id)?.symbol || "Nos";
                    return (
                      <tr key={idx} className="hover:bg-zinc-50/30">
                        <td className="px-3 py-2 font-semibold text-zinc-900">
                          {item.item_name}
                        </td>
                        <td className="px-2 py-2 text-zinc-500">{godownName}</td>
                        <td className="px-2 py-2 text-right">
                          {item.quantity.toFixed(2)} {unitSymbol}
                        </td>
                        <td className="px-2 py-2 text-right">
                          {(item.rate || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right font-bold">
                          {(item.amount || 0).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Accounting Double-Entry Details */}
          <div className="border border-zinc-200 rounded overflow-hidden">
            <div className="bg-zinc-50 border-b border-zinc-200 px-3 py-1.5 font-bold uppercase text-[9px] text-zinc-500 tracking-wider">
              Accounting Double-Entry Details
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-zinc-50/40 border-b border-zinc-100 text-[9px] uppercase text-zinc-400 font-bold font-sans">
                  <th className="px-3 py-1.5 text-center w-12">Dr/Cr</th>
                  <th className="px-3 py-1.5">Ledger Name</th>
                  <th className="px-3 py-1.5 text-right">Debit (Dr)</th>
                  <th className="px-3 py-1.5 text-right">Credit (Cr)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {voucher.entries &&
                  voucher.entries.map((entry: any, idx: number) => (
                    <tr key={idx} className="hover:bg-zinc-50/30">
                      <td
                        className={`px-3 py-2 text-center font-bold ${
                          entry.type === "Dr"
                            ? "text-blue-700 bg-blue-50/10"
                            : "text-red-700 bg-red-50/10"
                        }`}
                      >
                        {entry.type}
                      </td>
                      <td className="px-3 py-2 font-semibold text-zinc-900">
                        {entry.ledger_name}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-zinc-800">
                        {entry.type === "Dr" ? (entry.amount || 0).toFixed(2) : ""}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-zinc-800">
                        {entry.type === "Cr" ? (entry.amount || 0).toFixed(2) : ""}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Grand Total & Narration */}
          <div className="space-y-2 border-t border-zinc-100 pt-3">
            <div className="flex justify-between items-center p-3 border border-zinc-200 rounded bg-zinc-50">
              <span className="font-bold text-zinc-600 uppercase tracking-wider">
                Grand Total (INR) :
              </span>
              <span className="text-sm font-bold text-zinc-950">
                {grandTotal.toFixed(2)}
              </span>
            </div>

            <div className="p-3 border border-zinc-100 rounded bg-zinc-50/20">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">
                Narration Remarks
              </span>
              <p className="text-zinc-700 italic font-medium break-words">
                {voucher.narration ||
                  "No narration remarks recorded for this transaction."}
              </p>
            </div>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="border-t border-zinc-200 p-3 bg-zinc-50 flex justify-between items-center gap-2 shrink-0 select-none">
          <button
            onClick={() => onCancel(voucher.voucher_id)}
            className="text-xs text-red-600 hover:text-red-800 font-bold bg-red-50 hover:bg-red-100 border border-red-200 px-4 py-2 rounded transition-colors uppercase font-sans tracking-wide"
          >
            Cancel Voucher
          </button>
          <button
            onClick={onClose}
            className="text-xs text-zinc-700 hover:text-zinc-950 font-bold bg-white hover:bg-zinc-100 border border-zinc-300 px-5 py-2 rounded transition-colors uppercase font-sans tracking-wide shadow-sm"
          >
            Close Details
          </button>
        </div>
      </div>
    </>
  );
}
