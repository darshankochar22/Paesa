import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { Button } from '@/components/shadcn/button';
import type { EInvoiceRecord } from '@/types/api/GstIntegrations';

type Rec = EInvoiceRecord & { signed_qr_code?: string; ewb_no?: string | null };

// Tally-style "e-Invoice Details" block shown on a sales voucher once its IRN is generated.
// Renders the IRN / Ack No / Ack Date / Status plus the signed QR code, and lives inside the
// printable area so it appears on the exported invoice too.
export default function EInvoiceVoucherBlock({
  record,
  eway,
  companyId,
  onChanged,
}: {
  record: Rec;
  /** e-Way Bill record for this voucher (ewaybill_records) — adds date + validity + print link. */
  eway?: Record<string, any> | null;
  companyId: number;
  onChanged?: () => void;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const cancelIrn = async () => {
    if (!record.irn) return;
    const reason = window.prompt(
      'Cancellation reason:\n1 = Duplicate\n2 = Data entry mistake\n3 = Order cancelled\n4 = Others',
      '3',
    );
    if (!reason || !['1', '2', '3', '4'].includes(reason.trim())) return;
    const remarks = (window.prompt('Remarks (min 3 characters):', 'Cancelled') || '').trim();
    if (remarks.length < 3) {
      window.alert('Remarks must be at least 3 characters.');
      return;
    }
    if (
      !window.confirm(
        'Cancel this IRN? Allowed only within 24 hours of generation and cannot be undone.',
      )
    )
      return;
    setBusy(true);
    const r = await window.api.eInvoice.cancelIRN({
      company_id: companyId,
      irn: record.irn,
      cancel_reason: Number(reason.trim()),
      cancel_remarks: remarks,
    });
    setBusy(false);
    window.alert(r.success ? 'IRN cancelled.' : `Cancel failed: ${r.error}`);
    if (r.success) onChanged?.();
  };

  useEffect(() => {
    let alive = true;
    const content = record.signed_qr_code;
    if (!content) {
      setQr(null);
      return;
    }
    QRCode.toDataURL(content, { margin: 1, width: 132, errorCorrectionLevel: 'M' })
      .then((url) => alive && setQr(url))
      .catch(() => alive && setQr(null));
    return () => {
      alive = false;
    };
  }, [record.signed_qr_code]);

  const Row = ({ label, value }: { label: string; value?: string | null }) =>
    value ? (
      <div className="flex gap-2">
        <span className="w-20 shrink-0 text-zinc-500">{label}</span>
        <span className="font-semibold text-black break-all">{value}</span>
      </div>
    ) : null;

  return (
    <div className="flex items-start justify-between gap-4 border-t border-gray-300 shrink-0 px-3 py-2 bg-white">
      <div>
        <div className="mb-1 flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-black">
            e-Invoice Details
          </span>
          {record.voucher_id ? (
            <Button
              variant="outline"
              size="xs"
              onClick={() => navigate(`/transactions/voucher/${record.voucher_id}/invoice`)}
              className="h-auto rounded-none border-zinc-400 px-2 py-0 text-[11px] text-zinc-800 hover:bg-zinc-100"
            >
              View Invoice Bill →
            </Button>
          ) : null}
          {record.voucher_id && (eway?.ewb_no || record.ewb_no) ? (
            <Button
              variant="outline"
              size="xs"
              onClick={() => navigate(`/transactions/voucher/${record.voucher_id}/ewaybill`)}
              className="h-auto rounded-none border-zinc-400 px-2 py-0 text-[11px] text-zinc-800 hover:bg-zinc-100"
            >
              View e-Way Bill →
            </Button>
          ) : null}
          {record.irn && String(record.status).toUpperCase() !== 'CANCELLED' ? (
            <Button
              variant="outline"
              size="xs"
              onClick={cancelIrn}
              disabled={busy}
              className="h-auto rounded-none border-zinc-400 px-2 py-0 text-[11px] text-zinc-800 hover:bg-zinc-100"
            >
              {busy ? 'Cancelling…' : 'Cancel IRN'}
            </Button>
          ) : null}
        </div>
        <div className="space-y-0.5 text-[13px]">
          <Row label="IRN" value={record.irn} />
          <Row label="Ack No." value={record.ack_no != null ? String(record.ack_no) : null} />
          <Row label="Ack Date" value={record.ack_dt} />
          <Row label="Status" value={record.status} />
          {eway?.ewb_no || record.ewb_no ? (
            <>
              <Row label="e-Way Bill" value={String(eway?.ewb_no || record.ewb_no)} />
              {eway?.ewb_date ? <Row label="EWB Date" value={String(eway.ewb_date)} /> : null}
              {eway?.valid_upto ? <Row label="Valid Till" value={String(eway.valid_upto)} /> : null}
            </>
          ) : null}
        </div>
      </div>
      {qr && (
        <img
          src={qr}
          alt="e-Invoice QR code"
          className="h-[120px] w-[120px] shrink-0 border border-gray-300"
        />
      )}
    </div>
  );
}
