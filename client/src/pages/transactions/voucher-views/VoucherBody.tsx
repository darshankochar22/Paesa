import { type Voucher } from "./shared";
import SingleEntryVoucherView from "./SingleEntryVoucherView";
import TradeVoucherView from "./TradeVoucherView";
import InventoryVoucherView from "./InventoryVoucherView";
import PayrollVoucherView from "./PayrollVoucherView";
import AttendanceVoucherView from "./AttendanceVoucherView";

// Dispatch a voucher to its dedicated per-type view. Each voucher_type maps to
// exactly one body component so adding/altering a type touches one place.
const SINGLE_ENTRY = ["Receipt", "Payment", "Contra", "Journal", "Reversing Journal", "Memorandum"];
const TRADE = ["Sales", "Purchase", "Credit Note", "Debit Note"];
const INVENTORY = [
  "Delivery Note", "Receipt Note", "Rejection In", "Rejection Out", "Material In", "Material Out",
  "Physical Stock", "Stock Journal", "Manufacturing Journal", "Sales Order", "Purchase Order",
  "Job Work In Order", "Job Work Out Order",
];

export default function VoucherBody({ voucher, balances }: { voucher: Voucher; balances: Record<number, string> }) {
  const t = voucher.voucher_type;
  if (t === "Payroll") return <PayrollVoucherView voucher={voucher} balances={balances} />;
  if (t === "Attendance") return <AttendanceVoucherView voucher={voucher} balances={balances} />;
  if (TRADE.includes(t)) return <TradeVoucherView voucher={voucher} balances={balances} />;
  if (INVENTORY.includes(t)) return <InventoryVoucherView voucher={voucher} balances={balances} />;
  if (SINGLE_ENTRY.includes(t)) return <SingleEntryVoucherView voucher={voucher} balances={balances} />;
  // Unknown / future type: fall back to the accounting layout.
  return <SingleEntryVoucherView voucher={voucher} balances={balances} />;
}
