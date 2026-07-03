import type { useVoucherForm } from "../hooks/useVoucherForm";
import StockTransferVoucherBody from "../components/StockTransferVoucherBody";

interface Props {
  form: ReturnType<typeof useVoucherForm>;
  handleAmountConfirm: (row: any, idx: number) => void;
  focusStockQty: (idx: number) => void;
  focusStockRate: (idx: number) => void;
  proceedToNextStockRow: (idx: number) => void;
}

export default function ReceiptNoteVoucher({ handleAmountConfirm: _ignored, ...props }: Props) {
  // Receipt Note mirrors the Purchase layout: Party + an Actual/Billed item grid.
  // Non-accounting inventory voucher — the Purchase ledger row is informational
  // (stored on the voucher, never posted; the list filters to Purchase Accounts —
  // see Vouchers.tsx filteredLedgers). Godown/qty/rate are captured in the Stock
  // Item Allocations popup that opens on item select, so the inline godown column
  // is hidden (see Vouchers.tsx handleLedgerSelectWithAllocation).
  return (
    <StockTransferVoucherBody
      {...props}
      config={{ salesPurchaseLabel: "Purchase ledger", hideGodownColumn: true, showActualBilled: true, showReferenceRow: true }}
    />
  );
}
