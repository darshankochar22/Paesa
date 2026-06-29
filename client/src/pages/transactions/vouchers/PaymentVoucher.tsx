import type { useVoucherForm, ParticularRow } from "../hooks/useVoucherForm";
import AccountingVoucherBody from "../components/AccountingVoucherBody";

interface Props {
  form: ReturnType<typeof useVoucherForm>;
  handleAmountConfirm: (row: ParticularRow, idx: number) => void;
}

export default function PaymentVoucher({ form, handleAmountConfirm }: Props) {
  return (
    <AccountingVoucherBody
      form={form}
      handleAmountConfirm={handleAmountConfirm}
      entryMode={form.paymentEntryMode}
      doubleRows={form.paymentDoubleRows}
      onUpdateDoubleRow={form.handleUpdatePaymentDoubleRow}
      onAddDoubleRow={form.handleAddPaymentDoubleRow}
      onRemoveDoubleRow={form.handleRemovePaymentDoubleRow}
    />
  );
}
