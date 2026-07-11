'use strict';

// Tally-style GSTR-2A/2B reconciliation DRILL: the dual books-vs-portal comparison
// behind the recon screens. One aggregator, buildReconDetail(), produces the whole
// nested structure (section → party GSTIN → voucher groups) with book AND portal
// values plus a per-row match status; the three getters slice it for each screen:
//   getReconSummary        → main Return View (dual rows + voucher-status block)
//   getReconPartySummary   → a section's party-wise summary (dual rows per GSTIN)
//   getReconVoucherRegister→ a party's vouchers grouped Mismatched / Only-in-Portal /
//                            Only-in-Books / Reconciled
//
// Reuses the SAME matching primitives as portalRecon (invoice-number normalization,
// ₹10 tolerance) so the drill's counts reconcile exactly with the main screen.

const { db } = require('../../db/index');
const { sql } = require('drizzle-orm');
const {
  getDatesForFY,
  fetchPeriodVouchers,
  classifyVoucher,
  invoiceOf,
  INWARD_RECON_TYPES,
} = require('./core');
const { _recon } = require('./portalRecon');
const { invMatchKey, portalInvoiceTotals, withinTolerance } = _recon;

// Books voucher_type → drill section. Notes fold into the CDN section; everything
// else inward is a B2B invoice (imports would extend this once sandbox data exists).
const bookSection = (v) =>
  v.voucher_type === 'Credit Note' || v.voucher_type === 'Debit Note' ? 'cdn' : 'b2b';

const SECTION_LABELS = { b2b: 'B2B Invoices', cdn: 'Credit/Debit Notes' };

const KIND_CLASSIFIER = { '2A': 'GSTR2A', '2B': 'GSTR2B' };

const zero = () => ({
  count: 0,
  taxable: 0,
  igst: 0,
  cgst: 0,
  sgst: 0,
  cess: 0,
  tax: 0,
  invoice: 0,
});
const addBook = (acc, v) => {
  acc.count++;
  acc.taxable += Number(v.taxable) || 0;
  acc.igst += Number(v.igst) || 0;
  acc.cgst += Number(v.cgst) || 0;
  acc.sgst += Number(v.sgst) || 0;
  acc.tax += (Number(v.igst) || 0) + (Number(v.cgst) || 0) + (Number(v.sgst) || 0);
  acc.invoice += invoiceOf(v);
};
const addPortal = (acc, t) => {
  acc.count++;
  acc.taxable += Number(t.txval) || 0;
  acc.tax += Number(t.tax) || 0;
  acc.invoice += Number(t.val) || 0;
};
const round = (a) => {
  for (const k of Object.keys(a)) a[k] = Number((a[k] || 0).toFixed(2));
  return a;
};

// Portal index: invoice-level map keyed by GSTIN+normalized-invoice, tagged with its
// drill section, so an unmatched portal invoice can be surfaced under the right section.
const buildPortalIndex = (importedRows) => {
  const map = new Map();
  for (const row of importedRows) {
    let payload;
    try {
      payload = JSON.parse(row.payload_json);
    } catch {
      continue;
    }
    for (const [section, key] of [
      ['b2b', 'b2b'],
      ['b2b', 'b2ba'],
    ]) {
      for (const p of payload[key] || []) {
        for (const inv of p.inv || []) {
          map.set(invMatchKey(p.ctin, inv.inum), {
            ctin: p.ctin,
            inum: inv.inum,
            section,
            totals: portalInvoiceTotals(inv),
            matched: false,
          });
        }
      }
    }
  }
  return map;
};

// Voucher-level match status vs the portal map. Mutates portal.matched.
const voucherStatus = (v, portalMap) => {
  const portal = portalMap.get(invMatchKey(v.party_gstin, v.reference_number || v.voucher_number));
  if (!portal) return { status: portalMap.size > 0 ? 'only_books' : 'unreconciled', portal: null };
  portal.matched = true;
  const bookTax = (Number(v.igst) || 0) + (Number(v.cgst) || 0) + (Number(v.sgst) || 0);
  const t = portal.totals;
  const ok = t.hasItms
    ? withinTolerance(t.tax, bookTax) && withinTolerance(t.txval, Number(v.taxable) || 0)
    : t.val
      ? withinTolerance(t.val, invoiceOf(v))
      : true;
  return { status: ok ? 'reconciled' : 'mismatch', portal };
};

// Empty per-party node (holds both aggregates and the voucher groups for the register).
const partyNode = (gstin, name) => ({
  gstin,
  party_name: name || '',
  books: zero(),
  portal: zero(),
  status: 'Reconciled',
  counts: { reconciled: 0, mismatch: 0, only_books: 0, only_portal: 0 },
  vouchers: { mismatch: [], only_portal: [], only_books: [], reconciled: [] },
});

// The whole nested reconciliation for one statement kind. Everything else slices this.
const buildReconDetail = async (company_id, fy_id, kind) => {
  const { fyLabel } = await getDatesForFY(fy_id);
  const { rows, companyGstinInvalid } = await fetchPeriodVouchers(
    company_id,
    fy_id,
    null,
    null,
    true,
  );

  let portalMap = new Map();
  try {
    // Fixed table per kind (whitelisted) — tagged-template style, matching portalRecon.
    const importedRows =
      kind === '2A'
        ? await db.all(
            sql`SELECT * FROM gstr2a_imports WHERE company_id = ${company_id} AND fy_id = ${fy_id}`,
          )
        : await db.all(
            sql`SELECT * FROM gstr2b_imports WHERE company_id = ${company_id} AND fy_id = ${fy_id}`,
          );
    portalMap = buildPortalIndex(importedRows);
  } catch {
    /* imports table missing → books-only view */
  }

  const sections = {};
  const ensureSection = (key) =>
    (sections[key] ||= {
      key,
      label: SECTION_LABELS[key] || key,
      books: zero(),
      portal: zero(),
      status: 'Reconciled',
      parties: new Map(),
    });
  const ensureParty = (sec, gstin, name) => {
    if (!sec.parties.has(gstin)) sec.parties.set(gstin, partyNode(gstin, name));
    const p = sec.parties.get(gstin);
    if (name && !p.party_name) p.party_name = name;
    return p;
  };

  let uncertain = 0;
  const voucherRow = (v) => ({
    date: v.date,
    party_name: v.ledger_name || v.party_name || '',
    gstin: v.party_gstin || '',
    vch_type: v.voucher_type,
    vch_no: v.voucher_number,
    doc_no: v.reference_number || v.voucher_number,
    doc_date: v.date,
    taxable: Number(v.taxable) || 0,
    igst: Number(v.igst) || 0,
    cgst: Number(v.cgst) || 0,
    sgst: Number(v.sgst) || 0,
    tax: (Number(v.igst) || 0) + (Number(v.cgst) || 0) + (Number(v.sgst) || 0),
    invoice: invoiceOf(v),
  });
  const portalRowOf = (portal) => ({
    doc_no: portal.inum,
    gstin: portal.ctin,
    taxable: portal.totals.txval,
    tax: portal.totals.tax,
    invoice: portal.totals.val,
  });

  for (const v of rows) {
    if (!INWARD_RECON_TYPES.includes(v.voucher_type)) continue;
    const cls = classifyVoucher(v, KIND_CLASSIFIER[kind], companyGstinInvalid);
    if (cls.bucket === 'uncertain') {
      uncertain++;
      continue;
    }
    if (cls.bucket !== 'included') continue;

    const sec = ensureSection(bookSection(v));
    const party = ensureParty(sec, v.party_gstin || '(no GSTIN)', v.ledger_name || v.party_name);
    const { status, portal } = voucherStatus(v, portalMap);

    addBook(sec.books, v);
    addBook(party.books, v);
    if (portal) {
      addPortal(sec.portal, portal.totals);
      addPortal(party.portal, portal.totals);
    }
    party.counts[status === 'unreconciled' ? 'only_books' : status]++;
    const row = voucherRow(v);
    if (status === 'reconciled')
      party.vouchers.reconciled.push({ book: row, portal: portalRowOf(portal) });
    else if (status === 'mismatch')
      party.vouchers.mismatch.push({ book: row, portal: portalRowOf(portal) });
    else party.vouchers.only_books.push({ book: row, portal: null });
  }

  // Portal invoices no book document matched → "Available Only on Portal".
  for (const portal of portalMap.values()) {
    if (portal.matched) continue;
    const sec = ensureSection(portal.section);
    const party = ensureParty(sec, portal.ctin || '(no GSTIN)', '');
    addPortal(sec.portal, portal.totals);
    addPortal(party.portal, portal.totals);
    party.counts.only_portal++;
    party.vouchers.only_portal.push({ book: null, portal: portalRowOf(portal) });
  }

  // Finalize: statuses + rounding. A party/section is Reconciled only when every one of
  // its documents reconciled (no mismatch, nothing one-sided).
  const totals = { reconciled: 0, mismatch: 0, only_books: 0, only_portal: 0 };
  for (const sec of Object.values(sections)) {
    let secClean = true;
    for (const party of sec.parties.values()) {
      const c = party.counts;
      party.status = c.mismatch || c.only_books || c.only_portal ? 'Unreconciled' : 'Reconciled';
      if (party.status === 'Unreconciled') secClean = false;
      totals.reconciled += c.reconciled;
      totals.mismatch += c.mismatch;
      totals.only_books += c.only_books;
      totals.only_portal += c.only_portal;
      round(party.books);
      round(party.portal);
    }
    sec.status = secClean && sec.parties.size ? 'Reconciled' : 'Unreconciled';
    round(sec.books);
    round(sec.portal);
  }

  return { kind, fyLabel, uncertain, sections, totals, hasPortal: portalMap.size > 0 };
};

// ── View getters ────────────────────────────────────────────────────────────────
const SECTION_ORDER = ['b2b', 'cdn'];

const getReconSummary = async (company_id, fy_id, kind) => {
  try {
    const d = await buildReconDetail(company_id, fy_id, kind);
    const return_view = SECTION_ORDER.filter((k) => d.sections[k]).map((k) => {
      const s = d.sections[k];
      return { key: k, label: s.label, books: s.books, portal: s.portal, status: s.status };
    });
    const t = d.totals;
    return {
      success: true,
      payload: {
        return_view,
        voucher_status: {
          reconciled: t.reconciled,
          unreconciled: t.mismatch + t.only_books + t.only_portal,
          mismatch: t.mismatch,
          only_in_books: t.only_books,
          only_in_portal: t.only_portal,
          uncertain: d.uncertain,
        },
        period_label: d.fyLabel,
        has_portal: d.hasPortal,
        last_gst_activity: d.hasPortal ? `GSTR-${kind} imported` : `No portal ${kind} imported`,
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const getReconPartySummary = async (company_id, fy_id, kind, section) => {
  try {
    const d = await buildReconDetail(company_id, fy_id, kind);
    const sec = d.sections[section];
    const parties = sec
      ? [...sec.parties.values()].map((p) => ({
          gstin: p.gstin,
          party_name: p.party_name,
          books: p.books,
          portal: p.portal,
          status: p.status,
        }))
      : [];
    return {
      success: true,
      payload: {
        section,
        section_label: SECTION_LABELS[section] || section,
        parties,
        period_label: d.fyLabel,
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const getReconVoucherRegister = async (company_id, fy_id, kind, section, gstin) => {
  try {
    const d = await buildReconDetail(company_id, fy_id, kind);
    const party = d.sections[section]?.parties.get(gstin);
    const groups = party
      ? party.vouchers
      : { mismatch: [], only_portal: [], only_books: [], reconciled: [] };
    return {
      success: true,
      payload: {
        section,
        section_label: SECTION_LABELS[section] || section,
        gstin,
        party_name: party?.party_name || '',
        groups,
        period_label: d.fyLabel,
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = {
  buildReconDetail,
  getReconSummary,
  getReconPartySummary,
  getReconVoucherRegister,
  SECTION_LABELS,
};
