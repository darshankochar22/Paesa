import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/shadcn/button';
import { exportElementToPdf } from '@/lib/exportDomPdf';

// Printable e-Way Bill slip (Part-A / Part-B) built from the stored ewaybill_records row plus
// the NIC-signed invoice on the e-invoice record (for the from/to parties, doc no + value).
// Mirrors InvoicePrintView — the customer/transport-facing document, not the voucher view.

type Inv = {
  Irn?: string;
  DocDtls?: { Typ?: string; No?: string; Dt?: string };
  SellerDtls?: Party;
  BuyerDtls?: Party & { Pos?: string };
  ItemList?: { HsnCd?: string; PrdDesc?: string }[];
  ValDtls?: Record<string, number>;
};
type Party = {
  Gstin?: string;
  LglNm?: string;
  Addr1?: string;
  Loc?: string;
  Pin?: number;
  Stcd?: string;
};

function decodeSignedInvoice(jwt?: string): Inv | null {
  if (!jwt) return null;
  try {
    const b64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const outer = JSON.parse(decodeURIComponent(escape(atob(b64))));
    return typeof outer.data === 'string' ? JSON.parse(outer.data) : outer.data || outer;
  } catch {
    return null;
  }
}

const MODE: Record<string, string> = { '1': 'Road', '2': 'Rail', '3': 'Air', '4': 'Ship' };
const money = (n?: number) =>
  (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex text-[11px] leading-tight">
      <span className="w-40 shrink-0 text-neutral-600">{label}</span>
      <span className="font-semibold text-black break-all">
        {value === 0 || value ? String(value) : '—'}
      </span>
    </div>
  );
}

export default function EWayBillPrintView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ewb, setEwb] = useState<any>(null);
  const [einv, setEinv] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      window.api.ewayBill.getByVoucher(Number(id)),
      window.api.eInvoice.getByVoucher(Number(id)),
    ])
      .then(([e, i]) => {
        setEwb(e.success ? e.record : null);
        setEinv(i.success ? i.record : null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const inv = useMemo(() => decodeSignedInvoice(einv?.signed_invoice), [einv]);

  const handlePdf = async () => {
    const el = document.getElementById('ewaybill-print-area');
    if (!el) return;
    setExporting(true);
    await exportElementToPdf(el as HTMLElement, `EWayBill_${ewb?.ewb_no || id}`).catch(() => {});
    setExporting(false);
  };

  if (loading)
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-neutral-400">
        Loading…
      </div>
    );
  if (!ewb || !ewb.ewb_no)
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-xs text-neutral-500">
        <span className="font-semibold text-black">No e-Way Bill found for this voucher.</span>
        <Button variant="link" size="xs" onClick={() => navigate(-1)}>
          ← Go Back
        </Button>
      </div>
    );

  const seller = inv?.SellerDtls;
  const buyer = inv?.BuyerDtls;
  const hsn = (inv?.ItemList || []).map((it) => it.HsnCd).filter(Boolean);

  return (
    <div className="flex-1 flex flex-col bg-neutral-100 overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-neutral-300 sticky top-0 z-10">
        <Button variant="ghost" size="xs" onClick={() => navigate(-1)} className="text-black">
          ← Back
        </Button>
        <span className="text-xs font-bold">e-Way Bill</span>
        <Button size="xs" onClick={handlePdf} disabled={exporting} className="bg-black text-white">
          {exporting ? 'Exporting…' : 'Export PDF'}
        </Button>
      </div>

      <div className="flex justify-center py-6">
        <div
          id="ewaybill-print-area"
          className="bg-white text-black w-[794px] p-6 border border-black text-[11px]"
        >
          <div className="text-center font-bold text-[15px] tracking-wide border-b-2 border-black pb-1 mb-2">
            e-WAY BILL
          </div>

          {/* Header: EWB number + validity */}
          <div className="border border-black p-2 mb-2 flex justify-between">
            <div>
              <Field label="e-Way Bill No." value={ewb.ewb_no} />
              <Field label="Generated Date" value={ewb.ewb_date} />
              <Field label="Valid Until" value={ewb.valid_upto} />
              <Field label="Status" value={ewb.status} />
            </div>
            <div>
              <Field
                label="IRN"
                value={(ewb.irn || inv?.Irn || '').slice(0, 24) + (ewb.irn || inv?.Irn ? '…' : '')}
              />
              <Field label="Document No." value={inv?.DocDtls?.No} />
              <Field label="Document Date" value={inv?.DocDtls?.Dt} />
              <Field
                label="Total Value"
                value={inv?.ValDtls ? `₹ ${money(inv.ValDtls.TotInvVal)}` : null}
              />
            </div>
          </div>

          {/* Part-A */}
          <div className="border border-black mb-2">
            <div className="bg-neutral-100 border-b border-black px-2 py-0.5 font-bold text-[10px] uppercase tracking-wide">
              Part-A
            </div>
            <div className="flex">
              <div className="flex-1 border-r border-black p-2">
                <div className="font-bold text-[10px] uppercase text-neutral-600 mb-0.5">From</div>
                <div className="font-bold text-[12px]">{seller?.LglNm || '—'}</div>
                {seller?.Addr1 && <div>{seller.Addr1}</div>}
                <div>{[seller?.Loc, seller?.Pin].filter(Boolean).join(' - ')}</div>
                <Field label="GSTIN" value={seller?.Gstin} />
                <Field label="State Code" value={seller?.Stcd} />
              </div>
              <div className="flex-1 p-2">
                <div className="font-bold text-[10px] uppercase text-neutral-600 mb-0.5">To</div>
                <div className="font-bold text-[12px]">{buyer?.LglNm || '—'}</div>
                {buyer?.Addr1 && <div>{buyer.Addr1}</div>}
                <div>{[buyer?.Loc, buyer?.Pin].filter(Boolean).join(' - ')}</div>
                <Field label="GSTIN" value={buyer?.Gstin || 'URP'} />
                <Field
                  label="State Code / POS"
                  value={[buyer?.Stcd, buyer?.Pos].filter(Boolean).join(' / ')}
                />
              </div>
            </div>
            <div className="border-t border-black p-2">
              <Field label="HSN Code(s)" value={hsn.length ? hsn.join(', ') : null} />
            </div>
          </div>

          {/* Part-B */}
          <div className="border border-black mb-2">
            <div className="bg-neutral-100 border-b border-black px-2 py-0.5 font-bold text-[10px] uppercase tracking-wide">
              Part-B — Transport Details
            </div>
            <div className="p-2 grid grid-cols-2 gap-x-6 gap-y-0.5">
              <Field
                label="Mode"
                value={MODE[String(ewb.trans_mode)] || ewb.trans_mode || 'Road'}
              />
              <Field label="Vehicle No." value={ewb.veh_no} />
              <Field label="Distance (km)" value={ewb.distance} />
              <Field label="Doc No." value={ewb.doc_no} />
            </div>
          </div>

          <div className="text-[10px] text-neutral-600 mt-3">
            Generated via the GST e-Way Bill / Invoice Registration Portal. Carry this with the
            consignment. Validity is auto-computed by the portal from the pin-to-pin distance.
          </div>
        </div>
      </div>
    </div>
  );
}
