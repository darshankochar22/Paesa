import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useCompany } from "../../../context/CompanyContext";
import { loadFormState, saveFormState, clearFormState } from "../../../utils/formPersistence";
import type { LedgerType, GroupType, StockItemType, GodownType, UnitType } from "../../../types/api";

// ─── ID factory ──────────────────────────────────────────────────────────────

let idCounter = 0;
const nextId = () => `row_${++idCounter}_${Date.now()}`;

// ─── Types ────────────────────────────────────────────────────────────────────

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
      ledgerId: number;
      ledgerName: string;
      amount: number;
      initialDetails?: any;
    }
  | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const monthNames = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const formatDateDisplay = (dateStr: string | undefined): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()}-${monthNames[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
};

const todayStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// ─── Default row factories ────────────────────────────────────────────────────

const makeParticularRow = (type: "Dr" | "Cr" = "Dr"): ParticularRow => ({
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

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVoucherForm() {
  const { selectedCompany, activeFY } = useCompany();

  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;
  const persistKey = companyId ? `voucherForm_${companyId}` : null;

  // Track whether the very first render has passed so the auto-save effect
  // does not immediately overwrite the just-restored state.
  const hasRestored = useRef(false);

  // ── Basic voucher meta ──────────────────────────────────────────────────────

  const [voucherType, setVoucherType] = useState<string>(
    () => loadFormState<any>(persistKey ?? "")?.voucherType ?? "Receipt"
  );
  const [voucherNumber, setVoucherNumber] = useState<string>("1");
  const [voucherNumberLoading, setVoucherNumberLoading] = useState(true);
  const [date, setDate] = useState<string>(todayStr());
  const [status, setStatus] = useState<"Regular" | "Post-Dated">("Regular");
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState<string>("");
  const [supplierInvoiceDate, setSupplierInvoiceDate] = useState<string>("");
  const [narration, setNarration] = useState<string>(
    () => loadFormState<any>(persistKey ?? "")?.narration ?? ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── Advanced allocation state ───────────────────────────────────────────────

  const [activeAllocation, setActiveAllocation] = useState<ActiveAllocation>(null);
  const [partyBillReferences, setPartyBillReferences] = useState<any[]>(
    () => loadFormState<any>(persistKey ?? "")?.partyBillReferences ?? []
  );
  const [bankDetails, setBankDetails] = useState<any | null>(
    () => loadFormState<any>(persistKey ?? "")?.bankDetails ?? null
  );

  // ── Reference / invoice fields ─────────────────────────────────────────────

  const [referenceNumber, setReferenceNumber] = useState<string>(
    () => loadFormState<any>(persistKey ?? "")?.referenceNumber ?? ""
  );
  const [referenceDate, setReferenceDate] = useState<string>(todayStr());
  const [placeOfSupply, setPlaceOfSupply] = useState<string>(
    () => loadFormState<any>(persistKey ?? "")?.placeOfSupply ?? "Select"
  );

  // ── Master data lists ───────────────────────────────────────────────────────

  const [allLedgers, setAllLedgers] = useState<LedgerType[]>([]);
  const [allGroups, setAllGroups] = useState<GroupType[]>([]);
  const [allStockItems, setAllStockItems] = useState<StockItemType[]>([]);
  const [allGodowns, setAllGodowns] = useState<GodownType[]>([]);
  const [allUnits, setAllUnits] = useState<UnitType[]>([]);
  const [ledgersLoading, setLedgersLoading] = useState(false);

  // ── Search / active field ───────────────────────────────────────────────────

  const [ledgerSearchTerm, setLedgerSearchTerm] = useState("");
  const [stockSearchTerm, setStockSearchTerm] = useState("");
  const [activeField, setActiveField] = useState<ActiveField | null>(null);

  // ── Layout 1: Single-entry (Receipt F6, Payment F5, Contra F4) ─────────────

  const [accountLedger, setAccountLedger] = useState<LedgerType | null>(null);
  const [accountBalance, setAccountBalance] = useState<string>("");

  const [particulars, setParticulars] = useState<ParticularRow[]>(() => {
    const saved = loadFormState<any>(persistKey ?? "");
    return saved?.particulars?.length ? saved.particulars : [makeParticularRow("Dr")];
  });

  // ── Layout 2: Double-entry Journal (F7) ────────────────────────────────────

  const [journalRows, setJournalRows] = useState<ParticularRow[]>(() => {
    const saved = loadFormState<any>(persistKey ?? "");
    return saved?.journalRows?.length
      ? saved.journalRows
      : [makeParticularRow("Dr"), makeParticularRow("Cr")];
  });

  // ── Layout 3: Inventory invoice (Sales F8, Purchase F9) ───────────────────

  const [partyLedger, setPartyLedger] = useState<LedgerType | null>(
    () => loadFormState<any>(persistKey ?? "")?.partyLedger ?? null
  );
  const [partyBalance, setPartyBalance] = useState<string>("");

  const [salesPurchaseLedger, setSalesPurchaseLedger] = useState<LedgerType | null>(
    () => loadFormState<any>(persistKey ?? "")?.salesPurchaseLedger ?? null
  );
  const [salesPurchaseBalance, setSalesPurchaseBalance] = useState<string>("");

  const [stockEntries, setStockEntries] = useState<StockEntryRow[]>(() => {
    const saved = loadFormState<any>(persistKey ?? "");
    return saved?.stockEntries?.length ? saved.stockEntries : [makeStockRow()];
  });

  const [additionalEntries, setAdditionalEntries] = useState<ParticularRow[]>(
    () => loadFormState<any>(persistKey ?? "")?.additionalEntries ?? []
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Persistence snapshot
  // ─────────────────────────────────────────────────────────────────────────────

  const getSnapshot = useCallback(
    () => ({
      voucherType,
      narration,
      accountLedger,
      particulars,
      journalRows,
      partyLedger,
      salesPurchaseLedger,
      stockEntries,
      additionalEntries,
      referenceNumber,
      placeOfSupply,
      partyBillReferences,
      bankDetails,
      supplierInvoiceNo,
      supplierInvoiceDate,
    }),
    [
      voucherType, narration, accountLedger, particulars, journalRows,
      partyLedger, salesPurchaseLedger, stockEntries, additionalEntries,
      referenceNumber, placeOfSupply, partyBillReferences, bankDetails,
      supplierInvoiceNo, supplierInvoiceDate,
    ]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Data fetching
  // ─────────────────────────────────────────────────────────────────────────────

  const fetchContextData = useCallback(async () => {
    if (!companyId) return;
    setLedgersLoading(true);
    try {
      const [ledRes, grpRes, itemRes, godRes, unitRes] = await Promise.all([
        window.api.ledger.getAll(companyId),
        window.api.group.getAll(companyId),
        window.api.stockItem.getAll(companyId),
        window.api.godown.getAll(companyId),
        window.api.unit.getAll(companyId),
      ]);
      if (ledRes.success) setAllLedgers((ledRes as any).ledgers ?? []);
      if (grpRes.success) setAllGroups((grpRes as any).groups ?? []);
      if (itemRes.success) setAllStockItems((itemRes as any).stockItems ?? []);
      if (godRes.success) setAllGodowns((godRes as any).godowns ?? []);
      if (unitRes.success) setAllUnits((unitRes as any).units ?? []);
    } catch {
      // silently ignore — user can retry
    } finally {
      setLedgersLoading(false);
    }
  }, [companyId]);

  const fetchNextNumber = useCallback(async () => {
    if (!companyId || !fyId) return;
    setVoucherNumberLoading(true);
    try {
      const res = await window.api.voucher.getNextNumber(companyId, fyId, voucherType);
      if (res.success && res.voucher_number) {
        setVoucherNumber(String(res.voucher_number));
      }
    } catch {
      // ignore
    } finally {
      setVoucherNumberLoading(false);
    }
  }, [companyId, fyId, voucherType]);

  const fetchLedgerBalance = useCallback(
    async (ledgerId: number): Promise<string> => {
      if (!companyId || !fyId) return "";
      try {
        const res = await window.api.voucher.getLedgerBalance(ledgerId, companyId, fyId);
        if (res.success && res.balance != null) return String(res.balance);
      } catch {
        // ignore
      }
      return "";
    },
    [companyId, fyId]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Effects
  // ─────────────────────────────────────────────────────────────────────────────

  // Initial load
  useEffect(() => {
    fetchContextData();
    fetchNextNumber();
  }, [fetchContextData, fetchNextNumber]);

  // Auto-save — skip the very first render (restoration just happened)
  useEffect(() => {
    if (!persistKey) return;
    if (!hasRestored.current) {
      hasRestored.current = true;
      return;
    }
    saveFormState(persistKey, getSnapshot());
  }, [persistKey, getSnapshot]);

  // Reset form when voucher type changes
  const prevVoucherType = useRef(voucherType);
  useEffect(() => {
    if (prevVoucherType.current !== voucherType) {
      prevVoucherType.current = voucherType;
      // resetForm() is defined later — we call it via ref to avoid circular deps
      resetFormRef.current?.();
    }
  }, [voucherType]);

  // Balance sync: account ledger
  useEffect(() => {
    if (accountLedger?.ledger_id) {
      fetchLedgerBalance(accountLedger.ledger_id).then(setAccountBalance);
    } else {
      setAccountBalance("");
    }
  }, [accountLedger, fetchLedgerBalance]);

  // Balance sync: party ledger
  useEffect(() => {
    if (partyLedger?.ledger_id) {
      fetchLedgerBalance(partyLedger.ledger_id).then(setPartyBalance);
    } else {
      setPartyBalance("");
    }
  }, [partyLedger, fetchLedgerBalance]);

  // Balance sync: sales/purchase ledger
  useEffect(() => {
    if (salesPurchaseLedger?.ledger_id) {
      fetchLedgerBalance(salesPurchaseLedger.ledger_id).then(setSalesPurchaseBalance);
    } else {
      setSalesPurchaseBalance("");
    }
  }, [salesPurchaseLedger, fetchLedgerBalance]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Business logic helpers
  // ─────────────────────────────────────────────────────────────────────────────

  /** Walk the group hierarchy to see if a ledger ultimately belongs to any of the named groups. */
  const checkLedgerGroup = useCallback(
    (ledger: LedgerType | null, targetGroupNames: string[]): boolean => {
      if (!ledger || allGroups.length === 0) return false;

      const findGroup = (groupId?: number): GroupType | undefined =>
        allGroups.find((g) => g.group_id === groupId);

      const check = (grp: GroupType): boolean => {
        if (targetGroupNames.map((n) => n.toLowerCase().trim()).includes(grp.name.toLowerCase().trim())) {
          return true;
        }
        if (grp.parent_group_id) {
          const parent = findGroup(grp.parent_group_id);
          if (parent) return check(parent);
        }
        return false;
      };

      const group = findGroup(ledger.group_id);
      return group ? check(group) : false;
    },
    [allGroups]
  );

  const checkIsCashOrBank = useCallback(
    (ledger: LedgerType | null): boolean =>
      checkLedgerGroup(ledger, [
        "bank accounts",
        "bank od accounts",
        "bank od a/c",
        "bank od account",
        "cash-in-hand",
      ]),
    [checkLedgerGroup]
  );

  /**
   * FIX #9 — auto-derive Dr/Cr for single-entry voucher types so the user
   * never has to pick it manually (matching Tally Prime behaviour).
   *
   * Receipt  → cash/bank side is Dr;  all others are Cr
   * Payment  → cash/bank side is Cr;  all others are Dr
   * Contra   → no auto-assignment (both sides are cash/bank, user picks)
   */
  const autoType = useCallback(
    (ledger: LedgerType, currentType: "Dr" | "Cr"): "Dr" | "Cr" => {
      const isCB = checkIsCashOrBank(ledger);
      if (voucherType === "Receipt") return isCB ? "Dr" : "Cr";
      if (voucherType === "Payment") return isCB ? "Cr" : "Dr";
      return currentType; // Journal / Contra / Sales / Purchase — keep as-is
    },
    [voucherType, checkIsCashOrBank]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Computed totals  (FIX #1 — exported so Vouchers.tsx doesn't need `as any`)
  // ─────────────────────────────────────────────────────────────────────────────

  const debitTotal = useMemo(() => {
    if (voucherType === "Journal") {
      return journalRows.reduce(
        (sum, r) => sum + (r.type === "Dr" ? Number(r.amountRaw) || 0 : 0),
        0
      );
    }
    return particulars.reduce(
      (sum, p) => sum + (p.type === "Dr" ? Number(p.amountRaw) || 0 : 0),
      0
    );
  }, [voucherType, particulars, journalRows]);

  const creditTotal = useMemo(() => {
    if (voucherType === "Journal") {
      return journalRows.reduce(
        (sum, r) => sum + (r.type === "Cr" ? Number(r.amountRaw) || 0 : 0),
        0
      );
    }
    return particulars.reduce(
      (sum, p) => sum + (p.type === "Cr" ? Number(p.amountRaw) || 0 : 0),
      0
    );
  }, [voucherType, particulars, journalRows]);

  const totalAmount = useMemo(() => {
    if (voucherType === "Journal") return debitTotal;

    if (voucherType === "Sales" || voucherType === "Purchase") {
      const stockSum = stockEntries.reduce((s, r) => s + (Number(r.amountRaw) || 0), 0);
      const adjSum = additionalEntries.reduce((s, r) => {
        const amt = Number(r.amountRaw) || 0;
        if (voucherType === "Sales") return r.type === "Cr" ? s + amt : s - amt;
        return r.type === "Dr" ? s + amt : s - amt;
      }, 0);
      return Math.max(0, stockSum + adjSum);
    }

    // Receipt / Payment / Contra
    return particulars.reduce((s, p) => s + (Number(p.amountRaw) || 0), 0);
  }, [voucherType, debitTotal, particulars, stockEntries, additionalEntries]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Particular row handlers (single-entry layouts)
  // ─────────────────────────────────────────────────────────────────────────────

  const handleAddParticularRow = useCallback(() => {
    setParticulars((prev) => [...prev, makeParticularRow("Dr")]);
  }, []);

  const handleUpdateParticularRow = useCallback(
    async (id: string, updates: Partial<Omit<ParticularRow, "id">>) => {
      // FIX #9 — auto-assign Dr/Cr when a ledger is selected for Receipt/Payment
      if (updates.ledger && ["Receipt", "Payment"].includes(voucherType)) {
        setParticulars((prev) =>
          prev.map((p) => {
            if (p.id !== id) return p;
            const derivedType = autoType(updates.ledger!, p.type);
            return { ...p, ...updates, type: derivedType };
          })
        );
      } else {
        setParticulars((prev) =>
          prev.map((p) => (p.id !== id ? p : { ...p, ...updates }))
        );
      }

      // Fetch balance after ledger selection
      if (updates.ledger?.ledger_id) {
        const bal = await fetchLedgerBalance(updates.ledger.ledger_id);
        setParticulars((prev) =>
          prev.map((p) => (p.id !== id ? p : { ...p, ledgerBalance: bal }))
        );
      }
    },
    [voucherType, autoType, fetchLedgerBalance]
  );

  const handleRemoveParticularRow = useCallback((id: string) => {
    setParticulars((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev));
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Journal row handlers
  // ─────────────────────────────────────────────────────────────────────────────

  const handleAddJournalRow = useCallback(() => {
    setJournalRows((prev) => {
      const lastType = prev[prev.length - 1]?.type ?? "Dr";
      return [...prev, makeParticularRow(lastType)];
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Stock entry handlers
  // ─────────────────────────────────────────────────────────────────────────────

  const handleAddStockRow = useCallback(() => {
    setStockEntries((prev) => [...prev, makeStockRow()]);
  }, []);

  const handleUpdateStockRow = useCallback(
    async (id: string, updates: Partial<Omit<StockEntryRow, "id">>) => {
      setStockEntries((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          const updated = { ...r, ...updates };
          // Auto-compute amount when quantity or rate changes
          if (updates.quantityRaw !== undefined || updates.rateRaw !== undefined) {
            const qty = Number(updated.quantityRaw) || 0;
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Additional ledger row handlers (Sales/Purchase taxes & adjustments)
  // ─────────────────────────────────────────────────────────────────────────────

  const handleAddAdditionalRow = useCallback(() => {
    // Default type: Sales → Cr (tax adds to revenue side), Purchase → Dr
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Active field / search panel
  // ─────────────────────────────────────────────────────────────────────────────

  const handleFieldFocus = useCallback(
    (field: ActiveField) => {
      setActiveField(field);

      // Populate the search box with the currently selected item's name
      // so the user sees it highlighted and can start filtering immediately.
      let currentName = "";
      if (field.type === "account") {
        currentName = accountLedger?.name ?? "";
      } else if (field.type === "party") {
        currentName = partyLedger?.name ?? "";
      } else if (field.type === "salesPurchase") {
        currentName = salesPurchaseLedger?.name ?? "";
      } else if (field.type === "particular") {
        const row =
          particulars.find((p) => p.id === field.rowId) ??
          journalRows.find((p) => p.id === field.rowId);
        currentName = row?.ledger?.name ?? "";
      } else if (field.type === "additional") {
        const row = additionalEntries.find((p) => p.id === field.rowId);
        currentName = row?.ledger?.name ?? "";
      } else if (field.type === "stockItem") {
        const row = stockEntries.find((p) => p.id === field.rowId);
        currentName = row?.stockItem?.name ?? "";
      }

      setLedgerSearchTerm(currentName);
      setStockSearchTerm(currentName);
    },
    [
      accountLedger, partyLedger, salesPurchaseLedger,
      particulars, journalRows, additionalEntries, stockEntries,
    ]
  );

  const handleFieldBlur = useCallback(() => {
    setActiveField(null);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Universal selection handler (called when user clicks an item in LedgerPanel)
  // ─────────────────────────────────────────────────────────────────────────────

  const handleLedgerPanelSelect = useCallback(
    (item: any) => {
      if (!activeField) return;

      switch (activeField.type) {
        case "account":
          setAccountLedger(item as LedgerType);
          break;

        case "party":
          setPartyLedger(item as LedgerType);
          break;

        case "salesPurchase":
          setSalesPurchaseLedger(item as LedgerType);
          break;

        case "particular": {
          const ledger = item as LedgerType;
          if (voucherType === "Journal") {
            handleUpdateJournalRow(activeField.rowId, { ledger });
          } else {
            handleUpdateParticularRow(activeField.rowId, { ledger });
          }
          break;
        }

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

      // Close the panel immediately to prevent cross-field confusion
      setActiveField(null);
      setLedgerSearchTerm("");
      setStockSearchTerm("");
    },
    [
      activeField, voucherType, allUnits,
      handleUpdateParticularRow, handleUpdateJournalRow,
      handleUpdateAdditionalRow, handleUpdateStockRow,
    ]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Form reset
  // ─────────────────────────────────────────────────────────────────────────────

  const resetForm = useCallback(() => {
    if (persistKey) clearFormState(persistKey);
    hasRestored.current = false;

    setAccountLedger(null);
    setAccountBalance("");
    setPartyLedger(null);
    setPartyBalance("");
    setSalesPurchaseLedger(null);
    setSalesPurchaseBalance("");

    setParticulars([makeParticularRow("Dr")]);
    setJournalRows([makeParticularRow("Dr"), makeParticularRow("Cr")]);
    setStockEntries([makeStockRow()]);
    setAdditionalEntries([]);

    setActiveAllocation(null);
    setPartyBillReferences([]);
    setBankDetails(null);

    setReferenceNumber("");
    setNarration("");
    setError(null);
    setSuccess(null);
    setActiveField(null);
    setLedgerSearchTerm("");
    setStockSearchTerm("");
    setSupplierInvoiceNo("");
    setSupplierInvoiceDate("");
    setStatus("Regular");
    setDate(todayStr());

    fetchNextNumber();
  }, [persistKey, fetchNextNumber]);

  // Keep a stable ref so the voucherType-change effect can call resetForm
  // without it being listed as a dependency (which would cause an infinite loop).
  const resetFormRef = useRef<() => void>(resetForm);
  useEffect(() => {
    resetFormRef.current = resetForm;
  }, [resetForm]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Validation
  // ─────────────────────────────────────────────────────────────────────────────

  const validate = useCallback((): string | null => {
    if (!companyId) return "No company selected.";
    if (!fyId) return "No active financial year.";

    if (["Receipt", "Payment", "Contra"].includes(voucherType)) {
      const filled = particulars.filter((p) => p.ledger && Number(p.amountRaw) > 0);
      if (filled.length < 2)
        return "At least two ledger entries are required (one Debit and one Credit).";

      if (voucherType === "Contra") {
        for (const row of filled) {
          if (!checkIsCashOrBank(row.ledger))
            return "Contra vouchers may only use Cash/Bank accounts.";
        }
      }

      if (Math.abs(debitTotal - creditTotal) > 0.01)
        return `Debit (${debitTotal.toFixed(2)}) and Credit (${creditTotal.toFixed(2)}) must balance.`;

      if (debitTotal <= 0) return "Total amount must be greater than zero.";
    }

    if (voucherType === "Journal") {
      const filled = journalRows.filter((r) => r.ledger && Number(r.amountRaw) > 0);
      if (filled.length < 2) return "At least two valid Journal entries are required.";
      if (Math.abs(debitTotal - creditTotal) > 0.01)
        return `Debit (${debitTotal.toFixed(2)}) and Credit (${creditTotal.toFixed(2)}) must balance.`;
      if (debitTotal <= 0) return "Journal amount must be greater than zero.";
    }

    if (["Sales", "Purchase"].includes(voucherType)) {
      if (!partyLedger) return "Party A/c Name is required.";
      if (!salesPurchaseLedger) return `${voucherType} Ledger is required.`;
      if (partyLedger.ledger_id === salesPurchaseLedger.ledger_id)
        return `Party and ${voucherType} ledger cannot be the same account.`;

      const filledItems = stockEntries.filter(
        (r) => r.stockItem && Number(r.quantityRaw) > 0 && Number(r.rateRaw) > 0
      );
      if (filledItems.length === 0) return "At least one Stock Item with quantity and rate is required.";
      if (totalAmount <= 0) return "Total amount must be greater than zero.";
    }

    return null;
  }, [
    companyId, fyId, voucherType,
    particulars, journalRows, stockEntries,
    partyLedger, salesPurchaseLedger,
    debitTotal, creditTotal, totalAmount,
    checkIsCashOrBank,
  ]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Submit
  // ─────────────────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      let entries: any[] = [];
      let stock_entries: any[] = [];

      // ── Build entries per voucher type ──────────────────────────────────────

      if (["Receipt", "Payment", "Contra"].includes(voucherType)) {
        const filled = particulars.filter((p) => p.ledger && Number(p.amountRaw) > 0);
        entries = filled.map((p) => ({
          ledger_id: p.ledger!.ledger_id,
          ledger_name: p.ledger!.name,
          type: p.type,
          amount: Number(p.amountRaw),
          currency: "INR",
          cost_centres: p.costCentres,
        }));
      } else if (voucherType === "Journal") {
        const filled = journalRows.filter((r) => r.ledger && Number(r.amountRaw) > 0);
        entries = filled.map((r) => ({
          ledger_id: r.ledger!.ledger_id,
          ledger_name: r.ledger!.name,
          type: r.type,
          amount: Number(r.amountRaw),
          currency: "INR",
          cost_centres: r.costCentres,
        }));
      } else if (["Sales", "Purchase"].includes(voucherType)) {
        const filledItems = stockEntries.filter(
          (r) => r.stockItem && Number(r.quantityRaw) > 0 && Number(r.rateRaw) > 0
        );
        const stockSubtotal = filledItems.reduce((s, r) => s + (Number(r.amountRaw) || 0), 0);

        stock_entries = filledItems.map((r) => ({
          stock_item_id: r.stockItem!.item_id ?? null,
          item_name: r.stockItem!.name,
          godown_id: r.godown?.godown_id ?? null,
          unit_id: r.unit?.unit_id ?? null,
          quantity: Number(r.quantityRaw),
          rate: Number(r.rateRaw),
          amount: Number(r.amountRaw),
        }));

        // Sales: Party Dr (total), Sales Cr (subtotal), taxes ±
        // Purchase: Purchase Dr (subtotal), taxes ±, Party Cr (total)
        const partyType = voucherType === "Sales" ? "Dr" : "Cr";
        const spType = voucherType === "Sales" ? "Cr" : "Dr";

        entries = [
          {
            ledger_id: partyLedger!.ledger_id,
            ledger_name: partyLedger!.name,
            type: partyType,
            amount: totalAmount,
            currency: "INR",
          },
          {
            ledger_id: salesPurchaseLedger!.ledger_id,
            ledger_name: salesPurchaseLedger!.name,
            type: spType,
            amount: stockSubtotal,
            currency: "INR",
          },
          ...additionalEntries
            .filter((p) => p.ledger && Number(p.amountRaw) > 0)
            .map((p) => ({
              ledger_id: p.ledger!.ledger_id,
              ledger_name: p.ledger!.name,
              type: p.type,
              amount: Number(p.amountRaw),
              currency: "INR",
              cost_centres: p.costCentres,
            })),
        ];
      }

      // ── Collect bill references ─────────────────────────────────────────────

      let finalBillReferences: any[] = [];

      if (["Receipt", "Payment", "Contra"].includes(voucherType)) {
        finalBillReferences = particulars
          .filter((p) => p.ledger && p.billReferences?.length)
          .flatMap((p) => p.billReferences!.map((b) => ({ ...b, ledger_id: p.ledger!.ledger_id })));
      } else if (voucherType === "Journal") {
        finalBillReferences = journalRows
          .filter((r) => r.ledger && r.billReferences?.length)
          .flatMap((r) => r.billReferences!.map((b) => ({ ...b, ledger_id: r.ledger!.ledger_id })));
      } else if (["Sales", "Purchase"].includes(voucherType)) {
        if (partyLedger && partyBillReferences.length > 0) {
          finalBillReferences = partyBillReferences.map((b) => ({
            ...b,
            ledger_id: partyLedger.ledger_id,
          }));
        }
        const additionalRefs = additionalEntries
          .filter((p) => p.ledger && p.billReferences?.length)
          .flatMap((p) => p.billReferences!.map((b) => ({ ...b, ledger_id: p.ledger!.ledger_id })));
        finalBillReferences = [...finalBillReferences, ...additionalRefs];
      }

      // ── Final payload ───────────────────────────────────────────────────────

      const payload: any = {
        company_id: companyId!,
        fy_id: fyId!,
        voucher_type: voucherType,
        date,
        status,
        supplier_invoice_no: supplierInvoiceNo || null,
        supplier_invoice_date: supplierInvoiceDate || null,
        reference_number: referenceNumber || null,
        reference_date: referenceDate || null,
        place_of_supply: placeOfSupply !== "Select" ? placeOfSupply : null,
        narration: narration || null,
        party_ledger_id: ["Sales", "Purchase"].includes(voucherType)
          ? partyLedger?.ledger_id ?? null
          : null,
        party_name: ["Sales", "Purchase"].includes(voucherType)
          ? partyLedger?.name ?? null
          : null,
        is_accounting_voucher: 1,
        is_invoice: ["Sales", "Purchase"].includes(voucherType) ? 1 : 0,
        is_inventory_voucher: ["Sales", "Purchase"].includes(voucherType) ? 1 : 0,
        is_post_dated: status === "Post-Dated" ? 1 : 0,
        entries,
        stock_entries,
        bill_references: finalBillReferences.length > 0 ? finalBillReferences : undefined,
        bank_details: bankDetails || undefined,
      };

      const res = await window.api.voucher.create(payload);
      if (res.success) {
        const savedNumber = voucherNumber;
        resetForm();
        setSuccess(`Voucher No. ${savedNumber} saved successfully.`);
      } else {
        setError(res.error || "Failed to save voucher.");
      }
    } catch (e: any) {
      setError(e?.message || "Unexpected error.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    validate,
    companyId, fyId, voucherType,
    date, status,
    supplierInvoiceNo, supplierInvoiceDate,
    referenceNumber, referenceDate, placeOfSupply,
    narration, totalAmount,
    particulars, journalRows,
    partyLedger, salesPurchaseLedger,
    stockEntries, additionalEntries,
    partyBillReferences, bankDetails,
    voucherNumber, resetForm,
  ]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Derived display values
  // ─────────────────────────────────────────────────────────────────────────────

  const dateDisplay = useMemo(() => formatDateDisplay(date), [date]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────────

  return {
    // ── Voucher meta ──────────────────────────────────────────────────────────
    voucherType,
    setVoucherType,
    voucherNumber,          // string (FIX #4 — was treated as number in VoucherHeader)
    voucherNumberLoading,
    date,
    setDate,
    dateDisplay,
    status,
    setStatus,
    supplierInvoiceNo,
    setSupplierInvoiceNo,
    supplierInvoiceDate,
    setSupplierInvoiceDate,
    narration,
    setNarration,

    // ── Computed totals (FIX #1 — all three exported) ─────────────────────────
    totalAmount,
    debitTotal,
    creditTotal,

    // ── Submission state ──────────────────────────────────────────────────────
    isSubmitting,
    error,
    setError,
    success,
    setSuccess,
    handleSubmit,
    resetForm,

    // ── Advanced allocations ──────────────────────────────────────────────────
    activeAllocation,
    setActiveAllocation,
    partyBillReferences,
    setPartyBillReferences,
    bankDetails,
    setBankDetails,

    // ── Reference / invoice ───────────────────────────────────────────────────
    referenceNumber,
    setReferenceNumber,
    referenceDate,
    setReferenceDate,
    placeOfSupply,
    setPlaceOfSupply,

    // ── Master data lists ─────────────────────────────────────────────────────
    allLedgers,
    allStockItems,
    allGodowns,
    allUnits,
    ledgersLoading,
    fetchContextData,

    // ── Search / panel state ──────────────────────────────────────────────────
    ledgerSearchTerm,
    setLedgerSearchTerm,
    stockSearchTerm,
    setStockSearchTerm,
    activeField,
    handleFieldFocus,
    handleFieldBlur,
    handleLedgerPanelSelect,

    // ── Layout 1 — single-entry (F4 Contra, F5 Payment, F6 Receipt) ───────────
    accountLedger,
    accountBalance,
    particulars,
    setParticulars,
    handleUpdateParticularRow,
    handleAddParticularRow,
    handleRemoveParticularRow,

    // ── Layout 2 — journal (F7) ───────────────────────────────────────────────
    journalRows,
    setJournalRows,
    handleUpdateJournalRow,
    handleAddJournalRow,
    handleRemoveJournalRow,

    // ── Layout 3 — inventory invoice (F8 Sales, F9 Purchase) ──────────────────
    partyLedger,
    partyBalance,
    salesPurchaseLedger,
    salesPurchaseBalance,
    stockEntries,
    handleUpdateStockRow,
    handleAddStockRow,
    handleRemoveStockRow,
    additionalEntries,
    setAdditionalEntries,
    handleUpdateAdditionalRow,
    handleAddAdditionalRow,
    handleRemoveAdditionalRow,

    // ── Context helpers ───────────────────────────────────────────────────────
    checkIsCashOrBank,
    checkLedgerGroup,
    companyId,
    fyId,
  };
}