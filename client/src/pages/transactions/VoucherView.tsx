import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCompany } from '../../context/CompanyContext';
import { AlertBanner } from '../../components/ui';
import { Button } from '@/components/shadcn/button';
import { exportElementToPdf } from '@/lib/exportDomPdf';
import { EDITABLE_VOUCHER_TYPES } from './hooks/hydrateVoucherForm';
import { type Voucher, formatDateBox, FKeyPanel } from './voucher-views/shared';
import VoucherBody from './voucher-views/VoucherBody';
import GstVoucherActions from '@/pages/compliance/GstVoucherActions';
import EInvoiceVoucherBlock from '@/pages/compliance/EInvoiceVoucherBlock';

// Loader + shared chrome for a voucher. The type-specific body is dispatched to
// a dedicated per-type page (see ./voucher-views/VoucherBody). Every navigation
// to /transactions/voucher/:id lands here, so all reports/registers/daybook get
// the per-type views for free.

const INVENTORY_ONLY = [
  'Delivery Note',
  'Receipt Note',
  'Rejection In',
  'Rejection Out',
  'Material In',
  'Material Out',
  'Physical Stock',
  'Stock Journal',
  'Manufacturing Journal',
  'Sales Order',
  'Purchase Order',
  'Job Work In Order',
  'Job Work Out Order',
];

export default function VoucherView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [balances, setBalances] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [einv, setEinv] = useState<
    | (import('@/types/api/GstIntegrations').EInvoiceRecord & {
        signed_qr_code?: string;
        ewb_no?: string | null;
      })
    | null
  >(null);

  const [partyGstin, setPartyGstin] = useState<string | null>(null);

  // Pull the e-Invoice (IRN) record for this voucher, if one was generated.
  useEffect(() => {
    if (!voucher?.voucher_id) {
      setEinv(null);
      return;
    }
    window.api.eInvoice
      .getByVoucher(voucher.voucher_id)
      .then((r) => setEinv(r.success && r.record ? r.record : null))
      .catch(() => setEinv(null));
  }, [voucher?.voucher_id]);

  // Party GSTIN — e-Invoice/e-Way only apply to B2B (registered buyer), so the actions
  // are hidden when the party has no GSTIN.
  useEffect(() => {
    const pid = voucher?.party_ledger_id;
    if (!pid) {
      setPartyGstin(null);
      return;
    }
    window.api.ledger
      .getById(pid)
      .then((r: any) => setPartyGstin(r?.success ? r.ledger?.gstin || null : null))
      .catch(() => setPartyGstin(null));
  }, [voucher?.party_ledger_id]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await window.api.voucher.getById(Number(id));
        if (res.success) setVoucher(res.voucher as Voucher);
        else setError(res.error || 'Voucher not found');
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!voucher || !selectedCompany?.company_id || !activeFY?.fy_id) return;
    const uniqueLedgerIds = Array.from(
      new Set(
        [...voucher.entries.map((e) => e.ledger_id), voucher.party_ledger_id].filter(Boolean),
      ),
    );
    if (uniqueLedgerIds.length === 0) return;

    (async () => {
      try {
        const results = await Promise.all(
          uniqueLedgerIds.map((lid) =>
            window.api.voucher
              .getLedgerBalance(lid, selectedCompany.company_id, activeFY.fy_id)
              .then((r: any) => [lid, r?.success ? r.balance : null] as const)
              .catch(() => [lid, null] as const),
          ),
        );
        const map: Record<number, string> = {};
        for (const [lid, bal] of results) if (bal) map[lid] = bal;
        setBalances(map);
      } catch {
        // Non-critical — balances are a nice-to-have, don't block the view.
      }
    })();
  }, [voucher, selectedCompany?.company_id, activeFY?.fy_id]);

  const handleDelete = async () => {
    if (!voucher) return;
    if (!window.confirm(`Permanently delete voucher ${voucher.voucher_number}?`)) return;
    try {
      // Attendance vouchers live in their own table under a negated id — route
      // the delete to the matching API instead of the main voucher one.
      const res =
        voucher.voucher_type === 'Attendance'
          ? await window.api.attendance.delete(Math.abs(voucher.voucher_id))
          : await window.api.voucher.delete(voucher.voucher_id);
      if (res.success) navigate(-1);
      else setError(res.error || 'Failed to delete');
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleCancel = async () => {
    if (!voucher) return;
    if (!window.confirm(`Cancel voucher ${voucher.voucher_number}? This cannot be undone.`)) return;
    try {
      const res = await window.api.voucher.cancel(voucher.voucher_id);
      if (res.success) setVoucher({ ...voucher, is_cancelled: 1 });
      else setError(res.error || 'Failed to cancel');
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleExportPdf = async () => {
    if (!voucher) return;
    const el = document.getElementById('voucher-print-area');
    if (!el) return;
    setExporting(true);
    setError(null);
    try {
      const name = `${voucher.voucher_type}_${voucher.voucher_number || voucher.voucher_id}`;
      const res = await exportElementToPdf(el as HTMLElement, name);
      if (!res.success && !res.canceled) setError(res.error || 'Failed to export PDF');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400 text-xs">
        Loading voucher…
      </div>
    );
  }

  if (error && !voucher) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-zinc-500 text-xs">
        <span className="text-black font-semibold">{error}</span>
        <Button
          onClick={() => navigate(-1)}
          variant="link"
          size="xs"
          className="h-auto p-0 text-xs text-zinc-500 underline hover:text-zinc-900"
        >
          ← Go Back
        </Button>
      </div>
    );
  }

  if (!voucher) return null;

  const getTitle = () => {
    if (voucher.voucher_type === 'Attendance') return 'Attendance Voucher Alteration (Secondary)';
    if (voucher.voucher_type === 'Payroll') return 'Payroll Voucher Alteration (Secondary)';
    if (INVENTORY_ONLY.includes(voucher.voucher_type))
      return 'Inventory Voucher Alteration (Secondary)';
    return 'Accounting Voucher Alteration (Secondary)';
  };

  // Voucher types whose alteration view shows a "Tax Unit" line under GST Registration
  // (mirrors TallyPrime — inventory/order vouchers that carry a tax unit).
  const TAX_UNIT_TYPES = [
    "Sales", "Purchase", "Stock Journal", "Purchase Order",
    "Job Work In Order", "Job Work Out Order", "Material In", "Material Out",
  ];
  const showTaxUnit = TAX_UNIT_TYPES.includes(voucher.voucher_type);
  // "Status : Optional" shows only for vouchers a user explicitly marked Optional
  // (L:Optional) — not Memorandum / Reversing Journal, which store is_optional = 1
  // as an internal detail but are not "Optional" vouchers.
  const showOptionalStatus =
    !!voucher.is_optional && !["Memorandum", "Reversing Journal"].includes(voucher.voucher_type);

  const { date: dateStr, day: dayStr } = formatDateBox(voucher.date);

  return (
    <div className="flex-1 flex flex-col bg-white text-black text-sm select-none overflow-hidden min-h-0">
      {error && <AlertBanner type="error" message={error} onDismiss={() => setError(null)} />}

      <div className="flex items-center justify-between px-3 py-0.5 border-b border-black bg-zinc-900 shrink-0">
        <span className="text-xs font-bold text-white">{getTitle()}</span>
        <span className="text-xs font-bold text-white">
          {selectedCompany?.name ?? ''}
          {voucher.is_cancelled ? ' · CANCELLED' : ''}
          {voucher.is_post_dated ? ' · POST-DATED' : ''}
        </span>
        <button
          onClick={() => navigate(-1)}
          className="text-zinc-300 text-xs font-bold hover:opacity-60 leading-none"
        >
          ✕
        </button>
      </div>

      {/* ── GST Registration (+ Tax Unit) — centered under the company name (Tally-style) ── */}
      <div className="flex justify-center gap-2 px-3 py-1 border-b border-gray-300 bg-white shrink-0 text-sm">
        <div className="text-right text-zinc-500">
          <div>GST Registration</div>
          {showTaxUnit && <div>Tax Unit</div>}
          {showOptionalStatus && <div>Status</div>}
        </div>
        <div className="text-zinc-500">
          <div>:</div>
          {showTaxUnit && <div>:</div>}
          {showOptionalStatus && <div>:</div>}
        </div>
        <div className="font-semibold text-black">
          <div>♦ Not Applicable</div>
          {showTaxUnit && <div>♦ Not Applicable</div>}
          {showOptionalStatus && <div className="italic">Optional</div>}
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div
          id="voucher-print-area"
          data-filename={`${voucher.voucher_type}_${voucher.voucher_number || voucher.voucher_id}`}
          className="flex-1 flex flex-col min-h-0 overflow-y-auto"
        >
          <div className="flex items-center px-3 py-1.5 border-b border-gray-300 bg-white shrink-0">
            <div className="text-sm font-bold text-white bg-zinc-900 px-3 py-0.5 min-w-[90px] text-center">
              {voucher.voucher_type}
            </div>
            <span className="text-sm text-black ml-3">No.</span>
            <span className="text-sm font-bold text-black ml-2 mr-6">{voucher.voucher_number}</span>
            <div className="flex-1" />
            <div className="border border-gray-300 px-3 py-0.5 text-right">
              <div className="text-sm font-bold text-black">{dateStr}</div>
              {dayStr && <div className="text-[10px] text-zinc-600">{dayStr}</div>}
            </div>
          </div>

          <VoucherBody voucher={voucher} balances={balances} />

          {/* Narration */}
          <div className="flex items-center border-t border-gray-300 shrink-0 px-3 py-1.5 bg-white">
            <span className="text-sm text-black shrink-0">Narration:</span>
            <span className="flex-1 text-sm text-black ml-2">{voucher.narration || '—'}</span>
          </div>

          {einv && einv.irn && selectedCompany?.company_id && (
            <EInvoiceVoucherBlock
              record={einv}
              companyId={selectedCompany.company_id}
              onChanged={() =>
                voucher.voucher_id &&
                window.api.eInvoice
                  .getByVoucher(voucher.voucher_id)
                  .then((r) => setEinv(r.success && r.record ? r.record : null))
                  .catch(() => {})
              }
            />
          )}
        </div>

        <FKeyPanel voucherType={voucher.voucher_type} />
      </div>

      <div className="flex items-center justify-between border-t border-gray-300 shrink-0 px-3 py-1.5 bg-white">
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          size="xs"
          className="h-auto p-0 text-sm text-black hover:underline hover:bg-transparent"
        >
          <span className="underline">Q</span>: Quit
        </Button>
        <div className="flex items-center gap-3">
          {['Sales', 'Credit Note', 'Debit Note'].includes(voucher.voucher_type) &&
            !voucher.is_cancelled &&
            voucher.party_ledger_id &&
            partyGstin &&
            selectedCompany?.company_id && (
              <GstVoucherActions companyId={selectedCompany.company_id} voucher={voucher} />
            )}
          {!voucher.is_cancelled && EDITABLE_VOUCHER_TYPES.has(voucher.voucher_type) && (
            <Button
              onClick={() => navigate(`/transactions/voucher/${voucher.voucher_id}/edit`)}
              size="xs"
              className="h-auto rounded-none text-sm px-3 py-0.5 bg-black text-white hover:bg-zinc-800"
            >
              <span className="underline">E</span>: Alter
            </Button>
          )}
          <Button
            onClick={handleExportPdf}
            disabled={exporting}
            variant="outline"
            size="xs"
            className="h-auto rounded-none text-sm px-3 py-0.5 border-zinc-400 text-zinc-800 hover:bg-zinc-100"
          >
            <span className="underline">P</span>: {exporting ? 'Exporting…' : 'Export PDF'}
          </Button>
          {!voucher.is_cancelled && voucher.voucher_type !== 'Attendance' && (
            <Button
              onClick={handleCancel}
              variant="outline"
              size="xs"
              className="h-auto rounded-none text-sm px-3 py-0.5 border-zinc-400 text-zinc-800 hover:bg-zinc-100"
            >
              <span className="underline">X</span>: Cancel Vch
            </Button>
          )}
          <Button
            onClick={handleDelete}
            size="xs"
            className="h-auto rounded-none text-sm px-3 py-0.5 bg-black text-white hover:bg-zinc-800"
          >
            <span className="underline">D</span>: Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
