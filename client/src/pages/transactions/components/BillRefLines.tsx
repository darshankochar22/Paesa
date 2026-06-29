import type { ParticularRow } from "../types";

/**
 * Inline bill-wise breakup shown under a ledger row once allocations are entered
 * (TallyPrime shows e.g. "New Ref  DE104  45 Days  700.00 Cr  ( 16-Apr-27 )"
 * indented below the ledger name). Strict grayscale, emphasis via weight.
 */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtDate(s?: string): string {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return `${d.getDate()}-${MONTHS[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
}

function fmtAmount(n: number): string {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function BillRefLines({
  billReferences,
  dcType,
}: {
  billReferences?: ParticularRow["billReferences"];
  dcType: "Dr" | "Cr";
}) {
  if (!billReferences?.length) return null;

  return (
    <div className="pl-2 mt-0.5 space-y-0.5 text-[10px] text-zinc-600 leading-tight select-none">
      {billReferences.map((b, i) => (
        <div key={i} className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-semibold">{b.bill_type}</span>
          {b.bill_type !== "On Account" && b.bill_name ? <span>{b.bill_name}</span> : null}
          {b.credit_period ? <span>{b.credit_period} Days</span> : null}
          <span className="font-mono">{fmtAmount(b.amount)} {dcType}</span>
          {b.due_date ? (
            <span className="font-mono text-zinc-400">( {fmtDate(b.due_date)} )</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
