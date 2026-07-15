import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCompany } from '../../context/CompanyContext';

import { useVoucherForm } from './hooks/useVoucherForm';
import { hydrateVoucherForm } from './hooks/hydrateVoucherForm';
import { formatDateDisplay } from './hooks/useVoucherMeta';
import { useAutoOpenDetailPopups } from './hooks/useAutoOpenDetailPopups';
import { useVoucherAcceptFlow } from './hooks/useVoucherAcceptFlow';
import { useStockEntryFlow } from './hooks/useStockEntryFlow';
import type { ItemExciseState, InventoryAllocState } from './hooks/useStockEntryFlow';
import { useAmountConfirmFlow } from './hooks/useAmountConfirmFlow';
import { useAllocationSaveHandlers } from './hooks/useAllocationSaveHandlers';
import type { VoucherClassRow } from '@/types/entities/VoucherType';
import { computeCanAccept } from './utils/voucherCanAccept';
import { isVoucherTypeEnabled, type VoucherType } from '@/constants/voucherTypes';
import { computePanelItems, computePanelTitle } from './utils/voucherPanel';
import { AlertBanner, PageTitleBar } from '../../components/ui';
import LedgerListPanel from './components/LedgerListPanel';
import RightSidebar from './components/RightSidebar';
import VoucherPopups from './components/VoucherPopups';
import VoucherBody from './components/VoucherBody';
import { useEInvoiceFlow } from './hooks/useEInvoiceFlow';
import { EInvoiceGeneratePrompt, EInvoiceInfoPopup } from './components/popups/EInvoiceFlowDialogs';
import VoucherPrintPopup from './components/popups/VoucherPrintPopup';
import { INVENTORY_CREATION_TYPES, ORDER_CREATION_TYPES } from './voucherConstants';
import { PRIORITY, useShortcuts, type ShortcutBinding } from '@/lib/shortcuts';
import { isFeatureEnabled } from '@/lib/companyFeatures';
import { useVoucherQuickActions } from './hooks/useVoucherQuickActions';
import TallyConfirm from '@/components/ui/TallyConfirm';
import { useVoucherEnterNav } from './hooks/useVoucherEnterNav';
import { focusFirstField } from './lib/voucherNav';

export default function Vouchers() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY, features } = useCompany();

  const [voucherTypeChildren, setVoucherTypeChildren] = useState<Record<string, string[]>>({});
  const [voucherTypeParentMap, setVoucherTypeParentMap] = useState<Record<string, string>>({});
  const [voucherTypeIdByName, setVoucherTypeIdByName] = useState<Record<string, number>>({});
  const [availableVoucherClasses, setAvailableVoucherClasses] = useState<VoucherClassRow[]>([]);
  const [showTaxRegistrationPopup, setShowTaxRegistrationPopup] = useState(false);

  const resolveEffectiveVoucherType = useCallback(
    (type: string) => voucherTypeParentMap[type] || type,
    [voucherTypeParentMap],
  );

  // Edit mode: /transactions/voucher/:id/edit re-uses this entry screen, hydrated from
  // the saved voucher, and saves via voucher.update instead of create.
  const { id: editIdParam } = useParams<{ id: string }>();
  const editVoucherId = editIdParam ? Number(editIdParam) : null;

  // Inline e-Invoice flow (Tally-style "Provide e-Invoice details" → generate prompt
  // → success). Defined via a ref so the stable callback handed to useVoucherForm can
  // reach the latest handler once `einv` exists below.
  type NewVoucherInfo = {
    voucherId: number;
    savedNumber: string;
    partyGstin?: string;
    voucherType: string;
    provideEInvoice: 'Yes' | 'No';
  };
  const onNewVoucherSavedRef = useRef<(info: NewVoucherInfo) => void>(() => {});
  const handleNewVoucherSaved = useCallback(
    (info: NewVoucherInfo) => onNewVoucherSavedRef.current(info),
    [],
  );

  const form = useVoucherForm(
    resolveEffectiveVoucherType,
    editVoucherId,
    editVoucherId ? () => navigate(`/transactions/voucher/${editVoucherId}`) : undefined,
    handleNewVoucherSaved,
  );

  const einv = useEInvoiceFlow();
  // After the e-Invoice success popup, offer the Tally "Voucher Printing" dialog.
  const generatedVoucherIdRef = useRef<number | null>(null);
  const [printVoucherId, setPrintVoucherId] = useState<number | null>(null);

  // Load the voucher once master data (ledgers/items) is ready, then populate the form.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!editVoucherId || hydratedRef.current) return;
    if (form.ledgersLoading || !(form.allLedgers && form.allLedgers.length)) return;
    hydratedRef.current = true;
    (async () => {
      try {
        const res = await window.api.voucher.getById(editVoucherId);
        if (res.success && res.voucher) hydrateVoucherForm(form, res.voucher);
        else form.setError(res.error || 'Failed to load voucher for editing.');
      } catch (e: any) {
        form.setError(e?.message || 'Failed to load voucher for editing.');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editVoucherId, form.ledgersLoading, form.allLedgers]);

  const effectiveVoucherType = resolveEffectiveVoucherType(form.voucherType);

  // On a fresh create-save, queue the "Generate e-Invoice?" prompt when the user set
  // "Provide e-Invoice details" = Yes (captured into `info` at save time) AND the
  // party is registered (IRN needs a recipient GSTIN). The field itself lives in the
  // Sales/Credit Note/Debit Note bodies. Assigned in an effect (not during render).
  useEffect(() => {
    onNewVoucherSavedRef.current = (info) => {
      if (
        info.provideEInvoice === 'Yes' &&
        info.partyGstin &&
        ['Sales', 'Credit Note', 'Debit Note'].includes(info.voucherType)
      ) {
        einv.requestGenerate({ voucherId: info.voucherId, savedNumber: info.savedNumber });
      }
    };
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showApplicableUptoPicker, setShowApplicableUptoPicker] = useState(false);
  // Inventory Allocations sub-screen for a Journal/Reversing Journal ledger row
  // whose ledger affects inventory (Purchase/Sales A/c).
  const [inventoryAlloc, setInventoryAlloc] = useState<InventoryAllocState | null>(null);
  const [itemExcise, setItemExcise] = useState<ItemExciseState | null>(null);
  const [showOtherVouchers, setShowOtherVouchers] = useState(false);
  const [subDropdownType, setSubDropdownType] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Detail sub-screen visibility + Tally's party-driven auto-open chains.
  const popups = useAutoOpenDetailPopups(form, effectiveVoucherType);
  const {
    showDispatchDetails,
    setShowDispatchDetails,
    showReceiptDetails,
    setShowReceiptDetails,
    showPartyDetails,
    setShowPartyDetails,
    showManufacturerDetails,
    setShowManufacturerDetails,
    showCreditNoteDetails,
    setShowCreditNoteDetails,
    showExciseDetails,
    setShowExciseDetails,
    showVatDetails,
    setShowVatDetails,
    showDebitNoteExcise,
    setShowDebitNoteExcise,
    showOrderDetails,
    setShowOrderDetails,
    showDebitNoteDetails,
    setShowDebitNoteDetails,
  } = popups;

  const canAccept = useMemo(
    () => computeCanAccept(form, effectiveVoucherType),
    [
      form.isSubmitting,
      form.paymentEntryMode,
      form.journalEntryMode,
      effectiveVoucherType,
      form.contraEntryMode,
      form.receiptEntryMode,
      form.contraDoubleRows,
      form.receiptDoubleRows,
      form.paymentDoubleRows,
      form.accountLedger,
      form.particulars,
      form.journalRows,
      form.debitTotal,
      form.creditTotal,
      form.partyLedger,
      form.salesPurchaseLedger,
      form.stockEntries,
      form.sourceStockEntries,
      form.destinationStockEntries,
      form.attendanceEntries,
      form.payrollEntries,
    ],
  );

  // Whenever a main-form Godown field is focused, load that row's item's
  // per-godown balances so the shared List of Godowns panel shows a quantity
  // for every voucher (Stock Journal, Stock Transfer, Delivery/Receipt Note,
  // Physical Stock, …) — not just Physical Stock. The active row can live in the
  // single-table (stockEntries) or the Stock/Mfg Journal source/destination tables.
  useEffect(() => {
    if (form.activeField?.type !== 'stockGodown') return;
    const rowId = (form.activeField as any).rowId;
    const row =
      form.stockEntries.find((r) => r.id === rowId) ??
      form.sourceStockEntries.find((r) => r.id === rowId) ??
      form.destinationStockEntries.find((r) => r.id === rowId);
    const itemId = row?.stockItem?.item_id;
    if (itemId) form.fetchGodownBalances(itemId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.activeField]);

  // Accept-time allocation prompts + Enter-key row advance (shared flows).
  const { handleAccept, acceptRef, proceedToNextRow } = useVoucherAcceptFlow(
    form,
    effectiveVoucherType,
  );

  // Stock item entry focus flow + allocation-popup save handlers for item rows.
  const {
    focusStockQty,
    focusStockRate,
    proceedToNextStockRow,
    handlePhysicalStockQtyEnter,
    physicalStockEndEntry,
    physicalStockGodownNewItem,
    handleStockJournalItemEndOfList,
    journalParticularEndOfList,
    stockItemEndOfList,
    additionalLedgerEndOfList,
    handleSaveBatchAllocations,
    handleSaveMaterialInAllocations,
    handleSaveJobWorkAllocations,
    handleSaveItemExcise,
    handleSaveInventoryAllocation,
  } = useStockEntryFlow(form, effectiveVoucherType, {
    itemExcise,
    setItemExcise,
    inventoryAlloc,
    setInventoryAlloc,
  });

  // Enter-on-amount allocation dispatch + selection-time allocation opener.
  const { handleAmountConfirm, handleLedgerSelectWithAllocation } = useAmountConfirmFlow(
    form,
    effectiveVoucherType,
    { proceedToNextRow, setInventoryAlloc },
  );

  // Save handlers for the bill-wise / cost-centre / bank / detail popups.
  const {
    handleSaveBillWise,
    handleSaveCostCentre,
    handleSaveBankDetails,
    handleSaveCashDenomination,
    handleSaveDispatchDetails,
    handleSaveOrderDetails,
    handleImportVoucherItems,
    handleSaveReceiptDetails,
    handleSavePartyDetails,
    handleSaveManufacturerDetails,
    handleSaveExciseDetails,
    handleSaveDebitNoteExcise,
    handleSaveVatDetails,
    handleSaveCreditNoteDetails,
    handleSaveDebitNoteDetails,
  } = useAllocationSaveHandlers(form, effectiveVoucherType, {
    proceedToNextRow,
    acceptRef,
    selectedCompany,
    popups,
  });

  // ─── Ledger panel items ──────────────────────────────────────────────

  const panelOpen = !!form.activeField;

  // Generic Enter-to-advance navigation for the voucher body (every voucher).
  // The engine reads live DOM order, so it needs no per-voucher wiring; it only
  // acts on fields that don't already handle Enter themselves. Scoped to the
  // body container so the picker panel/popups (rendered outside it) keep theirs.
  const bodyRef = useRef<HTMLDivElement>(null);
  useVoucherEnterNav(bodyRef);

  const panelItems = useMemo(
    () => computePanelItems(form, effectiveVoucherType),
    [
      form.activeField,
      effectiveVoucherType,
      form.paymentEntryMode,
      form.journalEntryMode,
      form.receiptEntryMode,
      form.paymentDoubleRows,
      form.receiptDoubleRows,
      form.allLedgers,
      form.allStockItems,
      form.allGodowns,
      form.allEmployees,
      form.allAttendanceTypes,
      form.allPayHeads,
      form.checkIsCashOrBank,
      form.checkLedgerGroup,
    ],
  );

  const panelTitle = useMemo(
    () => computePanelTitle(form, effectiveVoucherType),
    [form.activeField, effectiveVoucherType, form.receiptEntryMode, form.receiptDoubleRows],
  );

  const panelSearchTerm =
    form.activeField?.type === 'stockItem' ? form.stockSearchTerm : form.ledgerSearchTerm;

  const handlePanelSearchChange = useCallback(
    (v: string) => {
      if (form.activeField?.type === 'stockItem') form.setStockSearchTerm(v);
      else form.setLedgerSearchTerm(v);
    },
    [form.activeField, form.setStockSearchTerm, form.setLedgerSearchTerm],
  );

  useEffect(() => {
    if (!selectedCompany) return;
    window.api.voucherType
      .getAll(selectedCompany.company_id)
      .then((res) => {
        if (res.success && res.voucherTypes) {
          const childrenMap: Record<string, string[]> = {};
          const parentMap: Record<string, string> = {};
          const idMap: Record<string, number> = {};
          for (const vt of res.voucherTypes) {
            if (vt.name && vt.vt_id) idMap[vt.name] = vt.vt_id;
            // Predefined types ARE the base buttons (Contra/Payment/Receipt/...). Skip them.
            if (vt.is_predefined) continue;
            // Nest a custom voucher type under its explicit parent, else under its
            // "Select type of voucher" category — so parent-less custom types aren't ignored.
            const parentName = vt.parent_vt_id
              ? res.voucherTypes.find((p) => p.vt_id === vt.parent_vt_id)?.name
              : vt.category;
            if (parentName && vt.name && parentName !== vt.name) {
              if (!childrenMap[parentName]) childrenMap[parentName] = [];
              if (!childrenMap[parentName].includes(vt.name)) childrenMap[parentName].push(vt.name);
              parentMap[vt.name] = parentName;
            }
          }
          setVoucherTypeChildren(childrenMap);
          setVoucherTypeParentMap(parentMap);
          setVoucherTypeIdByName(idMap);
        }
      })
      .catch(() => {});
  }, [selectedCompany]);

  // Load the selected voucher type's Name-of-Class list (if any), so a "Class" selector
  // can be shown next to it — matches TallyPrime's behaviour of hiding the Class field
  // entirely when no classes are defined for that voucher type.
  useEffect(() => {
    const vtId = voucherTypeIdByName[effectiveVoucherType];
    if (!vtId) {
      setAvailableVoucherClasses([]);
      return;
    }
    let active = true;
    window.api.voucherType
      .getConfig(vtId)
      .then((res) => {
        if (!active) return;
        setAvailableVoucherClasses(
          res.success && res.config?.voucher_classes ? res.config.voucher_classes : [],
        );
      })
      .catch(() => {
        if (active) setAvailableVoucherClasses([]);
      });
    return () => {
      active = false;
    };
  }, [effectiveVoucherType, voucherTypeIdByName]);

  // Close every open sub-screen / detail popup / dropdown. Called before a
  // voucher switch so the target voucher opens clean (TallyPrime behaviour).
  const closeAllSubScreens = useCallback(() => {
    setShowDatePicker(false);
    setShowApplicableUptoPicker(false);
    setShowOtherVouchers(false);
    setShowTaxRegistrationPopup(false);
    setSubDropdownType(null);
    setInventoryAlloc(null);
    setItemExcise(null);
    setShowDispatchDetails(false);
    setShowReceiptDetails(false);
    setShowPartyDetails(false);
    setShowManufacturerDetails(false);
    setShowCreditNoteDetails(false);
    setShowExciseDetails(false);
    setShowVatDetails(false);
    setShowDebitNoteExcise(false);
    setShowOrderDetails(false);
    setShowDebitNoteDetails(false);
  }, [
    setShowDispatchDetails,
    setShowReceiptDetails,
    setShowPartyDetails,
    setShowManufacturerDetails,
    setShowCreditNoteDetails,
    setShowExciseDetails,
    setShowVatDetails,
    setShowDebitNoteExcise,
    setShowOrderDetails,
    setShowDebitNoteDetails,
  ]);

  // The single, global voucher switch. Closes whatever is open and switches the
  // voucher type directly — no matter which voucher / popup / field is active.
  // `setVoucherType` resets the form (see useVoucherForm's type-change effect),
  // so the new voucher is always clean. Keyboard switching is direct (unlike the
  // sidebar's handleTypeKey, which may open a custom-type sub-dropdown on click).
  const switchVoucher = useCallback(
    (type: string) => {
      // F11 gate: ignore shortcuts/selection for voucher types whose feature is off.
      if (!isVoucherTypeEnabled(features, type as VoucherType)) return;
      closeAllSubScreens();
      form.setVoucherClass('');
      form.setVoucherType(type);
    },
    [closeAllSubScreens, form.setVoucherClass, form.setVoucherType, features],
  );

  // Any voucher sub-screen / detail popup currently open. Accept and Escape
  // yield to an open popup (it handles its own keys); voucher-open shortcuts do
  // not — they close it and switch, per the requirement.
  const anyPopupOpen =
    showDatePicker ||
    showApplicableUptoPicker ||
    showOtherVouchers ||
    showTaxRegistrationPopup ||
    !!inventoryAlloc ||
    !!itemExcise ||
    showDispatchDetails ||
    showReceiptDetails ||
    showPartyDetails ||
    showManufacturerDetails ||
    showCreditNoteDetails ||
    showExciseDetails ||
    showVatDetails ||
    showDebitNoteExcise ||
    showOrderDetails ||
    showDebitNoteDetails ||
    !!subDropdownType;

  // Initial focus (Tally "start typing, no click"): when a voucher opens or its
  // type / entry-mode changes (which resets the form), place the cursor on the
  // first editable field of the body. The generic Enter-nav engine then walks
  // every field from there. Guarded so it never steals focus from an open popup,
  // the ledger list, an allocation, or a field the user already moved to; waits
  // for master data so the first field (which may open the ledger list) is ready.
  useEffect(() => {
    if (form.ledgersLoading) return;
    if (anyPopupOpen || form.activeField || form.activeAllocation) return;
    const body = bodyRef.current;
    if (!body) return;
    const t = setTimeout(() => {
      if (form.activeField || form.activeAllocation) return;
      const active = document.activeElement as HTMLElement | null;
      if (active && body.contains(active)) return;
      focusFirstField(body);
    }, 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    effectiveVoucherType,
    form.contraEntryMode,
    form.paymentEntryMode,
    form.receiptEntryMode,
    form.journalEntryMode,
    form.ledgersLoading,
  ]);

  // TallyPrime global shortcuts — registered in the CAPTURE phase so they fire
  // before any focused field/popup handler and win regardless of the current
  // voucher state. Every voucher is reachable directly from every other voucher.
  const voucherOpenBindings: ShortcutBinding[] = [
    { keys: 'F2', handler: () => setShowDatePicker(true) },
    { keys: 'F3', handler: () => setShowTaxRegistrationPopup(true) },
    { keys: 'F10', handler: () => setShowOtherVouchers(true) },
    { keys: 'F4', handler: () => switchVoucher('Contra') },
    { keys: 'F5', handler: () => switchVoucher('Payment') },
    { keys: 'F6', handler: () => switchVoucher('Receipt') },
    { keys: 'F7', handler: () => switchVoucher('Journal') },
    { keys: 'F8', handler: () => switchVoucher('Sales') },
    { keys: 'F9', handler: () => switchVoucher('Purchase') },
    { keys: 'Alt+F5', handler: () => switchVoucher('Debit Note') },
    { keys: 'Alt+F6', handler: () => switchVoucher('Credit Note') },
    { keys: 'Alt+F7', handler: () => switchVoucher('Stock Journal') },
    { keys: 'Alt+F8', handler: () => switchVoucher('Delivery Note') },
    { keys: 'Alt+F9', handler: () => switchVoucher('Receipt Note') },
    { keys: 'Ctrl+F4', handler: () => switchVoucher('Payroll') },
    { keys: 'Ctrl+F5', handler: () => switchVoucher('Rejection Out') },
    { keys: 'Ctrl+F6', handler: () => switchVoucher('Rejection In') },
    { keys: 'Ctrl+F7', handler: () => switchVoucher('Physical Stock') },
    { keys: 'Ctrl+F8', handler: () => switchVoucher('Sales Order') },
    { keys: 'Ctrl+F9', handler: () => switchVoucher('Purchase Order') },
    // Ctrl+H — TallyPrime "Change Mode" → toggle Item ⇄ Accounting Invoice for the trade
    // vouchers only. NO-OP when F11 maintain_inventory is off (there is no stock grid, so
    // the voucher is already forced to accounting mode and must stay there).
    {
      keys: 'Ctrl+H',
      handler: () => {
        if (!['Sales', 'Purchase', 'Credit Note', 'Debit Note'].includes(effectiveVoucherType))
          return;
        if (!isFeatureEnabled(features, 'maintain_inventory')) return;
        form.setInvoiceMode((m: 'item' | 'accounting') => (m === 'item' ? 'accounting' : 'item'));
      },
    },
  ].map((b) => ({ ...b, capture: true, allowInInputs: true, allowInDialogs: true }));

  useShortcuts(
    [
      ...voucherOpenBindings,
      // Ctrl+A is TallyPrime's Accept; Alt+A kept as an alias. Declines (so the
      // event flows on) while a sub-screen is open — that popup accepts itself.
      {
        keys: ['Ctrl+A', 'Alt+A'],
        capture: true,
        allowInInputs: true,
        handler: () => {
          if (anyPopupOpen) return false;
          if (canAccept) handleAccept();
        },
      },
    ],
    // Suspended while the Cancel? prompt is up — it owns the keyboard then.
    { priority: PRIORITY.PANEL, enabled: !showCancelConfirm },
  );

  // Quick actions that need data access (cancel, narration retrieval, prev/next).
  const quickActions = useVoucherQuickActions({
    companyId: selectedCompany?.company_id,
    fyId: activeFY?.fy_id ?? undefined,
    voucherType: effectiveVoucherType,
    editVoucherId: editVoucherId ?? null,
    partyLedgerId: form.partyLedger?.ledger_id,
    setNarration: form.setNarration,
    resetForm: form.resetForm,
    navigate,
  });

  // Voucher operation shortcuts (Ctrl+L/T, Alt+X, Ctrl+R, Alt+R, Page Up/Down).
  // Capture-phase so they win over field handlers; each declines (returns false,
  // letting the key flow on to whatever picker/popup is open) unless the main
  // voucher body is the active surface — so PgUp/PgDn still pages an open list,
  // and Ctrl+L etc. don't fire mid-popup.
  const bodyActive = !anyPopupOpen && !form.activeField && !form.activeAllocation;
  const guarded = (fn: () => void) => () => {
    if (!bodyActive) return false;
    fn();
    return undefined;
  };
  useShortcuts(
    [
      { keys: 'Ctrl+L', handler: guarded(() => form.setIsOptional((p: boolean) => !p)) },
      {
        keys: 'Ctrl+T',
        handler: guarded(() =>
          form.setStatus((p) => (p === 'Post-Dated' ? 'Regular' : 'Post-Dated')),
        ),
      },
      { keys: 'Alt+X', handler: guarded(() => setShowCancelConfirm(true)) },
      { keys: 'Ctrl+R', handler: guarded(() => void quickActions.copyNarrationSameType()) },
      { keys: 'Alt+R', handler: guarded(() => void quickActions.retrieveNarrationSameParty()) },
      { keys: 'PageUp', handler: guarded(() => void quickActions.openAdjacentVoucher(-1)) },
      { keys: 'PageDown', handler: guarded(() => void quickActions.openAdjacentVoucher(1)) },
    ].map((b) => ({ ...b, capture: true, allowInInputs: true })),
    { priority: PRIORITY.PANEL, enabled: !showCancelConfirm },
  );

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        if (effectiveVoucherType === 'Contra') {
          form.setContraEntryMode((p: 'single' | 'double') =>
            p === 'single' ? 'double' : 'single',
          );
        } else if (effectiveVoucherType === 'Receipt') {
          form.setReceiptEntryMode((p: 'single' | 'double') =>
            p === 'single' ? 'double' : 'single',
          );
        } else if (effectiveVoucherType === 'Payment') {
          form.setPaymentEntryMode((p: 'single' | 'double') =>
            p === 'single' ? 'double' : 'single',
          );
        } else if (effectiveVoucherType === 'Journal') {
          form.setJournalEntryMode((p: 'single' | 'double') =>
            p === 'single' ? 'double' : 'single',
          );
        }
      }
      if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        navigate('/master/create/ledger');
      }
      if (
        e.key === 'Escape' &&
        !form.activeField &&
        !form.activeAllocation &&
        !showDatePicker &&
        !showApplicableUptoPicker &&
        !showDispatchDetails &&
        !showReceiptDetails &&
        !showCreditNoteDetails &&
        !showDebitNoteDetails &&
        !showVatDetails &&
        !showOrderDetails &&
        !showOtherVouchers
      ) {
        e.preventDefault();
        if (subDropdownType) {
          setSubDropdownType(null);
        } else {
          navigate('/');
        }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [
    form.setPaymentEntryMode,
    form.setJournalEntryMode,
    form.setContraEntryMode,
    form.setReceiptEntryMode,
    effectiveVoucherType,
    form.activeField,
    form.activeAllocation,
    showDatePicker,
    showApplicableUptoPicker,
    showDispatchDetails,
    showReceiptDetails,
    showCreditNoteDetails,
    showDebitNoteDetails,
    showVatDetails,
    showOrderDetails,
    showOtherVouchers,
    subDropdownType,
    navigate,
  ]);

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-white text-black text-sm select-none overflow-hidden">
      {form.error && (
        <AlertBanner type="error" message={form.error} onDismiss={() => form.setError(null)} />
      )}
      {form.success && (
        <AlertBanner
          type="success"
          message={form.success}
          onDismiss={() => form.setSuccess(null)}
          actions={
            <button
              onClick={() => navigate('/transactions/voucher-list')}
              className="text-xs underline"
            >
              View Register →
            </button>
          }
        />
      )}
      {form.negativeStockWarnings?.length > 0 && (
        <AlertBanner
          type="warning"
          message={`Negative Stock: ${form.negativeStockWarnings.join('; ')} — entry is allowed and can be accepted.`}
        />
      )}

      {/* ── Title bar ── */}
      <PageTitleBar
        title={`${effectiveVoucherType === 'Attendance' ? 'Attendance' : effectiveVoucherType === 'Payroll' ? 'Payroll' : ['Purchase Order', 'Sales Order', 'Job Work In Order', 'Job Work Out Order'].includes(effectiveVoucherType) ? 'Order' : INVENTORY_CREATION_TYPES.includes(effectiveVoucherType) ? 'Inventory' : 'Accounting'} Voucher ${editVoucherId ? 'Alteration' : 'Creation'}`}
        subtitle={selectedCompany?.name ?? ''}
        subtitleCenter
        actions={
          <button
            onClick={() => navigate('/')}
            className="text-white text-sm font-bold hover:opacity-60 leading-none"
          >
            ✕
          </button>
        }
      />
      {/* ── GST Registration / Tax Unit ── */}
      {([
        'Sales',
        'Purchase',
        'Contra',
        'Payment',
        'Journal',
        'Receipt',
        'Credit Note',
        'Debit Note',
        'Attendance',
      ].includes(effectiveVoucherType) ||
        INVENTORY_CREATION_TYPES.includes(effectiveVoucherType) ||
        ORDER_CREATION_TYPES.includes(effectiveVoucherType)) && (
        <div className="flex justify-center gap-2 px-3 py-1 border-b border-zinc-200 bg-white shrink-0 text-sm">
          <div className="text-right text-zinc-500">
            <div>GST Registration</div>
            {[
              'Sales',
              'Purchase',
              'Stock Journal',
              'Manufacturing Journal',
              'Purchase Order',
              'Sales Order',
              'Job Work In Order',
              'Job Work Out Order',
              'Receipt Note',
            ].includes(effectiveVoucherType) && <div>Tax Unit</div>}
          </div>
          <div className="text-zinc-500">
            <div>:</div>
            {[
              'Sales',
              'Purchase',
              'Stock Journal',
              'Manufacturing Journal',
              'Purchase Order',
              'Receipt Note',
            ].includes(effectiveVoucherType) && <div>:</div>}
          </div>
          <div className="font-semibold text-black">
            <div>
              {form.gstRegistration
                ? form.gstRegistration.state_id
                  ? `${form.gstRegistration.state_id} Registration`
                  : (form.gstRegistration.legal_name ??
                    form.gstRegistration.trade_name ??
                    form.gstRegistration.name ??
                    form.gstRegistration.gstin)
                : '♦ Not Applicable'}
            </div>
            {[
              'Sales',
              'Purchase',
              'Stock Journal',
              'Manufacturing Journal',
              'Purchase Order',
              'Sales Order',
              'Job Work In Order',
              'Job Work Out Order',
              'Receipt Note',
            ].includes(effectiveVoucherType) && (
              <div>{form.taxUnit ? form.taxUnit.name : '♦ Not Applicable'}</div>
            )}
          </div>
        </div>
      )}

      {/* ── Status : Optional — shown (all voucher types) only when L:Optional is on ── */}
      {form.isOptional && (
        <div className="flex justify-center gap-2 px-3 py-1 border-b border-zinc-200 bg-white shrink-0 text-sm">
          <div className="text-right text-zinc-500">Status</div>
          <div className="text-zinc-500">:</div>
          <div className="font-semibold italic text-black">Optional</div>
        </div>
      )}

      {/* ── Voucher type / number / date bar ── */}
      <div className="flex items-center px-3 py-1 border-b border-black bg-white shrink-0">
        <div className="text-xs font-bold text-white bg-black px-3 py-0.5 min-w-[80px] text-center uppercase">
          {form.voucherType}
        </div>
        <span className="text-sm text-black ml-3">No.</span>
        <span className="text-sm font-bold text-black ml-2 mr-6">{form.voucherNumber}</span>
        {availableVoucherClasses.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-black">Class</span>
            <select
              className="text-sm border border-black px-1 py-0 outline-none bg-white"
              value={form.voucherClass}
              onChange={(e) => form.setVoucherClass(e.target.value)}
            >
              <option value="">Not Applicable</option>
              {availableVoucherClasses.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex-1" />
        {form.status === 'Post-Dated' && (
          <span className="text-xs text-black border border-black px-2 py-0 mr-4">Post-Dated</span>
        )}
        <button
          onClick={() => setShowDatePicker(true)}
          className="text-right leading-tight text-black hover:underline focus:outline-none"
          title="F2: Change Date"
        >
          <div className="text-sm font-semibold">{form.dateDisplay}</div>
          <div className="text-[10px] font-normal text-zinc-500">
            {(() => {
              const d = new Date(form.date);
              return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { weekday: 'long' });
            })()}
          </div>
        </button>
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div
          ref={bodyRef}
          data-enter-nav
          className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden border-r border-black"
        >
          <VoucherBody
            effectiveVoucherType={effectiveVoucherType}
            form={form}
            handleAmountConfirm={handleAmountConfirm}
            focusStockQty={focusStockQty}
            focusStockRate={focusStockRate}
            proceedToNextStockRow={proceedToNextStockRow}
            handlePhysicalStockQtyEnter={handlePhysicalStockQtyEnter}
          />

          {/* ── Reversing Journal: Applicable Upto date ── */}
          {effectiveVoucherType === 'Reversing Journal' && (
            <div className="flex items-center border-t border-black shrink-0 px-3 py-1 bg-white">
              <span className="text-sm text-black shrink-0">Applicable Upto</span>
              <span className="text-sm text-black shrink-0 mx-2">:</span>
              <button
                onClick={() => setShowApplicableUptoPicker(true)}
                className="text-sm font-semibold text-black hover:underline focus:outline-none"
                title="Change Applicable Upto date"
              >
                {formatDateDisplay(form.applicableUpto || form.date)}
              </button>
            </div>
          )}

          {/* ── Narration + grand total ── */}
          <div className="flex items-center border-t border-black shrink-0 px-3 py-1 bg-white">
            <span className="text-sm text-black shrink-0 w-24">Narration</span>
            <span className="text-sm text-black shrink-0 mr-2">:</span>
            <input
              type="text"
              data-narration="true"
              className="flex-1 text-sm bg-transparent outline-none border-b border-transparent focus:border-black px-1 py-0"
              value={form.narration}
              onChange={(e) => form.setNarration(e.target.value)}
              onFocus={() => form.handleFieldBlur()}
              onKeyDown={(e) => {
                // Enter at Narration accepts the voucher, completing the keyboard
                // flow for every voucher type (same guard as Alt+A).
                if (e.key === 'Enter' && canAccept && !form.isSubmitting) {
                  e.preventDefault();
                  handleAccept();
                }
              }}
            />
            {form.totalAmount > 0 &&
              (effectiveVoucherType !== 'Contra' || form.contraEntryMode === 'double') && (
                <span className="text-sm font-semibold text-black ml-4 shrink-0 tabular-nums">
                  {form.totalAmount.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              )}
          </div>

          {/* ── Accept / Quit / Cancel ── */}
          <div className="flex items-center justify-between border-t border-black shrink-0 px-3 py-1.5 bg-white">
            <button onClick={() => navigate('/')} className="text-sm text-black hover:underline">
              <span className="underline">Q</span>: Quit
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={handleAccept}
                disabled={form.isSubmitting || !canAccept}
                className="text-sm px-6 py-0.5 bg-black text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-800"
              >
                <span className="underline">A</span>: Accept
              </button>
              <button
                onClick={form.resetForm}
                className="text-sm px-3 py-0.5 border border-black text-black hover:bg-gray-100"
              >
                Cancel Vch
              </button>
            </div>
          </div>
        </div>

        {/* ── Ledger list panel (right of main, left of sidebar) ── */}
        {panelOpen && (
          <LedgerListPanel
            title={panelTitle}
            items={panelItems}
            searchTerm={panelSearchTerm}
            onSearchChange={handlePanelSearchChange}
            onSelect={handleLedgerSelectWithAllocation}
            onClose={form.handleFieldBlur}
            onCreateNew={() => {
              const t = form.activeField?.type;
              if (t === 'stockItem') navigate('/master/create/stock-item');
              else if (t === 'employee' || t === 'payrollEmployee')
                navigate('/master/create/employee');
              else if (t === 'attendanceType') navigate('/master/create/attendance-type');
              else if (t === 'payrollCategory') navigate('/master/create/employee-category');
              else navigate('/master/create/ledger');
            }}
            createLabel={
              form.activeField?.type === 'stockItem'
                ? 'Create Stock Item'
                : form.activeField?.type === 'employee' ||
                    form.activeField?.type === 'payrollEmployee'
                  ? 'Create Employee'
                  : form.activeField?.type === 'attendanceType'
                    ? 'Create Attendance Type'
                    : form.activeField?.type === 'payrollPayHead'
                      ? 'Create Pay Head'
                      : form.activeField?.type === 'payrollCategory'
                        ? 'Create Category'
                        : 'Create'
            }
            onEndOfList={
              form.activeField?.type === 'stockItem'
                ? effectiveVoucherType === 'Physical Stock'
                  ? physicalStockEndEntry
                  : ['Stock Journal', 'Manufacturing Journal'].includes(effectiveVoucherType)
                    ? handleStockJournalItemEndOfList
                    : // Trade vouchers: End of List finishes items → Tax/Ledger section.
                      stockItemEndOfList
                : // Tax/Ledger row (Sales/Purchase/CN/DN): End of List finishes GST entry.
                  form.activeField?.type === 'additional'
                  ? additionalLedgerEndOfList
                  : form.activeField?.type === 'stockGodown' &&
                      effectiveVoucherType === 'Physical Stock'
                    ? () => physicalStockGodownNewItem((form.activeField as any).rowId)
                    : // Any accounting voucher's ledger row (Payment / Receipt / Contra /
                      // Journal, single or double entry): End of List finishes ledger
                      // entry and moves to Narration. `particular` uniquely identifies
                      // these — trade vouchers use stockItem / additional instead
                      form.activeField?.type === 'particular' &&
                        ['Journal', 'Reversing Journal', 'Memorandum'].includes(
                          effectiveVoucherType,
                        )
                      ? journalParticularEndOfList
                      : undefined
            }
            onEnterEmpty={
              // Payroll: blank Enter on a Pay Head → finish this employee, add & focus a new
              // employee under the same category (drops the trailing empty pay-head row first).
              form.activeField?.type === 'payrollPayHead'
                ? () => {
                    const { groupId, empRowId, phRowId } = form.activeField as any;
                    form.handleFieldBlur();
                    form.handleRemovePayrollPayHeadRow?.(groupId, empRowId, phRowId);
                    form.handleAddPayrollEmployeeRow?.(groupId);
                    setTimeout(() => {
                      const nodes = document.querySelectorAll(`[data-payroll-emp^="${groupId}-"]`);
                      (nodes[nodes.length - 1] as HTMLInputElement | null)?.focus();
                    }, 60);
                  }
                : // Payroll: blank Enter on an Employee → finish this category, add & focus a new group's category.
                  form.activeField?.type === 'payrollEmployee'
                  ? () => {
                      form.handleFieldBlur();
                      form.handleAddPayrollGroup?.();
                      setTimeout(() => {
                        const nodes = document.querySelectorAll(`[data-payroll-cat]`);
                        (nodes[nodes.length - 1] as HTMLInputElement | null)?.focus();
                      }, 60);
                    }
                  : form.activeField?.type === 'stockGodown' &&
                      effectiveVoucherType === 'Physical Stock'
                    ? () => physicalStockGodownNewItem((form.activeField as any).rowId)
                    : form.activeField?.type === 'stockItem' &&
                        effectiveVoucherType === 'Physical Stock'
                      ? physicalStockEndEntry
                      : form.activeField?.type === 'stockItem' &&
                          (effectiveVoucherType === 'Stock Journal' ||
                            effectiveVoucherType === 'Manufacturing Journal')
                        ? handleStockJournalItemEndOfList
                        : // Any accounting voucher's ledger row (single or double entry):
                          // a blank Enter finishes ledger entry → Narration.
                          form.activeField?.type === 'particular'
                          ? journalParticularEndOfList
                          : // Trade vouchers: a blank Enter on the item field = End of List.
                            form.activeField?.type === 'stockItem'
                            ? stockItemEndOfList
                            : // Blank Enter on a Tax/Ledger row = End of List (finish GST).
                              form.activeField?.type === 'additional'
                              ? additionalLedgerEndOfList
                              : undefined
            }
            stockBalances={form.activeField?.type === 'stockItem' ? form.stockBalances : undefined}
            godownBalances={
              form.activeField?.type === 'stockGodown' ? form.godownBalances : undefined
            }
            balanceUnit={
              form.activeField?.type === 'stockGodown'
                ? ((
                    form.stockEntries.find((r) => r.id === (form.activeField as any).rowId) ??
                    form.sourceStockEntries.find((r) => r.id === (form.activeField as any).rowId) ??
                    form.destinationStockEntries.find(
                      (r) => r.id === (form.activeField as any).rowId,
                    )
                  )?.unit?.symbol ?? '')
                : undefined
            }
            allUnits={form.activeField?.type === 'stockItem' ? form.allUnits : undefined}
            columns={
              form.activeField?.type === 'employee' || form.activeField?.type === 'payrollEmployee'
                ? [
                    { header: 'Name', render: (e: any) => e.name, className: 'flex-1 min-w-0' },
                    {
                      header: 'Emp No.',
                      render: (e: any) => e.employee_code ?? '',
                      className: 'w-16 text-right font-mono',
                    },
                    {
                      header: 'Group',
                      render: (e: any) => e.group_name ?? e.designation ?? '',
                      className: 'w-24',
                    },
                  ]
                : form.activeField?.type === 'attendanceType'
                  ? [
                      { header: 'Name', render: (t: any) => t.name, className: 'flex-1 min-w-0' },
                      {
                        header: 'Parent',
                        render: () => '♦ Primary',
                        className: 'w-24 text-gray-600',
                      },
                      {
                        header: 'Unit',
                        render: (t: any) => t.unit_name ?? 'Days',
                        className: 'w-16 text-right text-gray-600',
                      },
                    ]
                  : undefined
            }
          />
        )}

        {/* ── Right sidebar ── */}
        <RightSidebar
          voucherType={effectiveVoucherType}
          onTypeChange={switchVoucher}
          voucherTypeChildren={voucherTypeChildren}
          subDropdownType={subDropdownType}
          onSubDropdownToggle={(type) =>
            setSubDropdownType((prev) => (prev === type ? null : type))
          }
          status={form.status}
          onStatusChange={() =>
            form.setStatus((p: string) => (p === 'Regular' ? 'Post-Dated' : 'Regular'))
          }
          isOptional={form.isOptional}
          onOptionalToggle={() => form.setIsOptional((p: boolean) => !p)}
          entryMode={
            effectiveVoucherType === 'Receipt'
              ? form.receiptEntryMode
              : effectiveVoucherType === 'Payment'
                ? form.paymentEntryMode
                : effectiveVoucherType === 'Journal'
                  ? form.journalEntryMode
                  : form.contraEntryMode
          }
          onEntryModeChange={() => {
            if (effectiveVoucherType === 'Receipt') {
              form.setReceiptEntryMode((p: 'single' | 'double') =>
                p === 'single' ? 'double' : 'single',
              );
            } else if (effectiveVoucherType === 'Payment') {
              form.setPaymentEntryMode((p: 'single' | 'double') =>
                p === 'single' ? 'double' : 'single',
              );
            } else if (effectiveVoucherType === 'Journal') {
              form.setJournalEntryMode((p: 'single' | 'double') =>
                p === 'single' ? 'double' : 'single',
              );
            } else {
              form.setContraEntryMode((p: 'single' | 'double') =>
                p === 'single' ? 'double' : 'single',
              );
            }
          }}
          onDateClick={() => setShowDatePicker(true)}
          onCompanyTaxRegistrationClick={() => setShowTaxRegistrationPopup(true)}
          onCreateLedger={() => navigate('/master/create/ledger')}
          onAccept={handleAccept}
          onQuit={() => navigate('/')}
          canAccept={canAccept}
          onOtherVouchersClick={() => setShowOtherVouchers(true)}
        />
      </div>

      {/* ── Popups ── */}

      <VoucherPopups
        form={form}
        effectiveVoucherType={effectiveVoucherType}
        selectedCompany={selectedCompany}
        navigate={navigate}
        voucherTypeChildren={voucherTypeChildren}
        inventoryAlloc={inventoryAlloc}
        setInventoryAlloc={setInventoryAlloc}
        itemExcise={itemExcise}
        setItemExcise={setItemExcise}
        showDatePicker={showDatePicker}
        showApplicableUptoPicker={showApplicableUptoPicker}
        showTaxRegistrationPopup={showTaxRegistrationPopup}
        showDispatchDetails={showDispatchDetails}
        showOrderDetails={showOrderDetails}
        showReceiptDetails={showReceiptDetails}
        showPartyDetails={showPartyDetails}
        showManufacturerDetails={showManufacturerDetails}
        showExciseDetails={showExciseDetails}
        showDebitNoteExcise={showDebitNoteExcise}
        showVatDetails={showVatDetails}
        showCreditNoteDetails={showCreditNoteDetails}
        showDebitNoteDetails={showDebitNoteDetails}
        showOtherVouchers={showOtherVouchers}
        setShowDatePicker={setShowDatePicker}
        setShowApplicableUptoPicker={setShowApplicableUptoPicker}
        setShowTaxRegistrationPopup={setShowTaxRegistrationPopup}
        setShowDispatchDetails={setShowDispatchDetails}
        setShowOrderDetails={setShowOrderDetails}
        setShowReceiptDetails={setShowReceiptDetails}
        setShowPartyDetails={setShowPartyDetails}
        setShowManufacturerDetails={setShowManufacturerDetails}
        setShowExciseDetails={setShowExciseDetails}
        setShowDebitNoteExcise={setShowDebitNoteExcise}
        setShowVatDetails={setShowVatDetails}
        setShowCreditNoteDetails={setShowCreditNoteDetails}
        setShowDebitNoteDetails={setShowDebitNoteDetails}
        setShowOtherVouchers={setShowOtherVouchers}
        handleImportVoucherItems={handleImportVoucherItems}
        handleSaveBankDetails={handleSaveBankDetails}
        handleSaveBatchAllocations={handleSaveBatchAllocations}
        handleSaveBillWise={handleSaveBillWise}
        handleSaveCashDenomination={handleSaveCashDenomination}
        handleSaveCostCentre={handleSaveCostCentre}
        handleSaveCreditNoteDetails={handleSaveCreditNoteDetails}
        handleSaveDebitNoteDetails={handleSaveDebitNoteDetails}
        handleSaveDebitNoteExcise={handleSaveDebitNoteExcise}
        handleSaveDispatchDetails={handleSaveDispatchDetails}
        handleSaveExciseDetails={handleSaveExciseDetails}
        handleSaveInventoryAllocation={handleSaveInventoryAllocation}
        handleSaveItemExcise={handleSaveItemExcise}
        handleSaveJobWorkAllocations={handleSaveJobWorkAllocations}
        handleSaveMaterialInAllocations={handleSaveMaterialInAllocations}
        handleSaveOrderDetails={handleSaveOrderDetails}
        handleSavePartyDetails={handleSavePartyDetails}
        handleSaveManufacturerDetails={handleSaveManufacturerDetails}
        handleSaveReceiptDetails={handleSaveReceiptDetails}
        handleSaveVatDetails={handleSaveVatDetails}
      />

      {/* ── Inline e-Invoice flow (field lives in the Sales/CN/DN bodies) ── */}
      {einv.pendingGen && (
        <EInvoiceGeneratePrompt
          busy={einv.generating}
          onNo={() => einv.setPendingGen(null)}
          onYes={async () => {
            const info = einv.pendingGen!;
            einv.setGenerating(true);
            try {
              const r = await window.api.eInvoice.generateFromVoucher({
                company_id: selectedCompany!.company_id,
                voucher_id: info.voucherId,
              });
              einv.setPendingGen(null);
              einv.setGenerating(false);
              if (r.success) {
                form.setSuccess(
                  `Voucher ${info.savedNumber} saved. IRN ${(r.data as any)?.Irn || '(generated)'}.`,
                );
                generatedVoucherIdRef.current = info.voucherId;
                einv.setSuccessInfo('e-Invoice generated successfully');
              } else {
                form.setError(`e-Invoice failed: ${r.error}`);
              }
            } catch (e: any) {
              einv.setGenerating(false);
              einv.setPendingGen(null);
              form.setError(e?.message || 'e-Invoice generation failed.');
            }
          }}
        />
      )}

      {einv.successInfo && (
        <EInvoiceInfoPopup
          message={einv.successInfo}
          onClose={() => {
            einv.setSuccessInfo(null);
            if (generatedVoucherIdRef.current) setPrintVoucherId(generatedVoucherIdRef.current);
          }}
        />
      )}

      {printVoucherId != null && (
        <VoucherPrintPopup
          title="Tax Invoice"
          onClose={() => setPrintVoucherId(null)}
          onPreview={() => {
            const id = printVoucherId;
            setPrintVoucherId(null);
            navigate(`/transactions/voucher/${id}/invoice`);
          }}
          onPrint={() => {
            const id = printVoucherId;
            setPrintVoucherId(null);
            navigate(`/transactions/voucher/${id}/invoice?print=1`);
          }}
        />
      )}

      {/* Alt+X — TallyPrime "Cancel ?" prompt. Y cancels the voucher, N/Esc dismisses. */}
      <TallyConfirm
        open={showCancelConfirm}
        message="Cancel ?"
        onYes={() => {
          setShowCancelConfirm(false);
          void quickActions.cancelVoucher();
        }}
        onNo={() => setShowCancelConfirm(false)}
      />
    </div>
  );
}
