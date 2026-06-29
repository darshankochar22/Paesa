import type { useVoucherForm, ParticularRow } from "../hooks/useVoucherForm";
import AccountingVoucherBody from "../components/AccountingVoucherBody";

interface Props {
  form: ReturnType<typeof useVoucherForm>;
  handleAmountConfirm: (row: ParticularRow, idx: number) => void;
}

export default function JournalVoucher({ form, handleAmountConfirm }: Props) {
  return (
    <AccountingVoucherBody
      form={form}
      handleAmountConfirm={handleAmountConfirm}
      entryMode={form.journalEntryMode}
      doubleRows={form.journalRows}
      onUpdateDoubleRow={form.handleUpdateJournalRow}
      onAddDoubleRow={form.handleAddJournalRow}
      onRemoveDoubleRow={form.handleRemoveJournalRow}
    />
  );
}
