import { useNavigate } from "react-router-dom";
import { useVoucherForm } from "./hooks/useVoucherForm";
import { AlertBanner } from "../../components/ui";

import ContraVoucher from "./vouchers/contra/ContraVoucher";
import PaymentVoucher from "./vouchers/payment/PaymentVoucher";
import ReceiptVoucher from "./vouchers/receipt/ReceiptVoucher";
import JournalVoucher from "./vouchers/journal/JournalVoucher";
import SalesVoucher from "./vouchers/sales/SalesVoucher";
import PurchaseVoucher from "./vouchers/purchase/PurchaseVoucher";

export default function Vouchers() {
  const navigate = useNavigate();
  const form = useVoucherForm();

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
      return (
        <>
          {notifications}
          <PaymentVoucher form={form} />
        </>
      );
  }
}
