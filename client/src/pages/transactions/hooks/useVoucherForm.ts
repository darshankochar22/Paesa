import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useCompany } from "../../../context/CompanyContext";
import { loadFormState, saveFormState, clearFormState } from "../../../utils/formPersistence";
import type { LedgerType, GroupType, StockItemType, GodownType, UnitType } from "../../../types/api";

// ─── ID factory ───────────────────────────────────────────────────────────────

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
      rowId: string;
      ledgerId: number;
      ledgerName: string;
      amount: number;
      initialDetails?: any;
      allowCash?: boolean;
    }
    | {
      type: "cashDenomination";
      rowId: string;
      ledgerId: number;
      ledgerName: string;
      amount: number;
      initialDetails?: any;
    }
  | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const formatDateDisplay = (dateStr: string | undefined): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()}-${MONTH_NAMES[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
};

const todayStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
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

  // Tracks whether the first render has passed so auto-save doesn't overwrite
  // the just-restored state on mount.
  const hasRestored = useRef(false);

  // ── Voucher meta ────────────────────────────────────────────────────────────

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
  const [cashDenominations, setCashDenominations] = useState<any | null>(null);

  // ── Reference / invoice fields ──────────────────────────────────────────────

  const [referenceNumber, setReferenceNumber] = useState<string>(
    () => loadFormState<any>(persistKey ?? "")?.referenceNumber ?? ""
  );
  const [referenceDate, setReferenceDate] = useState<string>(todayStr());
  const [placeOfSupply, setPlaceOfSupply] = useState<string>(
    () => loadFormState<any>(persistKey ?? "")?.placeOfSupply ?? "Select"
  );

  // ── Master data ─────────────────────────────────────────────────────────────

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

  // ── Layout 1: Single-entry  (Receipt F6 · Payment F5 · Contra F4) ──────────
  //
  //   ACCOUNT field  = cash/bank side  (the "one" side in single-entry)
  //     Receipt  → Account is Dr  (money comes IN to cash/bank)
  //     Payment  → Account is Cr  (money goes OUT from cash/bank)
  //     Contra   → Account is Cr  (source side, e.g. withdraw from bank)
  //
  //   PARTICULARS rows = opposite side
  //     Receipt  → all rows are Cr  (the income/party being receipted from)
  //     Payment  → all rows are Dr  (the expense/party being paid to)
  //     Contra   → all rows are Dr  (destination side, e.g. cash-in-hand)

  const [accountLedger, setAccountLedger] = useState<LedgerType | null>(
    () => loadFormState<any>(persistKey ?? "")?.accountLedger ?? null
  );
  const [accountBalance, setAccountBalance] = useState<string>("");

  const [particulars, setParticulars] = useState<ParticularRow[]>(() => {
    const saved = loadFormState<any>(persistKey ?? "");
    return saved?.particulars?.length ? saved.particulars : [makeParticularRow("Cr")];
  });

  // ── Layout 1b: Double-entry Contra (F4 double-entry mode) ────────────────

  const [contraEntryMode, setContraEntryMode] = useState<"single" | "double">(
    () => loadFormState<any>(persistKey ?? "")?.contraEntryMode ?? "double"
  );

  const [contraDoubleRows, setContraDoubleRows] = useState<ParticularRow[]>(() => {
    const saved = loadFormState<any>(persistKey ?? "");
    return saved?.contraDoubleRows?.length
      ? saved.contraDoubleRows
      : [makeParticularRow("Cr"), makeParticularRow("Dr")];
  });

  // ── Layout 1c: Double-entry Receipt (F6 double-entry mode) ───────────────

  const [receiptEntryMode, setReceiptEntryMode] = useState<"single" | "double">(
    () => loadFormState<any>(persistKey ?? "")?.receiptEntryMode ?? "double"
  );

  const [receiptDoubleRows, setReceiptDoubleRows] = useState<ParticularRow[]>(() => {
    const saved = loadFormState<any>(persistKey ?? "");
    return saved?.receiptDoubleRows?.length
      ? saved.receiptDoubleRows
      : [makeParticularRow("Cr"), makeParticularRow("Dr")];
  });

  // ── Layout 1d: Double-entry Payment (F5 double-entry mode) ────────────────
  //
  //   Cr rows: ONLY Cash-in-Hand, Bank Accounts, Bank OD / OCC
  //   Dr rows: ALL ledgers EXCEPT Cash/Bank groups
  //
  //   Single-entry: Account field (= Cr, cash/bank) + Particulars rows (= Dr, non-cash/bank).

  const [paymentEntryMode, setPaymentEntryMode] = useState<"single" | "double">(
    () => loadFormState<any>(persistKey ?? "")?.paymentEntryMode ?? "double"
  );

  const [paymentDoubleRows, setPaymentDoubleRows] = useState<ParticularRow[]>(() => {
    const saved = loadFormState<any>(persistKey ?? "");
    return saved?.paymentDoubleRows?.length
      ? saved.paymentDoubleRows
      : [makeParticularRow("Cr"), makeParticularRow("Dr")];
  });

  // ── Layout 2: Journal (F7) ────────────────────────────────────────────────
  //
  //   Double-entry (default): Dr/Cr selector on each row, like Contra/Receipt
  //     double-entry. Both Dr and Cr fields allow all ledgers EXCEPT
  //     Cash-in-Hand, Bank Accounts, Bank OD / OCC.
  //
  //   Single-entry: Account field (one side) + Particulars table (opposite side).
  //     Like Contra single-entry but with non-cash/bank ledgers.
  //     Account defaults to Cr (credit side), Particulars default to Dr.

  const [journalEntryMode, setJournalEntryMode] = useState<"single" | "double">(
    () => loadFormState<any>(persistKey ?? "")?.journalEntryMode ?? "double"
  );

  const [journalRows, setJournalRows] = useState<ParticularRow[]>(() => {
    const saved = loadFormState<any>(persistKey ?? "");
    return saved?.journalRows?.length
      ? saved.journalRows
      : [makeParticularRow("Dr"), makeParticularRow("Cr")];
  });

  // ── Layout 3: Inventory invoice (Sales F8 · Purchase F9) ──────────────────
  //
  //   Sales:    Party Dr (total)  ·  Sales Cr (subtotal)  ·  Tax Cr (each tax)
  //   Purchase: Party Cr (total)  ·  Purchase Dr (subtotal)  ·  Tax Dr (each tax)

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

  // additionalEntries = tax ledgers, discounts, freight, etc.
  // Sales default: Cr  (tax collected is a liability/output)
  // Purchase default: Dr  (tax paid is an asset/input credit)
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
      journalEntryMode,
      contraEntryMode,
      contraDoubleRows,
      receiptEntryMode,
      receiptDoubleRows,
      paymentEntryMode,
      paymentDoubleRows,
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
      journalEntryMode, contraEntryMode, contraDoubleRows, receiptEntryMode, receiptDoubleRows,
      paymentEntryMode, paymentDoubleRows,
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
        if (res.success && res.rawBalance != null) return String(res.rawBalance);
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

  // Reset when voucher type changes (via stable ref to avoid circular deps)
  const resetFormRef = useRef<() => void>(() => {});
  const prevVoucherType = useRef(voucherType);
  useEffect(() => {
    if (prevVoucherType.current !== voucherType) {
      prevVoucherType.current = voucherType;
      resetFormRef.current?.();
    }
  }, [voucherType]);

  // Balance sync helpers
  useEffect(() => {
    if (accountLedger?.ledger_id) {
      fetchLedgerBalance(accountLedger.ledger_id).then(setAccountBalance);
    } else {
      setAccountBalance("");
    }
  }, [accountLedger, fetchLedgerBalance]);

  useEffect(() => {
    if (partyLedger?.ledger_id) {
      fetchLedgerBalance(partyLedger.ledger_id).then(setPartyBalance);
    } else {
      setPartyBalance("");
    }
  }, [partyLedger, fetchLedgerBalance]);

  useEffect(() => {
    if (salesPurchaseLedger?.ledger_id) {
      fetchLedgerBalance(salesPurchaseLedger.ledger_id).then(setSalesPurchaseBalance);
    } else {
      setSalesPurchaseBalance("");
    }
  }, [salesPurchaseLedger, fetchLedgerBalance]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Group / cash-bank helpers
  // ─────────────────────────────────────────────────────────────────────────────

  /** Walk the group hierarchy to check if a ledger belongs to any of the named groups. */
  const checkLedgerGroup = useCallback(
    (ledger: LedgerType | null, targetGroupNames: string[]): boolean => {
      if (!ledger) return false;
      const ledgerGroupId = ledger.group_id;
      if (!ledgerGroupId) return false;
      if (allGroups.length === 0) return false;

      const targets = targetGroupNames.map((n) => n.toLowerCase().trim());

      const findGroup = (id: number | null | undefined): GroupType | undefined => {
        if (!id) return undefined;
        return allGroups.find((g) => Number(g.group_id) === Number(id));
      };

      const check = (grp: GroupType): boolean => {
        if (!grp.name) return false;
        if (targets.includes(grp.name.toLowerCase().trim())) return true;
        if (grp.parent_group_id) {
          const parent = findGroup(grp.parent_group_id);
          if (parent) return check(parent);
        }
        return false;
      };

      const group = findGroup(ledgerGroupId);
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
        "bank occ a/c",
        "cash-in-hand",
      ]),
    [checkLedgerGroup]
  );

  const checkIsCash = useCallback(
    (ledger: LedgerType | null): boolean =>
      checkLedgerGroup(ledger, ["cash-in-hand"]),
    [checkLedgerGroup]
  );

  const checkIsBank = useCallback(
    (ledger: LedgerType | null): boolean =>
      checkLedgerGroup(ledger, [
        "bank accounts",
        "bank od accounts",
        "bank od a/c",
        "bank od account",
        "bank occ a/c",
      ]),
    [checkLedgerGroup]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Particulars Dr/Cr derivation (single-entry layouts)
  //
  // In single-entry mode:
  //   Receipt  → Particulars are ALWAYS Cr  (income / party side)
  //   Payment  → Particulars are ALWAYS Dr  (expense / party side)
  //   Contra   → Particulars are ALWAYS Dr  (destination cash/bank)
  //
  // The Account field carries the opposite type automatically (see submit logic).
  // We do NOT check cash/bank group here — that was the old bug. The group check
  // is only needed to filter which ledgers appear in the Account field selector.
  // ─────────────────────────────────────────────────────────────────────────────

  const deriveParticularType = useCallback(
    (currentType: "Dr" | "Cr"): "Dr" | "Cr" => {
      if (voucherType === "Receipt") return "Cr";
      if (voucherType === "Payment") return "Dr";
      if (voucherType === "Contra") return "Dr"; // destination side
      if (voucherType === "Journal" && journalEntryMode === "single") return "Dr"; // debit side
      return currentType; // Journal double / Sales / Purchase — keep as-is
    },
    [voucherType, journalEntryMode]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Computed totals
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * debitTotal / creditTotal
   *
   * For Journal: sum Dr rows / sum Cr rows from journalRows.
   * For Receipt/Payment/Contra: the Particulars rows are ALL one side (Cr for Receipt,
   *   Dr for Payment/Contra). The Account field supplies the opposite side. So:
   *     debitTotal  = Account amount  (for Receipt)  OR  particulars sum  (for Payment/Contra)
   *     creditTotal = particulars sum (for Receipt)  OR  Account amount   (for Payment/Contra)
   *   But for the "balanced" indicator we just need the two sides to match.
   *   We compute particularsTotal separately and compare to accountAmount.
   */

  /** Sum of all amounts in the Particulars rows (single-entry layouts). */
  const particularsTotal = useMemo(
    () => particulars.reduce((s, p) => s + (Number(p.amountRaw) || 0), 0),
    [particulars]
  );

  /** Sum of all Dr amounts in journalRows or contraDoubleRows or receiptDoubleRows. */
  const debitTotal = useMemo(() => {
    if (voucherType === "Journal" && journalEntryMode === "double") {
      return journalRows.reduce(
        (sum, r) => sum + (r.type === "Dr" ? Number(r.amountRaw) || 0 : 0),
        0
      );
    }
    if (voucherType === "Contra" && contraEntryMode === "double") {
      return contraDoubleRows.reduce(
        (sum, r) => sum + (r.type === "Dr" ? Number(r.amountRaw) || 0 : 0),
        0
      );
    }
    if (voucherType === "Receipt" && receiptEntryMode === "double") {
      return receiptDoubleRows.reduce(
        (sum, r) => sum + (r.type === "Dr" ? Number(r.amountRaw) || 0 : 0),
        0
      );
    }
    if (voucherType === "Payment" && paymentEntryMode === "double") {
      return paymentDoubleRows.reduce(
        (sum, r) => sum + (r.type === "Dr" ? Number(r.amountRaw) || 0 : 0),
        0
      );
    }
    // Receipt/Payment single-entry: Account is Dr; Contra single-entry: particulars are Dr
    return particularsTotal;
  }, [voucherType, journalRows, journalEntryMode, contraDoubleRows, contraEntryMode, receiptDoubleRows, receiptEntryMode, paymentDoubleRows, paymentEntryMode, particularsTotal]);

  /** Sum of all Cr amounts in journalRows or contraDoubleRows or receiptDoubleRows. */
  const creditTotal = useMemo(() => {
    if (voucherType === "Journal" && journalEntryMode === "double") {
      return journalRows.reduce(
        (sum, r) => sum + (r.type === "Cr" ? Number(r.amountRaw) || 0 : 0),
        0
      );
    }
    if (voucherType === "Contra" && contraEntryMode === "double") {
      return contraDoubleRows.reduce(
        (sum, r) => sum + (r.type === "Cr" ? Number(r.amountRaw) || 0 : 0),
        0
      );
    }
    if (voucherType === "Receipt" && receiptEntryMode === "double") {
      return receiptDoubleRows.reduce(
        (sum, r) => sum + (r.type === "Cr" ? Number(r.amountRaw) || 0 : 0),
        0
      );
    }
    if (voucherType === "Payment" && paymentEntryMode === "double") {
      return paymentDoubleRows.reduce(
        (sum, r) => sum + (r.type === "Cr" ? Number(r.amountRaw) || 0 : 0),
        0
      );
    }
    // Mirror of debitTotal for single-entry
    return particularsTotal;
  }, [voucherType, journalRows, journalEntryMode, contraDoubleRows, contraEntryMode, receiptDoubleRows, receiptEntryMode, paymentDoubleRows, paymentEntryMode, particularsTotal]);

  /**
   * totalAmount — the grand total shown in the voucher footer and used for
   * the Account field amount and the party ledger entry in Sales/Purchase.
   *
   * Receipt / Payment / Contra:
   *   = sum of Particulars rows  (Account leg always equals this when balanced)
   *
   * Journal:
   *   = debitTotal  (Dr side; equals creditTotal when balanced)
   *
   * Sales / Purchase:
   *   stockSubtotal + adjustments
   *   Sales:    Cr entries (taxes) add to party receivable; Dr entries (discounts) reduce it
   *   Purchase: Dr entries (taxes/charges) add to party payable; Cr entries (discounts) reduce it
   */
  const totalAmount = useMemo(() => {
    if (voucherType === "Receipt") {
      if (receiptEntryMode === "double") {
        return debitTotal;
      }
      return particularsTotal;
    }

    if (voucherType === "Payment") {
      if (paymentEntryMode === "double") {
        return debitTotal;
      }
      return particularsTotal;
    }

    if (voucherType === "Contra") {
      if (contraEntryMode === "double") {
        return debitTotal; // same as creditTotal when balanced
      }
      return particularsTotal;
    }

    if (voucherType === "Journal") {
      if (journalEntryMode === "single") {
        return particularsTotal;
      }
      return debitTotal;
    }

    if (voucherType === "Sales" || voucherType === "Purchase") {
      const stockSum = stockEntries.reduce((s, r) => s + (Number(r.amountRaw) || 0), 0);
      const adjSum = additionalEntries.reduce((s, r) => {
        const amt = Number(r.amountRaw) || 0;
        if (voucherType === "Sales") return r.type === "Cr" ? s + amt : s - amt;
        return r.type === "Dr" ? s + amt : s - amt;
      }, 0);
      return Math.max(0, stockSum + adjSum);
    }

    return 0;
  }, [voucherType, particularsTotal, debitTotal, contraEntryMode, receiptEntryMode, journalEntryMode, paymentEntryMode, stockEntries, additionalEntries]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Particular row handlers (single-entry layouts)
  // ─────────────────────────────────────────────────────────────────────────────

  const handleAddParticularRow = useCallback(() => {
    setParticulars((prev) => [
      ...prev,
      makeParticularRow(
        // New rows always get the correct side for the active voucher type
        voucherType === "Receipt" ? "Cr"
        : voucherType === "Payment" ? "Dr"
        : "Dr" // Contra
      ),
    ]);
  }, [voucherType]);

  const handleUpdateParticularRow = useCallback(
    async (id: string, updates: Partial<Omit<ParticularRow, "id">>) => {
      setParticulars((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          const next = { ...p, ...updates };
          // When a ledger is selected, enforce the correct Dr/Cr for this voucher type
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Journal row handlers
  // ─────────────────────────────────────────────────────────────────────────────

  const handleAddJournalRow = useCallback(() => {
    setJournalRows((prev) => {
      const drSum = prev.reduce((s, r) => s + (r.type === "Dr" ? Number(r.amountRaw) || 0 : 0), 0);
      const crSum = prev.reduce((s, r) => s + (r.type === "Cr" ? Number(r.amountRaw) || 0 : 0), 0);
      const diff = drSum - crSum;
      const nextType: "Dr" | "Cr" =
        diff < -0.01 ? "Dr" : diff > 0.01 ? "Cr" : (prev[prev.length - 1]?.type === "Dr" ? "Cr" : "Dr");
      return [...prev, makeParticularRow(nextType)];
    });
  }, []);

  const handleUpdateJournalRow = useCallback(
    async (id: string, updates: Partial<Omit<ParticularRow, "id">>) => {
      setJournalRows((prev) => {
        const nextRows = prev.map((r) => (r.id !== id ? r : {
          ...r,
          ...updates,
          ...(updates.ledger !== undefined ? { ledgerBalance: "" } : {}),
        }));

        if (updates.ledger?.ledger_id) {
          const updatedRow = nextRows.find((r) => r.id === id);
          if (updatedRow && (!updatedRow.amountRaw || Number(updatedRow.amountRaw) === 0)) {
            const drTotal = nextRows.reduce((s, r) => s + (r.type === "Dr" ? Number(r.amountRaw) || 0 : 0), 0);
            const crTotal = nextRows.reduce((s, r) => s + (r.type === "Cr" ? Number(r.amountRaw) || 0 : 0), 0);
            const deficit = updatedRow.type === "Dr" ? crTotal - drTotal : drTotal - crTotal;
            if (Math.abs(deficit) > 0.01) {
              return nextRows.map((r) =>
                r.id === id ? { ...r, amountRaw: Math.abs(deficit).toFixed(2) } : r
              );
            }
          }
        }
        return nextRows;
      });
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
  // Contra double-entry row handlers
  // ─────────────────────────────────────────────────────────────────────────────

  const handleAddContraDoubleRow = useCallback(() => {
    setContraDoubleRows((prev) => {
      const drSum = prev.reduce((s, r) => s + (r.type === "Dr" ? Number(r.amountRaw) || 0 : 0), 0);
      const crSum = prev.reduce((s, r) => s + (r.type === "Cr" ? Number(r.amountRaw) || 0 : 0), 0);
      const diff = drSum - crSum;
      const nextType: "Dr" | "Cr" =
        diff < -0.01 ? "Dr" : diff > 0.01 ? "Cr" : (prev[prev.length - 1]?.type === "Dr" ? "Cr" : "Dr");
      return [...prev, makeParticularRow(nextType)];
    });
  }, []);

  const handleUpdateContraDoubleRow = useCallback(
    async (id: string, updates: Partial<Omit<ParticularRow, "id">>) => {
      setContraDoubleRows((prev) => {
        const nextRows = prev.map((r) => (r.id !== id ? r : {
          ...r,
          ...updates,
          // Clear old balance when ledger changes
          ...(updates.ledger !== undefined ? { ledgerBalance: "" } : {}),
        }));

        // Autofill amount when ledger is selected and no amount set yet
        if (updates.ledger?.ledger_id) {
          const updatedRow = nextRows.find((r) => r.id === id);
          if (updatedRow && (!updatedRow.amountRaw || Number(updatedRow.amountRaw) === 0)) {
            const drTotal = nextRows.reduce((s, r) => s + (r.type === "Dr" ? Number(r.amountRaw) || 0 : 0), 0);
            const crTotal = nextRows.reduce((s, r) => s + (r.type === "Cr" ? Number(r.amountRaw) || 0 : 0), 0);
            const deficit = updatedRow.type === "Dr" ? crTotal - drTotal : drTotal - crTotal;
            if (Math.abs(deficit) > 0.01) {
              return nextRows.map((r) =>
                r.id === id ? { ...r, amountRaw: Math.abs(deficit).toFixed(2) } : r
              );
            }
          }
        }
        return nextRows;
      });
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
    setContraDoubleRows((prev) => (prev.length > 2 ? prev.filter((r) => r.id !== id) : prev));
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Receipt double-entry row handlers
  // ─────────────────────────────────────────────────────────────────────────────

  const handleAddReceiptDoubleRow = useCallback(() => {
    setReceiptDoubleRows((prev) => {
      const drSum = prev.reduce((s, r) => s + (r.type === "Dr" ? Number(r.amountRaw) || 0 : 0), 0);
      const crSum = prev.reduce((s, r) => s + (r.type === "Cr" ? Number(r.amountRaw) || 0 : 0), 0);
      const diff = drSum - crSum;
      const nextType: "Dr" | "Cr" =
        diff < -0.01 ? "Dr" : diff > 0.01 ? "Cr" : (prev[prev.length - 1]?.type === "Dr" ? "Cr" : "Dr");
      return [...prev, makeParticularRow(nextType)];
    });
  }, []);

  const handleUpdateReceiptDoubleRow = useCallback(
    async (id: string, updates: Partial<Omit<ParticularRow, "id">>) => {
      setReceiptDoubleRows((prev) => {
        const nextRows = prev.map((r) => (r.id !== id ? r : {
          ...r,
          ...updates,
          // Clear old balance when ledger changes
          ...(updates.ledger !== undefined ? { ledgerBalance: "" } : {}),
        }));

        // Autofill amount when ledger is selected and no amount set yet
        if (updates.ledger?.ledger_id) {
          const updatedRow = nextRows.find((r) => r.id === id);
          if (updatedRow && (!updatedRow.amountRaw || Number(updatedRow.amountRaw) === 0)) {
            const drTotal = nextRows.reduce((s, r) => s + (r.type === "Dr" ? Number(r.amountRaw) || 0 : 0), 0);
            const crTotal = nextRows.reduce((s, r) => s + (r.type === "Cr" ? Number(r.amountRaw) || 0 : 0), 0);
            const deficit = updatedRow.type === "Dr" ? crTotal - drTotal : drTotal - crTotal;
            if (Math.abs(deficit) > 0.01) {
              return nextRows.map((r) =>
                r.id === id ? { ...r, amountRaw: Math.abs(deficit).toFixed(2) } : r
              );
            }
          }
        }
        return nextRows;
      });
      if (updates.ledger?.ledger_id) {
        const bal = await fetchLedgerBalance(updates.ledger.ledger_id);
        setReceiptDoubleRows((prev) =>
          prev.map((r) => (r.id !== id ? r : { ...r, ledgerBalance: bal }))
        );
      }
    },
    [fetchLedgerBalance]
  );

  const handleRemoveReceiptDoubleRow = useCallback((id: string) => {
    setReceiptDoubleRows((prev) => (prev.length > 2 ? prev.filter((r) => r.id !== id) : prev));
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Payment double-entry row handlers
  // ─────────────────────────────────────────────────────────────────────────────

  const handleAddPaymentDoubleRow = useCallback(() => {
    setPaymentDoubleRows((prev) => {
      const drSum = prev.reduce((s, r) => s + (r.type === "Dr" ? Number(r.amountRaw) || 0 : 0), 0);
      const crSum = prev.reduce((s, r) => s + (r.type === "Cr" ? Number(r.amountRaw) || 0 : 0), 0);
      const diff = drSum - crSum;
      const nextType: "Dr" | "Cr" =
        diff < -0.01 ? "Dr" : diff > 0.01 ? "Cr" : (prev[prev.length - 1]?.type === "Dr" ? "Cr" : "Dr");
      return [...prev, makeParticularRow(nextType)];
    });
  }, []);

  const handleUpdatePaymentDoubleRow = useCallback(
    async (id: string, updates: Partial<Omit<ParticularRow, "id">>) => {
      setPaymentDoubleRows((prev) => {
        const nextRows = prev.map((r) => (r.id !== id ? r : {
          ...r,
          ...updates,
          ...(updates.ledger !== undefined ? { ledgerBalance: "" } : {}),
        }));

        if (updates.ledger?.ledger_id) {
          const updatedRow = nextRows.find((r) => r.id === id);
          if (updatedRow && (!updatedRow.amountRaw || Number(updatedRow.amountRaw) === 0)) {
            const drTotal = nextRows.reduce((s, r) => s + (r.type === "Dr" ? Number(r.amountRaw) || 0 : 0), 0);
            const crTotal = nextRows.reduce((s, r) => s + (r.type === "Cr" ? Number(r.amountRaw) || 0 : 0), 0);
            const deficit = updatedRow.type === "Dr" ? crTotal - drTotal : drTotal - crTotal;
            if (Math.abs(deficit) > 0.01) {
              return nextRows.map((r) =>
                r.id === id ? { ...r, amountRaw: Math.abs(deficit).toFixed(2) } : r
              );
            }
          }
        }
        return nextRows;
      });
      if (updates.ledger?.ledger_id) {
        const bal = await fetchLedgerBalance(updates.ledger.ledger_id);
        setPaymentDoubleRows((prev) =>
          prev.map((r) => (r.id !== id ? r : { ...r, ledgerBalance: bal }))
        );
      }
    },
    [fetchLedgerBalance]
  );

  const handleRemovePaymentDoubleRow = useCallback((id: string) => {
    setPaymentDoubleRows((prev) => (prev.length > 2 ? prev.filter((r) => r.id !== id) : prev));
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Stock entry handlers
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
          // Auto-compute amount whenever quantity or rate changes
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
  //
  //   Sales default    → Cr  (tax collected = output liability, adds to party receivable)
  //   Purchase default → Dr  (tax paid = input credit asset, adds to party payable)
  //
  //   User can flip to the opposite type to record discounts / contra-adjustments.
  // ─────────────────────────────────────────────────────────────────────────────

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

  // ─────────────────────────────────────────────────────────────────────────────
  // Active field / search panel
  // ─────────────────────────────────────────────────────────────────────────────

  const handleFieldFocus = useCallback(
    (field: ActiveField) => {
      setActiveField(field);
      setLedgerSearchTerm("");
      setStockSearchTerm("");
    },
    []
  );

  const handleFieldBlur = useCallback(() => {
    setActiveField(null);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Universal selection handler
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
          } else if (voucherType === "Contra" && contraEntryMode === "double") {
            handleUpdateContraDoubleRow(activeField.rowId, { ledger });
          } else if (voucherType === "Receipt" && receiptEntryMode === "double") {
            handleUpdateReceiptDoubleRow(activeField.rowId, { ledger });
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

      setActiveField(null);
      setLedgerSearchTerm("");
      setStockSearchTerm("");
    },
    [
      activeField, voucherType, contraEntryMode, receiptEntryMode, allUnits,
      handleUpdateParticularRow, handleUpdateJournalRow,
      handleUpdateContraDoubleRow, handleUpdateReceiptDoubleRow,
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

    // Default first row type to the correct Cr/Dr for the current voucher type
    const defaultParticular: "Dr" | "Cr" =
      voucherType === "Receipt" ? "Cr"
      : voucherType === "Payment" ? "Dr"
      : "Dr"; // Contra
    setParticulars([makeParticularRow(defaultParticular)]);
    setJournalRows([makeParticularRow("Dr"), makeParticularRow("Cr")]);
    setContraDoubleRows([makeParticularRow("Cr"), makeParticularRow("Dr")]);
    setReceiptDoubleRows([makeParticularRow("Cr"), makeParticularRow("Dr")]);
    setPaymentDoubleRows([makeParticularRow("Cr"), makeParticularRow("Dr")]);
    setStockEntries([makeStockRow()]);
    setAdditionalEntries([]);

    setActiveAllocation(null);
    setPartyBillReferences([]);
    setBankDetails(null);
    setCashDenominations(null);

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
    setContraEntryMode("double");
    setReceiptEntryMode("double");
    setJournalEntryMode("double");
    setPaymentEntryMode("double");
    setDate(todayStr());

    fetchNextNumber();
  }, [persistKey, voucherType, fetchNextNumber]);

  useEffect(() => {
    resetFormRef.current = resetForm;
  }, [resetForm]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Validation
  // ─────────────────────────────────────────────────────────────────────────────

  const validate = useCallback((): string | null => {
    if (!companyId) return "No company selected.";
    if (!fyId) return "No active financial year.";

    if (voucherType === "Receipt") {
      if (receiptEntryMode === "single") {
        if (!accountLedger) return "Account (cash/bank ledger) is required.";
        const filled = particulars.filter((p) => p.ledger && Number(p.amountRaw) >= 0);
        if (filled.length < 1)
          return "At least one Particulars entry with an amount is required.";
      } else {
        const filled = receiptDoubleRows.filter((r) => r.ledger && Number(r.amountRaw) >= 0);
        if (filled.length < 2)
          return "At least two valid entries are required.";
        if (Math.abs(debitTotal - creditTotal) > 0.01)
          return `Debit (${debitTotal.toFixed(2)}) and Credit (${creditTotal.toFixed(
            2
          )}) totals must balance.`;
      }
    }

    if (voucherType === "Payment") {
      if (paymentEntryMode === "single") {
        if (!accountLedger) return "Account (cash/bank ledger) is required.";
        const filled = particulars.filter((p) => p.ledger && Number(p.amountRaw) > 0);
        if (filled.length < 1)
          return "At least one Particulars entry with an amount is required.";
        if (particularsTotal <= 0) return "Total amount must be greater than zero.";
      } else {
        const filled = paymentDoubleRows.filter((r) => r.ledger && Number(r.amountRaw) > 0);
        if (filled.length < 2)
          return "At least two valid entries are required.";
        for (const row of filled) {
          if (row.type === "Cr" && !checkIsCashOrBank(row.ledger))
            return "Payment Credit entries must be Cash or Bank ledgers.";
        }
        if (Math.abs(debitTotal - creditTotal) > 0.01)
          return `Debit (${debitTotal.toFixed(2)}) and Credit (${creditTotal.toFixed(
            2
          )}) totals must balance.`;
        if (debitTotal <= 0) return "Amount must be greater than zero.";
      }
    }

    if (voucherType === "Contra") {
      if (contraEntryMode === "single") {
        if (!accountLedger) return "Account (cash/bank ledger) is required.";
        if (!checkIsCashOrBank(accountLedger)) {
          return "Contra Account must be a Cash or Bank ledger.";
        }
        const filled = particulars.filter((p) => p.ledger && Number(p.amountRaw) >= 0);
        if (filled.length < 1)
          return "At least one Particulars entry with an amount is required.";
        for (const row of filled) {
          if (!checkIsCashOrBank(row.ledger))
            return "Contra vouchers may only use Cash/Bank ledgers on both sides.";
        }
      } else {
        const filled = contraDoubleRows.filter((r) => r.ledger && Number(r.amountRaw) >= 0);
        if (filled.length < 2)
          return "At least two valid entries are required.";
        for (const row of filled) {
          if (!checkIsCashOrBank(row.ledger))
            return "Contra vouchers may only use Cash/Bank ledgers.";
        }
        if (Math.abs(debitTotal - creditTotal) > 0.01)
          return `Debit (${debitTotal.toFixed(2)}) and Credit (${creditTotal.toFixed(
            2
          )}) totals must balance.`;
      }
    }

    if (voucherType === "Journal") {
      if (journalEntryMode === "single") {
        if (!accountLedger) return "Account ledger is required.";
        const filled = particulars.filter((p) => p.ledger && Number(p.amountRaw) > 0);
        if (filled.length < 1)
          return "At least one Particulars entry with an amount is required.";
        if (particularsTotal <= 0) return "Total amount must be greater than zero.";
      } else {
        const filled = journalRows.filter((r) => r.ledger && Number(r.amountRaw) > 0);
        if (filled.length < 2) return "At least two valid Journal entries are required.";
        for (const row of filled) {
          if (checkIsCashOrBank(row.ledger))
            return "Journal vouchers cannot use Cash or Bank ledgers.";
        }
        if (Math.abs(debitTotal - creditTotal) > 0.01)
          return `Debit (${debitTotal.toFixed(2)}) and Credit (${creditTotal.toFixed(
            2
          )}) totals must balance.`;
        if (debitTotal <= 0) return "Journal amount must be greater than zero.";
      }
    }

    if (["Sales", "Purchase"].includes(voucherType)) {
      if (!partyLedger) return "Party A/c Name is required.";
      if (!salesPurchaseLedger) return `${voucherType} Ledger is required.`;
      if (partyLedger.ledger_id === salesPurchaseLedger.ledger_id)
        return `Party and ${voucherType} ledger cannot be the same account.`;

      const filledItems = stockEntries.filter(
        (r) => r.stockItem && Number(r.quantityRaw) > 0 && Number(r.rateRaw) > 0
      );
      if (filledItems.length === 0)
        return "At least one Stock Item with quantity and rate is required.";
      if (totalAmount <= 0) return "Total amount must be greater than zero.";
    }

    return null;
  }, [
    companyId, fyId, voucherType, contraEntryMode, receiptEntryMode, journalEntryMode, paymentEntryMode,
    accountLedger, particulars, particularsTotal,
    contraDoubleRows, receiptDoubleRows, paymentDoubleRows, journalRows, debitTotal, creditTotal,
    stockEntries, partyLedger, salesPurchaseLedger, totalAmount,
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

      // ── Build accounting entries ─────────────────────────────────────────────

      if (voucherType === "Receipt") {
        if (receiptEntryMode === "single") {
          const accountType: "Dr" | "Cr" = "Dr";

          entries.push({
            ledger_id: accountLedger!.ledger_id,
            ledger_name: accountLedger!.name,
            type: accountType,
            amount: particularsTotal,
          });

          const filled = particulars.filter((p) => p.ledger && Number(p.amountRaw) > 0);
          entries.push(
            ...filled.map((p) => ({
              ledger_id: p.ledger!.ledger_id,
              ledger_name: p.ledger!.name,
              type: p.type,
              amount: Number(p.amountRaw),
              currency: "INR",
              cost_centres: p.costCentres,
            }))
          );
        } else {
          const filled = receiptDoubleRows.filter((r) => r.ledger && Number(r.amountRaw) > 0);
          entries = filled.map((r) => ({
            ledger_id: r.ledger!.ledger_id,
            ledger_name: r.ledger!.name,
            type: r.type,
            amount: Number(r.amountRaw),
            currency: "INR",
            cost_centres: r.costCentres,
          }));
        }

      } else if (voucherType === "Payment") {
        if (paymentEntryMode === "single") {
          const accountType: "Dr" | "Cr" = "Cr";

          entries.push({
            ledger_id: accountLedger!.ledger_id,
            ledger_name: accountLedger!.name,
            type: accountType,
            amount: particularsTotal,
          });

          const filled = particulars.filter((p) => p.ledger && Number(p.amountRaw) > 0);
          entries.push(
            ...filled.map((p) => ({
              ledger_id: p.ledger!.ledger_id,
              ledger_name: p.ledger!.name,
              type: p.type,
              amount: Number(p.amountRaw),
              currency: "INR",
              cost_centres: p.costCentres,
            }))
          );
        } else {
          const filled = paymentDoubleRows.filter((r) => r.ledger && Number(r.amountRaw) > 0);
          entries = filled.map((r) => ({
            ledger_id: r.ledger!.ledger_id,
            ledger_name: r.ledger!.name,
            type: r.type,
            amount: Number(r.amountRaw),
            currency: "INR",
            cost_centres: r.costCentres,
          }));
        }

      } else if (voucherType === "Contra") {
        if (contraEntryMode === "single") {
          const accountType: "Dr" | "Cr" = "Cr";

          entries.push({
            ledger_id: accountLedger!.ledger_id,
            ledger_name: accountLedger!.name,
            type: accountType,
            amount: particularsTotal,
          });

          const filled = particulars.filter((p) => p.ledger && Number(p.amountRaw) > 0);
          entries.push(
            ...filled.map((p) => ({
              ledger_id: p.ledger!.ledger_id,
              ledger_name: p.ledger!.name,
              type: p.type,
              amount: Number(p.amountRaw),
              currency: "INR",
              cost_centres: p.costCentres,
            }))
          );
        } else {
          // Double-entry Contra: entries directly from rows (like Journal)
          const filled = contraDoubleRows.filter((r) => r.ledger && Number(r.amountRaw) > 0);
          entries = filled.map((r) => ({
            ledger_id: r.ledger!.ledger_id,
            ledger_name: r.ledger!.name,
            type: r.type,
            amount: Number(r.amountRaw),
            currency: "INR",
            cost_centres: r.costCentres,
          }));
        }

      } else if (voucherType === "Journal") {
        if (journalEntryMode === "single") {
          const accountType: "Dr" | "Cr" = "Cr";

          entries.push({
            ledger_id: accountLedger!.ledger_id,
            ledger_name: accountLedger!.name,
            type: accountType,
            amount: particularsTotal,
          });

          const filled = particulars.filter((p) => p.ledger && Number(p.amountRaw) > 0);
          entries.push(
            ...filled.map((p) => ({
              ledger_id: p.ledger!.ledger_id,
              ledger_name: p.ledger!.name,
              type: p.type,
              amount: Number(p.amountRaw),
              currency: "INR",
              cost_centres: p.costCentres,
            }))
          );
        } else {
          const filled = journalRows.filter((r) => r.ledger && Number(r.amountRaw) > 0);
          entries = filled.map((r) => ({
            ledger_id: r.ledger!.ledger_id,
            ledger_name: r.ledger!.name,
            type: r.type,
            amount: Number(r.amountRaw),
            currency: "INR",
            cost_centres: r.costCentres,
          }));
        }

      } else if (["Sales", "Purchase"].includes(voucherType)) {
        //
        // Sales:
        //   Party A/c     → Dr  (total: stock + taxes − discounts)
        //   Sales ledger  → Cr  (stock subtotal only)
        //   Tax ledgers   → Cr  (each tax amount, default for additional Cr rows)
        //   Discount etc. → Dr  (each Dr additional row)
        //
        // Purchase:
        //   Purchase ledger → Dr  (stock subtotal only)
        //   Tax ledgers     → Dr  (each tax amount, default for additional Dr rows)
        //   Discount etc.   → Cr  (each Cr additional row)
        //   Party A/c       → Cr  (total: stock + taxes − discounts)
        //

        const filledItems = stockEntries.filter(
          (r) => r.stockItem && Number(r.quantityRaw) > 0 && Number(r.rateRaw) > 0
        );
        const stockSubtotal = filledItems.reduce(
          (s, r) => s + (Number(r.amountRaw) || 0),
          0
        );

        stock_entries = filledItems.map((r) => ({
          stock_item_id: r.stockItem!.item_id ?? null,
          item_name: r.stockItem!.name,
          godown_id: r.godown?.godown_id ?? null,
          unit_id: r.unit?.unit_id ?? null,
          quantity: Number(r.quantityRaw),
          rate: Number(r.rateRaw),
          amount: Number(r.amountRaw),
        }));

        const partyType: "Dr" | "Cr" = voucherType === "Sales" ? "Dr" : "Cr";
        const spType: "Dr" | "Cr" = voucherType === "Sales" ? "Cr" : "Dr";

        entries = [
          // Party: receives the grand total (Dr for Sales, Cr for Purchase)
          {
            ledger_id: partyLedger!.ledger_id,
            ledger_name: partyLedger!.name,
            type: partyType,
            amount: totalAmount,
            currency: "INR",
          },
          // Sales/Purchase ledger: stock value only
          {
            ledger_id: salesPurchaseLedger!.ledger_id,
            ledger_name: salesPurchaseLedger!.name,
            type: spType,
            amount: stockSubtotal,
            currency: "INR",
          },
          // Tax / adjustment ledgers (each keeps its own Dr/Cr as set by user)
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

      // ── Collect bill references ──────────────────────────────────────────────

      let finalBillReferences: any[] = [];

      if (voucherType === "Receipt") {
        if (receiptEntryMode === "single") {
          finalBillReferences = particulars
            .filter((p) => p.ledger && p.billReferences?.length)
            .flatMap((p) =>
              p.billReferences!.map((b) => ({ ...b, ledger_id: p.ledger!.ledger_id }))
            );
        } else {
          finalBillReferences = receiptDoubleRows
            .filter((r) => r.ledger && r.billReferences?.length)
            .flatMap((r) =>
              r.billReferences!.map((b) => ({ ...b, ledger_id: r.ledger!.ledger_id }))
            );
        }
      } else if (voucherType === "Payment") {
        if (paymentEntryMode === "single") {
          finalBillReferences = particulars
            .filter((p) => p.ledger && p.billReferences?.length)
            .flatMap((p) =>
              p.billReferences!.map((b) => ({ ...b, ledger_id: p.ledger!.ledger_id }))
            );
        } else {
          finalBillReferences = paymentDoubleRows
            .filter((r) => r.ledger && r.billReferences?.length)
            .flatMap((r) =>
              r.billReferences!.map((b) => ({ ...b, ledger_id: r.ledger!.ledger_id }))
            );
        }
      } else if (voucherType === "Contra") {
        if (contraEntryMode === "single") {
          finalBillReferences = particulars
            .filter((p) => p.ledger && p.billReferences?.length)
            .flatMap((p) =>
              p.billReferences!.map((b) => ({ ...b, ledger_id: p.ledger!.ledger_id }))
            );
        } else {
          finalBillReferences = contraDoubleRows
            .filter((r) => r.ledger && r.billReferences?.length)
            .flatMap((r) =>
              r.billReferences!.map((b) => ({ ...b, ledger_id: r.ledger!.ledger_id }))
            );
        }
      } else if (voucherType === "Journal") {
        finalBillReferences = journalRows
          .filter((r) => r.ledger && r.billReferences?.length)
          .flatMap((r) =>
            r.billReferences!.map((b) => ({ ...b, ledger_id: r.ledger!.ledger_id }))
          );
      } else if (["Sales", "Purchase"].includes(voucherType)) {
        if (partyLedger && partyBillReferences.length > 0) {
          finalBillReferences = partyBillReferences.map((b) => ({
            ...b,
            ledger_id: partyLedger.ledger_id,
          }));
        }
        const additionalRefs = additionalEntries
          .filter((p) => p.ledger && p.billReferences?.length)
          .flatMap((p) =>
            p.billReferences!.map((b) => ({ ...b, ledger_id: p.ledger!.ledger_id }))
          );
        finalBillReferences = [...finalBillReferences, ...additionalRefs];
      }

      // ── Final payload ────────────────────────────────────────────────────────

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
        cash_denominations: cashDenominations || undefined,
      };

      const res = await window.api.voucher.create(payload);
      if (res.success) {
        const savedNumber = voucherNumber;
        resetForm();
        setSuccess(`Voucher No. ${savedNumber} saved successfully.`);
        // Refresh all ledger balances and master data after successful entry
        fetchContextData();
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
    companyId, fyId, voucherType, contraEntryMode, receiptEntryMode, journalEntryMode, paymentEntryMode,
    date, status,
    supplierInvoiceNo, supplierInvoiceDate,
    referenceNumber, referenceDate, placeOfSupply,
    narration, totalAmount, particularsTotal,
    accountLedger,
    particulars, contraDoubleRows, receiptDoubleRows, paymentDoubleRows, journalRows,
    partyLedger, salesPurchaseLedger,
    stockEntries, additionalEntries,
    partyBillReferences, bankDetails, cashDenominations,
    voucherNumber, resetForm, fetchContextData,
  ]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Derived display
  // ─────────────────────────────────────────────────────────────────────────────

  const dateDisplay = useMemo(() => formatDateDisplay(date), [date]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────────

  return {
    // ── Voucher meta ───────────────────────────────────────────────────────────
    voucherType,
    setVoucherType,
    voucherNumber,
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

    // ── Computed totals ────────────────────────────────────────────────────────
    totalAmount,       // grand total (used for footer display, party entry, account entry)
    debitTotal,        // Journal Dr side; equals particularsTotal for Receipt
    creditTotal,       // Journal Cr side; equals particularsTotal for Payment/Contra
    particularsTotal,  // raw sum of all Particulars rows (single-entry layouts)

    // ── Submission ─────────────────────────────────────────────────────────────
    isSubmitting,
    error,
    setError,
    success,
    setSuccess,
    handleSubmit,
    resetForm,

    // ── Advanced allocations ───────────────────────────────────────────────────
    activeAllocation,
    setActiveAllocation,
    partyBillReferences,
    setPartyBillReferences,
    bankDetails,
    setBankDetails,
    cashDenominations,
    setCashDenominations,

    // ── Reference / invoice ────────────────────────────────────────────────────
    referenceNumber,
    setReferenceNumber,
    referenceDate,
    setReferenceDate,
    placeOfSupply,
    setPlaceOfSupply,

    // ── Master data ────────────────────────────────────────────────────────────
    allLedgers,
    allStockItems,
    allGodowns,
    allUnits,
    ledgersLoading,
    fetchContextData,

    // ── Search / panel ─────────────────────────────────────────────────────────
    ledgerSearchTerm,
    setLedgerSearchTerm,
    stockSearchTerm,
    setStockSearchTerm,
    activeField,
    handleFieldFocus,
    handleFieldBlur,
    handleLedgerPanelSelect,

    // ── Layout 1 — single-entry (Contra F4 · Payment F5 · Receipt F6) ─────────
    accountLedger,
    accountBalance,
    particulars,
    setParticulars,
    handleUpdateParticularRow,
    handleAddParticularRow,
    handleRemoveParticularRow,

    // ── Layout 1b — Contra double-entry ───────────────────────────────────────
    contraEntryMode,
    setContraEntryMode,
    contraDoubleRows,
    setContraDoubleRows,
    handleUpdateContraDoubleRow,
    handleAddContraDoubleRow,
    handleRemoveContraDoubleRow,

    // ── Layout 1c — Receipt double-entry ──────────────────────────────────────
    receiptEntryMode,
    setReceiptEntryMode,
    receiptDoubleRows,
    setReceiptDoubleRows,
    handleUpdateReceiptDoubleRow,
    handleAddReceiptDoubleRow,
    handleRemoveReceiptDoubleRow,

    // ── Layout 1d — Payment double-entry ──────────────────────────────────────
    paymentEntryMode,
    setPaymentEntryMode,
    paymentDoubleRows,
    setPaymentDoubleRows,
    handleUpdatePaymentDoubleRow,
    handleAddPaymentDoubleRow,
    handleRemovePaymentDoubleRow,

    // ── Layout 2 — journal (F7) ────────────────────────────────────────────────
    journalEntryMode,
    setJournalEntryMode,
    journalRows,
    setJournalRows,
    handleUpdateJournalRow,
    handleAddJournalRow,
    handleRemoveJournalRow,

    // ── Layout 3 — inventory invoice (Sales F8 · Purchase F9) ─────────────────
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

    // ── Context helpers ────────────────────────────────────────────────────────
    checkIsCashOrBank,
    checkIsCash,
    checkIsBank,
    checkLedgerGroup,
    companyId,
    fyId,
  };
}