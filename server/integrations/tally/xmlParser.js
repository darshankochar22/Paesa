// ---------------------------------------------------------------------------
// Tally XML response parser (pure: XML string -> normalized plain JS objects).
//
// NO database access, NO id resolution, NO company/fy stamping. The importer
// owns all of that. This module only turns a Tally <ENVELOPE> response into the
// ParsedTally contract documented in the design spec:
//
//   { meta, groups[], ledgers[], stockItems[], vouchers[] }
//
// Uses fast-xml-parser@5 (XMLParser). Tally XML quirks handled here:
//   * Single-vs-array child nodes (one LEDGER vs many) -> always normalized to
//     arrays via toArray().
//   * Attribute @NAME / @VCHTYPE vs child <NAME>/<VOUCHERTYPENAME>.
//   * Amount strings with ₹ / Rs. / commas / "Dr"/"Cr" suffixes / leading '-'.
//   * Dr/Cr derivation from ISDEEMEDPOSITIVE + amount sign.
//   * ALLLEDGERENTRIES.LIST / LEDGERENTRIES.LIST and ALLINVENTORYENTRIES.LIST.
//   * Tally dates YYYYMMDD -> ISO YYYY-MM-DD.
// ---------------------------------------------------------------------------
const { XMLParser } = require("fast-xml-parser");

// fast-xml-parser config. We keep attributes (prefixed with @_), do NOT trim
// away leading zeros from numeric-looking strings (we parse numbers ourselves),
// and keep tag values as-is so we control all coercion.
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false, // keep everything as strings; we coerce explicitly
  parseAttributeValue: false,
  trimValues: true,
  // Tally uses tag names containing '.' (e.g. ALLLEDGERENTRIES.LIST). The parser
  // keeps the literal name, which is what we look up below.
});

// ----- small helpers --------------------------------------------------------

// Normalize a node to an array (handles undefined, single object, or array).
const toArray = (node) => {
  if (node == null) return [];
  return Array.isArray(node) ? node : [node];
};

// Read text content from a fast-xml-parser node. A leaf tag becomes a string;
// a tag with attributes/children becomes an object whose text is under "#text".
const text = (node) => {
  if (node == null) return null;
  if (typeof node === "string") {
    const t = node.trim();
    return t === "" ? null : t;
  }
  if (typeof node === "number" || typeof node === "boolean") return String(node);
  if (typeof node === "object") {
    if (node["#text"] != null) {
      const t = String(node["#text"]).trim();
      return t === "" ? null : t;
    }
    return null;
  }
  return null;
};

// Pick the first present/non-null among a list of field names on an object.
const pick = (obj, ...names) => {
  for (const n of names) {
    if (obj && obj[n] != null) {
      const v = text(obj[n]);
      if (v != null) return v;
    }
  }
  return null;
};

// Tally "Yes"/"No" -> boolean (default false).
const yesNo = (v) => {
  const t = text(v);
  return t != null && t.trim().toLowerCase() === "yes";
};

// Parse a Tally amount string into a SIGNED number.
//   * strips currency symbols (₹, Rs., INR), spaces, commas.
//   * trailing "Dr" => positive, trailing "Cr" => negative.
//   * leading '-' preserved.
// Returns 0 for empty/unparseable.
const parseAmount = (v) => {
  let s = text(v);
  if (s == null) return 0;
  s = String(s).trim();
  if (s === "") return 0;

  let sign = 1;

  // Detect trailing Dr/Cr (case-insensitive), optionally with a dot ("Cr.").
  const drCr = s.match(/(dr|cr)\.?\s*$/i);
  if (drCr) {
    if (drCr[1].toLowerCase() === "cr") sign = -1;
    s = s.slice(0, drCr.index);
  }

  // Strip currency markers and grouping.
  s = s
    .replace(/₹/g, "")
    .replace(/\bRs\.?/gi, "")
    .replace(/\bINR\b/gi, "")
    .replace(/,/g, "")
    .replace(/\s+/g, "")
    .trim();

  if (s === "" || s === "-" || s === "+") return 0;

  const n = Number(s);
  if (Number.isNaN(n)) return 0;
  return n * sign;
};

// Quantity strings look like "100 Nos" or "12.5 KG" or "-5 PCS".
// Returns the leading numeric (abs not applied — caller decides).
const parseQuantity = (v) => {
  let s = text(v);
  if (s == null) return 0;
  s = String(s).trim().replace(/,/g, "");
  const m = s.match(/-?\d+(?:\.\d+)?/);
  if (!m) return 0;
  const n = Number(m[0]);
  return Number.isNaN(n) ? 0 : n;
};

// Tally date YYYYMMDD -> ISO YYYY-MM-DD. Passes through already-ISO dates.
const tallyDateToIso = (v) => {
  const s = text(v);
  if (s == null) return null;
  const t = s.trim();
  if (/^\d{8}$/.test(t)) return `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  // dd-Mon-yyyy or other formats: leave as-is (best effort).
  return t;
};

// Name comes from @_NAME attribute or a <NAME> child.
const nameOf = (obj) => {
  const attr = obj && obj["@_NAME"] != null ? text(obj["@_NAME"]) : null;
  if (attr) return attr;
  return pick(obj, "NAME");
};

// ----- envelope traversal ---------------------------------------------------

// Recursively collect every node with a given tag key anywhere under root.
// Tally nests master objects at varying depths depending on the export form
// (COLLECTION, IMPORTDATA/REQUESTDATA/COLLECTION, DATA/COLLECTION, etc.), so a
// recursive find-by-key is the most robust extraction.
const collectByKey = (root, key, out = []) => {
  if (root == null || typeof root !== "object") return out;
  for (const k of Object.keys(root)) {
    if (k === key) {
      for (const n of toArray(root[k])) out.push(n);
    }
    const child = root[k];
    if (child && typeof child === "object") {
      for (const c of toArray(child)) collectByKey(c, key, out);
    }
  }
  return out;
};

// Parse the raw XML string once into a JS tree (or accept an already-parsed obj).
const toTree = (xmlOrObj) => {
  if (xmlOrObj == null) return {};
  if (typeof xmlOrObj === "object") return xmlOrObj;
  return parser.parse(String(xmlOrObj));
};

// HEADER/TALLYREQUEST if present (for meta.requestType).
const readRequestType = (tree) => {
  const hdr = collectByKey(tree, "HEADER")[0];
  if (hdr) {
    const rt = pick(hdr, "TALLYREQUEST");
    if (rt) return rt;
  }
  // Some responses echo REQUESTDESC/REPORTNAME instead.
  const rd = collectByKey(tree, "REQUESTDESC")[0];
  if (rd) {
    const rn = pick(rd, "REPORTNAME");
    if (rn) return rn;
  }
  return null;
};

// ----- entity parsers -------------------------------------------------------

const mapGroup = (g) => ({
  name: nameOf(g),
  parent: normalizeParent(pick(g, "PARENT")),
  nature: pick(g, "NATURE", "_PrimaryGroup") || null,
  isRevenue: yesNo(g.ISREVENUE),
  isDeemedPositive: yesNo(g.ISDEEMEDPOSITIVE),
  isReserved: yesNo(g.ISRESERVED),
  primaryGroup: pick(g, "_PrimaryGroup", "PRIMARYGROUP"),
  sortPosition: numOrNull(pick(g, "SORTPOSITION")),
  guid: pick(g, "GUID"),
});

// '' or 'Primary' (Tally's synthetic root) => null parent.
const normalizeParent = (p) => {
  if (p == null) return null;
  const t = String(p).trim();
  if (t === "" || t.toLowerCase() === "primary") return null;
  return t;
};

const numOrNull = (v) => {
  if (v == null) return null;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isNaN(n) ? null : n;
};

const mapLedger = (l) => {
  const bank = mapBank(l);
  return {
    name: nameOf(l),
    parent: normalizeParent(pick(l, "PARENT")),
    openingBalance: parseAmount(l.OPENINGBALANCE),
    closingBalance: parseAmount(l.CLOSINGBALANCE),
    gstin: pick(l, "PARTYGSTIN", "GSTIN"),
    registrationType: pick(l, "GSTREGISTRATIONTYPE", "Gstregistrationtype"),
    mailingName: pick(l, "MAILINGNAME"),
    address: mapAddress(l),
    state: pick(l, "LEDSTATENAME", "STATENAME"),
    country: pick(l, "COUNTRYNAME"),
    pincode: pick(l, "PINCODE"),
    email: pick(l, "EMAIL"),
    phone: pick(l, "LEDGERMOBILE", "LEDGERPHONE"),
    pan: pick(l, "INCOMETAXNUMBER", "PANNUMBER"),
    isRevenue: yesNo(l.ISREVENUE),
    isDeemedPositive: yesNo(l.ISDEEMEDPOSITIVE),
    bank,
    guid: pick(l, "GUID"),
  };
};

// <ADDRESS.LIST><ADDRESS>line1</ADDRESS><ADDRESS>line2</ADDRESS></ADDRESS.LIST>
// or a flat <ADDRESS>. Join the lines into one string.
const mapAddress = (l) => {
  const list = l["ADDRESS.LIST"];
  if (list) {
    const lines = toArray(list.ADDRESS).map((x) => text(x)).filter(Boolean);
    if (lines.length) return lines.join(", ");
  }
  return pick(l, "ADDRESS");
};

const mapBank = (l) => {
  const accountHolderName = pick(l, "BANKACCHOLDERNAME");
  const accountNumber = pick(l, "BANKDETAILS", "ACCOUNTNUMBER", "BANKACCOUNTNO");
  const ifscCode = pick(l, "IFSCODE", "IFSCCODE");
  const swiftCode = pick(l, "SWIFTCODE");
  const bankName = pick(l, "BANKINGCONFIGBANK", "BANKNAME");
  const branchName = pick(l, "BANKBRANCHNAME");
  if (
    accountHolderName == null &&
    accountNumber == null &&
    ifscCode == null &&
    swiftCode == null &&
    bankName == null &&
    branchName == null
  ) {
    return null;
  }
  return { accountHolderName, accountNumber, ifscCode, swiftCode, bankName, branchName };
};

const mapStockItem = (s) => ({
  name: nameOf(s),
  parent: normalizeParent(pick(s, "PARENT")),
  category: pick(s, "CATEGORY"),
  baseUnit: pick(s, "BASEUNITS", "BASEUNIT"),
  openingQuantity: Math.abs(parseQuantity(s.OPENINGBALANCE)),
  openingRate: Math.abs(parseAmount(s.OPENINGRATE)),
  openingValue: parseAmount(s.OPENINGVALUE),
  hsnSac: pick(s, "INFGSTHSNCODE", "HSNCODE", "GSTHSNCODE"),
  hsnSacDescription: pick(s, "INFGSTHSNDESCRIPTION", "GSTHSNDESCRIPTION"),
  gstRate: numOrZero(pick(s, "INFGSTIGSTRATE", "GSTIGSTRATE")),
  typeOfSupply: pick(s, "GSTMSTTYPEOFSUPPLY", "GSTTYPEOFSUPPLY"),
  taxability: pick(s, "INFGSTTAXABLILITY", "INFGSTTAXABILITY", "GSTTAXABILITY"),
  guid: pick(s, "GUID"),
});

const numOrZero = (v) => {
  const n = numOrNull(v);
  return n == null ? 0 : n;
};

// One ledger entry from ALLLEDGERENTRIES.LIST / LEDGERENTRIES.LIST.
const mapLedgerEntry = (e) => {
  const ledgerName = pick(e, "LEDGERNAME");
  const raw = parseAmount(e.AMOUNT);
  const deemedPositive = yesNo(e.ISDEEMEDPOSITIVE);
  // Spec §2.3: Dr if ISDEEMEDPOSITIVE=Yes OR rawAmount < 0; else Cr.
  const type = deemedPositive || raw < 0 ? "Dr" : "Cr";
  return { ledgerName, type, amount: Math.abs(raw) };
};

const mapInventoryEntry = (e) => ({
  stockItemName: pick(e, "STOCKITEMNAME"),
  quantity: Math.abs(parseQuantity(e.ACTUALQTY != null ? e.ACTUALQTY : e.BILLEDQTY)),
  rate: Math.abs(parseAmount(e.RATE)),
  amount: Math.abs(parseAmount(e.AMOUNT)),
  godownName: pick(e, "GODOWNNAME"),
});

const mapVoucher = (v) => {
  // Ledger entries may live under either key; merge both, preserving order.
  const ledgerEntryNodes = [
    ...toArray(v["ALLLEDGERENTRIES.LIST"]),
    ...toArray(v["LEDGERENTRIES.LIST"]),
  ];
  const entries = ledgerEntryNodes
    .map(mapLedgerEntry)
    .filter((e) => e.ledgerName != null);

  const inventoryNodes = toArray(v["ALLINVENTORYENTRIES.LIST"]);
  const inventoryEntries = inventoryNodes
    .map(mapInventoryEntry)
    .filter((e) => e.stockItemName != null);

  const isInventory =
    inventoryEntries.length > 0 || yesNo(v.ISINVENTORYVOUCHER);
  // Accounting voucher: explicit flag, else true when accounting entries exist.
  const explicitAccounting = v.ISACCOUNTINGVOUCHER != null;
  const isAccounting = explicitAccounting
    ? yesNo(v.ISACCOUNTINGVOUCHER)
    : entries.length > 0;

  return {
    date: tallyDateToIso(v.DATE),
    voucherType: pick(v, "VOUCHERTYPENAME") || (v["@_VCHTYPE"] != null ? text(v["@_VCHTYPE"]) : null),
    number: pick(v, "VOUCHERNUMBER"),
    narration: pick(v, "NARRATION"),
    party: pick(v, "PARTYLEDGERNAME", "PARTYNAME"),
    reference: pick(v, "REFERENCE"),
    isAccounting,
    isInventory,
    entries,
    inventoryEntries,
    guid: pick(v, "GUID"),
  };
};

// ----- public per-entity parsers (each accepts XML string OR parsed tree) ----

const parseGroups = (xmlOrObj) =>
  collectByKey(toTree(xmlOrObj), "GROUP").map(mapGroup).filter((g) => g.name != null);

const parseLedgers = (xmlOrObj) =>
  collectByKey(toTree(xmlOrObj), "LEDGER").map(mapLedger).filter((l) => l.name != null);

const parseStockItems = (xmlOrObj) =>
  collectByKey(toTree(xmlOrObj), "STOCKITEM").map(mapStockItem).filter((s) => s.name != null);

const parseVouchers = (xmlOrObj) =>
  collectByKey(toTree(xmlOrObj), "VOUCHER").map(mapVoucher);

// Determine which master collection the response carries (best effort).
const detectCollectionType = (tree) => {
  if (collectByKey(tree, "VOUCHER").length) return "Voucher";
  if (collectByKey(tree, "STOCKITEM").length) return "StockItem";
  if (collectByKey(tree, "LEDGER").length) return "Ledger";
  if (collectByKey(tree, "GROUP").length) return "Group";
  return null;
};

// Generic parse — returns the full ParsedTally contract. Parses the XML once
// and runs every per-entity extractor against the shared tree.
const parse = (xmlOrObj) => {
  const tree = toTree(xmlOrObj);
  return {
    meta: {
      source: "tally-xml",
      requestType: readRequestType(tree),
      collectionType: detectCollectionType(tree),
    },
    groups: collectByKey(tree, "GROUP").map(mapGroup).filter((g) => g.name != null),
    ledgers: collectByKey(tree, "LEDGER").map(mapLedger).filter((l) => l.name != null),
    stockItems: collectByKey(tree, "STOCKITEM").map(mapStockItem).filter((s) => s.name != null),
    vouchers: collectByKey(tree, "VOUCHER").map(mapVoucher),
  };
};

module.exports = {
  parse,
  parseGroups,
  parseLedgers,
  parseStockItems,
  parseVouchers,
  // exported helpers (useful for the importer + tests)
  parseAmount,
  parseQuantity,
  tallyDateToIso,
  toArray,
};
