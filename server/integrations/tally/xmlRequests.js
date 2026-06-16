// ---------------------------------------------------------------------------
// Tally XML request builders (read-side).
//
// Each function returns a fully-formed <ENVELOPE> XML *string* that can be POSTed
// to Tally's HTTP/XML server (default localhost:9000). We use the official
// "Collection" Export request envelope described in the Tally TDL primer:
//
//   HEADER/TALLYREQUEST = Export
//   HEADER/TYPE         = Collection
//   BODY/DESC/TDL/TDLMESSAGE/COLLECTION  (TYPE + FETCH list)
//
// These are pure string builders — no network, no parsing. CommonJS module.
// ---------------------------------------------------------------------------

// Escape a value for safe inclusion inside XML text / attribute content.
const esc = (v) =>
  String(v == null ? "" : v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

// Build a generic Collection Export envelope.
//   id      -> HEADER/ID and COLLECTION NAME
//   type    -> the master TYPE (Group | Ledger | StockItem | Unit |
//              VoucherType | Voucher)
//   fetch   -> array of field names for <FETCH>
//   extra   -> optional extra TDL lines injected inside the COLLECTION (e.g.
//              FILTER definitions for voucher date ranges)
//   filters -> optional array of <SYSTEM TYPE="Formulae"> filter definitions
//              injected into the TDLMESSAGE (used for date-range vouchers)
const buildCollectionRequest = ({ id, type, fetch = [], collectionBody = "", systems = "" }) => {
  const fetchLine = fetch.length
    ? `\n        <FETCH>${fetch.map(esc).join(", ")}</FETCH>`
    : "";
  return `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>${esc(id)}</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="${esc(id)}" ISMODIFY="No">
        <TYPE>${esc(type)}</TYPE>${fetchLine}${collectionBody}
          </COLLECTION>${systems}
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;
};

// ---------------------------------------------------------------------------
// testConnection / companyInfo
//
// A lightweight request used to confirm Tally is reachable and to read the
// active company name. We export the "Company" collection fetching NAME so the
// client can report the company that is currently open in Tally.
// ---------------------------------------------------------------------------
const companyInfo = () =>
  buildCollectionRequest({
    id: "CompanyInfoColl",
    type: "Company",
    fetch: ["NAME", "STARTINGFROM", "ENDINGAT", "EMAIL", "STATENAME", "COUNTRYNAME"],
  });

// Alias — semantically "is Tally reachable + which company is open".
const testConnection = () => companyInfo();

// ---------------------------------------------------------------------------
// Master exports
// ---------------------------------------------------------------------------
const groups = () =>
  buildCollectionRequest({
    id: "GroupColl",
    type: "Group",
    fetch: [
      "NAME",
      "PARENT",
      "ISREVENUE",
      "ISDEEMEDPOSITIVE",
      "ISRESERVED",
      "_PrimaryGroup",
      "SORTPOSITION",
      "GUID",
    ],
  });

const ledgers = () =>
  buildCollectionRequest({
    id: "LedgerColl",
    type: "Ledger",
    fetch: [
      "NAME",
      "PARENT",
      "OPENINGBALANCE",
      "CLOSINGBALANCE",
      "ISREVENUE",
      "ISDEEMEDPOSITIVE",
      "GSTREGISTRATIONTYPE",
      "PARTYGSTIN",
      "MAILINGNAME",
      "LEDSTATENAME",
      "COUNTRYNAME",
      "PINCODE",
      "EMAIL",
      "LEDGERMOBILE",
      "LEDGERPHONE",
      "INCOMETAXNUMBER",
      "BANKACCHOLDERNAME",
      "BANKDETAILS",
      "IFSCODE",
      "SWIFTCODE",
      "BANKINGCONFIGBANK",
      "BANKBRANCHNAME",
      "ADDRESS",
      "GUID",
    ],
  });

const stockItems = () =>
  buildCollectionRequest({
    id: "StockItemColl",
    type: "StockItem",
    fetch: [
      "NAME",
      "PARENT",
      "CATEGORY",
      "BASEUNITS",
      "OPENINGBALANCE",
      "OPENINGRATE",
      "OPENINGVALUE",
      "INFGSTHSNCODE",
      "INFGSTHSNDESCRIPTION",
      "INFGSTIGSTRATE",
      "GSTMSTTYPEOFSUPPLY",
      "INFGSTTAXABLILITY",
      "GUID",
    ],
  });

const units = () =>
  buildCollectionRequest({
    id: "UnitColl",
    type: "Unit",
    fetch: ["NAME", "ORIGINALNAME", "BASEUNITS", "ISSIMPLEUNIT", "GUID"],
  });

const voucherTypes = () =>
  buildCollectionRequest({
    id: "VoucherTypeColl",
    type: "VoucherType",
    fetch: ["NAME", "PARENT", "NUMBERINGMETHOD", "GUID"],
  });

// ---------------------------------------------------------------------------
// Vouchers (Day Book), bounded by a date range.
//
// Tally date format is YYYYMMDD. We inject SVFROMDATE/SVTODATE static variables
// so Tally limits the exported vouchers to the requested window, and FETCH the
// header fields plus the ALLLEDGERENTRIES.LIST / ALLINVENTORYENTRIES.LIST child
// collections the parser needs.
//
// Accepts ISO 'YYYY-MM-DD' or Tally 'YYYYMMDD'; normalizes to YYYYMMDD.
// ---------------------------------------------------------------------------
const toTallyDate = (d) => {
  if (d == null) return "";
  const s = String(d).trim();
  // already YYYYMMDD
  if (/^\d{8}$/.test(s)) return s;
  // ISO YYYY-MM-DD (allow / or . separators too)
  const m = s.match(/^(\d{4})[-/.](\d{2})[-/.](\d{2})$/);
  if (m) return `${m[1]}${m[2]}${m[3]}`;
  return s;
};

const vouchers = (from_date, to_date) => {
  const from = toTallyDate(from_date);
  const to = toTallyDate(to_date);
  return `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>VoucherColl</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVFROMDATE>${esc(from)}</SVFROMDATE>
        <SVTODATE>${esc(to)}</SVTODATE>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="VoucherColl" ISMODIFY="No">
        <TYPE>Voucher</TYPE>
        <FETCH>DATE, VOUCHERTYPENAME, VOUCHERNUMBER, PARTYLEDGERNAME, NARRATION, REFERENCE, ISACCOUNTINGVOUCHER, ISINVENTORYVOUCHER, ISINVOICE, GUID</FETCH>
        <FETCH>ALLLEDGERENTRIES.LIST, LEDGERENTRIES.LIST, ALLINVENTORYENTRIES.LIST</FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;
};

module.exports = {
  esc,
  buildCollectionRequest,
  toTallyDate,
  testConnection,
  companyInfo,
  groups,
  ledgers,
  stockItems,
  units,
  voucherTypes,
  vouchers,
};
