import JournalOpeningBalanceCreate from "../JournalOpeningBalanceCreate";

// #151 Excise Opening Balance — a Journal voucher (Status: Excise Opening
// Balance), posted against the Default Tax Unit.
export default function ExciseOpeningBalanceCreate() {
  return (
    <JournalOpeningBalanceCreate
      title="Excise Opening Balance Creation"
      status="Excise Opening Balance"
      taxUnitLabel="Default Tax Unit"
      successLabel="Excise Opening Balance saved."
    />
  );
}
