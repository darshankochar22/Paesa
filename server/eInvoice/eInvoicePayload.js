// Build a NIC IRP e-Invoice (IRN) payload, schema version 1.1, from a voucher + the seller
// (company) and buyer (party ledger) details. Structurally complete; real GSTINs / pincodes
// are still required for the sandbox to accept it.

let resolveStateCode;
try {
  ({ resolveStateCode } = require('../gst/gstTaxEngine'));
} catch {
  resolveStateCode = null;
}

const round = (n) => Math.round((Number(n) || 0) * 100) / 100;

// NIC state code = first 2 digits of GSTIN, else resolved from the state name.
function stcd(gstin, stateName) {
  if (gstin && /^\d{2}/.test(gstin)) return gstin.slice(0, 2);
  const code = resolveStateCode ? resolveStateCode(stateName) : null;
  return code ? String(code) : '';
}

// NIC wants DD/MM/YYYY.
function toNicDate(d) {
  if (!d) return '';
  const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return String(d);
}

function toPin(pin) {
  const n = parseInt(String(pin || '').replace(/\D/g, ''), 10);
  return Number.isInteger(n) && n >= 100000 ? n : 999999;
}

// NIC document type by voucher type — only these three are e-invoiced (Sales/CRN/DBN).
const DOC_TYP = { Sales: 'INV', 'Credit Note': 'CRN', 'Debit Note': 'DBN' };

function buildIrnPayload(voucher, seller, buyer) {
  const items = voucher.stock_entries || [];
  const typ = DOC_TYP[voucher.voucher_type] || 'INV';

  const sellerStcd = stcd(seller.gstin, seller.state);
  const buyerStcd = stcd(buyer.gstin, buyer.state) || sellerStcd;
  const isIntra = !!sellerStcd && sellerStcd === buyerStcd;

  const itemList = items.map((it, i) => {
    const qty = Number(it.quantity) || 0;
    const unitPrice = Number(it.rate) || 0;
    const totAmt = round(qty * unitPrice);
    const disc = Number(it.discount_amount) || 0;
    const assAmt = round(totAmt - disc);
    const rate = Number(it.gst_rate) || 0;
    // Per-entry tax is often 0 on the stock line (the real split lives in
    // gst_voucher_tax_lines), so derive CGST/SGST/IGST from the rate + supply type
    // when the stored amounts are empty. NIC rejects a rated item with zero tax.
    let cgst = round(it.cgst_amount),
      sgst = round(it.sgst_amount),
      igst = round(it.igst_amount);
    if (rate > 0 && !cgst && !sgst && !igst) {
      if (isIntra) {
        cgst = round((assAmt * rate) / 200);
        sgst = cgst;
      } else {
        igst = round((assAmt * rate) / 100);
      }
    }
    return {
      SlNo: String(i + 1),
      PrdDesc: it.item_name || `Item ${i + 1}`,
      IsServc: 'N',
      HsnCd: it.hsn_code || '',
      Qty: qty,
      Unit: (it.unit || 'NOS').toUpperCase().slice(0, 3) || 'NOS',
      UnitPrice: unitPrice,
      TotAmt: totAmt,
      Discount: disc,
      AssAmt: assAmt,
      GstRt: rate,
      IgstAmt: igst,
      CgstAmt: cgst,
      SgstAmt: sgst,
      CesRt: 0,
      CesAmt: 0,
      TotItemVal: round(assAmt + cgst + sgst + igst),
    };
  });

  const sum = (f) => round(itemList.reduce((s, x) => s + (x[f] || 0), 0));
  const valDtls = {
    AssVal: sum('AssAmt'),
    CgstVal: sum('CgstAmt'),
    SgstVal: sum('SgstAmt'),
    IgstVal: sum('IgstAmt'),
    CesVal: 0,
    StCesVal: 0,
    Discount: sum('Discount'),
    OthChrg: 0,
    RndOffAmt: 0,
    TotInvVal: sum('TotItemVal'),
  };

  return {
    Version: '1.1',
    TranDtls: { TaxSch: 'GST', SupTyp: 'B2B', RegRev: 'N', IgstOnIntra: 'N' },
    DocDtls: {
      Typ: typ,
      No: voucher.voucher_number || String(voucher.voucher_id),
      Dt: toNicDate(voucher.date),
    },
    // Credit/Debit notes must reference the original invoice (NIC requires PrecDocDtls).
    ...(typ !== 'INV' && voucher.orig_invoice_no
      ? {
          PrecDocDtls: [
            {
              InvNo: String(voucher.orig_invoice_no),
              InvDt: toNicDate(voucher.orig_invoice_date),
            },
          ],
        }
      : {}),
    SellerDtls: {
      Gstin: seller.gstin || '',
      LglNm: seller.name || '',
      Addr1: seller.addr || 'NA',
      Loc: seller.loc || 'NA',
      Pin: toPin(seller.pin),
      Stcd: sellerStcd,
    },
    BuyerDtls: {
      Gstin: buyer.gstin || 'URP',
      LglNm: buyer.name || '',
      Pos: buyerStcd,
      Addr1: buyer.addr || 'NA',
      Loc: buyer.loc || 'NA',
      Pin: toPin(buyer.pin),
      Stcd: buyerStcd,
    },
    ItemList: itemList,
    ValDtls: valDtls,
  };
}

module.exports = { buildIrnPayload, toNicDate, stcd };
