'use strict';

// Normalizes GST-portal GSTR-2A/2B downloads into the shape the reconciliation
// matcher reads (portalRecon.buildPortalMap): top-level b2b/b2ba arrays of
// { ctin, inv: [{ inum, val, itms: [{ itm_det: { txval, iamt, camt, samt, csamt } }] }] }.
//
// The official statements differ from that shape in ways this module absorbs:
// - GSTR-2B nests everything under data.docdata, item arrays are `items` with flat
//   tax keys (igst/cgst/sgst/cess), and credit/debit notes come as cdnr `nt` arrays.
// - GSTR-2A section GETs already use inv/itms/itm_det with iamt/camt/samt, but
//   notes come as cdn/cdna `nt` arrays and arrive per-section rather than merged.
// Notes are folded into b2b — the matcher keys on GSTIN + document number, so book
// Debit Notes reconcile against vendor-filed notes the same way invoices do.

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// One portal line item → itm_det with iamt/camt/samt keys, whatever the source called them.
const normItem = (it = {}) => {
  const d = it.itm_det || it;
  return {
    itm_det: {
      txval: num(d.txval),
      iamt: num(d.iamt ?? d.igst),
      camt: num(d.camt ?? d.cgst),
      samt: num(d.samt ?? d.sgst),
      csamt: num(d.csamt ?? d.cess),
    },
  };
};

// One portal document (invoice `inv` entry or note `nt` entry) → inv entry.
// Two tax shapes exist in the wild and BOTH must be captured:
//  - official GSTN 2B/2A: a per-document `items`/`itms` array carries txval + taxes;
//  - flattened feeds (some Sandbox 2B invoices, and CDNR notes which never nest items):
//    txval + igst/cgst/sgst/cess sit on the document itself.
// So when there's no non-empty item array, treat the document as a single implicit item — else
// the whole invoice/note would import with zero taxable/tax and wrongly read as a mismatch.
const TAX_KEYS = ['txval', 'igst', 'cgst', 'sgst', 'cess', 'iamt', 'camt', 'samt', 'csamt'];
const hasInlineTax = (doc) => TAX_KEYS.some((k) => doc[k] != null);
const normDoc = (doc = {}) => {
  const rawItems = Array.isArray(doc.itms) ? doc.itms : Array.isArray(doc.items) ? doc.items : null;
  // Prefer a real item array; else synthesize ONE item from the document's own tax fields — but
  // only when it actually carries them, so a bare {inum,val} document (no tax anywhere) keeps an
  // empty item list and still matches on invoice value rather than a spurious zero-taxable line.
  const items = rawItems && rawItems.length ? rawItems : hasInlineTax(doc) ? [doc] : [];
  // ntty is the note type: 'C' credit / 'D' debit. A vendor CREDIT note REDUCES the ITC the
  // portal shows, so losing this flag makes credit notes inflate the portal side.
  const ntty = String(doc.ntty ?? doc.nt_typ ?? doc.note_type ?? '')
    .trim()
    .toUpperCase()
    .charAt(0);
  return {
    inum: String(doc.inum ?? doc.ntnum ?? doc.nt_num ?? ''),
    val: num(doc.val),
    // Document date, place of supply, invoice type and reverse-charge flag: Tally shows
    // these on the portal side of the reconciliation, and a missing date makes a
    // period-misfiled invoice impossible to spot.
    idt: doc.idt ?? doc.dt ?? null,
    pos: doc.pos ?? null,
    inv_typ: doc.inv_typ ?? null,
    rev: doc.rev ?? null,
    // GSTR-2B only: whether this document's ITC is available, and if not, why. This is
    // the whole point of 2B over 2A — without it eligible and ineligible credit are
    // indistinguishable.
    itcavl: doc.itcavl ?? null,
    rsn: doc.rsn ?? null,
    // Amendments carry the ORIGINAL document number they amend.
    oinum: doc.oinum ?? doc.onum ?? null,
    ...(ntty === 'C' || ntty === 'D' ? { ntty } : {}),
    itms: items.map(normItem),
  };
};

// One supplier bucket ({ctin, inv|nt}) → {ctin, inv} with normalized docs.
const normSupplier = (s = {}) => {
  const docs = Array.isArray(s.inv) ? s.inv : Array.isArray(s.nt) ? s.nt : [];
  return { ctin: String(s.ctin || ''), inv: docs.map(normDoc) };
};

// Walk a raw portal response down to the object that carries the supplier arrays,
// however many `data` layers the statement/GSP wrapped around it.
const isDocRoot = (o) => ['b2b', 'b2ba', 'cdnr', 'cdn', 'cdna'].some((k) => Array.isArray(o[k]));

function findDocRoot(raw, depth = 0) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || depth > 4) return null;
  if (raw.docdata && typeof raw.docdata === 'object') return raw.docdata;
  if (isDocRoot(raw)) return raw;
  if (raw.data) return findDocRoot(raw.data, depth + 1);
  return null;
}

// rawBySection: { [sectionName]: raw response data } — one entry per section GET
// (a consolidated statement like 2B `all` is a single entry carrying everything).
// Returns { payload, suppliers, documents } where payload is import-ready.
function buildImportPayload(rawBySection = {}) {
  const acc = { b2b: [], b2ba: [], notes: [] };

  for (const [section, raw] of Object.entries(rawBySection)) {
    if (raw == null) continue;
    if (Array.isArray(raw)) {
      // Bare supplier array from a per-section GET — bucket by the section name.
      if (section === 'b2ba') acc.b2ba.push(...raw);
      else if (/^cdn/i.test(section)) acc.notes.push(...raw);
      else acc.b2b.push(...raw);
      continue;
    }
    const root = findDocRoot(raw);
    if (!root) continue;
    acc.b2b.push(...(root.b2b || []));
    acc.b2ba.push(...(root.b2ba || []));
    acc.notes.push(...(root.cdnr || []), ...(root.cdn || []), ...(root.cdna || []));
  }

  // Notes stay in their OWN bucket. Folding them into b2b lost two things: the portal's
  // Credit/Debit Notes section always read empty (everything was tagged b2b), and a
  // vendor credit note was added to the portal totals instead of reducing them.
  const payload = {
    b2b: acc.b2b.map(normSupplier),
    b2ba: acc.b2ba.map(normSupplier),
    cdn: acc.notes.map(normSupplier),
  };

  let suppliers = 0;
  let documents = 0;
  for (const key of ['b2b', 'b2ba', 'cdn']) {
    for (const s of payload[key]) {
      suppliers++;
      documents += s.inv.length;
    }
  }
  return { payload, suppliers, documents };
}

module.exports = { buildImportPayload };
