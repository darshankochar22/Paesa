import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { Button } from '@/components/shadcn/button';
import { exportElementToPdf } from '@/lib/exportDomPdf';

// Renders a proper GST e-Invoice (Tax Invoice) bill from the NIC-signed invoice JWT stored on
// the e-invoice record, plus IRN / Ack No / Ack Date and the signed QR code. This is the
// customer-facing document (what Tally prints), not the columnar voucher-alteration view.

type Inv = {
  Irn?: string;
  AckNo?: number | string;
  AckDt?: string;
  DocDtls?: { Typ?: string; No?: string; Dt?: string };
  SellerDtls?: Party;
  BuyerDtls?: Party & { Pos?: string };
  ItemList?: Item[];
  ValDtls?: Record<string, number>;
};
type Party = {
  Gstin?: string;
  LglNm?: string;
  Addr1?: string;
  Addr2?: string;
  Loc?: string;
  Pin?: number;
  Stcd?: string;
};
type Item = {
  SlNo?: string;
  PrdDesc?: string;
  HsnCd?: string;
  Qty?: number;
  Unit?: string;
  UnitPrice?: number;
  Discount?: number;
  AssAmt?: number;
  GstRt?: number;
  IgstAmt?: number;
  CgstAmt?: number;
  SgstAmt?: number;
  TotItemVal?: number;
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

const money = (n?: number) =>
  (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Indian-format amount in words (rupees).
function amountInWords(num: number): string {
  const a = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = (n: number): string =>
    n < 20 ? a[n] : b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
  const three = (n: number): string =>
    n >= 100 ? a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + two(n % 100) : '') : two(n);
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  if (rupees === 0 && paise === 0) return 'Zero Rupees Only';
  let r = rupees,
    out = '';
  const crore = Math.floor(r / 10000000);
  r %= 10000000;
  const lakh = Math.floor(r / 100000);
  r %= 100000;
  const thousand = Math.floor(r / 1000);
  r %= 1000;
  if (crore) out += three(crore) + ' Crore ';
  if (lakh) out += two(lakh) + ' Lakh ';
  if (thousand) out += two(thousand) + ' Thousand ';
  if (r) out += three(r);
  out = out.trim() + ' Rupees';
  if (paise) out += ' and ' + two(paise) + ' Paise';
  return out + ' Only';
}

function PartyBox({ title, p }: { title: string; p?: Party & { Pos?: string } }) {
  if (!p) return null;
  return (
    <div className="flex-1 border border-black p-2 text-[11px] leading-tight">
      <div className="font-bold uppercase text-[9px] tracking-wide text-neutral-600">{title}</div>
      <div className="font-bold text-[12px]">{p.LglNm || '—'}</div>
      {p.Addr1 && <div>{p.Addr1}</div>}
      {p.Addr2 && <div>{p.Addr2}</div>}
      {(p.Loc || p.Pin) && <div>{[p.Loc, p.Pin].filter(Boolean).join(' - ')}</div>}
      <div className="mt-1">
        <span className="text-neutral-600">GSTIN: </span>
        <span className="font-semibold">{p.Gstin || 'URP'}</span>
      </div>
      <div>
        <span className="text-neutral-600">State Code: </span>
        {p.Stcd || '—'}
        {p.Pos ? ` · POS: ${p.Pos}` : ''}
      </div>
    </div>
  );
}

export default function InvoicePrintView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [rec, setRec] = useState<any>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    window.api.eInvoice
      .getByVoucher(Number(id))
      .then((r) => setRec(r.success ? r.record : null))
      .catch(() => setRec(null))
      .finally(() => setLoading(false));
  }, [id]);

  const inv = useMemo(() => decodeSignedInvoice(rec?.signed_invoice), [rec]);

  useEffect(() => {
    const content = rec?.signed_qr_code;
    if (!content) return;
    QRCode.toDataURL(content, { margin: 1, width: 150 })
      .then(setQr)
      .catch(() => setQr(null));
  }, [rec]);

  const handlePdf = async () => {
    const el = document.getElementById('invoice-print-area');
    if (!el) return;
    setExporting(true);
    await exportElementToPdf(el as HTMLElement, `Invoice_${inv?.DocDtls?.No || id}`).catch(
      () => {},
    );
    setExporting(false);
  };

  if (loading)
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-neutral-400">
        Loading…
      </div>
    );
  if (!rec || !inv)
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-xs text-neutral-500">
        <span className="font-semibold text-black">No e-Invoice found for this voucher.</span>
        <Button variant="link" size="xs" onClick={() => navigate(-1)}>
          ← Go Back
        </Button>
      </div>
    );

  const v = inv.ValDtls || {};
  const items = inv.ItemList || [];
  const isIgst = (Number(v.IgstVal) || 0) > 0;

  return (
    <div className="flex-1 flex flex-col bg-neutral-100 overflow-y-auto">
      {/* Toolbar (not printed) */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-neutral-300 sticky top-0 z-10">
        <Button variant="ghost" size="xs" onClick={() => navigate(-1)} className="text-black">
          ← Back
        </Button>
        <span className="text-xs font-bold">Tax Invoice / e-Invoice</span>
        <Button size="xs" onClick={handlePdf} disabled={exporting} className="bg-black text-white">
          {exporting ? 'Exporting…' : 'Export PDF'}
        </Button>
      </div>

      {/* The printable A4 invoice */}
      <div className="flex justify-center py-6">
        <div
          id="invoice-print-area"
          className="bg-white text-black w-[794px] p-6 border border-black text-[11px]"
        >
          {/* Title */}
          <div className="text-center font-bold text-[15px] tracking-wide border-b-2 border-black pb-1 mb-2">
            TAX INVOICE
          </div>

          {/* e-Invoice header: IRN block + QR */}
          <div className="flex justify-between items-start border border-black p-2 mb-2">
            <div className="text-[11px] leading-tight">
              <div>
                <span className="text-neutral-600">IRN: </span>
                <span className="font-mono text-[10px] break-all">{inv.Irn}</span>
              </div>
              <div>
                <span className="text-neutral-600">Ack No.: </span>
                <span className="font-bold">{inv.AckNo}</span>
              </div>
              <div>
                <span className="text-neutral-600">Ack Date: </span>
                {inv.AckDt}
              </div>
              {rec.ewb_no ? (
                <div>
                  <span className="text-neutral-600">e-Way Bill No.: </span>
                  <span className="font-bold">{rec.ewb_no}</span>
                </div>
              ) : null}
              <div className="mt-1">
                <span className="text-neutral-600">Invoice No.: </span>
                <span className="font-bold">{inv.DocDtls?.No}</span>
                <span className="ml-4 text-neutral-600">Date: </span>
                <span className="font-bold">{inv.DocDtls?.Dt}</span>
              </div>
            </div>
            {qr && (
              <img
                src={qr}
                alt="e-Invoice QR"
                className="w-[120px] h-[120px] border border-black shrink-0"
              />
            )}
          </div>

          {/* Seller / Buyer */}
          <div className="flex gap-2 mb-2">
            <PartyBox title="Supplier (Seller)" p={inv.SellerDtls} />
            <PartyBox title="Recipient (Buyer)" p={inv.BuyerDtls} />
          </div>

          {/* Item table */}
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-neutral-100">
                {[
                  '#',
                  'Description',
                  'HSN/SAC',
                  'Qty',
                  'Rate',
                  'Taxable',
                  'Rate%',
                  isIgst ? 'IGST' : 'CGST',
                  isIgst ? '' : 'SGST',
                  'Amount',
                ]
                  .filter((h, i) => !(i === 8 && isIgst))
                  .map((h) => (
                    <th key={h} className="border border-black px-1 py-0.5 text-left font-bold">
                      {h}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  <td className="border border-black px-1 py-0.5">{it.SlNo || i + 1}</td>
                  <td className="border border-black px-1 py-0.5">{it.PrdDesc}</td>
                  <td className="border border-black px-1 py-0.5">{it.HsnCd}</td>
                  <td className="border border-black px-1 py-0.5 text-right">
                    {it.Qty} {it.Unit}
                  </td>
                  <td className="border border-black px-1 py-0.5 text-right">
                    {money(it.UnitPrice)}
                  </td>
                  <td className="border border-black px-1 py-0.5 text-right">{money(it.AssAmt)}</td>
                  <td className="border border-black px-1 py-0.5 text-right">{it.GstRt}%</td>
                  {isIgst ? (
                    <td className="border border-black px-1 py-0.5 text-right">
                      {money(it.IgstAmt)}
                    </td>
                  ) : (
                    <>
                      <td className="border border-black px-1 py-0.5 text-right">
                        {money(it.CgstAmt)}
                      </td>
                      <td className="border border-black px-1 py-0.5 text-right">
                        {money(it.SgstAmt)}
                      </td>
                    </>
                  )}
                  <td className="border border-black px-1 py-0.5 text-right font-semibold">
                    {money(it.TotItemVal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-between mt-2 gap-2">
            <div className="flex-1 border border-black p-2 text-[11px]">
              <div className="text-neutral-600 text-[9px] uppercase">Amount in Words</div>
              <div className="font-semibold">{amountInWords(Number(v.TotInvVal) || 0)}</div>
            </div>
            <div className="w-64 border border-black text-[11px]">
              <Row label="Taxable Value" value={money(v.AssVal)} />
              {isIgst ? (
                <Row label="IGST" value={money(v.IgstVal)} />
              ) : (
                <>
                  <Row label="CGST" value={money(v.CgstVal)} />
                  <Row label="SGST" value={money(v.SgstVal)} />
                </>
              )}
              {Number(v.RndOffAmt) ? <Row label="Round Off" value={money(v.RndOffAmt)} /> : null}
              <div className="flex justify-between px-2 py-1 border-t-2 border-black font-bold text-[12px]">
                <span>Total Invoice Value</span>
                <span>₹ {money(v.TotInvVal)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-end mt-6 text-[10px]">
            <div className="text-neutral-600">
              This is a digitally signed e-Invoice generated on the GST Invoice Registration Portal.
            </div>
            <div className="text-center">
              <div className="font-semibold">For {inv.SellerDtls?.LglNm}</div>
              <div className="mt-6 border-t border-black pt-0.5">Authorised Signatory</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between px-2 py-0.5">
      <span className="text-neutral-600">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
