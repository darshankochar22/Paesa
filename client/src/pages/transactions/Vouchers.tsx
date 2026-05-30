import { useNavigate } from "react-router-dom";
import { useVoucherForm } from "./hooks/useVoucherForm";
import { AlertBanner } from "../../components/ui";

// Dedicated voucher components — one per voucher type
import ContraVoucher from "./vouchers/contra/ContraVoucher";
import PaymentVoucher from "./vouchers/payment/PaymentVoucher";
import ReceiptVoucher from "./vouchers/receipt/ReceiptVoucher";
import JournalVoucher from "./vouchers/journal/JournalVoucher";
import SalesVoucher from "./vouchers/sales/SalesVoucher";
import PurchaseVoucher from "./vouchers/purchase/PurchaseVoucher";

/**
 * Vouchers — master orchestrator.
 *
 * Loads unified form state via useVoucherForm() and delegates rendering
 * entirely to the appropriate dedicated voucher component based on the
 * currently selected voucherType. Each voucher component owns its own:
 *   - keyboard shortcut listeners
 *   - layout (SingleEntry / Journal / SalesPurchase / ContraDouble)
 *   - popup set (date, bank, denomination, dispatch/receipt, party, bill-wise, cost-centre)
 *
 * Adding or debugging a voucher type is now isolated to its own folder.
 */
export default function Vouchers() {
  const navigate = useNavigate();
  const form = useVoucherForm();

  // Inline notification banners rendered above every voucher type
  const notifications = (
    <>
      {form.error && (
        <AlertBanner
          type="error"
          message={form.error}
          onDismiss={() => form.setError(null)}
        />
      )}
      {form.success && (
        <AlertBanner
          type="success"
          message={form.success}
          onDismiss={() => form.setSuccess(null)}
          actions={
            <button
              onClick={() => navigate("/transactions/voucher-list")}
              className="text-xs underline font-semibold font-mono"
            >
              View Register →
            </button>
          }
        />
      )}
    </>
  );

  // Render the dedicated component for the active voucher type
  switch (form.voucherType) {
    case "Contra":
      return (
        <>
          {notifications}
          <ContraVoucher form={form} />
        </>
      );

    case "Payment":
      return (
        <>
          {notifications}
          <PaymentVoucher form={form} />
        </>
      );

    case "Receipt":
      return (
        <>
          {notifications}
          <ReceiptVoucher form={form} />
        </>
      );

    case "Journal":
      return (
        <>
          {notifications}
          <JournalVoucher form={form} />
        </>
      );

    case "Sales":
      return (
        <>
          {notifications}
          <SalesVoucher form={form} />
        </>
      );

    case "Purchase":
      return (
        <>
          {notifications}
          <PurchaseVoucher form={form} />
        </>
      );

    default:
      // Fallback — should not happen; default to Payment
      return (
        <>
          {notifications}
          <PaymentVoucher form={form} />
        </>
      );
  }
}
