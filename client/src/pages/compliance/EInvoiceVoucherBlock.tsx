import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { Button } from '@/components/shadcn/button';
import type { EInvoiceRecord } from '@/types/api/GstIntegrations';

type Rec = EInvoiceRecord & { signed_qr_code?: string; ewb_no?: string | null };

// Tally-style "e-Invoice Details" block shown on a sales voucher once its IRN is generated.
// Renders the IRN / Ack No / Ack Date / Status plus the signed QR code, and lives inside the
// printable area so it appears on the exported invoice too.
export default function EInvoiceVoucherBlock({ record }: { record: Rec }) {
  const [qr, setQr] = useState<string | null>(null);
  const navigate = useNavigate();

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
        </div>
        <div className="space-y-0.5 text-[13px]">
          <Row label="IRN" value={record.irn} />
          <Row label="Ack No." value={record.ack_no != null ? String(record.ack_no) : null} />
          <Row label="Ack Date" value={record.ack_dt} />
          <Row label="Status" value={record.status} />
          {record.ewb_no ? <Row label="e-Way Bill" value={String(record.ewb_no)} /> : null}
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
