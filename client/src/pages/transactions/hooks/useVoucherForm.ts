import { useCallback, useEffect, useRef } from 'react';
import { useCompany } from '../../../context/CompanyContext';

import { useState } from 'react'; // add useState to your existing import from "react"

import { useVoucherMeta } from './useVoucherMeta';
import { useVoucherLedgers } from './useVoucherLedgers';
import { useVoucherRows as useVoucherRowsInternal } from './useVoucherRowsNew';
import { pickDefaultRegistrationFrom } from '../utils/defaultRegistration';

// Re-export types so any file that previously imported from this hook still works
export type { ParticularRow, StockEntryRow, ActiveField, ActiveAllocation } from '../types';

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVoucherForm(
  resolveEffectiveType?: (type: string) => string,
  editVoucherId?: number | null,
  onSaved?: () => void,
) {
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;
  // ── GST Registration / Tax Unit / Price Level masters ─────────────────────
  const [allGstRegistrations, setAllGstRegistrations] = useState<any[]>([]);
  const [allTaxUnits, setAllTaxUnits] = useState<any[]>([]);
  const [allPriceLevels, setAllPriceLevels] = useState<string[]>([]);

  const [gstRegistration, setGstRegistrationState] = useState<any | null>(null);
  const [taxUnit, setTaxUnit] = useState<any | null>(null);
  const [priceLevel, setPriceLevel] = useState<string>('');

  // Bug 5: the company's persisted "current default GST registration id" — the single
  // source of truth for what a NEW voucher prefills. Fetched fresh from the backend (not
  // read off a possibly-stale company object) and updated the instant the user changes it.
  const [defaultRegistrationId, setDefaultRegistrationId] = useState<number | null>(null);

  // Bug 5: the GST registration must default to the company's registration and persist —
  // not reset to "Not Applicable" on every new/reopened voucher. `gstTouchedRef` records
  // whether the user (or hydrate) explicitly set it, so the default-seeding effect below
  // never clobbers an explicit choice (including an explicit "Not Applicable"/null).
  const gstTouchedRef = useRef(false);
  const setGstRegistration = useCallback((val: any | null) => {
    gstTouchedRef.current = true;
    setGstRegistrationState(val);
  }, []);

  // Per-godown balances for the item currently being entered (Physical Stock's
  // "List of Godowns" quantity column). Fetched on item selection.
  const [godownBalances, setGodownBalances] = useState<Record<number, number>>({});
  const fetchGodownBalances = useCallback(
    async (itemId?: number | null) => {
      if (!companyId || !itemId) {
        setGodownBalances({});
        return;
      }
      try {
        const res = await window.api.stockItem.getStockBalancesByGodown({
          company_id: companyId,
          item_id: itemId,
        });
        setGodownBalances(res?.success && res.balances ? res.balances : {});
      } catch {
        setGodownBalances({});
      }
    },
    [companyId],
  );

  // Active batches for the item currently being entered (Physical Stock's
  // "List of Active Batches" picker on the Batch/Lot No. field).
  const [activeBatches, setActiveBatches] = useState<
    { name: string; expiry: string; balance: number }[]
  >([]);
  const fetchActiveBatches = useCallback(
    async (itemId?: number | null) => {
      if (!companyId || !itemId) {
        setActiveBatches([]);
        return;
      }
      try {
        const res = await window.api.stockItem.getActiveBatches({
          company_id: companyId,
          item_id: itemId,
        });
        setActiveBatches(res?.success && res.batches ? res.batches : []);
      } catch {
        setActiveBatches([]);
      }
    },
    [companyId],
  );

  const fetchTaxAndPriceMasters = useCallback(async () => {
    if (!companyId) return;
    // Each master loads INDEPENDENTLY — a failure in one (e.g. a newly-added IPC handler
    // not yet registered) must never blank the others. Previously these shared a single
    // Promise.all, so one rejected call wiped the whole GST-registration list.
    try {
      const gstRes = await window.api.gstRegistration.getAll(companyId);
      if (gstRes?.success) setAllGstRegistrations(gstRes.gstRegistrations || []);
    } catch (err) {
      console.error('Failed to load GST registrations:', err);
    }
    try {
      const taxUnitRes = await window.api.taxUnits.getAll(companyId);
      if (taxUnitRes?.success) setAllTaxUnits(taxUnitRes.taxUnits || []);
    } catch (err) {
      console.error('Failed to load tax units:', err);
    }
    try {
      const priceLevelRes = await window.api.priceLevels.get(companyId);
      if (priceLevelRes?.success) {
        setAllPriceLevels((priceLevelRes.data || []).filter((n: string) => !!n && n.trim() !== ''));
      }
    } catch (err) {
      console.error('Failed to load price levels:', err);
    }
    // The default registration persists in localStorage (durable across app restarts even
    // if the backend handler isn't yet live) with the backend as a secondary/cross-surface
    // store. localStorage wins when present.
    let backendId: number | null = null;
    try {
      const defaultRegRes = await window.api.company.getDefaultGstRegistration(companyId);
      if (defaultRegRes?.success && defaultRegRes.current_default_gst_registration_id != null) {
        backendId = Number(defaultRegRes.current_default_gst_registration_id);
      }
    } catch (err) {
      console.error('Failed to load default GST registration:', err);
    }
    let localId: number | null = null;
    try {
      const raw = localStorage.getItem(`defaultGstRegistration:${companyId}`);
      if (raw != null && raw !== '') localId = Number(raw);
    } catch {
      /* localStorage unavailable — fall back to backend */
    }
    setDefaultRegistrationId(localId != null ? localId : backendId);
  }, [companyId]);

  useEffect(() => {
    fetchTaxAndPriceMasters();
  }, [fetchTaxAndPriceMasters]);

  // Bug 5: seed strictly from the company's persisted default registration — NO fallback
  // to the first record (which was the reported bug: it showed Arunachal instead of the
  // last-selected Chhattisgarh).
  const pickDefaultRegistration = useCallback(
    () => pickDefaultRegistrationFrom(defaultRegistrationId, allGstRegistrations),
    [allGstRegistrations, defaultRegistrationId],
  );

  // Bug 5: persist the user's registration choice as the company default the INSTANT it is
  // picked (not only on save). Written to localStorage (durable, no backend dependency) AND
  // the backend (best-effort). A freshly-opened voucher — even after an app restart — seeds
  // from this, so the choice sticks until explicitly changed.
  const persistDefaultRegistration = useCallback(
    async (gstId: number | null) => {
      const value = gstId != null ? Number(gstId) : null;
      setDefaultRegistrationId(value);
      if (!companyId) return;
      try {
        if (value != null)
          localStorage.setItem(`defaultGstRegistration:${companyId}`, String(value));
        else localStorage.removeItem(`defaultGstRegistration:${companyId}`);
      } catch {
        /* localStorage unavailable — the backend write below still persists it */
      }
      try {
        await window.api.company.setDefaultGstRegistration(companyId, value);
      } catch (e) {
        console.error('Failed to persist default GST registration to backend:', e);
      }
    },
    [companyId],
  );

  // Seed the default for a NEW voucher once registrations + the persisted default load.
  // Edit mode hydrates from the saved voucher instead, and an explicit user choice is
  // never overwritten.
  useEffect(() => {
    if (editVoucherId) return;
    if (gstTouchedRef.current) return;
    const chosen = pickDefaultRegistration();
    if (chosen) setGstRegistrationState(chosen);
  }, [pickDefaultRegistration, editVoucherId]);

  // ── Sub-hooks ──────────────────────────────────────────────────────────────

  const meta = useVoucherMeta({
    initialVoucherType: 'Receipt',
    initialNarration: '',
    initialReferenceNumber: '',
    initialPlaceOfSupply: 'Select',
    initialPartyBillReferences: [],
    initialBankDetails: null,
  });

  const ledgers = useVoucherLedgers({ companyId, fyId });

  const effectiveVoucherType = resolveEffectiveType
    ? (resolveEffectiveType(meta.voucherType) ?? meta.voucherType)
    : meta.voucherType;

  const rows = useVoucherRowsInternal({
    initialAdditionalEntries: [],
    initialContraEntryMode: 'double',
    initialReceiptEntryMode: 'double',
    initialJournalEntryMode: 'double',
    initialPaymentEntryMode: 'double',
    fetchLedgerBalance: ledgers.fetchLedgerBalance,
    voucherType: effectiveVoucherType,
    allUnits: ledgers.allUnits,
    stockBalances: ledgers.stockBalances,
  });

  // ── Load master data and next voucher number on mount ─────────────────────

  const fetchNextNumber = useCallback(async () => {
    await ledgers.fetchNextVoucherNumber(
      meta.voucherType,
      meta.setVoucherNumber,
      meta.setVoucherNumberLoading,
    );
  }, [
    ledgers.fetchNextVoucherNumber,
    meta.voucherType,
    meta.setVoucherNumber,
    meta.setVoucherNumberLoading,
  ]);

  useEffect(() => {
    ledgers.fetchContextData();
    // In edit mode the voucher number comes from the saved voucher, not a fresh one.
    if (!editVoucherId) fetchNextNumber();
  }, [ledgers.fetchContextData, fetchNextNumber, editVoucherId]);

  // ── Ledger balance sync ────────────────────────────────────────────────────

  useEffect(() => {
    if (rows.accountLedger?.ledger_id) {
      ledgers
        .fetchLedgerBalance(rows.accountLedger.ledger_id)
        .then((b) => rows.setAccountBalance(b.label));
    } else {
      rows.setAccountBalance('');
    }
  }, [rows.accountLedger, ledgers.fetchLedgerBalance]);

  useEffect(() => {
    if (rows.partyLedger?.ledger_id) {
      ledgers
        .fetchLedgerBalance(rows.partyLedger.ledger_id)
        .then((b) => rows.setPartyBalance(b.label));
    } else {
      rows.setPartyBalance('');
    }
  }, [rows.partyLedger, ledgers.fetchLedgerBalance]);

  useEffect(() => {
    if (rows.salesPurchaseLedger?.ledger_id) {
      ledgers
        .fetchLedgerBalance(rows.salesPurchaseLedger.ledger_id)
        .then((b) => rows.setSalesPurchaseBalance(b.label));
    } else {
      rows.setSalesPurchaseBalance('');
    }
  }, [rows.salesPurchaseLedger, ledgers.fetchLedgerBalance]);

  // ── Reset on voucher type change ───────────────────────────────────────────

  const resetFormRef = useRef<() => void>(() => {});
  const prevVoucherType = useRef(meta.voucherType);
  useEffect(() => {
    if (prevVoucherType.current !== meta.voucherType) {
      prevVoucherType.current = meta.voucherType;
      // In edit mode the type is set once from the saved voucher — don't wipe the
      // hydrated rows.
      if (!editVoucherId) resetFormRef.current?.();
    }
  }, [meta.voucherType, editVoucherId]);

  // ── Validate ───────────────────────────────────────────────────────────────

  const validate = useCallback((): string | null => {
    if (!companyId) return 'No company selected.';
    // Attendance vouchers are stored in their own table and don't use the financial
    // year, so a not-yet-loaded FY must not block saving them.
    if (!fyId && effectiveVoucherType !== 'Attendance') return 'No active financial year.';

    if (effectiveVoucherType === 'Receipt') {
      if (rows.receiptEntryMode === 'single') {
        if (!rows.accountLedger) return 'Account (cash/bank ledger) is required.';
        const filled = rows.particulars.filter((p) => p.ledger && Number(p.amountRaw) >= 0);
        if (filled.length < 1) return 'At least one Particulars entry with an amount is required.';
      } else {
        const filled = rows.receiptDoubleRows.filter((r) => r.ledger && Number(r.amountRaw) >= 0);
        if (filled.length < 2) return 'At least two valid entries are required.';
        if (Math.abs(rows.debitTotal - rows.creditTotal) > 0.01)
          return `Debit (${rows.debitTotal.toFixed(2)}) and Credit (${rows.creditTotal.toFixed(2)}) totals must balance.`;
      }
    }

    if (effectiveVoucherType === 'Payment') {
      if (rows.paymentEntryMode === 'single') {
        if (!rows.accountLedger) return 'Account (cash/bank ledger) is required.';
        const filled = rows.particulars.filter((p) => p.ledger && Number(p.amountRaw) > 0);
        if (filled.length < 1) return 'At least one Particulars entry with an amount is required.';
        if (rows.particularsTotal <= 0) return 'Total amount must be greater than zero.';
      } else {
        const filled = rows.paymentDoubleRows.filter((r) => r.ledger && Number(r.amountRaw) > 0);
        if (filled.length < 2) return 'At least two valid entries are required.';
        if (Math.abs(rows.debitTotal - rows.creditTotal) > 0.01)
          return `Debit (${rows.debitTotal.toFixed(2)}) and Credit (${rows.creditTotal.toFixed(2)}) totals must balance.`;
        if (rows.debitTotal <= 0) return 'Amount must be greater than zero.';
      }
    }

    if (effectiveVoucherType === 'Contra') {
      if (rows.contraEntryMode === 'single') {
        if (!rows.accountLedger) return 'Account (cash/bank ledger) is required.';
        if (!ledgers.checkIsCashOrBank(rows.accountLedger))
          return 'Contra Account must be a Cash or Bank ledger.';
        const filled = rows.particulars.filter((p) => p.ledger && Number(p.amountRaw) >= 0);
        if (filled.length < 1) return 'At least one Particulars entry with an amount is required.';
        for (const row of filled) {
          if (!ledgers.checkIsCashOrBank(row.ledger))
            return 'Contra vouchers may only use Cash/Bank ledgers on both sides.';
        }
      } else {
        const filled = rows.contraDoubleRows.filter((r) => r.ledger && Number(r.amountRaw) >= 0);
        if (filled.length < 2) return 'At least two valid entries are required.';
        for (const row of filled) {
          if (!ledgers.checkIsCashOrBank(row.ledger))
            return 'Contra vouchers may only use Cash/Bank ledgers.';
        }
        if (Math.abs(rows.debitTotal - rows.creditTotal) > 0.01)
          return `Debit (${rows.debitTotal.toFixed(2)}) and Credit (${rows.creditTotal.toFixed(2)}) totals must balance.`;
      }
    }

    if (effectiveVoucherType === 'Journal' || effectiveVoucherType === 'Reversing Journal') {
      if (rows.journalEntryMode === 'single') {
        if (!rows.accountLedger) return 'Account ledger is required.';
        const filled = rows.particulars.filter((p) => p.ledger && Number(p.amountRaw) > 0);
        if (filled.length < 1) return 'At least one Particulars entry with an amount is required.';
        if (rows.particularsTotal <= 0) return 'Total amount must be greater than zero.';
      } else {
        const filled = rows.journalRows.filter((r) => r.ledger && Number(r.amountRaw) > 0);
        if (filled.length < 2) return 'At least two valid Journal entries are required.';
        // A regular Journal forbids Cash/Bank ledgers; a Reversing Journal allows them
        // (it is a non-posting scenario voucher — e.g. provisioning against a bank a/c).
        if (effectiveVoucherType === 'Journal') {
          for (const row of filled) {
            if (ledgers.checkIsCashOrBank(row.ledger))
              return 'Journal vouchers cannot use Cash or Bank ledgers.';
          }
        }
        if (Math.abs(rows.debitTotal - rows.creditTotal) > 0.01)
          return `Debit (${rows.debitTotal.toFixed(2)}) and Credit (${rows.creditTotal.toFixed(2)}) totals must balance.`;
        if (rows.debitTotal <= 0) return 'Journal amount must be greater than zero.';
      }
    }

    // Memorandum is a non-accounting voucher entered like a double-entry Journal,
    // but (unlike Journal) it may use any ledger, including Cash/Bank.
    if (effectiveVoucherType === 'Memorandum') {
      const filled = rows.journalRows.filter((r) => r.ledger && Number(r.amountRaw) > 0);
      if (filled.length < 2) return 'At least two valid entries are required.';
      if (Math.abs(rows.debitTotal - rows.creditTotal) > 0.01)
        return `Debit (${rows.debitTotal.toFixed(2)}) and Credit (${rows.creditTotal.toFixed(2)}) totals must balance.`;
      if (rows.debitTotal <= 0) return 'Amount must be greater than zero.';
    }

    if (
      [
        'Sales',
        'Purchase',
        'Credit Note',
        'Debit Note',
        'Delivery Note',
        'Receipt Note',
        'Rejection In',
        'Rejection Out',
        'Material In',
        'Material Out',
      ].includes(effectiveVoucherType)
    ) {
      if (!rows.partyLedger) return 'Party A/c Name is required.';
      // Delivery Note / Receipt Note / Rejection In / Rejection Out are non-accounting
      // inventory vouchers in Tally — no Sales/Purchase ledger is posted, so unlike
      // Sales/Purchase/Credit Note/Debit Note it is never required here.
      const needsLedger = ['Sales', 'Purchase', 'Credit Note', 'Debit Note'].includes(
        effectiveVoucherType,
      );
      if (needsLedger && !rows.salesPurchaseLedger) {
        const baseLabel =
          effectiveVoucherType === 'Credit Note'
            ? 'Sales'
            : effectiveVoucherType === 'Debit Note'
              ? 'Purchase'
              : effectiveVoucherType;
        return `${baseLabel} Ledger is required.`;
      }
      if (needsLedger && rows.partyLedger.ledger_id === rows.salesPurchaseLedger.ledger_id)
        return `Party and ${effectiveVoucherType} ledger cannot be the same account.`;
      const filledItems = rows.stockEntries.filter(
        (r) => r.stockItem && Number(r.quantityRaw) > 0 && Number(r.rateRaw) > 0,
      );
      if (filledItems.length === 0)
        return 'At least one Stock Item with quantity and rate is required.';
      if (rows.totalAmount <= 0) return 'Total amount must be greater than zero.';
      if (rows.negativeStockWarnings?.length > 0) {
        return `Negative Stock: ${rows.negativeStockWarnings[0]}`;
      }
    }

    // Order vouchers: stock entries only, no accounting, no stock balance effect
    if (
      ['Purchase Order', 'Sales Order', 'Job Work In Order', 'Job Work Out Order'].includes(
        effectiveVoucherType,
      )
    ) {
      if (!rows.partyLedger) return 'Party A/c Name is required.';
      const filledItems = rows.stockEntries.filter((r) => r.stockItem && Number(r.quantityRaw) > 0);
      if (filledItems.length === 0) return 'At least one Stock Item with quantity is required.';
    }

    if (effectiveVoucherType === 'Manufacturing Journal') {
      const filledSource = rows.sourceStockEntries.filter(
        (r) => r.stockItem && Number(r.quantityRaw) > 0,
      );
      const filledDest = rows.destinationStockEntries.filter(
        (r) => r.stockItem && Number(r.quantityRaw) > 0,
      );
      if (filledSource.length === 0 && filledDest.length === 0) {
        return 'At least one Stock Item is required (either Source or Destination).';
      }
      if (rows.negativeStockWarnings?.length > 0) {
        return `Negative Stock: ${rows.negativeStockWarnings[0]}`;
      }
    }

    if (effectiveVoucherType === 'Physical Stock') {
      const filled = rows.stockEntries.filter((r) => r.stockItem && Number(r.quantityRaw) > 0);
      if (filled.length === 0) return 'At least one Stock Item with quantity is required.';
    }

    if (effectiveVoucherType === 'Stock Journal') {
      const filledSource = rows.sourceStockEntries.filter(
        (r) => r.stockItem && Number(r.quantityRaw) > 0,
      );
      const filledDest = rows.destinationStockEntries.filter(
        (r) => r.stockItem && Number(r.quantityRaw) > 0,
      );
      if (filledSource.length === 0 && filledDest.length === 0) {
        return 'At least one Stock Item is required (either Source or Destination).';
      }
      if (rows.negativeStockWarnings?.length > 0) {
        return `Negative Stock: ${rows.negativeStockWarnings[0]}`;
      }
    }

    if (effectiveVoucherType === 'Attendance') {
      const filled = rows.attendanceEntries.filter(
        (r) => r.employee && r.attendanceType && Number(r.valueRaw) > 0,
      );
      if (filled.length === 0)
        return 'At least one Attendance entry with a positive value is required.';
    }

    if (effectiveVoucherType === 'Payroll') {
      if (!rows.accountLedger) return 'Account (cash/bank ledger) is required.';
      const filled = rows.payrollEntriesFromGroups.filter(
        (r) => r.employee && r.payHead && Number(r.amountRaw) > 0,
      );
      if (filled.length === 0)
        return 'At least one Payroll entry with a positive amount is required.';
    }

    return null;
  }, [companyId, fyId, effectiveVoucherType, rows, ledgers.checkIsCashOrBank]);

  // ── handleSubmit ───────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    const validationError = validate();
    if (validationError) {
      meta.setError(validationError);
      return;
    }

    meta.setIsSubmitting(true);
    meta.setError(null);
    meta.setSuccess(null);

    try {
      let entries: any[] = [];
      let stock_entries: any[] = [];

      // ── Build accounting entries ─────────────────────────────────────────

      if (effectiveVoucherType === 'Receipt') {
        if (rows.receiptEntryMode === 'single') {
          entries.push({
            ledger_id: rows.accountLedger!.ledger_id,
            ledger_name: rows.accountLedger!.name,
            type: 'Dr',
            amount: rows.particularsTotal,
          });
          entries.push(
            ...rows.particulars
              .filter((p) => p.ledger && Number(p.amountRaw) > 0)
              .map((p) => ({
                ledger_id: p.ledger!.ledger_id,
                ledger_name: p.ledger!.name,
                type: p.type,
                amount: Number(p.amountRaw),
                currency: 'INR',
                cost_centres: p.costCentres,
              })),
          );
        } else {
          entries = rows.receiptDoubleRows
            .filter((r) => r.ledger && Number(r.amountRaw) > 0)
            .map((r) => ({
              ledger_id: r.ledger!.ledger_id,
              ledger_name: r.ledger!.name,
              type: r.type,
              amount: Number(r.amountRaw),
              currency: 'INR',
              cost_centres: r.costCentres,
            }));
        }
      } else if (effectiveVoucherType === 'Payment') {
        if (rows.paymentEntryMode === 'single') {
          entries.push({
            ledger_id: rows.accountLedger!.ledger_id,
            ledger_name: rows.accountLedger!.name,
            type: 'Cr',
            amount: rows.particularsTotal,
          });
          entries.push(
            ...rows.particulars
              .filter((p) => p.ledger && Number(p.amountRaw) > 0)
              .map((p) => ({
                ledger_id: p.ledger!.ledger_id,
                ledger_name: p.ledger!.name,
                type: p.type,
                amount: Number(p.amountRaw),
                currency: 'INR',
                cost_centres: p.costCentres,
              })),
          );
        } else {
          entries = rows.paymentDoubleRows
            .filter((r) => r.ledger && Number(r.amountRaw) > 0)
            .map((r) => ({
              ledger_id: r.ledger!.ledger_id,
              ledger_name: r.ledger!.name,
              type: r.type,
              amount: Number(r.amountRaw),
              currency: 'INR',
              cost_centres: r.costCentres,
            }));
        }
      } else if (effectiveVoucherType === 'Contra') {
        if (rows.contraEntryMode === 'single') {
          entries.push({
            ledger_id: rows.accountLedger!.ledger_id,
            ledger_name: rows.accountLedger!.name,
            type: 'Cr',
            amount: rows.particularsTotal,
          });
          entries.push(
            ...rows.particulars
              .filter((p) => p.ledger && Number(p.amountRaw) > 0)
              .map((p) => ({
                ledger_id: p.ledger!.ledger_id,
                ledger_name: p.ledger!.name,
                type: p.type,
                amount: Number(p.amountRaw),
                currency: 'INR',
                cost_centres: p.costCentres,
              })),
          );
        } else {
          entries = rows.contraDoubleRows
            .filter((r) => r.ledger && Number(r.amountRaw) > 0)
            .map((r) => ({
              ledger_id: r.ledger!.ledger_id,
              ledger_name: r.ledger!.name,
              type: r.type,
              amount: Number(r.amountRaw),
              currency: 'INR',
              cost_centres: r.costCentres,
            }));
        }
      } else if (
        effectiveVoucherType === 'Journal' ||
        effectiveVoucherType === 'Reversing Journal' ||
        effectiveVoucherType === 'Memorandum'
      ) {
        if (rows.journalEntryMode === 'single') {
          entries.push({
            ledger_id: rows.accountLedger!.ledger_id,
            ledger_name: rows.accountLedger!.name,
            type: 'Cr',
            amount: rows.particularsTotal,
          });
          entries.push(
            ...rows.particulars
              .filter((p) => p.ledger && Number(p.amountRaw) > 0)
              .map((p) => ({
                ledger_id: p.ledger!.ledger_id,
                ledger_name: p.ledger!.name,
                type: p.type,
                amount: Number(p.amountRaw),
                currency: 'INR',
                cost_centres: p.costCentres,
              })),
          );
        } else {
          entries = rows.journalRows
            .filter((r) => r.ledger && Number(r.amountRaw) > 0)
            .map((r) => ({
              ledger_id: r.ledger!.ledger_id,
              ledger_name: r.ledger!.name,
              type: r.type,
              amount: Number(r.amountRaw),
              currency: 'INR',
              cost_centres: r.costCentres,
            }));
          // Inventory-affecting ledgers (Purchase/Sales A/c) carry stock lines entered
          // via the Inventory Allocations sub-screen — flatten them into the voucher's
          // stock entries (persisted generically by the backend).
          stock_entries = rows.journalRows
            .filter((r) => r.inventoryAllocations?.length)
            .flatMap((r) =>
              r.inventoryAllocations!.map((it) => ({
                stock_item_id: it.stock_item_id,
                item_name: it.item_name,
                godown_id: it.godown_id ?? null,
                unit_id: it.unit_id ?? null,
                quantity: it.quantity,
                rate: it.rate,
                amount: it.amount,
                batches: it.batches && it.batches.length ? it.batches : undefined,
              })),
            );
        }
      } else if (
        [
          'Sales',
          'Purchase',
          'Credit Note',
          'Debit Note',
          'Delivery Note',
          'Receipt Note',
          'Rejection In',
          'Rejection Out',
          'Material In',
          'Material Out',
        ].includes(effectiveVoucherType)
      ) {
        const filledItems = rows.stockEntries.filter(
          (r) => r.stockItem && Number(r.quantityRaw) > 0 && Number(r.rateRaw) > 0,
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
          batches: r.batchAllocations && r.batchAllocations.length ? r.batchAllocations : undefined,
          excise_item_details: r.exciseItemDetails || undefined,
        }));
        const isInventoryOnly = [
          'Delivery Note',
          'Receipt Note',
          'Rejection In',
          'Rejection Out',
          'Material In',
          'Material Out',
        ].includes(effectiveVoucherType);
        if (!isInventoryOnly) {
          const isPurchaseLike = effectiveVoucherType === 'Purchase';
          const partyType: 'Dr' | 'Cr' = isPurchaseLike ? 'Cr' : 'Dr';
          const spType: 'Dr' | 'Cr' = isPurchaseLike ? 'Dr' : 'Cr';

          entries = [
            {
              ledger_id: rows.partyLedger!.ledger_id,
              ledger_name: rows.partyLedger!.name,
              type: partyType,
              amount: rows.totalAmount,
              currency: 'INR',
            },
            {
              ledger_id: rows.salesPurchaseLedger!.ledger_id,
              ledger_name: rows.salesPurchaseLedger!.name,
              type: spType,
              amount: stockSubtotal,
              currency: 'INR',
            },
            ...(effectiveVoucherType === 'Sales' || effectiveVoucherType === 'Purchase'
              ? rows.additionalEntries
                  .filter((p) => p.ledger && Number(p.amountRaw) > 0)
                  .map((p) => ({
                    ledger_id: p.ledger!.ledger_id,
                    ledger_name: p.ledger!.name,
                    type: p.type,
                    amount: Number(p.amountRaw),
                    currency: 'INR',
                    cost_centres: p.costCentres,
                  }))
              : []),
          ];
        }
      } else if (effectiveVoucherType === 'Stock Journal') {
        const filledSource = rows.sourceStockEntries.filter(
          (r) => r.stockItem && Number(r.quantityRaw) > 0,
        );
        const filledDest = rows.destinationStockEntries.filter(
          (r) => r.stockItem && Number(r.quantityRaw) > 0,
        );
        stock_entries = [
          ...filledSource.map((r) => ({
            stock_item_id: r.stockItem!.item_id ?? null,
            item_name: r.stockItem!.name,
            godown_id: r.godown?.godown_id ?? null,
            unit_id: r.unit?.unit_id ?? null,
            quantity: Number(r.quantityRaw),
            rate: Number(r.rateRaw),
            amount: Number(r.amountRaw),
            batches:
              r.batchAllocations && r.batchAllocations.length ? r.batchAllocations : undefined,
            is_source: 1,
          })),
          ...filledDest.map((r) => ({
            stock_item_id: r.stockItem!.item_id ?? null,
            item_name: r.stockItem!.name,
            godown_id: r.godown?.godown_id ?? null,
            unit_id: r.unit?.unit_id ?? null,
            quantity: Number(r.quantityRaw),
            rate: Number(r.rateRaw),
            amount: Number(r.amountRaw),
            batches:
              r.batchAllocations && r.batchAllocations.length ? r.batchAllocations : undefined,
            is_source: 0,
          })),
        ];
      } else if (effectiveVoucherType === 'Manufacturing Journal') {
        const filledSource = rows.sourceStockEntries.filter(
          (r) => r.stockItem && Number(r.quantityRaw) > 0,
        );
        const filledDest = rows.destinationStockEntries.filter(
          (r) => r.stockItem && Number(r.quantityRaw) > 0,
        );
        stock_entries = [
          ...filledSource.map((r) => ({
            stock_item_id: r.stockItem!.item_id ?? null,
            item_name: r.stockItem!.name,
            godown_id: r.godown?.godown_id ?? null,
            unit_id: r.unit?.unit_id ?? null,
            quantity: Number(r.quantityRaw),
            rate: Number(r.rateRaw),
            amount: Number(r.amountRaw),
            batches:
              r.batchAllocations && r.batchAllocations.length ? r.batchAllocations : undefined,
            is_source: 1,
          })),
          ...filledDest.map((r) => ({
            stock_item_id: r.stockItem!.item_id ?? null,
            item_name: r.stockItem!.name,
            godown_id: r.godown?.godown_id ?? null,
            unit_id: r.unit?.unit_id ?? null,
            quantity: Number(r.quantityRaw),
            rate: Number(r.rateRaw),
            amount: Number(r.amountRaw),
            batches:
              r.batchAllocations && r.batchAllocations.length ? r.batchAllocations : undefined,
            is_source: 0,
          })),
        ];
      } else if (
        ['Purchase Order', 'Sales Order', 'Job Work In Order', 'Job Work Out Order'].includes(
          effectiveVoucherType,
        )
      ) {
        const filledItems = rows.stockEntries.filter(
          (r) => r.stockItem && Number(r.quantityRaw) > 0,
        );
        const isJobWork =
          effectiveVoucherType === 'Job Work In Order' ||
          effectiveVoucherType === 'Job Work Out Order';
        stock_entries = filledItems.map((r) => {
          let batches: any[] | undefined;
          if (isJobWork && r.jobWorkAllocations?.length) {
            // Flatten jobWorkAllocations into voucher_batches rows.
            // Main row: batch_number = "JW:<idx>"; component rows: component_of = item name,
            // consider_as_scrap = "JW:<parentIdx>" to reconstruct the parent link on load.
            batches = r.jobWorkAllocations.flatMap((alloc, allocIdx) => [
              {
                batch_number: `JW:${allocIdx}`,
                due_on: alloc.due_on,
                godown: alloc.godown,
                quantity: alloc.quantity,
                actual_quantity: alloc.quantity,
                rate: alloc.rate,
                order_no: meta.orderDetails?.order_nos ?? '',
              },
              ...(alloc.components ?? []).map((comp) => ({
                batch_number: comp.batch_lot || '',
                tracking_no: comp.track || 'Pending to Issue',
                due_on: comp.due_on,
                godown: comp.godown,
                quantity: comp.actual_qty,
                actual_quantity: comp.as_per_bom,
                rate: comp.rate,
                component_of: comp.item_name,
                consider_as_scrap: `JW:${allocIdx}`,
              })),
            ]);
          } else if (r.batchAllocations?.length) {
            batches = r.batchAllocations;
          }
          return {
            stock_item_id: r.stockItem!.item_id ?? null,
            item_name: r.stockItem!.name,
            godown_id: r.godown?.godown_id ?? null,
            unit_id: r.unit?.unit_id ?? null,
            quantity: Number(r.quantityRaw),
            rate: Number(r.rateRaw),
            amount: Number(r.amountRaw),
            batches,
          };
        });
      }

      // ── Collect bill references ──────────────────────────────────────────
      let finalBillReferences: any[] = [];
      if (effectiveVoucherType === 'Receipt') {
        finalBillReferences =
          rows.receiptEntryMode === 'single'
            ? rows.particulars
                .filter((p) => p.ledger && p.billReferences?.length)
                .flatMap((p) =>
                  p.billReferences!.map((b) => ({ ...b, ledger_id: p.ledger!.ledger_id })),
                )
            : rows.receiptDoubleRows
                .filter((r) => r.ledger && r.billReferences?.length)
                .flatMap((r) =>
                  r.billReferences!.map((b) => ({ ...b, ledger_id: r.ledger!.ledger_id })),
                );
      } else if (effectiveVoucherType === 'Payment') {
        finalBillReferences =
          rows.paymentEntryMode === 'single'
            ? rows.particulars
                .filter((p) => p.ledger && p.billReferences?.length)
                .flatMap((p) =>
                  p.billReferences!.map((b) => ({ ...b, ledger_id: p.ledger!.ledger_id })),
                )
            : rows.paymentDoubleRows
                .filter((r) => r.ledger && r.billReferences?.length)
                .flatMap((r) =>
                  r.billReferences!.map((b) => ({ ...b, ledger_id: r.ledger!.ledger_id })),
                );
      } else if (effectiveVoucherType === 'Contra') {
        finalBillReferences =
          rows.contraEntryMode === 'single'
            ? rows.particulars
                .filter((p) => p.ledger && p.billReferences?.length)
                .flatMap((p) =>
                  p.billReferences!.map((b) => ({ ...b, ledger_id: p.ledger!.ledger_id })),
                )
            : rows.contraDoubleRows
                .filter((r) => r.ledger && r.billReferences?.length)
                .flatMap((r) =>
                  r.billReferences!.map((b) => ({ ...b, ledger_id: r.ledger!.ledger_id })),
                );
      } else if (
        effectiveVoucherType === 'Journal' ||
        effectiveVoucherType === 'Reversing Journal' ||
        effectiveVoucherType === 'Memorandum'
      ) {
        finalBillReferences = rows.journalRows
          .filter((r) => r.ledger && r.billReferences?.length)
          .flatMap((r) => r.billReferences!.map((b) => ({ ...b, ledger_id: r.ledger!.ledger_id })));
      } else if (
        [
          'Sales',
          'Purchase',
          'Credit Note',
          'Debit Note',
          'Delivery Note',
          'Receipt Note',
          'Rejection In',
          'Rejection Out',
          'Material In',
          'Material Out',
        ].includes(effectiveVoucherType)
      ) {
        if (rows.partyLedger && meta.partyBillReferences.length > 0) {
          finalBillReferences = meta.partyBillReferences.map((b) => ({
            ...b,
            ledger_id: rows.partyLedger!.ledger_id,
          }));
        }
        finalBillReferences = [
          ...finalBillReferences,
          ...rows.additionalEntries
            .filter((p) => p.ledger && p.billReferences?.length)
            .flatMap((p) =>
              p.billReferences!.map((b) => ({ ...b, ledger_id: p.ledger!.ledger_id })),
            ),
        ];
      }

      // ── Final payload / API submission ──────────────────────────────────
      let res: any;
      if (effectiveVoucherType === 'Physical Stock') {
        const physicalLines = rows.stockEntries
          .filter((r) => r.stockItem && Number(r.quantityRaw) > 0)
          .map((r, lineIdx) => ({
            stock_item_id: r.stockItem!.item_id,
            godown_id: r.godown?.godown_id ?? null,
            batch_no: r.batchNo || null,
            lot_no: r.lotNo || null,
            manufacturing_date: r.mfgDate || null,
            expiry_date: r.expiryDate || null,
            quantity: Number(r.quantityRaw),
            rate: Number(r.rateRaw) || 0,
            amount: Number(r.amountRaw) || 0,
            line_order: lineIdx + 1,
          }));
        res = await window.api.physicalStock.create({
          company_id: companyId!,
          voucher_no: meta.voucherNumber,
          voucher_date: meta.date,
          reference_no: meta.referenceNumber || null,
          narration: meta.narration || null,
          is_optional: 0,
          is_post_dated: meta.status === 'Post-Dated' ? 1 : 0,
          lines: physicalLines,
        });
      } else if (effectiveVoucherType === 'Attendance') {
        const attEntries = rows.attendanceEntries
          .filter((r) => r.employee && r.attendanceType)
          .map((r) => ({
            employee_id: r.employee!.employee_id,
            attendance_type_id: r.attendanceType!.attendance_type_id,
            value: Number(r.valueRaw) || 0,
          }));
        res = await window.api.attendance.create({
          company_id: companyId!,
          voucher_number: meta.voucherNumber,
          date: meta.date,
          narration: meta.narration || null,
          entries: attEntries,
        });
      } else {
        const isInventoryOnly = [
          'Delivery Note',
          'Receipt Note',
          'Rejection In',
          'Rejection Out',
          'Material In',
          'Material Out',
          'Stock Journal',
          'Manufacturing Journal',
        ].includes(effectiveVoucherType);
        const isOrderVoucher = [
          'Purchase Order',
          'Sales Order',
          'Job Work In Order',
          'Job Work Out Order',
        ].includes(effectiveVoucherType);
        const hasAccountingEntries = ['Sales', 'Purchase', 'Credit Note', 'Debit Note'].includes(
          effectiveVoucherType,
        );
        // Memorandum: non-accounting. Store its Dr/Cr entries but mark the voucher
        // optional so it is excluded from all ledger-balance and report queries
        // (which already filter out is_optional = 1) — it must not affect the books.
        const isNonAccounting = effectiveVoucherType === 'Memorandum';
        // Reversing Journal: a balanced accounting entry (server validates Dr=Cr) but
        // non-posting — like Tally's scenario vouchers it shows in the Day Book yet is
        // excluded from ledger balances/reports (is_optional = 1). Carries an
        // "Applicable Upto" date.
        const isReversingJournal = effectiveVoucherType === 'Reversing Journal';
        const partyLedgerTypes = [
          'Sales',
          'Purchase',
          'Credit Note',
          'Debit Note',
          'Delivery Note',
          'Receipt Note',
          'Rejection In',
          'Rejection Out',
          'Material In',
          'Material Out',
          'Purchase Order',
          'Sales Order',
          'Job Work In Order',
          'Job Work Out Order',
        ];
        const payload: any = {
          company_id: companyId!,
          fy_id: fyId!,
          voucher_type: meta.voucherType,
          date: meta.date,
          status: meta.status,
          supplier_invoice_no: meta.supplierInvoiceNo || null,
          supplier_invoice_date: meta.supplierInvoiceDate || null,
          reference_number: meta.referenceNumber || null,
          reference_date: meta.referenceDate || null,
          place_of_supply: meta.placeOfSupply !== 'Select' ? meta.placeOfSupply : null,
          // Bug 5: persist the selected GST registration so it round-trips on reopen and
          // the backend snapshots the user's explicit choice (not just the company default).
          gst_registration_id: gstRegistration?.gst_id ?? null,
          voucher_class: meta.voucherClass || null,
          narration: meta.narration || null,
          party_ledger_id:
            effectiveVoucherType === 'Payroll' || partyLedgerTypes.includes(effectiveVoucherType)
              ? (rows.partyLedger?.ledger_id ?? null)
              : null,
          party_name:
            effectiveVoucherType === 'Payroll' || partyLedgerTypes.includes(effectiveVoucherType)
              ? (rows.partyLedger?.name ?? null)
              : null,
          // Non-accounting vouchers (Receipt Note, orders) keep their Sales/Purchase
          // ledger on the voucher row since no accounting entry is posted for it.
          sales_purchase_ledger_id: rows.salesPurchaseLedger?.ledger_id ?? null,
          is_accounting_voucher: isInventoryOnly || isOrderVoucher || isNonAccounting ? 0 : 1,
          is_invoice: hasAccountingEntries ? 1 : 0,
          is_inventory_voucher:
            isInventoryOnly || isOrderVoucher || hasAccountingEntries || stock_entries.length > 0
              ? 1
              : 0,
          is_order_voucher:
            [
              'Delivery Note',
              'Receipt Note',
              'Rejection In',
              'Rejection Out',
              'Material In',
              'Material Out',
            ].includes(effectiveVoucherType) || isOrderVoucher
              ? 1
              : 0,
          is_optional: isNonAccounting || isReversingJournal ? 1 : 0,
          is_post_dated: meta.status === 'Post-Dated' ? 1 : 0,
          applicable_upto: isReversingJournal ? meta.applicableUpto || meta.date : null,
          entries: isInventoryOnly || isOrderVoucher ? [] : entries,
          stock_entries,
          bill_references: finalBillReferences.length > 0 ? finalBillReferences : undefined,
          bank_details: meta.bankDetails || undefined,
          cash_denominations: meta.cashDenominations || undefined,
          receipt_details:
            effectiveVoucherType === 'Receipt Note' ? meta.receiptDetails || undefined : undefined,
          party_details: meta.partyDetails || undefined,
          dispatch_details:
            effectiveVoucherType === 'Delivery Note' ||
            effectiveVoucherType === 'Job Work In Order' ||
            effectiveVoucherType === 'Job Work Out Order'
              ? meta.dispatchDetails || undefined
              : undefined,
          credit_note_details: meta.creditNoteDetails || undefined,
          debit_note_details: meta.debitNoteDetails || undefined,
          excise_details: meta.exciseDetails || undefined,
          vat_details: meta.vatDetails || undefined,
          order_details:
            meta.orderDetails || meta.sourceGodown
              ? {
                  ...(meta.orderDetails || {}),
                  source_godown_id: meta.sourceGodown?.godown_id ?? null,
                  source_godown_name: meta.sourceGodown?.name ?? null,
                }
              : undefined,
          payroll_entries:
            effectiveVoucherType === 'Payroll'
              ? rows.payrollEntriesFromGroups
                  .filter((r) => r.employee && r.payHead && Number(r.amountRaw) > 0)
                  .map((r) => ({
                    employee_id: r.employee!.employee_id,
                    pay_head_id: r.payHead!.pay_head_id,
                    amount: Number(r.amountRaw),
                    category_id: r.category?.cc_cat_id ?? null,
                  }))
              : undefined,
        };
        if (editVoucherId) {
          res = await window.api.voucher.update({ ...payload, voucher_id: editVoucherId });
        } else {
          res = await window.api.voucher.create(payload);
        }
      }

      if (res.success) {
        const savedNumber = meta.voucherNumber;
        if (editVoucherId) {
          meta.setSuccess(`Voucher No. ${savedNumber} updated successfully.`);
          ledgers.fetchContextData();
          onSaved?.();
        } else {
          resetForm();
          meta.setSuccess(`Voucher No. ${savedNumber} saved successfully.`);
          ledgers.fetchContextData();
        }
      } else {
        meta.setError(res.error || 'Failed to save voucher.');
      }
    } catch (e: any) {
      meta.setError(e?.message || 'Unexpected error.');
    } finally {
      meta.setIsSubmitting(false);
    }
  }, [
    validate,
    companyId,
    fyId,
    effectiveVoucherType,
    meta,
    rows,
    ledgers.fetchContextData,
    editVoucherId,
    onSaved,
    gstRegistration,
  ]);

  // ── resetForm ──────────────────────────────────────────────────────────────

  const resetForm = useCallback(() => {
    meta.resetMeta();
    rows.resetRows(effectiveVoucherType);
    fetchNextNumber();
    // Bug 5: re-seed the default GST registration for the next new voucher rather than
    // dropping back to "Not Applicable".
    gstTouchedRef.current = false;
    setGstRegistrationState(pickDefaultRegistration());
  }, [
    meta.resetMeta,
    rows.resetRows,
    effectiveVoucherType,
    fetchNextNumber,
    pickDefaultRegistration,
  ]);

  resetFormRef.current = resetForm;

  // ── Public API — IDENTICAL to original useVoucherForm ─────────────────────

  return {
    // ── Voucher meta
    voucherType: meta.voucherType,
    setVoucherType: meta.setVoucherType,
    voucherNumber: meta.voucherNumber,
    voucherNumberLoading: meta.voucherNumberLoading,
    setVoucherNumber: meta.setVoucherNumber,
    date: meta.date,
    setDate: meta.setDate,
    dateDisplay: meta.dateDisplay,
    status: meta.status,
    setStatus: meta.setStatus,
    applicableUpto: meta.applicableUpto,
    setApplicableUpto: meta.setApplicableUpto,
    supplierInvoiceNo: meta.supplierInvoiceNo,
    setSupplierInvoiceNo: meta.setSupplierInvoiceNo,
    supplierInvoiceDate: meta.supplierInvoiceDate,
    setSupplierInvoiceDate: meta.setSupplierInvoiceDate,
    narration: meta.narration,
    setNarration: meta.setNarration,

    // ── Computed totals
    totalAmount: rows.totalAmount,
    debitTotal: rows.debitTotal,
    creditTotal: rows.creditTotal,
    particularsTotal: rows.particularsTotal,

    // ── Submission
    isSubmitting: meta.isSubmitting,
    error: meta.error,
    setError: meta.setError,
    success: meta.success,
    setSuccess: meta.setSuccess,
    handleSubmit,
    resetForm,

    // ── Advanced allocations
    activeAllocation: meta.activeAllocation,
    setActiveAllocation: meta.setActiveAllocation,
    partyBillReferences: meta.partyBillReferences,
    setPartyBillReferences: meta.setPartyBillReferences,
    bankDetails: meta.bankDetails,
    setBankDetails: meta.setBankDetails,
    cashDenominations: meta.cashDenominations,
    setCashDenominations: meta.setCashDenominations,
    receiptDetails: meta.receiptDetails,
    setReceiptDetails: meta.setReceiptDetails,
    partyDetails: meta.partyDetails,
    setPartyDetails: meta.setPartyDetails,
    dispatchDetails: meta.dispatchDetails,
    setDispatchDetails: meta.setDispatchDetails,
    creditNoteDetails: meta.creditNoteDetails,
    setCreditNoteDetails: meta.setCreditNoteDetails,
    debitNoteDetails: meta.debitNoteDetails,
    setDebitNoteDetails: meta.setDebitNoteDetails,
    exciseDetails: meta.exciseDetails,
    setExciseDetails: meta.setExciseDetails,
    vatDetails: meta.vatDetails,
    setVatDetails: meta.setVatDetails,
    orderDetails: meta.orderDetails,
    setOrderDetails: meta.setOrderDetails,
    sourceGodown: meta.sourceGodown,
    setSourceGodown: meta.setSourceGodown,

    // ── Reference / invoice
    referenceNumber: meta.referenceNumber,
    setReferenceNumber: meta.setReferenceNumber,
    referenceDate: meta.referenceDate,
    setReferenceDate: meta.setReferenceDate,
    placeOfSupply: meta.placeOfSupply,
    setPlaceOfSupply: meta.setPlaceOfSupply,
    voucherClass: meta.voucherClass,
    setVoucherClass: meta.setVoucherClass,

    // ── Master data
    allGstRegistrations,
    allTaxUnits,
    allPriceLevels,
    gstRegistration,
    setGstRegistration,
    persistDefaultRegistration,
    taxUnit,
    setTaxUnit,
    priceLevel,
    setPriceLevel,
    allLedgers: ledgers.allLedgers,
    allStockItems: ledgers.allStockItems,
    stockBalances: ledgers.stockBalances,
    godownBalances,
    fetchGodownBalances,
    activeBatches,
    fetchActiveBatches,
    allGodowns: ledgers.allGodowns,
    allUnits: ledgers.allUnits,
    allEmployees: ledgers.allEmployees,
    allAttendanceTypes: ledgers.allAttendanceTypes,
    allPayHeads: ledgers.allPayHeads,
    allCostCategories: ledgers.allCostCategories,
    allEmployeeCategories: ledgers.allEmployeeCategories,
    ledgersLoading: ledgers.ledgersLoading,
    fetchContextData: ledgers.fetchContextData,

    // ── Layout 4 — Attendance & Payroll
    attendanceEntries: rows.attendanceEntries,
    setAttendanceEntries: rows.setAttendanceEntries,
    handleAddAttendanceRow: rows.handleAddAttendanceRow,
    handleUpdateAttendanceRow: rows.handleUpdateAttendanceRow,
    handleRemoveAttendanceRow: rows.handleRemoveAttendanceRow,
    payrollEntries: rows.payrollEntries,
    setPayrollEntries: rows.setPayrollEntries,
    handleAddPayrollRow: rows.handleAddPayrollRow,
    handleUpdatePayrollRow: rows.handleUpdatePayrollRow,
    handleRemovePayrollRow: rows.handleRemovePayrollRow,
    // ── Payroll groups
    payrollGroups: rows.payrollGroups,
    setPayrollGroups: rows.setPayrollGroups,
    payrollEntriesFromGroups: rows.payrollEntriesFromGroups,
    handleAddPayrollGroup: rows.handleAddPayrollGroup,
    handleUpdatePayrollGroup: rows.handleUpdatePayrollGroup,
    handleAddPayrollEmployeeRow: rows.handleAddPayrollEmployeeRow,
    handleUpdatePayrollEmployeeRow: rows.handleUpdatePayrollEmployeeRow,
    handleAddPayrollPayHeadRow: rows.handleAddPayrollPayHeadRow,
    handleUpdatePayrollPayHeadRow: rows.handleUpdatePayrollPayHeadRow,
    handleRemovePayrollPayHeadRow: rows.handleRemovePayrollPayHeadRow,
    handleRemovePayrollEmployeeRow: rows.handleRemovePayrollEmployeeRow,
    sourceStockEntries: rows.sourceStockEntries,
    setSourceStockEntries: rows.setSourceStockEntries,
    handleAddSourceStockRow: rows.handleAddSourceStockRow,
    handleUpdateSourceStockRow: rows.handleUpdateSourceStockRow,
    handleRemoveSourceStockRow: rows.handleRemoveSourceStockRow,
    destinationStockEntries: rows.destinationStockEntries,
    setDestinationStockEntries: rows.setDestinationStockEntries,
    handleAddDestinationStockRow: rows.handleAddDestinationStockRow,
    handleUpdateDestinationStockRow: rows.handleUpdateDestinationStockRow,
    handleRemoveDestinationStockRow: rows.handleRemoveDestinationStockRow,

    // ── Search / panel
    ledgerSearchTerm: rows.ledgerSearchTerm,
    setLedgerSearchTerm: rows.setLedgerSearchTerm,
    stockSearchTerm: rows.stockSearchTerm,
    setStockSearchTerm: rows.setStockSearchTerm,
    activeField: rows.activeField,
    handleFieldFocus: rows.handleFieldFocus,
    handleFieldBlur: rows.handleFieldBlur,
    handleLedgerPanelSelect: rows.handleLedgerPanelSelect,

    // ── Layout 1 — single-entry
    accountLedger: rows.accountLedger,
    setAccountLedger: rows.setAccountLedger,
    accountBalance: rows.accountBalance,
    particulars: rows.particulars,
    setParticulars: rows.setParticulars,
    handleUpdateParticularRow: rows.handleUpdateParticularRow,
    handleAddParticularRow: rows.handleAddParticularRow,
    handleRemoveParticularRow: rows.handleRemoveParticularRow,

    // ── Layout 1b — Contra double-entry
    contraEntryMode: rows.contraEntryMode,
    setContraEntryMode: rows.setContraEntryMode,
    contraDoubleRows: rows.contraDoubleRows,
    setContraDoubleRows: rows.setContraDoubleRows,
    handleUpdateContraDoubleRow: rows.handleUpdateContraDoubleRow,
    handleAddContraDoubleRow: rows.handleAddContraDoubleRow,
    handleRemoveContraDoubleRow: rows.handleRemoveContraDoubleRow,

    // ── Layout 1c — Receipt double-entry
    receiptEntryMode: rows.receiptEntryMode,
    setReceiptEntryMode: rows.setReceiptEntryMode,
    receiptDoubleRows: rows.receiptDoubleRows,
    setReceiptDoubleRows: rows.setReceiptDoubleRows,
    handleUpdateReceiptDoubleRow: rows.handleUpdateReceiptDoubleRow,
    handleAddReceiptDoubleRow: rows.handleAddReceiptDoubleRow,
    handleRemoveReceiptDoubleRow: rows.handleRemoveReceiptDoubleRow,

    // ── Layout 1d — Payment double-entry
    paymentEntryMode: rows.paymentEntryMode,
    setPaymentEntryMode: rows.setPaymentEntryMode,
    paymentDoubleRows: rows.paymentDoubleRows,
    setPaymentDoubleRows: rows.setPaymentDoubleRows,
    handleUpdatePaymentDoubleRow: rows.handleUpdatePaymentDoubleRow,
    handleAddPaymentDoubleRow: rows.handleAddPaymentDoubleRow,
    handleRemovePaymentDoubleRow: rows.handleRemovePaymentDoubleRow,

    // ── Layout 2 — Journal
    journalEntryMode: rows.journalEntryMode,
    setJournalEntryMode: rows.setJournalEntryMode,
    journalRows: rows.journalRows,
    setJournalRows: rows.setJournalRows,
    handleUpdateJournalRow: rows.handleUpdateJournalRow,
    handleAddJournalRow: rows.handleAddJournalRow,
    handleRemoveJournalRow: rows.handleRemoveJournalRow,

    // ── Layout 3 — Sales / Purchase
    partyLedger: rows.partyLedger,
    setPartyLedger: rows.setPartyLedger,
    partyBalance: rows.partyBalance,
    salesPurchaseLedger: rows.salesPurchaseLedger,
    setSalesPurchaseLedger: rows.setSalesPurchaseLedger,
    salesPurchaseBalance: rows.salesPurchaseBalance,
    stockEntries: rows.stockEntries,
    setStockEntries: rows.setStockEntries,
    handleUpdateStockRow: rows.handleUpdateStockRow,
    handleAddStockRow: rows.handleAddStockRow,
    handleRemoveStockRow: rows.handleRemoveStockRow,
    additionalEntries: rows.additionalEntries,
    setAdditionalEntries: rows.setAdditionalEntries,
    handleUpdateAdditionalRow: rows.handleUpdateAdditionalRow,
    handleAddAdditionalRow: rows.handleAddAdditionalRow,
    handleRemoveAdditionalRow: rows.handleRemoveAdditionalRow,

    // ── Context helpers
    checkIsCashOrBank: ledgers.checkIsCashOrBank,
    checkIsCash: ledgers.checkIsCash,
    checkIsBank: ledgers.checkIsBank,
    checkIsParty: ledgers.checkIsParty,
    checkLedgerGroup: ledgers.checkLedgerGroup,
    negativeStockWarnings: rows.negativeStockWarnings,
    companyId,
    fyId,
  };
}
