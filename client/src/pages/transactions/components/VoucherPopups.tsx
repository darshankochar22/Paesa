// Popup wall for the voucher entry screen — the block of conditional popup
// renders extracted verbatim from Vouchers.tsx. Purely presentational: renders
// each popup from the show-state / handler props the parent (Vouchers) owns.
import CompanyTaxRegistrationPopup from './popups/CompanyTaxRegistrationPopup';
import BillWiseAllocationPopup from './popups/BillWiseAllocationPopup';
import CostCentreAllocationPopup from './popups/CostCentreAllocationPopup';
import BatchAllocationPopup from './popups/BatchAllocationPopup';
import InventoryAllocationPopup from './popups/InventoryAllocationPopup';
import OrderItemAllocationPopup from './popups/OrderItemAllocationPopup';
import OrderDueOnAllocationPopup from './popups/OrderDueOnAllocationPopup';
import ItemExciseDetailsPopup from './popups/ItemExciseDetailsPopup';
import BankAllocationPopup from './popups/BankAllocationPopup';
import DenominationPopup from './popups/DenominationPopup';
import DispatchDetailsPopup from './popups/DispatchDetailsPopup';
import ReceiptDetailsPopup from './popups/ReceiptDetailsPopup';
import PartyDetailsPopup from './popups/PartyDetailsPopup';
import DatePickerPopup from './popups/DatePickerPopup';
import CreditNoteDetailsPopup from './popups/CreditNoteDetailsPopup';
import DebitNoteDetailsPopup from './popups/DebitNoteDetailsPopup';
import OtherVouchersPopup from './popups/OtherVouchersPopup';
import ExciseDetailsPopup from './popups/ExciseDetailsPopup';
import VatDetailsPopup from './popups/VatDetailsPopup';
import DebitNoteExciseDetailsPopup from './popups/DebitNoteExciseDetailsPopup';
import OrderDetailsPopup from './popups/OrderDetailsPopup';
import PurchaseOrderDetailsPopup from './popups/PurchaseOrderDetailsPopup';
import MaterialInAllocationPopup from './popups/MaterialInAllocationPopup';
import JobWorkItemAllocationPopup from './popups/JobWorkItemAllocationPopup';
import { ORDER_CREATION_TYPES } from '../voucherConstants';

interface VoucherPopupsProps {
  form: any;
  effectiveVoucherType: any;
  selectedCompany: any;
  navigate: any;
  voucherTypeChildren: any;
  inventoryAlloc: any;
  setInventoryAlloc: any;
  itemExcise: any;
  setItemExcise: any;
  showDatePicker: any;
  showApplicableUptoPicker: any;
  showTaxRegistrationPopup: any;
  showDispatchDetails: any;
  showOrderDetails: any;
  showReceiptDetails: any;
  showPartyDetails: any;
  showExciseDetails: any;
  showDebitNoteExcise: any;
  showVatDetails: any;
  showCreditNoteDetails: any;
  showDebitNoteDetails: any;
  showOtherVouchers: any;
  setShowDatePicker: any;
  setShowApplicableUptoPicker: any;
  setShowTaxRegistrationPopup: any;
  setShowDispatchDetails: any;
  setShowOrderDetails: any;
  setShowReceiptDetails: any;
  setShowPartyDetails: any;
  setShowExciseDetails: any;
  setShowDebitNoteExcise: any;
  setShowVatDetails: any;
  setShowCreditNoteDetails: any;
  setShowDebitNoteDetails: any;
  setShowOtherVouchers: any;
  handleImportVoucherItems: any;
  handleSaveBankDetails: any;
  handleSaveBatchAllocations: any;
  handleSaveBillWise: any;
  handleSaveCashDenomination: any;
  handleSaveCostCentre: any;
  handleSaveCreditNoteDetails: any;
  handleSaveDebitNoteDetails: any;
  handleSaveDebitNoteExcise: any;
  handleSaveDispatchDetails: any;
  handleSaveExciseDetails: any;
  handleSaveInventoryAllocation: any;
  handleSaveItemExcise: any;
  handleSaveJobWorkAllocations: any;
  handleSaveMaterialInAllocations: any;
  handleSaveOrderDetails: any;
  handleSavePartyDetails: any;
  handleSaveReceiptDetails: any;
  handleSaveVatDetails: any;
}

export default function VoucherPopups({
  form,
  effectiveVoucherType,
  selectedCompany,
  navigate,
  voucherTypeChildren,
  inventoryAlloc,
  setInventoryAlloc,
  itemExcise,
  setItemExcise,
  showDatePicker,
  showApplicableUptoPicker,
  showTaxRegistrationPopup,
  showDispatchDetails,
  showOrderDetails,
  showReceiptDetails,
  showPartyDetails,
  showExciseDetails,
  showDebitNoteExcise,
  showVatDetails,
  showCreditNoteDetails,
  showDebitNoteDetails,
  showOtherVouchers,
  setShowDatePicker,
  setShowApplicableUptoPicker,
  setShowTaxRegistrationPopup,
  setShowDispatchDetails,
  setShowOrderDetails,
  setShowReceiptDetails,
  setShowPartyDetails,
  setShowExciseDetails,
  setShowDebitNoteExcise,
  setShowVatDetails,
  setShowCreditNoteDetails,
  setShowDebitNoteDetails,
  setShowOtherVouchers,
  handleImportVoucherItems,
  handleSaveBankDetails,
  handleSaveBatchAllocations,
  handleSaveBillWise,
  handleSaveCashDenomination,
  handleSaveCostCentre,
  handleSaveCreditNoteDetails,
  handleSaveDebitNoteDetails,
  handleSaveDebitNoteExcise,
  handleSaveDispatchDetails,
  handleSaveExciseDetails,
  handleSaveInventoryAllocation,
  handleSaveItemExcise,
  handleSaveJobWorkAllocations,
  handleSaveMaterialInAllocations,
  handleSaveOrderDetails,
  handleSavePartyDetails,
  handleSaveReceiptDetails,
  handleSaveVatDetails,
}: VoucherPopupsProps) {
  return (
    <>
      {showDatePicker && (
        <DatePickerPopup
          initialDate={form.date}
          onClose={() => setShowDatePicker(false)}
          onConfirm={form.setDate}
          label="Voucher Date"
        />
      )}
      {showApplicableUptoPicker && (
        <DatePickerPopup
          initialDate={form.applicableUpto || form.date}
          onClose={() => setShowApplicableUptoPicker(false)}
          onConfirm={form.setApplicableUpto}
          label="Applicable Upto"
        />
      )}
      {showTaxRegistrationPopup && (
        <CompanyTaxRegistrationPopup
          gstRegistrations={form.allGstRegistrations}
          taxUnits={form.allTaxUnits}
          onClose={() => setShowTaxRegistrationPopup(false)}
          onSelect={(selection) => {
            if (!selection) {
              form.setGstRegistration(null);
              form.setTaxUnit(null);
              // Bug 5: an explicit "Not Applicable" choice clears the persisted default too.
              form.persistDefaultRegistration(null);
            } else if (selection.kind === 'gst') {
              form.setGstRegistration(selection.raw);
              form.setTaxUnit(null);
              // Bug 5: persist this registration as the company default IMMEDIATELY, so the next
              // new voucher (even after closing this screen) prefills it.
              form.persistDefaultRegistration(selection.raw?.gst_id ?? null);
            } else {
              form.setTaxUnit(selection.raw);
              form.setGstRegistration(null);
            }
            setShowTaxRegistrationPopup(false);
          }}
        />
      )}

      {showDispatchDetails && form.partyLedger && (
        <DispatchDetailsPopup
          initialDetails={form.dispatchDetails}
          onClose={() => setShowDispatchDetails(false)}
          onSave={handleSaveDispatchDetails}
          variant={
            effectiveVoucherType === 'Job Work In Order' ||
            effectiveVoucherType === 'Job Work Out Order'
              ? 'jobWork'
              : undefined
          }
          companyId={selectedCompany?.company_id}
          partyLedgerId={form.partyLedger?.ledger_id}
          noteVoucherType="Delivery Note"
          orderVoucherType="Sales Order"
          onSelectSavedNote={(n) =>
            handleImportVoucherItems(n.voucher_id, { tracking_no: n.tracking_no })
          }
          onSelectSavedOrder={(o) =>
            handleImportVoucherItems(o.voucher_id, { order_no: o.order_no })
          }
        />
      )}

      {showOrderDetails &&
        form.partyLedger &&
        (effectiveVoucherType === 'Purchase Order' || effectiveVoucherType === 'Sales Order' ? (
          <PurchaseOrderDetailsPopup
            initialDetails={form.orderDetails}
            onClose={() => setShowOrderDetails(false)}
            onSave={handleSaveOrderDetails}
          />
        ) : (
          <OrderDetailsPopup
            initialDetails={form.orderDetails}
            receiptVariant={effectiveVoucherType === 'Receipt Note'}
            companyId={selectedCompany?.company_id}
            partyLedgerId={form.partyLedger?.ledger_id}
            orderVoucherType={
              ['Receipt Note', 'Rejection Out', 'Purchase'].includes(effectiveVoucherType)
                ? 'Purchase Order'
                : 'Sales Order'
            }
            onSelectSavedOrder={(o) =>
              handleImportVoucherItems(o.voucher_id, { order_no: o.order_no })
            }
            onClose={() => setShowOrderDetails(false)}
            onSave={handleSaveOrderDetails}
          />
        ))}

      {showReceiptDetails && form.partyLedger && (
        <ReceiptDetailsPopup
          initialDetails={form.receiptDetails}
          companyId={selectedCompany?.company_id}
          partyLedgerId={form.partyLedger?.ledger_id}
          noteVoucherType={
            ['Sales', 'Credit Note', 'Delivery Note'].includes(effectiveVoucherType)
              ? 'Delivery Note'
              : 'Receipt Note'
          }
          orderVoucherType={
            ['Sales', 'Credit Note', 'Delivery Note'].includes(effectiveVoucherType)
              ? 'Sales Order'
              : 'Purchase Order'
          }
          onSelectSavedNote={(n) =>
            handleImportVoucherItems(n.voucher_id, { tracking_no: n.tracking_no })
          }
          onSelectSavedOrder={(o) =>
            handleImportVoucherItems(o.voucher_id, { order_no: o.order_no })
          }
          onClose={() => setShowReceiptDetails(false)}
          onSave={handleSaveReceiptDetails}
        />
      )}

      {showPartyDetails && form.partyLedger && (
        <PartyDetailsPopup
          partyLedger={form.partyLedger}
          allLedgers={form.allLedgers}
          initialDetails={form.partyDetails}
          onClose={() => setShowPartyDetails(false)}
          onSave={handleSavePartyDetails}
          onCreateLedger={() => navigate('/master/create/ledger')}
          buyerLabel={
            ['Sales', 'Credit Note', 'Delivery Note', 'Rejection In', 'Debit Note'].includes(
              effectiveVoucherType,
            )
              ? 'Buyer (Bill to)'
              : 'Supplier (Bill from)'
          }
          natureOfReturnLabel={
            effectiveVoucherType === 'Credit Note' ? 'Nature of Sales Return' : undefined
          }
        />
      )}
      {showExciseDetails && form.partyLedger && (
        <ExciseDetailsPopup
          initialDetails={form.exciseDetails}
          onClose={() => setShowExciseDetails(false)}
          onSave={handleSaveExciseDetails}
        />
      )}
      {showDebitNoteExcise && form.partyLedger && (
        <DebitNoteExciseDetailsPopup
          initialDetails={form.debitNoteDetails}
          voucherDate={form.date}
          onClose={() => setShowDebitNoteExcise(false)}
          onSave={handleSaveDebitNoteExcise}
        />
      )}
      {showVatDetails && form.partyLedger && (
        <VatDetailsPopup
          initialDetails={form.vatDetails}
          voucherDate={form.date}
          onClose={() => setShowVatDetails(false)}
          onSave={handleSaveVatDetails}
        />
      )}

      {showCreditNoteDetails && form.partyLedger && (
        <CreditNoteDetailsPopup
          initialDetails={form.creditNoteDetails}
          onClose={() => setShowCreditNoteDetails(false)}
          onSave={handleSaveCreditNoteDetails}
        />
      )}

      {showDebitNoteDetails && form.partyLedger && (
        <DebitNoteDetailsPopup
          initialDetails={form.debitNoteDetails}
          onClose={() => setShowDebitNoteDetails(false)}
          onSave={handleSaveDebitNoteDetails}
        />
      )}

      {showOtherVouchers && (
        <OtherVouchersPopup
          voucherType={effectiveVoucherType}
          companyId={selectedCompany?.company_id}
          onClose={() => setShowOtherVouchers(false)}
          onSelect={(type) => {
            form.setVoucherType(type);
            setShowOtherVouchers(false);
          }}
          voucherTypeChildren={voucherTypeChildren}
        />
      )}

      {form.activeAllocation?.type === 'billWise' && (
        <BillWiseAllocationPopup
          ledgerId={form.activeAllocation.ledgerId}
          ledgerName={form.activeAllocation.ledgerName}
          totalAmount={form.activeAllocation.amount}
          dcType={form.activeAllocation.dcType ?? 'Dr'}
          voucherDate={form.date}
          initialAllocations={form.activeAllocation.initialAllocations ?? []}
          onClose={() => form.setActiveAllocation(null)}
          onSave={handleSaveBillWise}
        />
      )}

      {form.activeAllocation?.type === 'billWiseParty' && (
        <BillWiseAllocationPopup
          ledgerId={form.activeAllocation.ledgerId}
          ledgerName={form.activeAllocation.ledgerName}
          totalAmount={form.activeAllocation.amount}
          dcType={form.activeAllocation.dcType ?? 'Cr'}
          voucherDate={form.date}
          initialAllocations={form.partyBillReferences}
          onClose={() => form.setActiveAllocation(null)}
          onSave={handleSaveBillWise}
        />
      )}

      {inventoryAlloc && (
        <InventoryAllocationPopup
          companyId={selectedCompany!.company_id}
          ledgerName={inventoryAlloc.ledgerName}
          dcType={inventoryAlloc.dcType}
          isInward={inventoryAlloc.isInward}
          allowCostCentres={inventoryAlloc.allowCostCentres}
          voucherDate={form.date}
          allStockItems={form.allStockItems}
          allGodowns={form.allGodowns}
          allUnits={form.allUnits}
          initialItems={
            form.journalRows.find((r) => r.id === inventoryAlloc.rowId)?.inventoryAllocations ?? []
          }
          onClose={() => setInventoryAlloc(null)}
          onSave={handleSaveInventoryAllocation}
        />
      )}

      {form.activeAllocation?.type === 'batch' &&
        // Purchase / Sales Order: simple "Due on" allocation (Due on period/date +
        // Godown + Batch-Lot + Actual/Billed + Rate + Disc). No Tracking/Order No.
        (ORDER_CREATION_TYPES.includes(effectiveVoucherType) ? (
          <OrderDueOnAllocationPopup
            companyId={selectedCompany!.company_id}
            itemId={form.activeAllocation.itemId}
            itemName={form.activeAllocation.itemName}
            rate={form.activeAllocation.rate}
            unitSymbol={form.activeAllocation.unitSymbol}
            voucherDate={form.date}
            trackMfg={form.activeAllocation.trackMfg}
            trackExpiry={form.activeAllocation.trackExpiry}
            isInward={form.activeAllocation.isInward}
            godowns={form.allGodowns}
            initialAllocations={form.activeAllocation.initialAllocations}
            showBatch={form.activeAllocation.showBatch}
            onClose={() => form.setActiveAllocation(null)}
            onSave={handleSaveBatchAllocations}
          />
        ) : // Order-tracking allocation (Tracking No. / Order No. / Due on + New Number
        // popups, List of Godowns, batch lots). Used for the quantity-driven
        // item-select flow on every party stock voucher (Sales, Purchase,
        // Credit/Debit Note, Receipt/Delivery Note). The plain batch popup
        // stays for the fixed-total split flow (Rejection In/Out) and the internal
        // transfers (Stock / Manufacturing Journal), which have no order to track.
        form.activeAllocation.quantityDriven &&
          !['Stock Journal', 'Manufacturing Journal'].includes(effectiveVoucherType) ? (
          <OrderItemAllocationPopup
            companyId={selectedCompany!.company_id}
            itemId={form.activeAllocation.itemId}
            itemName={form.activeAllocation.itemName}
            rate={form.activeAllocation.rate}
            unitSymbol={form.activeAllocation.unitSymbol}
            voucherDate={form.date}
            trackMfg={form.activeAllocation.trackMfg}
            trackExpiry={form.activeAllocation.trackExpiry}
            isInward={form.activeAllocation.isInward}
            godowns={form.allGodowns}
            initialAllocations={form.activeAllocation.initialAllocations}
            showBatch={form.activeAllocation.showBatch}
            onClose={() => form.setActiveAllocation(null)}
            onSave={handleSaveBatchAllocations}
          />
        ) : (
          <BatchAllocationPopup
            companyId={selectedCompany!.company_id}
            itemId={form.activeAllocation.itemId}
            itemName={form.activeAllocation.itemName}
            totalQuantity={form.activeAllocation.quantity}
            rate={form.activeAllocation.rate}
            unitSymbol={form.activeAllocation.unitSymbol}
            voucherDate={form.date}
            trackMfg={form.activeAllocation.trackMfg}
            trackExpiry={form.activeAllocation.trackExpiry}
            isInward={form.activeAllocation.isInward}
            godowns={form.allGodowns}
            initialAllocations={form.activeAllocation.initialAllocations}
            quantityDriven={form.activeAllocation.quantityDriven}
            showBatch={form.activeAllocation.showBatch}
            onClose={() => form.setActiveAllocation(null)}
            onSave={handleSaveBatchAllocations}
          />
        ))}

      {form.activeAllocation?.type === 'materialIn' && (
        <MaterialInAllocationPopup
          itemName={form.activeAllocation.itemName}
          rate={form.activeAllocation.rate}
          unitSymbol={form.activeAllocation.unitSymbol}
          godowns={form.allGodowns}
          stockItems={form.allStockItems}
          showBatch={form.activeAllocation.showBatch}
          trackMfg={form.activeAllocation.trackMfg}
          trackExpiry={form.activeAllocation.trackExpiry}
          initialAllocations={form.activeAllocation.initialAllocations}
          companyId={selectedCompany?.company_id}
          itemId={form.activeAllocation.itemId}
          voucherDate={form.date}
          onClose={() => form.setActiveAllocation(null)}
          onSave={handleSaveMaterialInAllocations}
        />
      )}

      {form.activeAllocation?.type === 'jobWork' && (
        <JobWorkItemAllocationPopup
          itemName={form.activeAllocation.itemName}
          orderNo={form.activeAllocation.orderNo}
          unitSymbol={form.activeAllocation.unitSymbol}
          voucherDate={form.date}
          allGodowns={form.allGodowns}
          allStockItems={form.allStockItems}
          allUnits={form.allUnits}
          initialAllocations={form.activeAllocation.initialAllocations}
          onClose={() => form.setActiveAllocation(null)}
          onSave={handleSaveJobWorkAllocations}
        />
      )}

      {itemExcise && (
        <ItemExciseDetailsPopup
          itemName={itemExcise.itemName}
          initialDetails={itemExcise.initial}
          onClose={() => setItemExcise(null)}
          onSave={handleSaveItemExcise}
        />
      )}

      {form.activeAllocation?.type === 'costCentre' && (
        <CostCentreAllocationPopup
          companyId={selectedCompany!.company_id}
          ledgerName={form.activeAllocation.ledgerName}
          totalAmount={form.activeAllocation.amount}
          initialAllocations={form.activeAllocation.initialAllocations ?? []}
          onClose={() => form.setActiveAllocation(null)}
          onSave={handleSaveCostCentre}
        />
      )}

      {(form.activeAllocation?.type === 'bankDetails' ||
        form.activeAllocation?.type === 'partyBankDetails') && (
        <BankAllocationPopup
          ledgerId={form.activeAllocation.ledgerId}
          ledgerName={form.activeAllocation.ledgerName}
          amount={form.activeAllocation.amount}
          initialDetails={form.bankDetails}
          allowCash={
            form.activeAllocation.type === 'bankDetails'
              ? form.activeAllocation.allowCash !== false
              : true
          }
          onClose={() => form.setActiveAllocation(null)}
          onSave={handleSaveBankDetails}
        />
      )}

      {form.activeAllocation?.type === 'cashDenomination' && (
        <DenominationPopup
          ledgerId={form.activeAllocation.ledgerId}
          ledgerName={form.activeAllocation.ledgerName}
          amount={form.activeAllocation.amount}
          initialDetails={form.cashDenominations}
          onClose={() => form.setActiveAllocation(null)}
          onSave={handleSaveCashDenomination}
        />
      )}
    </>
  );
}
