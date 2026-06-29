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
  return <StockTransferVoucherBody {...props} config={{ salesPurchaseLabel: "Purchase Ledger" }} />;
}
