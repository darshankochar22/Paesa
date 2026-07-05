// Voucher body dispatch — renders the per-type entry component. Extracted
// verbatim from Vouchers.tsx; the parent passes form + the row/amount handlers.
import PaymentVoucher from '../vouchers/PaymentVoucher';
import ReceiptVoucher from '../vouchers/ReceiptVoucher';
import ContraVoucher from '../vouchers/ContraVoucher';
import JournalVoucher from '../vouchers/JournalVoucher';
import SalesVoucher from '../vouchers/SalesVoucher';
import PurchaseVoucher from '../vouchers/PurchaseVoucher';
import CreditNoteVoucher from '../vouchers/CreditNoteVoucher';
import DebitNoteVoucher from '../vouchers/DebitNoteVoucher';
import PhysicalStockVoucher from '../vouchers/PhysicalStockVoucher';
import StockJournalVoucher from '../vouchers/StockJournalVoucher';
import ReceiptNoteVoucher from '../vouchers/ReceiptNoteVoucher';
import RejectionInVoucher from '../vouchers/RejectionInVoucher';
import RejectionOutVoucher from '../vouchers/RejectionOutVoucher';
import MaterialInVoucher from '../vouchers/MaterialInVoucher';
import MaterialOutVoucher from '../vouchers/MaterialOutVoucher';
import ManufacturingJournalVoucher from '../vouchers/ManufacturingJournalVoucher';
import AttendanceVoucher from '../vouchers/AttendanceVoucher';
import PayrollVoucher from '../vouchers/PayrollVoucher';
import PurchaseOrderVoucher from '../vouchers/PurchaseOrderVoucher';
import SalesOrderVoucher from '../vouchers/SalesOrderVoucher';
import JobWorkInOrderVoucher from '../vouchers/JobWorkInOrderVoucher';
import JobWorkOutOrderVoucher from '../vouchers/JobWorkOutOrderVoucher';

interface VoucherBodyProps {
  effectiveVoucherType: any;
  form: any;
  handleAmountConfirm: any;
  focusStockQty: any;
  focusStockRate: any;
  proceedToNextStockRow: any;
  handlePhysicalStockQtyEnter: any;
}

export default function VoucherBody({
  effectiveVoucherType,
  form,
  handleAmountConfirm,
  focusStockQty,
  focusStockRate,
  proceedToNextStockRow,
  handlePhysicalStockQtyEnter,
}: VoucherBodyProps) {
  return (
    <>
      {effectiveVoucherType === 'Payment' && (
        <PaymentVoucher form={form} handleAmountConfirm={handleAmountConfirm} />
      )}
      {effectiveVoucherType === 'Receipt' && (
        <ReceiptVoucher form={form} handleAmountConfirm={handleAmountConfirm} />
      )}
      {effectiveVoucherType === 'Contra' && (
        <ContraVoucher form={form} handleAmountConfirm={handleAmountConfirm} />
      )}
      {effectiveVoucherType === 'Journal' && (
        <JournalVoucher form={form} handleAmountConfirm={handleAmountConfirm} />
      )}
      {effectiveVoucherType === 'Sales' && (
        <SalesVoucher
          form={form}
          handleAmountConfirm={handleAmountConfirm}
          focusStockQty={focusStockQty}
          focusStockRate={focusStockRate}
          proceedToNextStockRow={proceedToNextStockRow}
        />
      )}
      {effectiveVoucherType === 'Purchase' && (
        <PurchaseVoucher
          form={form}
          handleAmountConfirm={handleAmountConfirm}
          focusStockQty={focusStockQty}
          focusStockRate={focusStockRate}
          proceedToNextStockRow={proceedToNextStockRow}
        />
      )}
      {effectiveVoucherType === 'Credit Note' && (
        <CreditNoteVoucher
          form={form}
          handleAmountConfirm={handleAmountConfirm}
          focusStockQty={focusStockQty}
          focusStockRate={focusStockRate}
          proceedToNextStockRow={proceedToNextStockRow}
        />
      )}
      {effectiveVoucherType === 'Debit Note' && (
        <DebitNoteVoucher
          form={form}
          handleAmountConfirm={handleAmountConfirm}
          focusStockQty={focusStockQty}
          focusStockRate={focusStockRate}
          proceedToNextStockRow={proceedToNextStockRow}
        />
      )}
      {effectiveVoucherType === 'Physical Stock' && (
        <PhysicalStockVoucher
          form={form}
          focusStockQty={focusStockQty}
          focusStockRate={focusStockRate}
          proceedToNextStockRow={proceedToNextStockRow}
          physicalStockQtyEnter={handlePhysicalStockQtyEnter}
        />
      )}
      {effectiveVoucherType === 'Stock Journal' && <StockJournalVoucher form={form} />}
      {effectiveVoucherType === 'Delivery Note' && (
        // Tally Delivery Note uses the sales-invoice layout (Party + Sales
        // ledger + Actual/Billed/Rate/Disc%/Amount). Reuse SalesVoucher, hiding
        // the Sales-only VAT toggle and additional-ledger rows (a Delivery Note
        // is inventory-only — those lines aren't persisted for it).
        <SalesVoucher
          form={form}
          handleAmountConfirm={handleAmountConfirm}
          focusStockQty={focusStockQty}
          focusStockRate={focusStockRate}
          proceedToNextStockRow={proceedToNextStockRow}
          hideVatDetails
          hideAdditionalLedgers
        />
      )}
      {effectiveVoucherType === 'Receipt Note' && (
        <ReceiptNoteVoucher
          form={form}
          handleAmountConfirm={handleAmountConfirm}
          focusStockQty={focusStockQty}
          focusStockRate={focusStockRate}
          proceedToNextStockRow={proceedToNextStockRow}
        />
      )}
      {effectiveVoucherType === 'Rejection In' && (
        <RejectionInVoucher
          form={form}
          handleAmountConfirm={handleAmountConfirm}
          focusStockQty={focusStockQty}
          focusStockRate={focusStockRate}
          proceedToNextStockRow={proceedToNextStockRow}
        />
      )}
      {effectiveVoucherType === 'Rejection Out' && (
        <RejectionOutVoucher
          form={form}
          handleAmountConfirm={handleAmountConfirm}
          focusStockQty={focusStockQty}
          focusStockRate={focusStockRate}
          proceedToNextStockRow={proceedToNextStockRow}
        />
      )}
      {effectiveVoucherType === 'Material In' && (
        <MaterialInVoucher
          form={form}
          focusStockQty={focusStockQty}
          focusStockRate={focusStockRate}
          proceedToNextStockRow={proceedToNextStockRow}
        />
      )}
      {effectiveVoucherType === 'Material Out' && (
        <MaterialOutVoucher
          form={form}
          focusStockQty={focusStockQty}
          focusStockRate={focusStockRate}
          proceedToNextStockRow={proceedToNextStockRow}
        />
      )}
      {effectiveVoucherType === 'Manufacturing Journal' && (
        <ManufacturingJournalVoucher form={form} />
      )}
      {effectiveVoucherType === 'Attendance' && <AttendanceVoucher form={form} />}
      {effectiveVoucherType === 'Payroll' && <PayrollVoucher form={form} />}
      {effectiveVoucherType === 'Purchase Order' && (
        <PurchaseOrderVoucher
          form={form}
          handleAmountConfirm={handleAmountConfirm}
          focusStockQty={focusStockQty}
          focusStockRate={focusStockRate}
          proceedToNextStockRow={proceedToNextStockRow}
        />
      )}
      {effectiveVoucherType === 'Sales Order' && (
        <SalesOrderVoucher
          form={form}
          handleAmountConfirm={handleAmountConfirm}
          focusStockQty={focusStockQty}
          focusStockRate={focusStockRate}
          proceedToNextStockRow={proceedToNextStockRow}
        />
      )}
      {effectiveVoucherType === 'Job Work In Order' && (
        <JobWorkInOrderVoucher
          form={form}
          handleAmountConfirm={handleAmountConfirm}
          focusStockQty={focusStockQty}
          focusStockRate={focusStockRate}
          proceedToNextStockRow={proceedToNextStockRow}
        />
      )}
      {effectiveVoucherType === 'Job Work Out Order' && (
        <JobWorkOutOrderVoucher
          form={form}
          handleAmountConfirm={handleAmountConfirm}
          focusStockQty={focusStockQty}
          focusStockRate={focusStockRate}
          proceedToNextStockRow={proceedToNextStockRow}
        />
      )}
      {effectiveVoucherType === 'Memorandum' && (
        <JournalVoucher form={form} handleAmountConfirm={handleAmountConfirm} />
      )}
      {effectiveVoucherType === 'Reversing Journal' && (
        <JournalVoucher form={form} handleAmountConfirm={handleAmountConfirm} />
      )}
    </>
  );
}
