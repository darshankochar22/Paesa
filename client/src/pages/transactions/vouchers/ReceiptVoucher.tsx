import type { useVoucherForm, ParticularRow } from "../hooks/useVoucherForm";
import AccountingVoucherBody from "../components/AccountingVoucherBody";

interface Props {
  form: ReturnType<typeof useVoucherForm>;
  handleAmountConfirm: (row: ParticularRow, idx: number) => void;
}

export default function ReceiptVoucher({ form, handleAmountConfirm }: Props) {
  return (
    <AccountingVoucherBody
      form={form}
      handleAmountConfirm={handleAmountConfirm}
      entryMode={form.receiptEntryMode}
      doubleRows={form.receiptDoubleRows}
      onUpdateDoubleRow={form.handleUpdateReceiptDoubleRow}
      onAddDoubleRow={form.handleAddReceiptDoubleRow}
      onRemoveDoubleRow={form.handleRemoveReceiptDoubleRow}
    />
  );
}
