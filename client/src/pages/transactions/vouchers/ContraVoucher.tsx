import type { useVoucherForm, ParticularRow } from "../hooks/useVoucherForm";
import AccountingVoucherBody from "../components/AccountingVoucherBody";

interface Props {
  form: ReturnType<typeof useVoucherForm>;
  handleAmountConfirm: (row: ParticularRow, idx: number) => void;
}

export default function ContraVoucher({ form, handleAmountConfirm }: Props) {
  return (
    <AccountingVoucherBody
      form={form}
      handleAmountConfirm={handleAmountConfirm}
      entryMode={form.contraEntryMode}
      doubleRows={form.contraDoubleRows}
      onUpdateDoubleRow={form.handleUpdateContraDoubleRow}
      onAddDoubleRow={form.handleAddContraDoubleRow}
      onRemoveDoubleRow={form.handleRemoveContraDoubleRow}
    />
  );
}
