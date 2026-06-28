import JournalOpeningBalanceCreate from "../JournalOpeningBalanceCreate";

// #148 PLA Opening Balance — a Journal voucher (Status: PLA Opening Balance).
export default function PlaOpeningBalanceCreate() {
  return (
    <JournalOpeningBalanceCreate
      title="PLA Opening Balance Creation"
      status="PLA Opening Balance"
      taxUnitLabel="♦ Not Applicable"
      successLabel="PLA Opening Balance saved."
    />
  );
}
