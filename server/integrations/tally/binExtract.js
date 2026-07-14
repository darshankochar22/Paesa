// ---------------------------------------------------------------------------
// binExtract.js — extract masters + vouchers from a TallyPrime 6.x data folder
// (Manager.1800 + TranMgr.1800) into the importer's parsed shape.
//
// Node port of extract.py. Record grammar (verified — see project memory
// "tally-1800-binary-import"):
//   MASTERS  Manager.1800, chain rec_class 0x0b, fields parsed at offset 0x2c
//   VOUCHERS TranMgr.1800, chain rec_class 0x42 (header + allocation sub-records)
//   amounts  signed i64 / 100000 = rupees   (neg = Debit, pos = Credit)
//   dates    serial day, epoch 1899-12-31
// ---------------------------------------------------------------------------
'use strict';

const path = require('path');
const { PagedFile, parse, first, firstFlat, flat } = require('./binFormat');

const SCALE = 100000;
const EPOCH_MS = Date.UTC(1899, 11, 31); // 1899-12-31
const HSN_RE = /^\d{4,8}$/;

// Standard Tally group tree: name -> [parent|null, nature]. The .1800 master has
// no recoverable parent stream-ref for groups; the default tree is fixed.
const TALLY_GROUP_HIER = {
  'Capital Account': [null, 'Liabilities'],
  'Loans (Liability)': [null, 'Liabilities'],
  'Current Liabilities': [null, 'Liabilities'],
  'Fixed Assets': [null, 'Assets'],
  Investments: [null, 'Assets'],
  'Current Assets': [null, 'Assets'],
  'Branch / Divisions': [null, 'Assets'],
  'Misc. Expenses (ASSET)': [null, 'Assets'],
  'Suspense A/c': [null, 'Liabilities'],
  'Sales Accounts': [null, 'Income'],
  'Purchase Accounts': [null, 'Expenses'],
  'Direct Incomes': [null, 'Income'],
  'Indirect Incomes': [null, 'Income'],
  'Direct Expenses': [null, 'Expenses'],
  'Indirect Expenses': [null, 'Expenses'],
  'Bank Accounts': ['Current Assets', 'Assets'],
  'Cash-in-hand': ['Current Assets', 'Assets'],
  'Sundry Debtors': ['Current Assets', 'Assets'],
  'Stock-in-hand': ['Current Assets', 'Assets'],
  'Loans & Advances (Asset)': ['Current Assets', 'Assets'],
  'Deposits (Asset)': ['Current Assets', 'Assets'],
  'Duties & Taxes': ['Current Liabilities', 'Liabilities'],
  Provisions: ['Current Liabilities', 'Liabilities'],
  'Sundry Creditors': ['Current Liabilities', 'Liabilities'],
  'Bank OD A/c': ['Loans (Liability)', 'Liabilities'],
  'Secured Loans': ['Loans (Liability)', 'Liabilities'],
  'Unsecured Loans': ['Loans (Liability)', 'Liabilities'],
  'Reserves & Surplus': ['Capital Account', 'Liabilities'],
  'Advance From Debtor': ['Current Liabilities', 'Liabilities'],
  'Salary & Wages': ['Indirect Expenses', 'Expenses'],
  'Transportation Exp.': ['Indirect Expenses', 'Expenses'],
};

// Reserved names that are voucher types, NOT accounting groups.
const VOUCHER_TYPE_NAMES = new Set([
  'Attendance',
  'Contra',
  'Credit Note',
  'Debit Note',
  'Delivery Note',
  'Indent',
  'Job Work In Order',
  'Job Work Out Order',
  'Journal',
  'Material In',
  'Material Out',
  'Memorandum',
  'Mfg. Plan',
  'Opening Balance',
  'Payment',
  'Payroll',
  'Physical Stock',
  'Purchase',
  'Purchase Order',
  'Purchase Quotation',
  'Quotation',
  'Receipt',
  'Receipt Note',
  'Rejections In',
  'Rejections Out',
  'Reversing Journal',
  'Sales',
  'Sales Order',
  'Sales Plan',
  'Stat Only Adjustment',
  'Stat Only Inwards',
  'Stat Only Outwards',
  'Stock Journal',
]);

const toNum = (v) => (typeof v === 'bigint' ? Number(v) : v || 0);

function serToDate(serial) {
  if (serial == null) return null;
  const s = Number(serial);
  if (!Number.isFinite(s) || s <= 0) return null;
  const d = new Date(EPOCH_MS + s * 86400000);
  return d.toISOString().slice(0, 10);
}

// --------------------------------------------------------------- masters -----

function loadMasters(managerPath) {
  const mg = new PagedFile(managerPath);
  const streams = new Map(); // sid -> {cls: head}
  for (const h of mg.chainHeads()) {
    if (!streams.has(h.streamId)) streams.set(h.streamId, {});
    streams.get(h.streamId)[h.cls] = h;
  }

  const raw = new Map(); // sid -> fields
  const name = new Map(); // sid -> name
  for (const [sid, d] of streams) {
    if (d[0x0b] === undefined) continue;
    const f = parse(mg.blob(d[0x0b].head), 0x2c);
    const nm = first(f, 'str', 2);
    if (!nm) continue;
    raw.set(sid, f);
    name.set(sid, nm);
  }

  const parentOf = (f) => {
    const p = first(f, 'n03', 3);
    return p !== undefined ? name.get(Number(p)) : undefined;
  };

  // Pass 1 — confident types: opening-balance slot / GSTIN => ledger; base-unit
  // string => stock item.
  const kind = new Map();
  for (const [sid, f] of raw) {
    const gstin = first(f, 'str', 0xaca);
    const hasObSlot = first(f, 'n0d', 0xa2b) !== undefined;
    const baseUnit = first(f, 'str', 0xfd4);
    if (hasObSlot || gstin !== undefined) kind.set(sid, 'ledger');
    else if (baseUnit !== undefined) kind.set(sid, 'stock');
    else kind.set(sid, 'other');
  }

  // Discover the ACCOUNTING-group names (parents of confirmed ledgers + the
  // standard tree) and the STOCK-group names (parents of confirmed stock items),
  // so unused masters with no ob-slot / base-unit still classify by their parent.
  const acctGroupNames = new Set(Object.keys(TALLY_GROUP_HIER));
  const stockGroupNames = new Set(['Primary']);
  for (const [sid, f] of raw) {
    const p = first(f, 'n03', 3);
    const pn = p !== undefined ? name.get(Number(p)) : null;
    if (!pn) continue;
    if (kind.get(sid) === 'ledger') acctGroupNames.add(pn);
    else if (kind.get(sid) === 'stock') stockGroupNames.add(pn);
  }
  // Pass 2 — classify the remainder by parent: a leaf under an accounting group
  // is a ledger; a leaf under a stock group is a stock item.
  for (const [sid, f] of raw) {
    if (kind.get(sid) !== 'other') continue;
    const p = first(f, 'n03', 3);
    const pn = p !== undefined ? name.get(Number(p)) : null;
    if (!pn) continue;
    if (acctGroupNames.has(pn) && !acctGroupNames.has(name.get(sid))) kind.set(sid, 'ledger');
    else if (stockGroupNames.has(pn) && !stockGroupNames.has(name.get(sid))) kind.set(sid, 'stock');
  }

  // group names actually used as parents
  const parentNames = new Set(Object.keys(TALLY_GROUP_HIER));
  for (const [, f] of raw) {
    const p = first(f, 'n03', 3);
    if (p !== undefined && name.has(Number(p))) parentNames.add(name.get(Number(p)));
  }

  const groups = [];
  const ledgers = [];
  const stockItems = [];

  for (const [sid, f] of raw) {
    const nm = name.get(sid);
    const guid = first(f, 'str', 0x1fb);
    const base = { name: nm, parent: parentOf(f) || null, guid: guid || null, link_id: sid };
    const kd = kind.get(sid);

    if (kd === 'ledger') {
      const obRaw = first(f, 'n09', 0xa2b);
      const obNum = obRaw === undefined ? 0 : toNum(obRaw);
      const led = {
        ...base,
        opening_balance: Math.round((Math.abs(obNum) / SCALE) * 100) / 100,
        opening_balance_type: obNum < 0 ? 'Dr' : 'Cr',
      };
      const gstin = first(f, 'str', 0xaca);
      const state = first(f, 'str', 0xacc);
      const pincode = first(f, 'str', 0xa8f);
      const country = first(f, 'str', 0xa31);
      const mailing = first(f, 'str', 0x1f7);
      const address = first(f, 'str', 0x1f8);
      if (gstin) {
        led.gstin = gstin;
        led.registration_type = 'Regular';
        if (gstin.length >= 12) led.pan = gstin.slice(2, 12);
      } else {
        led.registration_type = 'Unregistered';
      }
      if (state) led.state = state;
      if (pincode) led.pincode = pincode;
      if (country) led.country = country;
      led.mailing_name = mailing || nm;
      if (address && address !== nm) {
        led.address = address;
        led.city = address;
      }
      if (base.parent && /debtor|creditor/i.test(base.parent)) led.is_bill_wise = true;
      ledgers.push(led);
    } else if (kd === 'stock') {
      const si = { ...base, base_unit: first(f, 'str', 0xfd4) || null, type_of_supply: 'Goods' };
      let hsn = null;
      for (const x of flat(f)) {
        if (x.k === 'str' && x.v && hsn === null && HSN_RE.test(x.v)) hsn = x.v;
      }
      if (hsn) si.hsn_sac = hsn;
      // Do NOT infer gst_rate/taxability from binary n08 fields. Every number is
      // scaled by SCALE, so a scaled "1.0" (=100000) or any quantity/amount
      // divisible by 25000 looked like a GST rate and falsely stamped Taxable on
      // items that have no GST set in Tally. Real GST comes from the HTTP/XML export.
      const oq = first(f, 'n0c', 2);
      if (oq) si.opening_quantity = Math.round((toNum(oq[0]) / SCALE) * 10000) / 10000;
      stockItems.push(si);
    } else if (parentNames.has(nm) && !VOUCHER_TYPE_NAMES.has(nm)) {
      const hier = TALLY_GROUP_HIER[nm];
      groups.push({
        ...base,
        parent: hier ? hier[0] : null,
        nature: hier ? hier[1] : null,
      });
    }
    // else: cost categories, currencies, voucher classes — skipped
  }

  return { streams, name, raw, groups, ledgers, stockItems };
}

// --------------------------------------------------------------- vouchers ----

function extractEntries(alloc) {
  const entries = [];
  for (const x of alloc) {
    if (x.k !== 'obj' || x.id !== 0x2713) continue;
    for (const a of x.v) {
      if (a.k === 'obj' && a.id === 2) {
        for (const b of a.v) {
          if (b.k === 'obj' && b.id === 2) {
            const led = first(b.v, 'n03', 2);
            const amt = first(b.v, 'n09', 2);
            if (led !== undefined && amt !== undefined) entries.push([Number(led), amt]);
          }
        }
      }
    }
  }
  return entries;
}

function extractInventory(alloc, name) {
  const inv = [];
  const rec = (fields) => {
    for (const x of fields) {
      if (x.k === 'obj') {
        if (x.id === 3) {
          const desc = first(x.v, 'str', 0x6b);
          const link = first(x.v, 'n03', 2);
          const canonical = link !== undefined ? name.get(Number(link)) : undefined;
          if (desc || canonical) {
            // Quantity = n0b (nested under OBJ 0x1f6); Rate = the n0c rational at
            // the top of the stock detail (carries the unit). Verified against
            // TallyPrime's own voucher view: qty 98.70 kg @ rate 140 = 13,818.
            let amt = null;
            for (const c of x.v) {
              if (c.k === 'obj' && c.id === 0x1f6) {
                const a = first(c.v, 'n09', 2);
                if (a !== undefined) amt = Math.round((Math.abs(toNum(a)) / SCALE) * 100) / 100;
              }
            }
            const qRaw = firstFlat(x.v, 'n0b', 2);
            const qty =
              qRaw !== undefined
                ? Math.round((Math.abs(toNum(qRaw)) / SCALE) * 10000) / 10000
                : null;
            const rateC = first(x.v, 'n0c', 2);
            const rate = rateC
              ? Math.round((Math.abs(toNum(rateC[0])) / SCALE) * 10000) / 10000
              : null;
            inv.push({
              item: canonical || desc || null,
              item_link_id: link !== undefined ? Number(link) : null,
              description: desc || null,
              qty,
              rate,
              amount: amt,
              hsn: first(x.v, 'str', 0x79) || null,
            });
          }
        }
        rec(x.v);
      }
    }
  };
  rec(alloc);
  return inv;
}

function loadVouchers(tranPath, name) {
  const tm = new PagedFile(tranPath);
  const streams = new Map(); // sid -> [heads]
  for (const h of tm.chainHeads()) {
    if (!streams.has(h.streamId)) streams.set(h.streamId, []);
    streams.get(h.streamId).push(h);
  }

  const vouchers = [];
  let noEntries = 0;
  const sellerGstin = new Map(); // GSTIN -> count (the company's own, on its invoices)
  for (const [, hs] of streams) {
    const h42 = hs.filter((h) => h.cls === 0x42);
    if (!h42.length) continue;
    let header = null;
    let alloc = null;
    for (const h of h42) {
      const f = parse(tm.blob(h.head));
      if (first(f, 'n03', 0xcb) !== undefined && first(f, 'str', 0x7d5) !== undefined) header = f;
      if (f.some((x) => x.k === 'obj' && x.id === 0x2713)) alloc = f;
    }
    if (header) {
      // seller GSTIN (str 0x213 in the invoice's own-company block) — the most
      // frequent one is the company's own registration.
      const g = firstFlat(header, 'str', 0x213);
      if (g && /^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z0-9]{2}$/.test(g))
        sellerGstin.set(g, (sellerGstin.get(g) || 0) + 1);
    }
    if (header === null) {
      const f = parse(tm.blob(h42[0].head));
      header = f;
      if (alloc === null && f.some((x) => x.k === 'obj' && x.id === 0x2713)) alloc = f;
    }

    const vtSid = first(header, 'n03', 0xcb);
    const partySid = first(header, 'n03', 0xcc);
    const number = first(header, 'str', 0x7d5) || firstFlat(header, 'str', 0x3f0) || null;
    let dser = null;
    for (const x of flat(header)) {
      if (x.k === 'n0d' && (x.id === 0x67 || x.id === 0x68 || x.id === 0x69)) {
        dser = x.v;
        break;
      }
    }

    const entries = [];
    if (alloc) {
      for (const [ledSid, amt] of extractEntries(alloc)) {
        const a = toNum(amt);
        const amount = Math.round((Math.abs(a) / SCALE) * 100) / 100;
        // Skip zero-amount entries — they're no-ops and the double-entry
        // validator rejects any entry that isn't strictly positive.
        if (amount === 0) continue;
        entries.push({
          ledger_name: name.get(ledSid) || null,
          ledger_link_id: ledSid,
          dr_cr: a < 0 ? 'Dr' : 'Cr',
          amount,
        });
      }
    }
    // Reconstruct the party entry when Tally left it implicit. On many invoices
    // Tally stores only the income/tax allocations and computes the party
    // (debtor/creditor) line as the balancing figure — so the record is missing
    // that entry. If the voucher is out of balance and the header names a party
    // that isn't already an entry, add it with the exact balancing amount/side.
    const partyName = partySid !== undefined ? name.get(Number(partySid)) : null;
    if (entries.length && partyName) {
      let s = 0;
      for (const e of entries) s += e.dr_cr === 'Dr' ? -e.amount : e.amount;
      s = Math.round(s * 100) / 100;
      const lc = partyName.trim().toLowerCase();
      const hasParty = entries.some((e) => (e.ledger_name || '').trim().toLowerCase() === lc);
      if (Math.abs(s) >= 0.01 && !hasParty) {
        entries.push({
          ledger_name: partyName,
          ledger_link_id: partySid !== undefined ? Number(partySid) : null,
          dr_cr: s > 0 ? 'Dr' : 'Cr',
          amount: Math.abs(s),
        });
      }
    }

    // Consolidate repeated allocations to the same ledger+side into one entry
    // (e.g. two "Sales Account" lines, one per item). Tally stores a single
    // ledger line = the sum, and the voucher view assumes one main ledger — so
    // leaving them split double-counts the invoice total.
    let mergedEntries = entries;
    if (entries.length > 1) {
      const byKey = new Map();
      const order = [];
      for (const e of entries) {
        const k = `${(e.ledger_name || '').trim().toLowerCase()}|${e.dr_cr}`;
        if (byKey.has(k)) {
          byKey.get(k).amount = Math.round((byKey.get(k).amount + e.amount) * 100) / 100;
        } else {
          const copy = { ...e };
          byKey.set(k, copy);
          order.push(k);
        }
      }
      mergedEntries = order.map((k) => byKey.get(k));
    }

    const inventory = alloc ? extractInventory(alloc, name) : [];
    if (!mergedEntries.length) noEntries++;

    vouchers.push({
      date: serToDate(dser),
      voucher_type: vtSid !== undefined ? name.get(Number(vtSid)) || null : null,
      number: number != null ? String(number) : null,
      party: partySid !== undefined ? name.get(Number(partySid)) || null : null,
      narration: null,
      // buyer's reference / order no. (str 0xcc) and dispatch/transporter (0x3f3)
      reference: first(header, 'str', 0xcc) || null,
      dispatch_through: first(header, 'str', 0x3f3) || null,
      entries: mergedEntries,
      inventory,
      guid: firstFlat(header, 'str', 0xbbc) || null,
    });
  }
  // company's own GSTIN = most frequent seller GSTIN across its invoices
  let companyGstin = null;
  let top = 0;
  for (const [g, c] of sellerGstin)
    if (c > top) {
      top = c;
      companyGstin = g;
    }
  return { vouchers, stats: { streamsWith42: vouchers.length, noEntries }, companyGstin };
}

// ------------------------------------------------------------------- main ----

// Extract a company data folder into the parsed shape consumed by importer.js
// (via binImportRunner.adapt). Returns { masters, vouchers, stats }.
function extractCompany(folder) {
  const M = loadMasters(path.join(folder, 'Manager.1800'));
  const { name } = M;
  const masters = {
    groups: M.groups,
    ledgers: M.ledgers,
    stockItems: M.stockItems,
    units: [],
    godowns: [],
    voucherTypes: [],
  };

  const { vouchers, stats, companyGstin } = loadVouchers(path.join(folder, 'TranMgr.1800'), name);
  masters.company = { gstin: companyGstin || null };

  // Promote any master referenced as an entry ledger into ledgers (TCS, an
  // unregistered party, etc.) so every voucher entry resolves.
  const emittedLedgers = new Set(masters.ledgers.map((l) => l.link_id));
  const refLedgers = new Set();
  for (const v of vouchers)
    for (const e of v.entries) if (e.ledger_link_id != null) refLedgers.add(e.ledger_link_id);
  for (const sid of refLedgers) {
    if (emittedLedgers.has(sid)) continue;
    const f = M.raw.get(sid);
    if (!f) continue;
    const p = first(f, 'n03', 3);
    const obRaw = first(f, 'n09', 0xa2b);
    const obNum = obRaw === undefined ? 0 : toNum(obRaw);
    const led = {
      name: M.name.get(sid),
      parent: p !== undefined ? M.name.get(Number(p)) || null : null,
      link_id: sid,
      opening_balance: Math.round((Math.abs(obNum) / SCALE) * 100) / 100,
      opening_balance_type: obNum < 0 ? 'Dr' : 'Cr',
    };
    const gstin = first(f, 'str', 0xaca);
    if (gstin) {
      led.gstin = gstin;
      led.registration_type = 'Regular';
      if (gstin.length >= 12) led.pan = gstin.slice(2, 12);
    } else led.registration_type = 'Unregistered';
    masters.ledgers.push(led);
    masters.groups = masters.groups.filter((g) => g.link_id !== sid);
    masters.stockItems = masters.stockItems.filter((s) => s.link_id !== sid);
  }

  // Promote any stock master referenced by an inventory line.
  const emittedItems = new Set(masters.stockItems.map((s) => s.link_id));
  const refItems = new Set();
  for (const v of vouchers)
    for (const iv of v.inventory) if (iv.item_link_id != null) refItems.add(iv.item_link_id);
  for (const sid of refItems) {
    if (emittedItems.has(sid)) continue;
    const f = M.raw.get(sid);
    if (!f) continue;
    const si = {
      name: M.name.get(sid),
      parent: null,
      link_id: sid,
      base_unit: first(f, 'str', 0xfd4) || null,
      type_of_supply: 'Goods',
    };
    let hsn = null;
    for (const x of flat(f)) {
      if (x.k === 'str' && x.v && hsn === null && HSN_RE.test(x.v)) hsn = x.v;
    }
    if (hsn) si.hsn_sac = hsn;
    // Do NOT infer gst_rate/taxability from binary n08 fields — see note above.
    masters.stockItems.push(si);
  }

  return { masters, vouchers, stats };
}

module.exports = { extractCompany, loadMasters, loadVouchers, serToDate };
