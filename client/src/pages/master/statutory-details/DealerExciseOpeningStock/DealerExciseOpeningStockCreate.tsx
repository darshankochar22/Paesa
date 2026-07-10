import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { PageTitleBar, RightActionPanel, MasterFormFooter, AlertBanner } from '@/components/ui';
import LedgerListPanel from '@/pages/transactions/components/LedgerListPanel';
import PartyDetailsPopup, {
  type PartyDetails,
} from '@/pages/transactions/components/popups/PartyDetailsPopup';
import ReceiptDetailsPopup, {
  type ReceiptDetails,
} from '@/pages/transactions/components/popups/ReceiptDetailsPopup';
import type { LedgerType } from '@/types/entities/Ledger';
import type { StockItemType } from '@/types/entities/StockItem';
import type { UnitType } from '@/types/entities/Unit';
import type { GodownType } from '@/types/entities/Godown';

import GodownAllocationPopup from './GodownAllocationPopup';
import {
  blankRow,
  inr,
  qty,
  rowAmount,
  focusSel,
  type StockRow,
} from './dealerExciseOpeningStockShared';

export default function DealerExciseOpeningStockCreate() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  // FY start year → opening date 1-Apr-<FY>
  const fyStartYear = useMemo(() => {
    if (activeFY?.start_date) return Number(activeFY.start_date.slice(0, 4));
    return new Date().getFullYear();
  }, [activeFY]);
  const openingDate = `${fyStartYear}-04-01`;
  const asOnLabel = `1-Apr-${String(fyStartYear).slice(-2)}`;

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // header
  const [voucherNo, setVoucherNo] = useState('');
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [partyLedger, setPartyLedger] = useState<LedgerType | null>(null);
  const [partyBalance, setPartyBalance] = useState<string>('');
  const [partyDetails, setPartyDetails] = useState<PartyDetails | null>(null);
  const [purchaseLedger, setPurchaseLedger] = useState<LedgerType | null>(null);
  const [narration, setNarration] = useState('');
  const [receiptDetails, setReceiptDetails] = useState<ReceiptDetails | null>(null);

  // data
  const [allLedgers, setAllLedgers] = useState<LedgerType[]>([]);
  const [allStockItems, setAllStockItems] = useState<StockItemType[]>([]);
  const [stockBalances, setStockBalances] = useState<Record<number, number>>({});
  const [allUnits, setAllUnits] = useState<UnitType[]>([]);
  const [allGodowns, setAllGodowns] = useState<GodownType[]>([]);

  // grid
  const [rows, setRows] = useState<StockRow[]>([blankRow()]);

  // popups
  const [partyPanelOpen, setPartyPanelOpen] = useState(false);
  const [partySearch, setPartySearch] = useState('');
  const [partyDetailsOpen, setPartyDetailsOpen] = useState(false);
  const [purchasePanelOpen, setPurchasePanelOpen] = useState(false);
  const [purchaseSearch, setPurchaseSearch] = useState('');
  const [itemPanelRow, setItemPanelRow] = useState<number | null>(null);
  const [itemSearch, setItemSearch] = useState('');
  const [godownRowId, setGodownRowId] = useState<number | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  // ── load ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!companyId) return;
    (async () => {
      try {
        const [ledRes, itemRes, balRes, unitRes, godRes] = await Promise.all([
          window.api.ledger.getAll(companyId),
          window.api.stockItem.getAll(companyId),
          window.api.stockItem.getStockBalances(companyId),
          window.api.unit.getAll(companyId),
          window.api.godown.getAll(companyId),
        ]);
        if (ledRes?.success) {
          const ledgers = (ledRes as { ledgers?: LedgerType[] }).ledgers ?? [];
          setAllLedgers(ledgers);
          // default Purchase ledger → "Goods Purchase"
          const gp = ledgers.find((l) => l.name?.toLowerCase() === 'goods purchase');
          if (gp) setPurchaseLedger(gp);
        }
        if (itemRes?.success) setAllStockItems(itemRes.stockItems ?? []);
        if (balRes?.success) setStockBalances(balRes.balances ?? {});
        if (unitRes?.success) setAllUnits(unitRes.units ?? []);
        if (godRes?.success) setAllGodowns(godRes.godowns ?? []);
      } catch (err) {
        setError((err as Error).message);
      }
    })();
  }, [companyId]);

  // auto voucher number (voucher_type Purchase, like the screenshots' "No. 12")
  useEffect(() => {
    if (!companyId || !fyId) return;
    (async () => {
      try {
        const res = await window.api.voucher.getNextNumber(companyId, fyId, 'Purchase');
        if (res?.success && res.voucher_number) setVoucherNo(String(res.voucher_number));
      } catch {
        /* ignore */
      }
    })();
  }, [companyId, fyId]);

  // ── party selection ───────────────────────────────────────────────────
  const handlePartySelect = useCallback(
    async (led: LedgerType) => {
      setPartyLedger(led);
      setPartyPanelOpen(false);
      setPartySearch('');
      // current balance (formatted label, e.g. "5,26,490.00 Dr")
      if (companyId && fyId && led.ledger_id != null) {
        try {
          const res = await window.api.voucher.getLedgerBalance(led.ledger_id, companyId, fyId);
          if (res?.success) setPartyBalance(res.balance ?? '');
        } catch {
          /* ignore balance errors */
        }
      }
      // Purchase-voucher flow: Receipt Details first, then Party Details.
      setReceiptOpen(true);
    },
    [companyId, fyId],
  );

  const handlePurchaseSelect = useCallback((led: LedgerType) => {
    setPurchaseLedger(led);
    setPurchasePanelOpen(false);
    setPurchaseSearch('');
  }, []);

  // ── stock-item selection ──────────────────────────────────────────────
  const handleItemSelect = useCallback(
    (item: StockItemType) => {
      const targetId = itemPanelRow;
      setItemPanelRow(null);
      setItemSearch('');
      if (targetId == null) return;
      const unit = allUnits.find((u) => u.unit_id === item.unit_id) ?? null;
      setRows((prev) => {
        const next = prev.map((r) => (r.id === targetId ? { ...r, stockItem: item, unit } : r));
        // always keep one trailing blank row
        if (next.every((r) => r.stockItem)) next.push(blankRow());
        return next;
      });
      focusSel(`[data-qty="${targetId}"]`);
    },
    [itemPanelRow, allUnits],
  );

  const updateRow = (id: number, patch: Partial<StockRow>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeRow = (id: number) =>
    setRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      return next.length ? next : [blankRow()];
    });

  // advance focus to the next row's item field (item flow: item→qty→billed→rate→next)
  const advanceToNextRow = useCallback((rowId: number) => {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === rowId);
      const nextRow = prev[idx + 1];
      if (nextRow) {
        focusSel(`[data-item="${nextRow.id}"]`);
        return prev;
      }
      const appended = [...prev, blankRow()];
      focusSel(`[data-item="${appended[appended.length - 1].id}"]`);
      return appended;
    });
  }, []);

  // after Rate entry: open Item (Godown) Allocations if multiple godowns,
  // else default-allocate the single godown and move on — mirrors TallyPrime.
  const handleRateEnter = useCallback(
    (row: StockRow) => {
      if (!row.stockItem) return;
      const q = Number(row.billedQtyRaw || row.quantityRaw) || 0;
      if (q <= 0) {
        advanceToNextRow(row.id);
        return;
      }
      if (allGodowns.length > 1) {
        setGodownRowId(row.id);
        return;
      }
      if (allGodowns.length === 1) {
        updateRow(row.id, {
          godownAllocations: [
            {
              godown_id: allGodowns[0].godown_id ?? null,
              godown_name: allGodowns[0].name,
              actualRaw: row.quantityRaw,
              billedRaw: row.billedQtyRaw || row.quantityRaw,
              rateRaw: row.rateRaw,
              discPercentRaw: row.discPercentRaw,
            },
          ],
        });
      }
      advanceToNextRow(row.id);
    },
    [allGodowns, advanceToNextRow],
  );

  const godownRow = rows.find((r) => r.id === godownRowId) ?? null;

  // ── totals ────────────────────────────────────────────────────────────
  const unitSymbol = useMemo(() => {
    const r = rows.find((row) => row.unit?.symbol);
    return r?.unit?.symbol ?? '';
  }, [rows]);
  const totalActual = rows.reduce((s, r) => s + (Number(r.quantityRaw) || 0), 0);
  const totalBilled = rows.reduce((s, r) => s + (Number(r.billedQtyRaw || r.quantityRaw) || 0), 0);
  const grandTotal = rows.reduce((s, r) => s + rowAmount(r), 0);
  const filledRows = rows.filter((r) => r.stockItem && rowAmount(r) > 0);

  // GST Registration label, e.g. "Chhattisgarh Registration" (party state, else company state)
  const gstRegistration = useMemo(() => {
    const state = partyDetails?.state || selectedCompany?.state;
    return state ? `${state} Registration` : '♦ Not Applicable';
  }, [partyDetails, selectedCompany]);

  // ── save ──────────────────────────────────────────────────────────────
  const quit = useCallback(() => navigate('/master/create'), [navigate]);

  const handleSubmit = useCallback(async () => {
    setError(null);
    if (!companyId || !fyId) {
      setError('No active company / financial year.');
      return;
    }
    if (!partyLedger) {
      setError('Party A/c name is required.');
      return;
    }
    if (!purchaseLedger) {
      setError('Purchase ledger is required.');
      return;
    }
    if (filledRows.length === 0) {
      setError('Add at least one stock item with quantity and rate.');
      return;
    }

    // Expand each item into one stock entry per godown allocation (TallyPrime
    // splits an item across godowns into separate stock lines). Falls back to a
    // single line when there are no explicit allocations.
    const stockEntries = filledRows.flatMap((r) => {
      const baseRate = Number(r.rateRaw) || 0;
      const disc = Number(r.discPercentRaw) || 0;
      const unitId = r.unit?.unit_id ?? r.stockItem!.unit_id ?? null;
      const allocs = r.godownAllocations.filter(
        (a) => a.godown_id != null && (Number(a.billedRaw || a.actualRaw) || 0) > 0,
      );
      if (allocs.length) {
        return allocs.map((a) => {
          const q = Number(a.billedRaw || a.actualRaw) || 0;
          const rate = Number(a.rateRaw) || baseRate;
          return {
            stock_item_id: r.stockItem!.item_id,
            item_name: r.stockItem!.name,
            godown_id: a.godown_id,
            unit_id: unitId,
            quantity: q,
            rate,
            discount_amount: (q * rate * disc) / 100,
          };
        });
      }
      const q = Number(r.billedQtyRaw || r.quantityRaw) || 0;
      return [
        {
          stock_item_id: r.stockItem!.item_id,
          item_name: r.stockItem!.name,
          godown_id: allGodowns.length === 1 ? allGodowns[0].godown_id : null,
          unit_id: unitId,
          quantity: q,
          rate: baseRate,
          discount_amount: (q * baseRate * disc) / 100,
        },
      ];
    });

    const total = grandTotal;
    // balanced double-entry: Dr Purchase ledger, Cr Party
    const entries = [
      {
        ledger_id: purchaseLedger.ledger_id,
        ledger_name: purchaseLedger.name,
        type: 'Dr',
        amount: total,
      },
      {
        ledger_id: partyLedger.ledger_id,
        ledger_name: partyLedger.name,
        type: 'Cr',
        amount: total,
      },
    ];

    const placeOfSupply = partyDetails?.place_of_supply ?? partyDetails?.state ?? null;

    const payload = {
      company_id: companyId,
      fy_id: fyId,
      voucher_type: 'Purchase',
      status: 'Excise Opening Stock',
      date: openingDate,
      is_invoice: 1,
      is_inventory_voucher: 1,
      is_accounting_voucher: 1,
      supplier_invoice_no: supplierInvoiceNo || null,
      narration: narration || null,
      party_ledger_id: partyLedger.ledger_id,
      party_name: partyLedger.name,
      place_of_supply: placeOfSupply,
      stock_entries: stockEntries,
      entries,
      party_details: partyDetails
        ? {
            supplier_name: partyDetails.supplier_name,
            mailing_name: partyDetails.mailing_name,
            address: partyDetails.address,
            state: partyDetails.state,
            country: partyDetails.country,
          }
        : undefined,
      receipt_details: receiptDetails ?? undefined,
    };

    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = await window.api.voucher.create(payload as any);
      if (res?.success) {
        setSuccess('Dealer Excise Opening Stock saved.');
        setTimeout(() => navigate('/master/create'), 400);
      } else {
        setError(res?.error || 'Failed to save.');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [
    companyId,
    fyId,
    partyLedger,
    purchaseLedger,
    filledRows,
    grandTotal,
    openingDate,
    supplierInvoiceNo,
    narration,
    partyDetails,
    receiptDetails,
    allGodowns,
    navigate,
  ]);

  // keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        partyPanelOpen ||
        purchasePanelOpen ||
        partyDetailsOpen ||
        itemPanelRow != null ||
        godownRowId != null ||
        receiptOpen
      )
        return;
      if (e.key === 'Escape') {
        e.preventDefault();
        quit();
      }
      if (e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    handleSubmit,
    quit,
    partyPanelOpen,
    purchasePanelOpen,
    partyDetailsOpen,
    itemPanelRow,
    godownRowId,
    receiptOpen,
  ]);

  const actions = [
    {
      key: 'F6',
      label: 'Receipt Details',
      onClick: () => setReceiptOpen(true),
    },
    {
      key: 'F4',
      label: 'Party Details',
      onClick: () => partyLedger && setPartyDetailsOpen(true),
      disabled: !partyLedger,
    },
    { key: 'A', label: 'Accept', onClick: handleSubmit, disabled: filledRows.length === 0 },
    { key: 'Q', label: 'Quit', onClick: quit },
  ];

  // ── small presentational helpers (read-only label : value) ─────────────
  const InfoRow = ({
    label,
    value,
    valueClass = '',
  }: {
    label: string;
    value: string;
    valueClass?: string;
  }) => (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-36 text-zinc-600 shrink-0">{label}</span>
      <span className="text-zinc-600 shrink-0">:</span>
      <span className={`text-black ${valueClass}`}>{value}</span>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none">
      <PageTitleBar title="Dealer Excise Opening Stock Creation" subtitle={`As on ${asOnLabel}`} />

      {error && <AlertBanner type="error" message={error} onDismiss={() => setError(null)} />}
      {success && (
        <AlertBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
      )}

      <div className="flex-1 flex min-h-0">
        {/* main column */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* header: left field block + right read-only context (Tally img-01) */}
          <div className="flex border-b border-black shrink-0 px-3 py-2 gap-8">
            {/* left field block */}
            <div className="flex-1 flex flex-col gap-1">
              {/* voucher type + auto number */}
              <div className="flex items-center gap-2 pb-1">
                <span className="text-sm font-semibold text-black">Purchase</span>
                <span className="text-sm text-zinc-500">No.</span>
                <span className="text-sm font-semibold text-black tabular-nums">
                  {voucherNo || '…'}
                </span>
              </div>

              {/* Supplier Invoice No. */}
              <div className="flex items-center gap-2">
                <span className="w-36 text-sm text-black shrink-0">Supplier Invoice No.</span>
                <span className="text-sm text-black shrink-0">:</span>
                <input
                  type="text"
                  className="text-sm border border-zinc-400 px-1 py-0 outline-none focus:border-black w-44"
                  value={supplierInvoiceNo}
                  onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                />
              </div>

              {/* Party A/c name */}
              <div className="flex items-center gap-2">
                <span className="w-36 text-sm text-black shrink-0">Party A/c name</span>
                <span className="text-sm text-black shrink-0">:</span>
                <input
                  type="text"
                  readOnly
                  className="text-sm border border-zinc-400 px-1 py-0 outline-none focus:border-black w-56 cursor-pointer bg-white"
                  value={partyLedger?.name ?? ''}
                  placeholder="Select party…"
                  onFocus={() => {
                    setPartyPanelOpen(true);
                    setPartySearch('');
                  }}
                  onClick={() => {
                    setPartyPanelOpen(true);
                    setPartySearch('');
                  }}
                />
              </div>

              {/* Current balance */}
              {partyLedger && (
                <div className="flex items-center gap-2">
                  <span className="w-36 text-sm text-zinc-600 shrink-0 pl-4">Current balance</span>
                  <span className="text-sm text-zinc-600 shrink-0">:</span>
                  <span className="text-sm font-semibold text-black tabular-nums">
                    {partyBalance || '—'}
                  </span>
                </div>
              )}

              {/* Purchase ledger */}
              <div className="flex items-center gap-2">
                <span className="w-36 text-sm text-black shrink-0">Purchase ledger</span>
                <span className="text-sm text-black shrink-0">:</span>
                <input
                  type="text"
                  readOnly
                  className="text-sm border border-zinc-400 px-1 py-0 outline-none focus:border-black w-56 cursor-pointer bg-white"
                  value={purchaseLedger?.name ?? ''}
                  placeholder="Select ledger…"
                  onFocus={() => {
                    setPurchasePanelOpen(true);
                    setPurchaseSearch('');
                  }}
                  onClick={() => {
                    setPurchasePanelOpen(true);
                    setPurchaseSearch('');
                  }}
                />
              </div>
            </div>

            {/* right read-only context strip */}
            <div className="w-80 flex flex-col gap-1 shrink-0">
              <div className="text-right text-sm text-black pb-1">
                As on <span className="font-semibold">{asOnLabel}</span>
              </div>
              <InfoRow label="GST Registration" value={gstRegistration} />
              <InfoRow label="Tax Unit" value="♦ Not Applicable" />
              <InfoRow
                label="Status"
                value="Excise Opening Stock"
                valueClass="italic font-medium"
              />
            </div>
          </div>

          {/* item grid header — two-line like Purchase voucher */}
          <div className="border-b border-black shrink-0 bg-white">
            <div className="flex px-3 py-0.5">
              <div className="flex-1 text-sm font-semibold text-black">Name of Item</div>
              <div className="w-44 text-center text-sm font-semibold text-black">Quantity</div>
              <div className="w-20 text-right text-sm font-semibold text-black">Rate</div>
              <div className="w-12 text-center text-sm font-semibold text-black">per</div>
              <div className="w-16 text-right text-sm font-semibold text-black">Disc %</div>
              <div className="w-32 text-right text-sm font-semibold text-black">Amount</div>
            </div>
            <div className="flex px-3 py-0.5 border-t border-zinc-200">
              <div className="flex-1" />
              <div className="w-44 flex">
                <div className="flex-1 text-center text-xs text-zinc-600">Actual</div>
                <div className="flex-1 text-center text-xs text-zinc-600">Billed</div>
              </div>
              <div className="w-20" />
              <div className="w-12" />
              <div className="w-16" />
              <div className="w-32" />
            </div>
          </div>

          {/* item rows */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {rows.map((row, idx) => (
              <div
                key={row.id}
                className="flex items-center border-b border-zinc-100 min-h-[24px] group px-3 py-0"
              >
                <div className="flex-1 flex items-center gap-1">
                  <input
                    data-item={row.id}
                    type="text"
                    readOnly
                    className="flex-1 text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black cursor-pointer"
                    value={row.stockItem?.name ?? ''}
                    placeholder={idx === 0 ? 'Select Item…' : ''}
                    onFocus={() => {
                      setItemPanelRow(row.id);
                      setItemSearch('');
                    }}
                    onClick={() => {
                      setItemPanelRow(row.id);
                      setItemSearch('');
                    }}
                  />
                  {row.stockItem && allGodowns.length > 0 && (
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setGodownRowId(row.id)}
                      className="text-[10px] px-1.5 py-0.5 border border-zinc-300 text-zinc-600 hover:text-black hover:border-black shrink-0"
                    >
                      Godown
                    </button>
                  )}
                  {rows.length > 1 && row.stockItem && (
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => removeRow(row.id)}
                      className="text-xs text-zinc-300 hover:text-black opacity-0 group-hover:opacity-100 shrink-0"
                    >
                      &times;
                    </button>
                  )}
                </div>

                {/* Quantity Actual | Billed */}
                <div className="w-44 flex">
                  <div className="flex-1 text-right pr-1">
                    <input
                      data-qty={row.id}
                      type="text"
                      inputMode="decimal"
                      className="w-full text-right text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                      value={row.quantityRaw}
                      disabled={!row.stockItem}
                      onChange={(e) =>
                        updateRow(row.id, {
                          quantityRaw: e.target.value,
                          billedQtyRaw:
                            row.billedQtyRaw === '' || row.billedQtyRaw === row.quantityRaw
                              ? e.target.value
                              : row.billedQtyRaw,
                        })
                      }
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter') return;
                        e.preventDefault();
                        focusSel(`[data-billed="${row.id}"]`);
                      }}
                    />
                  </div>
                  <div className="flex-1 text-right pr-1">
                    <input
                      data-billed={row.id}
                      type="text"
                      inputMode="decimal"
                      className="w-full text-right text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                      value={row.billedQtyRaw || row.quantityRaw}
                      disabled={!row.stockItem}
                      onChange={(e) => updateRow(row.id, { billedQtyRaw: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter') return;
                        e.preventDefault();
                        focusSel(`[data-rate="${row.id}"]`);
                      }}
                    />
                  </div>
                </div>

                <div className="w-20 text-right pr-1">
                  <input
                    data-rate={row.id}
                    type="text"
                    inputMode="decimal"
                    className="w-full text-right text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                    value={row.rateRaw}
                    disabled={!row.stockItem}
                    onChange={(e) => updateRow(row.id, { rateRaw: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      handleRateEnter(row);
                    }}
                  />
                </div>

                <div className="w-12 text-center text-xs text-zinc-500">
                  {row.unit?.symbol ?? ''}
                </div>

                <div className="w-16 text-right pr-1">
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full text-right text-sm bg-transparent outline-none px-1 border border-transparent focus:border-black"
                    value={row.discPercentRaw}
                    disabled={!row.stockItem}
                    onChange={(e) => updateRow(row.id, { discPercentRaw: e.target.value })}
                  />
                </div>

                <div className="w-32 text-right text-sm font-semibold text-black select-none tabular-nums">
                  {rowAmount(row) > 0 ? inr(rowAmount(row)) : ''}
                </div>
              </div>
            ))}

            {/* filler rows */}
            {Array.from({ length: Math.max(0, 6 - rows.length) }).map((_, i) => (
              <div key={`f-${i}`} className="flex border-b border-zinc-50 min-h-[24px] px-3" />
            ))}
          </div>

          {/* totals row */}
          <div className="flex border-t border-black shrink-0 px-3 py-0.5 bg-white">
            <div className="flex-1 text-sm font-semibold text-black" />
            <div className="w-44 flex">
              <div className="flex-1 text-right pr-1 text-sm font-semibold text-black tabular-nums">
                {qty(totalActual, unitSymbol)}
              </div>
              <div className="flex-1 text-right pr-1 text-sm font-semibold text-black tabular-nums">
                {qty(totalBilled, unitSymbol)}
              </div>
            </div>
            <div className="w-20" />
            <div className="w-12" />
            <div className="w-16" />
            <div className="w-32 text-right text-sm font-semibold text-black tabular-nums">
              {grandTotal > 0 ? inr(grandTotal) : ''}
            </div>
          </div>

          {/* narration */}
          <div className="border-t border-zinc-200 px-3 py-2 shrink-0 bg-white">
            <div className="flex items-start gap-2">
              <span className="text-sm text-black shrink-0 pt-0.5">Narration</span>
              <span className="text-sm text-black shrink-0 pt-0.5">:</span>
              <textarea
                className="flex-1 text-sm border border-zinc-400 px-1 py-0.5 outline-none focus:border-black resize-none h-12"
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
              />
            </div>
          </div>
        </div>

        <RightActionPanel actions={actions} />
      </div>

      <MasterFormFooter
        onCancel={quit}
        onSubmit={handleSubmit}
        loading={loading}
        disabled={filledRows.length === 0}
      />

      {/* Party ledger list */}
      {partyPanelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <LedgerListPanel
            title="List of Ledger Accounts"
            items={allLedgers}
            searchTerm={partySearch}
            onSearchChange={setPartySearch}
            onSelect={(it) => handlePartySelect(it as LedgerType)}
            onClose={() => {
              setPartyPanelOpen(false);
              setPartySearch('');
            }}
            onCreateNew={() => navigate('/master/create/ledger')}
            createLabel="Create"
            height="h-screen"
          />
        </div>
      )}

      {/* Purchase ledger list */}
      {purchasePanelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <LedgerListPanel
            title="List of Ledger Accounts"
            items={allLedgers}
            searchTerm={purchaseSearch}
            onSearchChange={setPurchaseSearch}
            onSelect={(it) => handlePurchaseSelect(it as LedgerType)}
            onClose={() => {
              setPurchasePanelOpen(false);
              setPurchaseSearch('');
            }}
            onCreateNew={() => navigate('/master/create/ledger')}
            createLabel="Create"
            height="h-screen"
          />
        </div>
      )}

      {/* Stock item list */}
      {itemPanelRow != null && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <LedgerListPanel
            title="List of Stock Items"
            items={allStockItems}
            searchTerm={itemSearch}
            onSearchChange={setItemSearch}
            onSelect={(it) => handleItemSelect(it as StockItemType)}
            onClose={() => {
              setItemPanelRow(null);
              setItemSearch('');
            }}
            onCreateNew={() => navigate('/master/create/stock-item')}
            createLabel="Create"
            height="h-screen"
            stockBalances={stockBalances}
            allUnits={allUnits}
          />
        </div>
      )}

      {/* Party Details popup */}
      {partyDetailsOpen && partyLedger && (
        <PartyDetailsPopup
          partyLedger={partyLedger}
          allLedgers={allLedgers}
          initialDetails={partyDetails}
          onClose={() => setPartyDetailsOpen(false)}
          onSave={(d) => {
            setPartyDetails(d);
            setPartyDetailsOpen(false);
          }}
          onCreateLedger={() => navigate('/master/create/ledger')}
        />
      )}

      {/* Receipt Details popup → then Party Details (Purchase-voucher flow) */}
      {receiptOpen && (
        <ReceiptDetailsPopup
          initialDetails={receiptDetails}
          onClose={() => setReceiptOpen(false)}
          onSave={(d) => {
            setReceiptDetails(d);
            setReceiptOpen(false);
            if (partyLedger && !partyDetails) setPartyDetailsOpen(true);
          }}
        />
      )}

      {/* Item (Godown) Allocations popup */}
      {godownRow && (
        <GodownAllocationPopup
          row={godownRow}
          godowns={allGodowns}
          onClose={() => setGodownRowId(null)}
          onSave={(allocs) => {
            updateRow(godownRow.id, { godownAllocations: allocs });
            const savedId = godownRow.id;
            setGodownRowId(null);
            advanceToNextRow(savedId);
          }}
        />
      )}
    </div>
  );
}
