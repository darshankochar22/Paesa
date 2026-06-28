import JournalOpeningBalanceCreate from "../JournalOpeningBalanceCreate";

// #147 CENVAT Opening Balance — a Journal voucher (Status: CENVAT Opening
// Balance) with the extra "CENVAT credit of" selector.
export default function CenvatOpeningBalanceCreate() {
  return (
    <JournalOpeningBalanceCreate
      title="CENVAT Opening Balance Creation"
      status="CENVAT Opening Balance"
      taxUnitLabel="♦ Not Applicable"
      successLabel="CENVAT Opening Balance saved."
      creditOf
    />
  );
}
