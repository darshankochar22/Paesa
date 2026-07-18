// GSTR-1 export helpers — turn the server's GSTR-1 payload (the GSTN section shapes
// b2b/b2cl/b2cs/cdnr/cdnur/exp/nil/hsn built by server/gst/gstr1Service.js) into the three
// formats the GST portal / Returns Offline Tool accept:
//   1. Portal JSON  — the exact machine envelope the portal ingests (offline tool → JSON).
//   2. Section CSVs — one file per section with the offline-tool template headers (option-4 import).
//   3. One .xls     — a multi-sheet SpreadsheetML workbook (dependency-free) for review, sheets
//                     and headers matching the offline-tool template so data is copy-paste ready.
//
// Headers/section names follow the GST Returns Offline Tool template (stable since 2017):
// b2b, b2cl, b2cs, cdnr, cdnur, exp, exemp (nil), hsn. Amounts are rounded to 2 decimals
// (the tool rejects >2). Dates stay DD-MM-YYYY as the server emits them.

/* eslint-disable @typescript-eslint/no-explicit-any */

// GST state code → name, for the "Place Of Supply" column (offline tool wants "24-Gujarat").
const GST_STATE_NAMES: Record<string, string> = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '25': 'Daman & Diu',
  '26': 'Dadra & Nagar Haveli',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar',
  '36': 'Telangana',
  '37': 'Andhra Pradesh (New)',
  '38': 'Ladakh',
  '96': 'Foreign',
  '97': 'Other Territory',
};

export function posLabel(pos: any): string {
  const code = String(pos ?? '').padStart(2, '0');
  const name = GST_STATE_NAMES[code];
  return name ? `${code}-${name}` : String(pos ?? '');
}

// GSTN UQC code → description. The offline-tool / TallyPrime `hsn` sheet writes the
// UQC as "CAN-CANS" (code-DESCRIPTION), while the portal JSON carries the bare code
// ("CAN"). Only the sheet/CSV uses this map — never the JSON.
const UQC_NAMES: Record<string, string> = {
  BAG: 'BAGS',
  BAL: 'BALE',
  BDL: 'BUNDLES',
  BKL: 'BUCKLES',
  BOU: 'BILLIONS OF UNITS',
  BOX: 'BOX',
  BTL: 'BOTTLES',
  BUN: 'BUNCHES',
  CAN: 'CANS',
  CBM: 'CUBIC METERS',
  CCM: 'CUBIC CENTIMETERS',
  CMS: 'CENTIMETERS',
  CTN: 'CARTONS',
  DOZ: 'DOZENS',
  DRM: 'DRUMS',
  GGK: 'GREAT GROSS',
  GMS: 'GRAMMES',
  GRS: 'GROSS',
  GYD: 'GROSS YARDS',
  KGS: 'KILOGRAMS',
  KLR: 'KILOLITRE',
  KME: 'KILOMETRE',
  LTR: 'LITRES',
  MLT: 'MILILITRE',
  MTR: 'METERS',
  MTS: 'METRIC TON',
  NOS: 'NUMBERS',
  PAC: 'PACKS',
  PCS: 'PIECES',
  PRS: 'PAIRS',
  QTL: 'QUINTAL',
  ROL: 'ROLLS',
  SET: 'SETS',
  SQF: 'SQUARE FEET',
  SQM: 'SQUARE METERS',
  SQY: 'SQUARE YARDS',
  TBS: 'TABLETS',
  TGM: 'TEN GROSS',
  THD: 'THOUSANDS',
  TON: 'TONNES',
  TUB: 'TUBES',
  UGS: 'US GALLONS',
  UNT: 'UNITS',
  YDS: 'YARDS',
  OTH: 'OTHERS',
};

export function uqcLabel(uqc: any): string {
  const code = String(uqc || 'OTH')
    .trim()
    .toUpperCase();
  const name = UQC_NAMES[code];
  return name ? `${code}-${name}` : code;
}

const r2 = (n: any) => Number(Number(n || 0).toFixed(2));

// inv_typ code → the offline tool's Invoice/Note Type label.
const INV_TYPE_LABEL: Record<string, string> = {
  R: 'Regular',
  SEWP: 'SEZ supplies with payment',
  SEWOP: 'SEZ supplies without payment',
  DE: 'Deemed Exp',
  CBW: 'Intra-State supplies attracting IGST',
};
const invTypeLabel = (t: any) => INV_TYPE_LABEL[String(t || 'R')] || 'Regular';

// Table 13 "Nature of Document" label per GSTN doc_num (server/gst/docIssue.js emits the code).
const DOC_NUM_LABEL: Record<string, string> = {
  '1': 'Invoices for outward supply',
  '2': 'Invoices for inward supply from unregistered person',
  '3': 'Revised Invoice',
  '4': 'Debit Note',
  '5': 'Credit Note',
  '6': 'Receipt Voucher',
  '7': 'Payment Voucher',
  '8': 'Refund Voucher',
  '9': 'Delivery Challan for job work',
  '10': 'Delivery Challan for supply on approval',
  '11': 'Delivery Challan in case of liquid gas',
  '12': 'Delivery Challan in cases other than by way of supply (excluding at S no. 9 to 11)',
};

// exemp (table 8) description per supply-type code the server emits.
const NIL_DESC: Record<string, string> = {
  INTERB2B: 'Inter-State supplies to registered persons',
  INTRB2B: 'Intra-State supplies to registered persons',
  INTERB2C: 'Inter-State supplies to unregistered persons',
  INTRB2C: 'Intra-State supplies to unregistered persons',
};

// ---- Typed cell so the same rows drive both CSV (value only) and XML (value + type) ----
type Cell = { v: string | number; t: 's' | 'n' };
const S = (v: any): Cell => ({ v: v == null ? '' : String(v), t: 's' });
const N = (v: any): Cell => ({ v: r2(v), t: 'n' });

export interface GstrSection {
  name: string; // sheet / file name (b2b, b2cl, …)
  header: string[];
  rows: Cell[][];
}

// Flatten the payload into the offline-tool section tables (only non-empty sections).
export function buildSections(payload: any): GstrSection[] {
  const out: GstrSection[] = [];
  if (!payload) return out;

  // b2b — one row per party×invoice×rate.
  const b2bRows: Cell[][] = [];
  (payload.b2b || []).forEach((p: any) =>
    (p.inv || []).forEach((inv: any) =>
      (inv.itms || []).forEach((it: any) => {
        const d = it.itm_det || {};
        b2bRows.push([
          S(p.ctin),
          S(''), // Receiver Name (not stored)
          S(inv.inum),
          S(inv.idt),
          N(inv.val),
          S(posLabel(inv.pos)),
          S(inv.rchrg || 'N'),
          S(''), // Applicable % of Tax Rate
          S(invTypeLabel(inv.inv_typ)),
          S(''), // E-Commerce GSTIN
          N(d.rt),
          N(d.txval),
          N(d.csamt),
        ]);
      }),
    ),
  );
  if (b2bRows.length)
    out.push({
      name: 'b2b',
      header: [
        'GSTIN/UIN of Recipient',
        'Receiver Name',
        'Invoice Number',
        'Invoice date',
        'Invoice Value',
        'Place Of Supply',
        'Reverse Charge',
        'Applicable % of Tax Rate',
        'Invoice Type',
        'E-Commerce GSTIN',
        'Rate',
        'Taxable Value',
        'Cess Amount',
      ],
      rows: b2bRows,
    });

  // b2cl — large inter-state B2C, one row per invoice×rate.
  const b2clRows: Cell[][] = [];
  (payload.b2cl || []).forEach((g: any) =>
    (g.inv || []).forEach((inv: any) =>
      (inv.itms || []).forEach((it: any) => {
        const d = it.itm_det || {};
        b2clRows.push([
          S(inv.inum),
          S(inv.idt),
          N(inv.val),
          S(posLabel(g.pos)),
          S(''), // Applicable % of Tax Rate
          N(d.rt),
          N(d.txval),
          N(d.csamt),
          S(''), // E-Commerce GSTIN
        ]);
      }),
    ),
  );
  if (b2clRows.length)
    out.push({
      name: 'b2cl',
      header: [
        'Invoice Number',
        'Invoice date',
        'Invoice Value',
        'Place Of Supply',
        'Applicable % of Tax Rate',
        'Rate',
        'Taxable Value',
        'Cess Amount',
        'E-Commerce GSTIN',
      ],
      rows: b2clRows,
    });

  // b2cs — small B2C, already rate-aggregated. Type OE (we don't track e-commerce).
  const b2csRows: Cell[][] = (payload.b2cs || []).map((x: any) => [
    S('OE'),
    S(posLabel(x.pos)),
    S(''), // Applicable % of Tax Rate
    N(x.rt),
    N(x.txval),
    N(x.csamt),
    S(''), // E-Commerce GSTIN
  ]);
  if (b2csRows.length)
    out.push({
      name: 'b2cs',
      header: [
        'Type',
        'Place Of Supply',
        'Applicable % of Tax Rate',
        'Rate',
        'Taxable Value',
        'Cess Amount',
        'E-Commerce GSTIN',
      ],
      rows: b2csRows,
    });

  // cdnr — credit/debit notes to registered parties.
  const cdnrRows: Cell[][] = [];
  (payload.cdnr || []).forEach((p: any) =>
    (p.nt || []).forEach((nt: any) =>
      (nt.itms || []).forEach((it: any) => {
        const d = it.itm_det || {};
        cdnrRows.push([
          S(p.ctin),
          S(''), // Receiver Name
          S(nt.nt_num),
          S(nt.nt_dt),
          S(nt.ntty), // C / D
          S(posLabel(nt.pos)),
          S(nt.rchrg || 'N'),
          S(invTypeLabel(nt.inv_typ)),
          N(nt.val),
          S(''), // Applicable % of Tax Rate
          N(d.rt),
          N(d.txval),
          N(d.csamt),
        ]);
      }),
    ),
  );
  if (cdnrRows.length)
    out.push({
      name: 'cdnr',
      header: [
        'GSTIN/UIN of Recipient',
        'Receiver Name',
        'Note Number',
        'Note Date',
        'Note Type',
        'Place Of Supply',
        'Reverse Charge',
        'Note Supply Type',
        'Note Value',
        'Applicable % of Tax Rate',
        'Rate',
        'Taxable Value',
        'Cess Amount',
      ],
      rows: cdnrRows,
    });

  // cdnur — credit/debit notes to unregistered (export / B2CL).
  const cdnurRows: Cell[][] = [];
  (payload.cdnur || []).forEach((nt: any) =>
    (nt.itms || []).forEach((it: any) => {
      const d = it.itm_det || {};
      cdnurRows.push([
        S(nt.typ), // B2CL / EXPWP / EXPWOP
        S(nt.nt_num),
        S(nt.nt_dt),
        S(nt.ntty),
        S(posLabel(nt.pos)),
        N(nt.val),
        S(''), // Applicable % of Tax Rate
        N(d.rt),
        N(d.txval),
        N(d.csamt),
      ]);
    }),
  );
  if (cdnurRows.length)
    out.push({
      name: 'cdnur',
      header: [
        'UR Type',
        'Note Number',
        'Note Date',
        'Note Type',
        'Place Of Supply',
        'Note Value',
        'Applicable % of Tax Rate',
        'Rate',
        'Taxable Value',
        'Cess Amount',
      ],
      rows: cdnurRows,
    });

  // exp — export invoices (table 6A).
  const expRows: Cell[][] = [];
  (payload.exp || []).forEach((g: any) =>
    (g.inv || []).forEach((inv: any) =>
      (inv.itms || []).forEach((it: any) => {
        expRows.push([
          S(g.exp_typ), // WPAY / WOPAY
          S(inv.inum),
          S(inv.idt),
          N(inv.val),
          S(''), // Port Code
          S(''), // Shipping Bill Number
          S(''), // Shipping Bill Date
          N(it.rt),
          N(it.txval),
          N(it.csamt),
        ]);
      }),
    ),
  );
  if (expRows.length)
    out.push({
      name: 'exp',
      header: [
        'Export Type',
        'Invoice Number',
        'Invoice date',
        'Invoice Value',
        'Port Code',
        'Shipping Bill Number',
        'Shipping Bill Date',
        'Rate',
        'Taxable Value',
        'Cess Amount',
      ],
      rows: expRows,
    });

  // exemp (table 8) — nil / exempt / non-GST outward supplies.
  const nilRows: Cell[][] = (payload.nil?.inv || []).map((x: any) => [
    S(NIL_DESC[x.sply_ty] || x.sply_ty),
    N(x.nil_amt),
    N(x.expt_amt),
    N(x.ngsup_amt),
  ]);
  if (nilRows.length)
    out.push({
      name: 'exemp',
      header: [
        'Description',
        'Nil Rated Supplies',
        'Exempted(other than nil rated/non GST supply)',
        'Non-GST Supplies',
      ],
      rows: nilRows,
    });

  // hsn (table 12) — Total Value is txval + all taxes (server omits it from JSON).
  const hsnRows: Cell[][] = (payload.hsn?.data || []).map((x: any) => [
    S(x.hsn_sc),
    S(x.desc),
    S(uqcLabel(x.uqc)),
    N(x.qty),
    N(r2(x.txval) + r2(x.iamt) + r2(x.camt) + r2(x.samt) + r2(x.csamt)),
    N(x.rt),
    N(x.txval),
    N(x.iamt),
    N(x.camt),
    N(x.samt),
    N(x.csamt),
  ]);
  if (hsnRows.length)
    out.push({
      name: 'hsn',
      header: [
        'HSN',
        'Description',
        'UQC',
        'Total Quantity',
        'Total Value',
        'Rate',
        'Taxable Value',
        'Integrated Tax Amount',
        'Central Tax Amount',
        'State/UT Tax Amount',
        'Cess Amount',
      ],
      rows: hsnRows,
    });

  // docs (table 13) — one row per document series, per nature of document.
  const docsRows: Cell[][] = [];
  (payload.doc_issue?.doc_det || []).forEach((det: any) =>
    (det.docs || []).forEach((d: any) => {
      docsRows.push([
        S(DOC_NUM_LABEL[String(det.doc_num)] || String(det.doc_num)),
        S(d.from),
        S(d.to),
        N(d.totnum),
        N(d.cancel),
      ]);
    }),
  );
  if (docsRows.length)
    out.push({
      name: 'docs',
      header: ['Nature of Document', 'Sr. No. From', 'Sr. No. To', 'Total Number', 'Cancelled'],
      rows: docsRows,
    });

  return out;
}

// ---- Portal JSON: exact envelope, empty sections pruned, b2cs `typ` defaulted to OE ----
export function buildPortalJson(payload: any): any {
  if (!payload) return {};
  const env: any = { gstin: payload.gstin, fp: payload.fp };
  // gt / cur_gt are optional. Only state a turnover we actually computed — emitting
  // `cur_gt: 0` declares a zero gross turnover to the portal, which is a false
  // statement (the service currently has no turnover source). A real portal-accepted
  // TallyPrime export omits both keys entirely.
  if (r2(payload.gt)) env.gt = r2(payload.gt);
  if (r2(payload.cur_gt)) env.cur_gt = r2(payload.cur_gt);

  const nonEmptyArr = (a: any) => Array.isArray(a) && a.length > 0;
  if (nonEmptyArr(payload.b2b)) env.b2b = payload.b2b;
  if (nonEmptyArr(payload.b2cl)) env.b2cl = payload.b2cl;
  if (nonEmptyArr(payload.b2cs))
    env.b2cs = payload.b2cs.map((x: any) => ({ ...x, typ: x.typ || 'OE' }));
  if (nonEmptyArr(payload.cdnr)) env.cdnr = payload.cdnr;
  if (nonEmptyArr(payload.cdnur)) env.cdnur = payload.cdnur;
  if (nonEmptyArr(payload.exp)) env.exp = payload.exp;
  if (nonEmptyArr(payload.nil?.inv)) env.nil = payload.nil;
  if (nonEmptyArr(payload.hsn?.data)) env.hsn = payload.hsn;
  if (nonEmptyArr(payload.doc_issue?.doc_det)) env.doc_issue = payload.doc_issue;
  return env;
}

// ---- CSV (one per section) ----
const csvCell = (v: string | number): string => `"${String(v ?? '').replace(/"/g, '""')}"`;
export function sectionToCsv(sec: GstrSection): string {
  const head = sec.header.map(csvCell).join(',');
  const body = sec.rows.map((r) => r.map((c) => csvCell(c.v)).join(',')).join('\n');
  return head + '\n' + body;
}

// ---- SpreadsheetML 2003 workbook (multi-sheet, no dependency) ----
const xmlEsc = (v: any) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function sheetXml(sec: GstrSection): string {
  const headRow =
    '<Row>' +
    sec.header.map((h) => `<Cell><Data ss:Type="String">${xmlEsc(h)}</Data></Cell>`).join('') +
    '</Row>';
  const dataRows = sec.rows
    .map(
      (r) =>
        '<Row>' +
        r
          .map(
            (c) =>
              `<Cell><Data ss:Type="${c.t === 'n' ? 'Number' : 'String'}">${xmlEsc(c.v)}</Data></Cell>`,
          )
          .join('') +
        '</Row>',
    )
    .join('');
  return `<Worksheet ss:Name="${xmlEsc(sec.name)}"><Table>${headRow}${dataRows}</Table></Worksheet>`;
}

export function buildWorkbookXml(payload: any): string {
  const sections = buildSections(payload);
  const sheets = sections.length
    ? sections.map(sheetXml).join('')
    : '<Worksheet ss:Name="GSTR1"><Table><Row><Cell><Data ss:Type="String">No data</Data></Cell></Row></Table></Worksheet>';
  return (
    '<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>\n' +
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ' +
    'xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">' +
    sheets +
    '</Workbook>'
  );
}

// ---- browser download helpers ----
function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const base = (payload: any) => `GSTR1_${payload?.gstin || 'Export'}_${payload?.fp || ''}`;

export function downloadPortalJson(payload: any) {
  download(
    `${base(payload)}.json`,
    JSON.stringify(buildPortalJson(payload), null, 2),
    'application/json',
  );
}

export function downloadWorkbook(payload: any) {
  download(`${base(payload)}.xls`, buildWorkbookXml(payload), 'application/vnd.ms-excel');
}

// Each non-empty section as its own offline-tool CSV. Returns the count downloaded.
export function downloadSectionCsvs(payload: any): number {
  const sections = buildSections(payload);
  sections.forEach((sec) =>
    download(`${base(payload)}_${sec.name}.csv`, sectionToCsv(sec), 'text/csv;charset=utf-8;'),
  );
  return sections.length;
}
