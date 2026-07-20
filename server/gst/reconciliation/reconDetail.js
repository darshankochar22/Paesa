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
  buildFyMonths,
  classifyVoucher,
  invoiceOf,
  INWARD_RECON_TYPES,
} = require('./core');
const { _recon } = require('./portalRecon');
const { invMatchKey, invTailKey, portalInvoiceTotals, withinTolerance } = _recon;

// The document number a book voucher is matched on — the supplier's bill number when
// recorded, else our own voucher number.
const bookDocNo = (v) => v.reference_number || v.voucher_number;

// Sign + provenance for one portal document. Only notes carry a direction; an invoice
// is always positive. See the call site for why an unknown note direction is treated as
// a reversal rather than left positive.
const noteDirection = (section, ntty) => {
  if (section !== 'cdn') return { sign: 1, note_type_assumed: false };
  const t = String(ntty || '').toUpperCase();
  if (t === 'C') return { sign: -1, note_type_assumed: false };
  if (t === 'D') return { sign: 1, note_type_assumed: false };
  return { sign: -1, note_type_assumed: true };
};

// Books-side direction. The codebase convention is Credit Note = outward, Debit Note =
// inward, so on the PURCHASE side a Debit Note is the purchase return and reduces ITC —
// mirroring the portal's credit note for the same event.
const bookSign = (v) => (v.voucher_type === 'Debit Note' ? -1 : 1);

// Secondary index for the trailing-digits fallback. A key claimed by more than one
// portal document is poisoned to AMBIGUOUS so it can never pair.
const AMBIGUOUS = Symbol('ambiguous');
const buildTailIndex = (portalMap) => {
  const idx = new Map();
  for (const entry of portalMap.values()) {
    const key = invTailKey(entry.ctin, entry.inum);
    if (!key) continue;
    idx.set(key, idx.has(key) ? AMBIGUOUS : entry);
  }
  return idx;
};

// Books voucher_type → drill section. Notes fold into the CDN section; everything
// else inward is a B2B invoice (imports would extend this once sandbox data exists).
const bookSection = (v) =>
  v.voucher_type === 'Credit Note' || v.voucher_type === 'Debit Note' ? 'cdn' : 'b2b';

const SECTION_LABELS = {
  b2b: 'B2B Invoices',
  cdn: 'Credit/Debit Notes',
  // GSTR-2B splits the same documents by whether their ITC may be claimed, so the
  // ineligible ones get their own sections rather than inflating the available total.
  u_b2b: 'B2B Invoices (ITC Unavailable)',
  u_cdn: 'Credit/Debit Notes (ITC Unavailable)',
};

// GSTR-2B routes a document to the ITC-unavailable sections when the portal says the
// credit cannot be claimed (itcavl 'N'). GSTR-2A has no eligibility concept, so it
// always uses the plain sections. A book voucher follows the portal document it matched.
const itcSection = (kind, section, portal) =>
  kind === '2B' && portal && String(portal.itcavl || '').toUpperCase() === 'N'
    ? `u_${section}`
    : section;

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
// `sign` is -1 for a purchase return, which REDUCES the books-side ITC — the mirror of
// the supplier's credit note on the portal side.
const addBook = (acc, v, sign = 1) => {
  acc.count++;
  acc.taxable += sign * (Number(v.taxable) || 0);
  acc.igst += sign * (Number(v.igst) || 0);
  acc.cgst += sign * (Number(v.cgst) || 0);
  acc.sgst += sign * (Number(v.sgst) || 0);
  acc.cess += sign * (Number(v.cess) || 0);
  acc.tax +=
    sign *
    ((Number(v.igst) || 0) + (Number(v.cgst) || 0) + (Number(v.sgst) || 0) + (Number(v.cess) || 0));
  acc.invoice += sign * invoiceOf(v);
};
// `sign` is -1 for a vendor credit note, which REDUCES the portal-side totals.
const addPortal = (acc, t, sign = 1) => {
  acc.count++;
  acc.taxable += sign * (Number(t.txval) || 0);
  acc.igst += sign * (Number(t.igst) || 0);
  acc.cgst += sign * (Number(t.cgst) || 0);
  acc.sgst += sign * (Number(t.sgst) || 0);
  acc.cess += sign * (Number(t.cess) || 0);
  acc.tax += sign * (Number(t.tax) || 0);
  acc.invoice += sign * (Number(t.val) || 0);
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
      // Notes belong to the Credit/Debit Notes section, not B2B. Payloads imported
      // before notes got their own bucket have no `cdn` key — they simply contribute
      // nothing here, exactly as before.
      ['cdn', 'cdn'],
    ]) {
      for (const p of payload[key] || []) {
        for (const inv of p.inv || []) {
          map.set(invMatchKey(p.ctin, inv.inum), {
            ctin: p.ctin,
            // Supplier trade name as filed on the portal — the only name a portal-only
            // document carries. Absent on payloads imported before it was captured.
            trdnm: String(p.trdnm || p.lgnm || '').trim(),
            inum: inv.inum,
            section,
            // A vendor CREDIT note reduces the ITC the portal reports; a debit note adds.
            // Totals stay positive so matching compares magnitudes — the sign is applied
            // when aggregating into the section/party columns.
            //
            // Direction unknown (2B payloads have arrived without any note-type key) is
            // treated as a REVERSAL: understating available ITC is the safe error, since
            // the opposite guess inflates credit the taxpayer may not actually claim.
            // `note_type_assumed` marks it so an inferred direction is never passed off
            // as one the portal stated.
            ...noteDirection(section, inv.ntty),
            idt: inv.idt || null,
            itcavl: inv.itcavl ?? null,
            rsn: inv.rsn ?? null,
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
// A book document with no portal counterpart is "Available Only in Books" ONLY when the
// portal statement for ITS return period was actually fetched — otherwise nothing can be
// asserted about it and it is reported as "no_portal" (period not fetched) instead of a
// false discrepancy.
const voucherStatus = (v, portalMap, importedPeriods, tailIdx, booksTailCount) => {
  let portal = portalMap.get(invMatchKey(v.party_gstin, bookDocNo(v)));
  let matchedOn = 'number';
  if (!portal) {
    // Second pass: same supplier, same trailing digits. Requires the key to identify
    // exactly ONE document on each side — one portal candidate and one book voucher —
    // so a shared tail leaves both sides unmatched instead of pairing the wrong two.
    const key = invTailKey(v.party_gstin, bookDocNo(v));
    const cand = key ? tailIdx.get(key) : null;
    if (cand && cand !== AMBIGUOUS && !cand.matched && booksTailCount.get(key) === 1) {
      portal = cand;
      matchedOn = 'trailing-digits';
    }
  }
  if (!portal) {
    const d = String(v.date || '');
    const period = `${d.slice(5, 7)}${d.slice(0, 4)}`;
    return { status: importedPeriods.has(period) ? 'only_books' : 'no_portal', portal: null };
  }
  portal.matched = true;
  portal.matchedOn = matchedOn;
  // Cess-inclusive on BOTH sides — portalInvoiceTotals.tax now counts cess too, so a
  // cess invoice is compared like-for-like instead of always reading as a mismatch.
  const bookTax =
    (Number(v.igst) || 0) + (Number(v.cgst) || 0) + (Number(v.sgst) || 0) + (Number(v.cess) || 0);
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
  counts: { reconciled: 0, mismatch: 0, only_books: 0, only_portal: 0, no_portal: 0 },
  vouchers: { mismatch: [], only_portal: [], only_books: [], no_portal: [], reconciled: [] },
});

// The whole nested reconciliation for one statement kind. Everything else slices this.
// gst_registration_id scopes the books side to one GST registration (the screen header
// names a registration — the data must honour it for multi-GSTIN companies).
// return_period (MMYYYY) narrows BOTH sides to a single month — the books vouchers and
// the imported portal statement. Null = the whole financial year (the default view).
const buildReconDetail = async (
  company_id,
  fy_id,
  kind,
  gst_registration_id = null,
  return_period = null,
) => {
  const { fyLabel, fyStartDate } = await getDatesForFY(fy_id);
  const months = buildFyMonths(fyStartDate);
  // A period outside the open FY would silently return nothing — reject it instead.
  const period =
    return_period && months.some((m) => m.period === String(return_period))
      ? String(return_period)
      : null;
  const periodLabel = period ? months.find((m) => m.period === period).label : fyLabel;
  const { rows, companyGstinInvalid } = await fetchPeriodVouchers(
    company_id,
    fy_id,
    period,
    gst_registration_id,
    !period,
  );

  let portalMap = new Map();
  const importedPeriods = new Set();
  let lastImportAt = null;
  try {
    // Fixed table per kind (whitelisted) — tagged-template style, matching portalRecon.
    const periodFilter = period ? sql`AND return_period = ${period}` : sql``;
    const importedRows =
      kind === '2A'
        ? await db.all(
            sql`SELECT * FROM gstr2a_imports
                WHERE company_id = ${company_id} AND fy_id = ${fy_id} ${periodFilter}`,
          )
        : await db.all(
            sql`SELECT * FROM gstr2b_imports
                WHERE company_id = ${company_id} AND fy_id = ${fy_id} ${periodFilter}`,
          );
    portalMap = buildPortalIndex(importedRows);
    for (const r of importedRows) {
      if (r.return_period) importedPeriods.add(String(r.return_period));
      if (r.created_at && (!lastImportAt || r.created_at > lastImportAt))
        lastImportAt = r.created_at;
    }
  } catch {
    /* imports table missing → books-only view */
  }

  // GSTIN → ledger name, for suppliers that appear ONLY on the portal (no book voucher
  // in this period to borrow a name from) and for statements imported before the
  // portal's trade name was captured. A ledger may still exist for such a supplier.
  const ledgerNameByGstin = new Map();
  try {
    const nameRows = await db.all(
      sql`SELECT gstin, name FROM ledgers
          WHERE company_id = ${company_id} AND gstin IS NOT NULL AND gstin <> ''`,
    );
    for (const r of nameRows) {
      const key = String(r.gstin || '')
        .trim()
        .toUpperCase();
      if (key && !ledgerNameByGstin.has(key)) ledgerNameByGstin.set(key, r.name || '');
    }
  } catch {
    /* no ledgers table → portal trade name only */
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

  // Trailing-digits fallback indexes. The books-side count spans every inward voucher
  // (not just the ones that reach the matcher) so a tail shared with a filtered-out
  // voucher still counts as ambiguous — erring toward "don't pair" rather than pairing
  // the wrong document.
  const tailIdx = buildTailIndex(portalMap);
  const booksTailCount = new Map();
  for (const v of rows) {
    if (!INWARD_RECON_TYPES.includes(v.voucher_type)) continue;
    const key = invTailKey(v.party_gstin, bookDocNo(v));
    if (key) booksTailCount.set(key, (booksTailCount.get(key) || 0) + 1);
  }

  let uncertain = 0;
  let notInScope = 0; // unregistered/consumer purchases — can never appear on the portal
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
    cess: Number(v.cess) || 0,
    tax:
      (Number(v.igst) || 0) + (Number(v.cgst) || 0) + (Number(v.sgst) || 0) + (Number(v.cess) || 0),
    invoice: invoiceOf(v),
  });
  // Portal-side row. Amounts carry the note sign so a vendor credit note reads as the
  // negative it is, matching the section totals.
  const portalRowOf = (portal) => {
    const s = portal.sign || 1;
    return {
      doc_no: portal.inum,
      gstin: portal.ctin,
      // Supplier name for the portal row — trade name as filed, else a books ledger with
      // the same GSTIN. Lets an only-on-portal document name its supplier.
      party_name:
        portal.trdnm ||
        ledgerNameByGstin.get(
          String(portal.ctin || '')
            .trim()
            .toUpperCase(),
        ) ||
        '',
      doc_date: portal.idt || null,
      taxable: s * portal.totals.txval,
      igst: s * portal.totals.igst,
      cgst: s * portal.totals.cgst,
      sgst: s * portal.totals.sgst,
      cess: s * portal.totals.cess,
      tax: s * portal.totals.tax,
      invoice: s * portal.totals.val,
      // GSTR-2B ITC eligibility. 'N' means the credit cannot be claimed — `rsn` carries
      // the portal's reason code. Null on 2A, which has no eligibility concept.
      itc_available: portal.itcavl ?? null,
      itc_reason: portal.rsn ?? null,
      // 'trailing-digits' = paired on the numeric tail because the book document number
      // is an abbreviation of the portal's. Surfaced so a user can see the join was
      // inferred rather than exact.
      matched_on: portal.matchedOn || null,
      // True when the portal gave no note type and the reversal direction was inferred.
      note_type_assumed: !!portal.note_type_assumed,
    };
  };

  for (const v of rows) {
    if (!INWARD_RECON_TYPES.includes(v.voucher_type)) continue;
    const cls = classifyVoucher(v, KIND_CLASSIFIER[kind], companyGstinInvalid);
    if (cls.bucket === 'uncertain') {
      uncertain++;
      continue;
    }
    if (cls.bucket !== 'included') {
      if (cls.category === 'Unregistered Party (Not on Portal)') notInScope++;
      continue;
    }

    const { status, portal } = voucherStatus(
      v,
      portalMap,
      importedPeriods,
      tailIdx,
      booksTailCount,
    );
    // Section is decided AFTER matching: on GSTR-2B an ITC-ineligible portal document
    // pulls its book voucher into the ITC-unavailable block alongside it.
    const sec = ensureSection(itcSection(kind, bookSection(v), portal));
    const gstinKey =
      String(v.party_gstin || '')
        .trim()
        .toUpperCase() || '(no GSTIN)';
    const party = ensureParty(
      sec,
      gstinKey,
      v.ledger_name || v.party_name || portal?.trdnm || ledgerNameByGstin.get(gstinKey),
    );

    const bs = bookSign(v);
    addBook(sec.books, v, bs);
    addBook(party.books, v, bs);
    // A portal invoice is added to the aggregates ONCE, even if two book documents share
    // its normalized number — otherwise the portal totals double-count.
    if (portal && !portal.counted) {
      portal.counted = true;
      addPortal(sec.portal, portal.totals, portal.sign);
      addPortal(party.portal, portal.totals, portal.sign);
    }
    party.counts[status]++;
    const row = voucherRow(v);
    if (status === 'reconciled')
      party.vouchers.reconciled.push({ book: row, portal: portalRowOf(portal) });
    else if (status === 'mismatch')
      party.vouchers.mismatch.push({ book: row, portal: portalRowOf(portal) });
    else party.vouchers[status].push({ book: row, portal: null });
  }

  // Portal invoices no book document matched → "Available Only on Portal".
  for (const portal of portalMap.values()) {
    if (portal.matched) continue;
    const sec = ensureSection(itcSection(kind, portal.section, portal));
    const ctinKey =
      String(portal.ctin || '')
        .trim()
        .toUpperCase() || '(no GSTIN)';
    // Name a portal-only supplier from the portal's own trade name, falling back to a
    // ledger with the same GSTIN — otherwise the row shows a bare GSTIN and is unusable.
    const party = ensureParty(sec, ctinKey, portal.trdnm || ledgerNameByGstin.get(ctinKey) || '');
    addPortal(sec.portal, portal.totals, portal.sign);
    addPortal(party.portal, portal.totals, portal.sign);
    party.counts.only_portal++;
    party.vouchers.only_portal.push({ book: null, portal: portalRowOf(portal) });
  }

  // Finalize: statuses + rounding. A party/section is Reconciled only when every one of
  // its documents reconciled (no mismatch, nothing one-sided, no unverifiable period).
  const totals = { reconciled: 0, mismatch: 0, only_books: 0, only_portal: 0, no_portal: 0 };
  for (const sec of Object.values(sections)) {
    let secClean = true;
    for (const party of sec.parties.values()) {
      const c = party.counts;
      party.status =
        c.mismatch || c.only_books || c.only_portal || c.no_portal ? 'Unreconciled' : 'Reconciled';
      if (party.status === 'Unreconciled') secClean = false;
      totals.reconciled += c.reconciled;
      totals.mismatch += c.mismatch;
      totals.only_books += c.only_books;
      totals.only_portal += c.only_portal;
      totals.no_portal += c.no_portal;
      round(party.books);
      round(party.portal);
    }
    sec.status = secClean && sec.parties.size ? 'Reconciled' : 'Unreconciled';
    round(sec.books);
    round(sec.portal);
  }

  return {
    kind,
    fyLabel: periodLabel,
    period,
    months,
    uncertain,
    notInScope,
    sections,
    totals,
    hasPortal: portalMap.size > 0,
    lastImportAt,
  };
};

// ── View getters ────────────────────────────────────────────────────────────────

// Sum a list of {books, portal} data rows into one {books, portal} subtotal.
// A row with sign -1 (ITC reversal) NETS OFF the amount columns; counts always add.
const sumRows = (rows) => {
  const acc = { books: zero(), portal: zero() };
  for (const r of rows) {
    const sign = r.sign === -1 ? -1 : 1;
    for (const side of ['books', 'portal']) {
      for (const k of Object.keys(acc[side]))
        acc[side][k] += (k === 'count' ? 1 : sign) * (r[side]?.[k] || 0);
    }
  }
  round(acc.books);
  round(acc.portal);
  return acc;
};

// Build the Tally-shaped Return View for a kind. GSTR-2A lists inward documents
// (B2B, amendments, notes, ISD, imports); GSTR-2B groups them as Input Tax Credit
// Available / Unavailable — Part A/Part B with subtotals. Only rows backed by real
// book sections ('b2b' invoices, 'cdn' purchase-return notes) are drillable.
const buildReturnView = (d, kind) => {
  const dataRow = (key, label, bookKey, sign = 1) => {
    const s = bookKey ? d.sections[bookKey] : null;
    const drillable = !!(s && s.parties.size);
    return {
      type: 'data',
      key: bookKey || key,
      label,
      sign,
      books: s ? s.books : zero(),
      portal: s ? s.portal : zero(),
      status: s ? s.status : '',
      drillable,
    };
  };

  if (kind === '2A') {
    return [
      dataRow('b2b', 'B2B Invoices', 'b2b'),
      dataRow('amend_b2b', 'Amendments to B2B Invoices'),
      dataRow('cdn', 'Credit/Debit Notes', 'cdn'),
      dataRow('amend_cdn', 'Amendments to Credit/Debit Notes'),
      dataRow('isd', 'ISD Credits'),
      dataRow('import_boe', 'Import of Goods from overseas on Bill of Entry'),
      dataRow('import_sez', 'Import of Goods from SEZ Units/Developers on Bill of Entry'),
    ];
  }

  // GSTR-2B — Input Tax Credit Available / Unavailable, Part A/Part B.
  // No row-level sign here: purchase returns are already negative at the DOCUMENT level
  // (portal credit notes via noteDirection, book Debit Notes via bookSign). Applying -1
  // again would flip them back and make a reversal ADD to the available credit.
  const avail = [
    dataRow('b2b', 'All other ITC from Registered Persons (Excluding Reverse Charge)', 'b2b'),
    dataRow('isd', 'Inward Supplies from ISD'),
    dataRow('rcm', 'Inward Supplies Liable for Reverse Charge'),
    dataRow('import', 'Import of Goods'),
    dataRow('reversal', 'Reversal of Available ITC (Purchase Return) - Part B', 'cdn'),
    dataRow('others', 'Others'),
  ];
  const unavail = [
    dataRow('u_other', 'All other ITC from Registered Persons (Excluding Reverse Charge)', 'u_b2b'),
    dataRow('u_isd', 'Inward Supplies from ISD'),
    dataRow('u_rcm', 'Inward Supplies Liable for Reverse Charge'),
    dataRow('u_reversal', 'Reversal of Unavailable ITC (Purchase Return) - Part B', 'u_cdn'),
    dataRow('u_others', 'Others'),
  ];
  const availTotal = sumRows(avail);
  const unavailTotal = sumRows(unavail);
  return [
    { type: 'group', label: 'Input Tax Credit Available - Part A' },
    ...avail,
    { type: 'subtotal', label: 'Net ITC Available', ...availTotal },
    { type: 'group', label: 'Input Tax Credit Unavailable - Part A' },
    ...unavail,
    { type: 'subtotal', label: 'Total Unavailable ITC', ...unavailTotal },
  ];
};

// Which FY months already have a fetched portal statement — drives the period list's
// "fetched" marker. Unfiltered by the selected period on purpose.
const fetchedPeriods = async (company_id, fy_id, kind) => {
  try {
    const table = kind === '2A' ? 'gstr2a_imports' : 'gstr2b_imports';
    const rows = await db.all(
      sql`SELECT DISTINCT return_period FROM ${sql.raw(table)}
          WHERE company_id = ${company_id} AND fy_id = ${fy_id}`,
    );
    return new Set(rows.map((r) => String(r.return_period)));
  } catch {
    return new Set();
  }
};

const getReconSummary = async (
  company_id,
  fy_id,
  kind,
  gst_registration_id = null,
  return_period = null,
) => {
  try {
    const d = await buildReconDetail(company_id, fy_id, kind, gst_registration_id, return_period);
    const fetched = await fetchedPeriods(company_id, fy_id, kind);
    const return_view = buildReturnView(d, kind);
    const t = d.totals;
    return {
      success: true,
      payload: {
        return_view,
        voucher_status: {
          reconciled: t.reconciled,
          unreconciled: t.mismatch + t.only_books + t.only_portal + t.no_portal,
          mismatch: t.mismatch,
          only_in_books: t.only_books,
          only_in_portal: t.only_portal,
          // Book documents whose return period has no fetched portal statement —
          // unverifiable, not a proven discrepancy.
          no_portal: t.no_portal,
          uncertain: d.uncertain,
          // Unregistered/consumer purchases — out of the portal's scope entirely.
          not_in_portal_scope: d.notInScope,
        },
        period_label: d.fyLabel,
        return_period: d.period,
        // Period picker source: every month of the open FY + whether it was fetched.
        periods: d.months.map((m) => ({ ...m, fetched: fetched.has(m.period) })),
        has_portal: d.hasPortal,
        last_gst_activity: d.lastImportAt
          ? `GSTR-${kind} imported on ${d.lastImportAt}`
          : `No portal ${kind} imported`,
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const getReconPartySummary = async (
  company_id,
  fy_id,
  kind,
  section,
  gst_registration_id = null,
  return_period = null,
) => {
  try {
    const d = await buildReconDetail(company_id, fy_id, kind, gst_registration_id, return_period);
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

const getReconVoucherRegister = async (
  company_id,
  fy_id,
  kind,
  section,
  gstin,
  gst_registration_id = null,
  return_period = null,
) => {
  try {
    const d = await buildReconDetail(company_id, fy_id, kind, gst_registration_id, return_period);
    const parties = d.sections[section]?.parties;
    // Party keys are uppercased GSTINs (or the literal '(no GSTIN)') — try both.
    const party =
      parties?.get(gstin) ||
      parties?.get(
        String(gstin || '')
          .trim()
          .toUpperCase(),
      );
    const groups = party
      ? party.vouchers
      : { mismatch: [], only_portal: [], only_books: [], no_portal: [], reconciled: [] };
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
