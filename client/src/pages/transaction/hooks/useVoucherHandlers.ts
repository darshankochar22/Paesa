import { useCallback, useRef } from "react";
import type { ParticularRow, ActiveAllocation, BillReference, CostCentreAllocation, VoucherType } from "../types";

interface HandlersParams {
  voucherType: VoucherType;

  // layout 1
  accountLedger: any;
  particulars: ParticularRow[];
  particularsTotal: number;
  handleAddParticularRow: () => void;
  handleUpdateParticularRow: (id: string, updates: Partial<Omit<ParticularRow, "id">>) => void;

  // layout 2
  journalRows: ParticularRow[];
  handleAddJournalRow: () => void;
  handleUpdateJournalRow: (id: string, updates: Partial<Omit<ParticularRow, "id">>) => void;

  // layout 3
  partyLedger: any;
  additionalEntries: ParticularRow[];
  handleAddAdditionalRow: () => void;
  handleUpdateAdditionalRow: (id: string, updates: Partial<Omit<ParticularRow, "id">>) => void;
  partyBillReferences: BillReference[];
  setPartyBillReferences: (refs: BillReference[]) => void;
  bankDetails: any | null;
  totalAmount: number;

  // allocation
  activeAllocation: ActiveAllocation;
  setActiveAllocation: (a: ActiveAllocation) => void;
  setBankDetails: (d: any) => void;

  // dispatch & receipt details
  setDispatchDetails: (d: any) => void;
  setReceiptDetails: (d: any) => void;

  // submit
  handleSubmit: () => void;
}

export function useVoucherHandlers(p: HandlersParams) {
  const acceptRef = useRef<() => void>(() => {});

  const proceedToNextRow = useCallback(
    (idx: number) => {
      const isJ   = p.voucherType === "Journal";
      const isInv = ["Sales", "Purchase"].includes(p.voucherType);

      const list    = isJ ? p.journalRows   : isInv ? p.additionalEntries : p.particulars;
      const addRow  = isJ ? p.handleAddJournalRow : isInv ? p.handleAddAdditionalRow : p.handleAddParticularRow;

      if (idx === list.length - 1) addRow();

      const sel = isInv
        ? `[data-additional-ledger="${idx + 2}"]`
        : `[data-particular-ledger="${idx + 2}"]`;

      setTimeout(
        () => (document.querySelector(sel) as HTMLInputElement | null)?.focus(),
        50
      );
    },
    [
      p.voucherType,
      p.journalRows, p.additionalEntries, p.particulars,
      p.handleAddJournalRow, p.handleAddAdditionalRow, p.handleAddParticularRow,
    ]
  );

  const handleAccept = useCallback(() => {
    if (
      ["Sales", "Purchase"].includes(p.voucherType) &&
      p.partyLedger?.is_bill_wise === 1 &&
      p.partyBillReferences.length === 0
    ) {
      p.setActiveAllocation({
        type: "billWiseParty",
        ledgerId: p.partyLedger.ledger_id,
        ledgerName: p.partyLedger.name,
        amount: p.totalAmount,
        initialAllocations: [],
      });
      return;
    }

    if (
      ["Receipt", "Payment", "Contra"].includes(p.voucherType) &&
      p.accountLedger?.is_bill_wise === 1 &&
      p.partyBillReferences.length === 0
    ) {
      p.setActiveAllocation({
        type: "billWiseParty",
        ledgerId: p.accountLedger.ledger_id,
        ledgerName: p.accountLedger.name,
        amount: p.particularsTotal,
        initialAllocations: [],
      });
      return;
    }

    if (
      p.voucherType === "Contra" &&
      p.accountLedger?.is_bank === 1 &&
      !p.bankDetails
    ) {
      p.setActiveAllocation({
        type: "bankDetails",
        ledgerId: p.accountLedger.ledger_id,
        ledgerName: p.accountLedger.name,
        amount: p.particularsTotal,
        initialDetails: null,
      });
      return;
    }

    p.handleSubmit();
  }, [
    p.voucherType,
    p.partyLedger, p.accountLedger,
    p.partyBillReferences, p.totalAmount, p.particularsTotal,
    p.bankDetails, p.handleSubmit, p.setActiveAllocation,
  ]);

  const setAcceptRef = useCallback((fn: () => void) => {
    acceptRef.current = fn;
  }, []);


  const handleAmountConfirm = useCallback(
    (row: ParticularRow, idx: number) => {
      const { ledger, amountRaw, id } = row;
      const amount = Number(amountRaw) || 0;
      if (!ledger || amount <= 0) { proceedToNextRow(idx); return; }

      if (ledger.is_bill_wise === 1) {
        p.setActiveAllocation({
          type: "billwise",
          rowId: id,
          ledgerId: ledger.ledger_id,
          ledgerName: ledger.name,
          amount,
          initialAllocations: row.billReferences ?? [],
        });
      } else if (ledger.allow_cost_centres === 1) {
        p.setActiveAllocation({
          type: "costCentre",
          rowId: id,
          ledgerId: ledger.ledger_id,
          ledgerName: ledger.name,
          amount,
          initialAllocations: row.costCentres ?? [],
        });
      } else {
        proceedToNextRow(idx);
      }
    },
    [p.setActiveAllocation, proceedToNextRow]
  );

  const handleSaveBillWise = useCallback(
    (allocations: BillReference[]) => {
      if (p.activeAllocation?.type === "billWiseParty") {
        p.setPartyBillReferences(allocations);
        p.setActiveAllocation(null);
        setTimeout(() => acceptRef.current(), 50);
        return;
      }

      const alloc = p.activeAllocation;
      if (!alloc || !("rowId" in alloc)) return;
      const { rowId } = alloc;

      const isJ   = p.voucherType === "Journal";
      const isInv = ["Sales", "Purchase"].includes(p.voucherType);

      if (isJ)        p.handleUpdateJournalRow(rowId,     { billReferences: allocations });
      else if (isInv) p.handleUpdateAdditionalRow(rowId,  { billReferences: allocations });
      else            p.handleUpdateParticularRow(rowId,  { billReferences: allocations });

      const list       = isJ ? p.journalRows : isInv ? p.additionalEntries : p.particulars;
      const targetRow  = list.find((r) => r.id === rowId);

      if (targetRow?.ledger?.allow_cost_centres === 1) {
        p.setActiveAllocation({
          type: "costCentre",
          rowId,
          ledgerId:  targetRow.ledger.ledger_id,
          ledgerName: targetRow.ledger.name,
          amount:    Number(targetRow.amountRaw) || 0,
          initialAllocations: (targetRow as any).costCentres ?? [],
        });
      } else {
        p.setActiveAllocation(null);
        proceedToNextRow(list.findIndex((r) => r.id === rowId));
      }
    },
    [
      p.activeAllocation, p.voucherType,
      p.journalRows, p.additionalEntries, p.particulars,
      p.setPartyBillReferences, p.setActiveAllocation,
      p.handleUpdateJournalRow, p.handleUpdateAdditionalRow, p.handleUpdateParticularRow,
      proceedToNextRow,
    ]
  );

  // ── handleSaveCostCentre ────────────────────────────────────────────────────

  const handleSaveCostCentre = useCallback(
    (allocations: CostCentreAllocation[]) => {
      const alloc = p.activeAllocation;
      if (!alloc || !("rowId" in alloc)) return;
      const { rowId } = alloc;

      const isJ   = p.voucherType === "Journal";
      const isInv = ["Sales", "Purchase"].includes(p.voucherType);

      if (isJ)        p.handleUpdateJournalRow(rowId,    { costCentres: allocations });
      else if (isInv) p.handleUpdateAdditionalRow(rowId, { costCentres: allocations });
      else            p.handleUpdateParticularRow(rowId, { costCentres: allocations });

      p.setActiveAllocation(null);
      const list = isJ ? p.journalRows : isInv ? p.additionalEntries : p.particulars;
      proceedToNextRow(list.findIndex((r) => r.id === rowId));
    },
    [
      p.activeAllocation, p.voucherType,
      p.journalRows, p.additionalEntries, p.particulars,
      p.setActiveAllocation,
      p.handleUpdateJournalRow, p.handleUpdateAdditionalRow, p.handleUpdateParticularRow,
      proceedToNextRow,
    ]
  );

  // ── handleSaveBankDetails ───────────────────────────────────────────────────

  const handleSaveBankDetails = useCallback(
    (details: any) => {
      p.setBankDetails(details);
      p.setActiveAllocation(null);
      setTimeout(() => acceptRef.current(), 50);
    },
    [p.setBankDetails, p.setActiveAllocation]
  );

  // ── handleSaveDispatchDetails ───────────────────────────────────────────────

  const handleSaveDispatchDetails = useCallback(
    (details: any) => {
      p.setDispatchDetails(details);
      setTimeout(() => acceptRef.current(), 50);
    },
    [p.setDispatchDetails]
  );

  // ── handleSaveReceiptDetails ────────────────────────────────────────────────

  const handleSaveReceiptDetails = useCallback(
    (details: any) => {
      p.setReceiptDetails(details);
      setTimeout(() => acceptRef.current(), 50);
    },
    [p.setReceiptDetails]
  );

  return {
    acceptRef,
    setAcceptRef,
    handleAccept,
    handleAmountConfirm,
    proceedToNextRow,
    handleSaveBillWise,
    handleSaveCostCentre,
    handleSaveBankDetails,
    handleSaveDispatchDetails,
    handleSaveReceiptDetails,
  };
}