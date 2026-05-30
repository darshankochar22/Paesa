import { useState, useCallback } from "react";
import type { LedgerType, StockItemType, GodownType, UnitType } from "../../../types/api";
import type { VoucherType } from "./useVoucherMeta";

export interface ParticularRow {
  id: string;
  type: "Dr" | "Cr";
  ledger: LedgerType | null;
  ledgerBalance: string;
  amountRaw: string;
  costCentres?: { cost_centre_id: number; amount: number }[];
  billReferences?: {
    bill_name: string;
    bill_type: "New Ref" | "Agst Ref" | "Advance" | "On Account";
    amount: number;
    credit_period?: string;
  }[];
}

export interface StockEntryRow {
  id: string;
  stockItem: StockItemType | null;
  godown: GodownType | null;
  unit: UnitType | null;
  quantityRaw: string;
  rateRaw: string;
  amountRaw: string;
}

export type ActiveField =
  | { type: "account" }
  | { type: "party" }
  | { type: "salesPurchase" }
  | { type: "particular"; rowId: string }
  | { type: "additional"; rowId: string }
  | { type: "stockItem"; rowId: string }
  | { type: "stockGodown"; rowId: string };

export type ActiveAllocation =
  | {
      type: "billWise";
      rowId: string;
      ledgerId: number;
      ledgerName: string;
      amount: number;
      initialAllocations?: any[];
    }
  | {
      type: "billWiseParty";
      ledgerId: number;
      ledgerName: string;
      amount: number;
      initialAllocations?: any[];
    }
  | {
      type: "costCentre";
      rowId: string;
      ledgerId: number;
      ledgerName: string;
      amount: number;
      initialAllocations?: any[];
    }
  | {
      type: "bankDetails";
      rowId?: string;
      ledgerId: number;
      ledgerName: string;
      amount: number;
      initialDetails?: any;
    }
  | {
      type: "cashDenomination";
      rowId?: string;
      ledgerId: number;
      ledgerName: string;
      amount: number;
      initialDetails?: any;
    }
  | null;

let idCounter = 0;
const nextId = () => `row_${++idCounter}_${Date.now()}`;

export const makeParticularRow = (type: "Dr" | "Cr" = "Dr"): ParticularRow => ({
  id: nextId(),
  type,
  ledger: null,
  ledgerBalance: "",
  amountRaw: "",
});

const makeStockRow = (): StockEntryRow => ({
  id: nextId(),
  stockItem: null,
  godown: null,
  unit: null,
  quantityRaw: "",
  rateRaw: "",
  amountRaw: "",
});

interface UseVoucherRowsParams {
  voucherType: VoucherType;
  companyId: number | null;
  fyId: number | null;
  fetchLedgerBalance: (ledgerId: number) => Promise<string>;
  checkIsCashOrBank: (ledger: LedgerType | null) => boolean;
  checkIsBank: (ledger: LedgerType | null) => boolean;
  checkIsCash: (ledger: LedgerType | null) => boolean;
  allUnits: UnitType[];
  persistKey: string | null;
}

export function useVoucherRows({
  voucherType,
  fetchLedgerBalance,
  allUnits,
}: UseVoucherRowsParams) {

  const [accountLedger, setAccountLedger] = useState<LedgerType | null>(null);
  const [accountBalance, setAccountBalance] = useState<string>("");

  const [particulars, setParticulars] = useState<ParticularRow[]>([
    makeParticularRow("Cr"),
  ]);

  const [contraEntryMode, setContraEntryMode] = useState<"single" | "double">("single");
  const [contraDoubleRows, setContraDoubleRows] = useState<ParticularRow[]>([
    makeParticularRow("Cr"),
    makeParticularRow("Dr"),
  ]);

  const [journalRows, setJournalRows] = useState<ParticularRow[]>([
    makeParticularRow("Dr"),
    makeParticularRow("Cr"),
  ]);

  const [partyLedger, setPartyLedger] = useState<LedgerType | null>(null);
  const [partyBalance, setPartyBalance] = useState<string>("");
  const [salesPurchaseLedger, setSalesPurchaseLedger] = useState<LedgerType | null>(null);
  const [salesPurchaseBalance, setSalesPurchaseBalance] = useState<string>("");
  const [stockEntries, setStockEntries] = useState<StockEntryRow[]>([makeStockRow()]);
  const [additionalEntries, setAdditionalEntries] = useState<ParticularRow[]>([]);

  const [activeAllocation, setActiveAllocation] = useState<ActiveAllocation>(null);
  const [partyBillReferences, setPartyBillReferences] = useState<any[]>([]);
  const [bankDetails, setBankDetails] = useState<any | null>(null);
  const [cashDenominations, setCashDenominations] = useState<any | null>(null);

  const [ledgerSearchTerm, setLedgerSearchTerm] = useState("");
  const [stockSearchTerm, setStockSearchTerm] = useState("");
  const [activeField, setActiveField] = useState<ActiveField | null>(null);

  const deriveParticularType = useCallback(
    (currentType: "Dr" | "Cr"): "Dr" | "Cr" => {
      if (voucherType === "Receipt") return "Cr";
      if (voucherType === "Payment") return "Dr";
      if (voucherType === "Contra")  return "Dr";
      return currentType;
    },
    [voucherType]
  );

  const handleAddParticularRow = useCallback(() => {
    setParticulars((prev) => [
      ...prev,
      makeParticularRow(
        voucherType === "Receipt" ? "Cr"
        : voucherType === "Payment" ? "Dr"
        : "Dr"
      ),
    ]);
  }, [voucherType]);

  const handleUpdateParticularRow = useCallback(
    async (id: string, updates: Partial<Omit<ParticularRow, "id">>) => {
      setParticulars((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          const next = { ...p, ...updates };
          if (updates.ledger !== undefined) {
            next.type = deriveParticularType(p.type);
          }
          return next;
        })
      );
      if (updates.ledger?.ledger_id) {
        const bal = await fetchLedgerBalance(updates.ledger.ledger_id);
        setParticulars((prev) =>
          prev.map((p) => (p.id !== id ? p : { ...p, ledgerBalance: bal }))
        );
      }
    },
    [deriveParticularType, fetchLedgerBalance]
  );

  const handleRemoveParticularRow = useCallback((id: string) => {
    setParticulars((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev));
  }, []);

  const handleAddJournalRow = useCallback(() => {
    setJournalRows((prev) => {
      const lastType = prev[prev.length - 1]?.type ?? "Dr";
      const nextType: "Dr" | "Cr" = lastType === "Dr" ? "Cr" : "Dr";
      return [...prev, makeParticularRow(nextType)];
    });
  }, []);

  const handleUpdateJournalRow = useCallback(
    async (id: string, updates: Partial<Omit<ParticularRow, "id">>) => {
      setJournalRows((prev) =>
        prev.map((r) => (r.id !== id ? r : { ...r, ...updates }))
      );
      if (updates.ledger?.ledger_id) {
        const bal = await fetchLedgerBalance(updates.ledger.ledger_id);
        setJournalRows((prev) =>
          prev.map((r) => (r.id !== id ? r : { ...r, ledgerBalance: bal }))
        );
      }
    },
    [fetchLedgerBalance]
  );

  const handleRemoveJournalRow = useCallback((id: string) => {
    setJournalRows((prev) => (prev.length > 2 ? prev.filter((r) => r.id !== id) : prev));
  }, []);

  const handleAddContraDoubleRow = useCallback(() => {
    setContraDoubleRows((prev) => {
      const lastType = prev[prev.length - 1]?.type ?? "Dr";
      const nextType: "Dr" | "Cr" = lastType === "Dr" ? "Cr" : "Dr";
      return [...prev, makeParticularRow(nextType)];
    });
  }, []);

  const handleUpdateContraDoubleRow = useCallback(
    async (id: string, updates: Partial<Omit<ParticularRow, "id">>) => {
      setContraDoubleRows((prev) =>
        prev.map((r) => (r.id !== id ? r : { ...r, ...updates }))
      );
      if (updates.ledger?.ledger_id) {
        const bal = await fetchLedgerBalance(updates.ledger.ledger_id);
        setContraDoubleRows((prev) =>
          prev.map((r) => (r.id !== id ? r : { ...r, ledgerBalance: bal }))
        );
      }
    },
    [fetchLedgerBalance]
  );

  const handleRemoveContraDoubleRow = useCallback((id: string) => {
    setContraDoubleRows((prev) =>
      prev.length > 2 ? prev.filter((r) => r.id !== id) : prev
    );
  }, []);

  const handleAddStockRow = useCallback(() => {
    setStockEntries((prev) => [...prev, makeStockRow()]);
  }, []);

  const handleUpdateStockRow = useCallback(
    async (id: string, updates: Partial<Omit<StockEntryRow, "id">>) => {
      setStockEntries((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          const updated = { ...r, ...updates };
          if (updates.quantityRaw !== undefined || updates.rateRaw !== undefined) {
            const qty  = Number(updated.quantityRaw) || 0;
            const rate = Number(updated.rateRaw) || 0;
            updated.amountRaw = qty > 0 && rate > 0 ? (qty * rate).toFixed(2) : "";
          }
          return updated;
        })
      );
    },
    []
  );

  const handleRemoveStockRow = useCallback((id: string) => {
    setStockEntries((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  }, []);

  const handleAddAdditionalRow = useCallback(() => {
    setAdditionalEntries((prev) => [
      ...prev,
      makeParticularRow(voucherType === "Sales" ? "Cr" : "Dr"),
    ]);
  }, [voucherType]);

  const handleUpdateAdditionalRow = useCallback(
    async (id: string, updates: Partial<Omit<ParticularRow, "id">>) => {
      setAdditionalEntries((prev) =>
        prev.map((p) => (p.id !== id ? p : { ...p, ...updates }))
      );
      if (updates.ledger?.ledger_id) {
        const bal = await fetchLedgerBalance(updates.ledger.ledger_id);
        setAdditionalEntries((prev) =>
          prev.map((p) => (p.id !== id ? p : { ...p, ledgerBalance: bal }))
        );
      }
    },
    [fetchLedgerBalance]
  );

  const handleRemoveAdditionalRow = useCallback((id: string) => {
    setAdditionalEntries((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleFieldFocus = useCallback((field: ActiveField) => {
    setActiveField(field);
    setLedgerSearchTerm("");
    setStockSearchTerm("");
  }, []);

  const handleFieldBlur = useCallback(() => {
    setActiveField(null);
  }, []);

  const handleLedgerPanelSelect = useCallback(
    (item: any) => {
      if (!activeField) return;

      switch (activeField.type) {
        case "account":
          setAccountLedger(item as LedgerType);
          fetchLedgerBalance(item.ledger_id).then(setAccountBalance);
          break;

        case "party":
          setPartyLedger(item as LedgerType);
          fetchLedgerBalance(item.ledger_id).then(setPartyBalance);
          break;

        case "salesPurchase":
          setSalesPurchaseLedger(item as LedgerType);
          fetchLedgerBalance(item.ledger_id).then(setSalesPurchaseBalance);
          break;

        case "particular":
          if (voucherType === "Journal") {
            handleUpdateJournalRow(activeField.rowId, { ledger: item as LedgerType });
          } else if (voucherType === "Contra" && contraEntryMode === "double") {
            handleUpdateContraDoubleRow(activeField.rowId, { ledger: item as LedgerType });
          } else {
            handleUpdateParticularRow(activeField.rowId, { ledger: item as LedgerType });
          }
          break;

        case "additional":
          handleUpdateAdditionalRow(activeField.rowId, { ledger: item as LedgerType });
          break;

        case "stockItem": {
          const stockItem = item as StockItemType;
          const matchingUnit = allUnits.find((u) => u.unit_id === stockItem.unit_id) ?? null;
          handleUpdateStockRow(activeField.rowId, { stockItem, unit: matchingUnit });
          break;
        }

        default:
          break;
      }

      setActiveField(null);
      setLedgerSearchTerm("");
      setStockSearchTerm("");
    },
    [
      activeField,
      voucherType,
      contraEntryMode,
      allUnits,
      fetchLedgerBalance,
      handleUpdateParticularRow,
      handleUpdateJournalRow,
      handleUpdateContraDoubleRow,
      handleUpdateAdditionalRow,
      handleUpdateStockRow,
    ]
  );

  const resetRows = useCallback((currentVoucherType: VoucherType) => {
    const defaultParticular: "Dr" | "Cr" =
      currentVoucherType === "Receipt" ? "Cr"
      : currentVoucherType === "Payment" ? "Dr"
      : "Dr";

    setAccountLedger(null);
    setAccountBalance("");
    setPartyLedger(null);
    setPartyBalance("");
    setSalesPurchaseLedger(null);
    setSalesPurchaseBalance("");
    setParticulars([makeParticularRow(defaultParticular)]);
    setJournalRows([makeParticularRow("Dr"), makeParticularRow("Cr")]);
    setContraDoubleRows([makeParticularRow("Cr"), makeParticularRow("Dr")]);
    setContraEntryMode("single");
    setStockEntries([makeStockRow()]);
    setAdditionalEntries([]);
    setActiveAllocation(null);
    setPartyBillReferences([]);
    setBankDetails(null);
    setCashDenominations(null);
    setActiveField(null);
    setLedgerSearchTerm("");
    setStockSearchTerm("");
  }, []);

  return {
    accountLedger,
    setAccountLedger,
    accountBalance,
    setAccountBalance,
    particulars,
    setParticulars,
    handleAddParticularRow,
    handleUpdateParticularRow,
    handleRemoveParticularRow,
    contraEntryMode,
    setContraEntryMode,
    contraDoubleRows,
    setContraDoubleRows,
    handleAddContraDoubleRow,
    handleUpdateContraDoubleRow,
    handleRemoveContraDoubleRow,
    journalRows,
    setJournalRows,
    handleAddJournalRow,
    handleUpdateJournalRow,
    handleRemoveJournalRow,
    partyLedger,
    setPartyLedger,
    partyBalance,
    salesPurchaseLedger,
    setSalesPurchaseLedger,
    salesPurchaseBalance,
    stockEntries,
    setStockEntries,
    handleAddStockRow,
    handleUpdateStockRow,
    handleRemoveStockRow,
    additionalEntries,
    setAdditionalEntries,
    handleAddAdditionalRow,
    handleUpdateAdditionalRow,
    handleRemoveAdditionalRow,
    activeAllocation,
    setActiveAllocation,
    partyBillReferences,
    setPartyBillReferences,
    bankDetails,
    setBankDetails,
    cashDenominations,
    setCashDenominations,
    ledgerSearchTerm,
    setLedgerSearchTerm,
    stockSearchTerm,
    setStockSearchTerm,
    activeField,
    handleFieldFocus,
    handleFieldBlur,
    handleLedgerPanelSelect,
    resetRows,
  };
}
