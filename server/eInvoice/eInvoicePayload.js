// Build a NIC IRP e-Invoice (IRN) payload, schema version 1.1, from a voucher + the seller
// (company) and buyer (party ledger) details. Structurally complete; real GSTINs / pincodes
// are still required for the sandbox to accept it.
//
// The service layer (eInvoiceService.generateFromVoucher) enriches the voucher before
// calling here — per-entry authoritative tax (incl. cess) from gst_voucher_tax_lines, the
// real UQC from the unit master, RCM flag, supply type, and round-off. When those enrichments
// are absent (e.g. the unit test calls this directly) the builder falls back to the stored
// stock-line amounts / rate derivation, so it stays usable stand-alone.

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

// Export/SEZ supply types carry through to TranDtls.SupTyp; anything else is a normal B2B.
const EXPORT_SUP_TYPS = new Set(['EXPWP', 'EXPWOP', 'SEZWP', 'SEZWOP', 'DEXP']);

// Resolve one stock line's CGST/SGST/IGST/CESS. Priority: authoritative per-entry breakdown
// (from gst_voucher_tax_lines, attached as it.tax) → stored stock-line amounts → derive from
// rate + supply type. NIC rejects a rated item with zero tax, so derivation is the last resort.
function resolveLineTax(it, assAmt, rate, isIntra) {
  if (it.tax) {
    return {
      cgst: round(it.tax.cgst),
      sgst: round(it.tax.sgst),
      igst: round(it.tax.igst),
      cess: round(it.tax.cess),
      cessRt: Number(it.tax.cessRate) || 0,
    };
  }
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
  return { cgst, sgst, igst, cess: round(it.cess_amount), cessRt: Number(it.cess_rate) || 0 };
}

// NIC UQC codes are 3-letter (NOS/KGS/PCS/BOX…). Prefer the mapped code from the unit master,
// fall back to the unit symbol/name, then OTH — never an arbitrary long string.
function toUqc(it) {
  const raw = String(it.uqc || it.unit || '')
    .trim()
    .toUpperCase();
  if (!raw) return 'NOS';
  return raw.slice(0, 3);
}

function buildIrnPayload(voucher, seller, buyer) {
  const items = voucher.stock_entries || [];
  const typ = DOC_TYP[voucher.voucher_type] || 'INV';

  const sellerStcd = stcd(seller.gstin, seller.state);
  const buyerStcd = stcd(buyer.gstin, buyer.state) || sellerStcd;
  const isIntra = !!sellerStcd && sellerStcd === buyerStcd;

  const supTyp = voucher.sup_typ || 'B2B';
  const isExport = EXPORT_SUP_TYPS.has(supTyp);

  const itemList = items.map((it, i) => {
    const qty = Number(it.quantity) || 0;
    const unitPrice = Number(it.rate) || 0;
    const totAmt = round(qty * unitPrice);
    const disc = Number(it.discount_amount) || 0;
    const assAmt = round(totAmt - disc);
    const rate = Number(it.gst_rate) || 0;
    // Services are identified by a SAC (6-digit, begins with 99) — same rule GSTR-3B uses.
    const isServc = /^99/.test(String(it.hsn_code || '')) ? 'Y' : 'N';
    let { cgst, sgst, igst, cess, cessRt } = resolveLineTax(it, assAmt, rate, isIntra);
    // Cess is stored as an amount only (rate 0 on the tax line); back out the advalorem rate
    // so NIC gets a consistent CesRt/CesAmt pair.
    if (cess > 0 && !cessRt && assAmt > 0) cessRt = round((cess / assAmt) * 100);
    return {
      SlNo: String(i + 1),
      PrdDesc: it.item_name || `Item ${i + 1}`,
      IsServc: isServc,
      HsnCd: it.hsn_code || '',
      Qty: qty,
      Unit: toUqc(it),
      UnitPrice: unitPrice,
      TotAmt: totAmt,
      Discount: disc,
      AssAmt: assAmt,
      GstRt: rate,
      IgstAmt: igst,
      CgstAmt: cgst,
      SgstAmt: sgst,
      CesRt: cessRt,
      CesAmt: cess,
      TotItemVal: round(assAmt + cgst + sgst + igst + cess),
    };
  });

  const sum = (f) => round(itemList.reduce((s, x) => s + (x[f] || 0), 0));
  const rndOff = round(voucher.round_off);
  const othChrg = round(voucher.oth_chrg);
  const valDtls = {
    AssVal: sum('AssAmt'),
    CgstVal: sum('CgstAmt'),
    SgstVal: sum('SgstAmt'),
    IgstVal: sum('IgstAmt'),
    CesVal: sum('CesAmt'),
    StCesVal: 0,
    Discount: sum('Discount'),
    OthChrg: othChrg,
    RndOffAmt: rndOff,
    TotInvVal: round(sum('TotItemVal') + othChrg + rndOff),
  };

  return {
    Version: '1.1',
    TranDtls: {
      TaxSch: 'GST',
      SupTyp: supTyp,
      RegRev: voucher.reg_rev === 'Y' || voucher.reg_rev === true ? 'Y' : 'N',
      IgstOnIntra: voucher.igst_on_intra === 'Y' ? 'Y' : 'N',
    },
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
      // Exports: place of supply is 96 (other territory / outside India).
      Pos: isExport ? '96' : buyerStcd,
      Addr1: buyer.addr || 'NA',
      Loc: buyer.loc || 'NA',
      Pin: toPin(buyer.pin),
      Stcd: isExport ? '96' : buyerStcd,
    },
    ItemList: itemList,
    ValDtls: valDtls,
  };
}

// Pre-flight the payload against NIC's hard rules so we surface a clear, specific error
// instead of a cryptic IRP rejection. Returns an array of human-readable problems ([] = ok).
function validateIrnInputs(payload) {
  const errs = [];
  const gstinRe = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/;
  const s = payload.SellerDtls || {};
  const b = payload.BuyerDtls || {};
  if (!s.Gstin || !gstinRe.test(s.Gstin)) errs.push('Seller GSTIN is missing or invalid.');
  if (!s.Stcd) errs.push('Seller state code could not be resolved.');
  if (s.Pin === 999999) errs.push('Seller pincode is missing/invalid (fill the company address).');

  const supTyp = payload.TranDtls?.SupTyp;
  const isExport = EXPORT_SUP_TYPS.has(supTyp);
  if (!isExport && supTyp === 'B2B') {
    if (!b.Gstin || b.Gstin === 'URP' || !gstinRe.test(b.Gstin))
      errs.push('Buyer GSTIN is missing or invalid (a B2B e-Invoice needs a registered buyer).');
    if (b.Pin === 999999) errs.push('Buyer pincode is missing/invalid (fill the party address).');
  }

  (payload.ItemList || []).forEach((it, i) => {
    const n = i + 1;
    if (!it.HsnCd) errs.push(`Line ${n} (${it.PrdDesc}): HSN/SAC code is required.`);
    if (Number(it.GstRt) > 0 && !Number(it.IgstAmt) && !Number(it.CgstAmt) && !Number(it.SgstAmt))
      errs.push(`Line ${n} (${it.PrdDesc}): taxed at ${it.GstRt}% but no tax amount computed.`);
  });
  return errs;
}

module.exports = { buildIrnPayload, validateIrnInputs, toNicDate, stcd, EXPORT_SUP_TYPS };
