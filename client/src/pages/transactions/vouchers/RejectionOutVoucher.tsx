import type { useVoucherForm } from "../hooks/useVoucherForm";
import RejectionInVoucher from "./RejectionInVoucher";

interface Props {
  form: ReturnType<typeof useVoucherForm>;
  handleAmountConfirm: (row: any, idx: number) => void;
  focusStockQty: (idx: number) => void;
  focusStockRate: (idx: number) => void;
  proceedToNextStockRow: (idx: number) => void;
}

<<<<<<< Updated upstream
export default function RejectionOutVoucher({ handleAmountConfirm: _ignored, ...props }: Props) {
  // Non-accounting inventory voucher — no Purchase Ledger row (Tally posts nothing here).
  return <StockTransferVoucherBody {...props} />;
=======
/**
 * TallyPrime "Rejections Out" — rejected goods returned to a supplier (outward).
 * Identical to Rejection In except the right-hand column reads "Supplier's Name
 * and Address"; reuses the RejectionInVoucher body.
 */
export default function RejectionOutVoucher(props: Props) {
  return <RejectionInVoucher {...props} partyAddressLabel="Supplier's Name and Address" />;
>>>>>>> Stashed changes
}
