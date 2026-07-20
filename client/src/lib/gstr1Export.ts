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

import { buildXlsxBlob, colLetter, STYLE, type XlsxCell, type XlsxSheet } from './xlsxWriter';

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

// ---------------------------------------------------------------------------
// GST-portal "E-invoice details auto-populated for Form GSTR-1" .xlsx layout.
// Reproduces the exact 7-sheet workbook the portal hands out (Read me + b2b,sez,de
// + cdnr + cdnur + exp + hsn(b2b) + hsn(b2c)) so the export opens identically.
// ---------------------------------------------------------------------------

// Plain text / number cells. Numbers carry the NUM style (right-aligned, 0.00 format) so the
// sheet shows "81719.00" like the portal file while staying summable in Excel.
const XS = (v: any): XlsxCell => ({ v: v == null ? '' : String(v), t: 's' });
const XN = (v: any): XlsxCell => ({ v: r2(v), t: 'n', s: STYLE.NUM });

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Server emits dates as DD-MM-YYYY; the portal sheet shows DD-MMM-YYYY (01-May-2026).
function fmtDate(d: any): string {
  const s = String(d ?? '').trim();
  const m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (!m) return s;
  const day = m[1].padStart(2, '0');
  const mon = MONTHS[Number(m[2]) - 1] || m[2];
  return `${day}-${mon}-${m[3]}`;
}

// Place of Supply on the portal sheet is spaced: "22 - Chhattisgarh".
function posSpaced(pos: any): string {
  const code = String(pos ?? '').padStart(2, '0');
  const name = GST_STATE_NAMES[code];
  return name ? `${code} - ${name}` : String(pos ?? '');
}

// fp is "MMYYYY" (e.g. 052026). GST FY runs Apr→Mar, so month ≥ 4 keeps the year.
function fyFromFp(fp: any): string {
  const s = String(fp ?? '');
  if (!/^\d{6}$/.test(s)) return '';
  const mm = Number(s.slice(0, 2));
  const yyyy = Number(s.slice(2));
  const start = mm >= 4 ? yyyy : yyyy - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

// Portal invoice/note "type" labels (differ from the offline-tool short codes).
const EINV_TYPE_LABEL: Record<string, string> = {
  R: 'Regular B2B',
  SEWP: 'SEZ supplies with payment',
  SEWOP: 'SEZ supplies without payment',
  DE: 'Deemed Exp',
  CBW: 'Intra-State Supplies attracting IGST',
};
const einvTypeLabel = (t: any) => EINV_TYPE_LABEL[String(t || 'R')] || 'Regular B2B';
const noteTypeLabel = (t: any) => (String(t).toUpperCase() === 'D' ? 'Debit Note' : 'Credit Note');

const EINV_TITLE = 'E-invoice details auto-populated for Form GSTR-1';

// Common trailing columns present on every transaction sheet (we don't source IRN /
// auto-population data, so they stay blank — matching a books-computed return).
const IRN_TAIL = ['IRN', 'IRN date', 'E-invoice status'];
const AUTOPOP_TAIL = [
  'GSTR-1 auto-population/ deletion upon cancellation date',
  'GSTR-1 auto-population/ deletion status',
  'Error in auto-population/ deletion',
];

// Wrap a section's data rows with the portal's 4-row banner (title, blank, section, header),
// styled to match the reference: navy title (merged A1:<lastcol>2), cream section (merged
// A3:<lastcol>3), navy wrapped column headers, and a 20-wide first column.
function einvSheet(name: string, section: string, header: string[], rows: XlsxCell[][]): XlsxSheet {
  const lastCol = colLetter(header.length - 1);
  const titleCell: XlsxCell = { v: EINV_TITLE, t: 's', s: STYLE.TITLE };
  const sectionCell: XlsxCell = { v: section, t: 's', s: STYLE.SECTION };
  const headerRow: XlsxCell[] = header.map((h) => ({ v: h, t: 's', s: STYLE.HEADER }));
  const banner: XlsxCell[][] = [
    [titleCell],
    [{ v: '', t: 's', s: STYLE.TITLE }],
    [sectionCell],
    headerRow,
  ];
  return {
    name,
    rows: [...banner, ...rows],
    merges: [`A1:${lastCol}2`, `A3:${lastCol}3`],
    cols: [{ min: 1, max: 1, width: 20 }],
  };
}

export interface EinvMeta {
  legalName?: string;
  tradeName?: string;
  dateTill?: string;
}

// Build the 7-sheet portal-format workbook from the server's GSTR-1 payload.
export function buildEinvSheets(payload: any, meta: EinvMeta = {}): XlsxSheet[] {
  const p = payload || {};

  // --- Read me (styled + merged to mirror the portal template) ---
  const cTitle: XlsxCell = { v: EINV_TITLE, t: 's', s: STYLE.TITLE };
  const label = (v: string): XlsxCell => ({ v, t: 's', s: STYLE.META_LABEL });
  const value = (v: string): XlsxCell => ({ v, t: 's', s: STYLE.META_VALUE });
  const hd = (v: string): XlsxCell => ({ v, t: 's', s: STYLE.HEADER });
  const heading = (v: string): XlsxCell => ({ v, t: 's', s: STYLE.SECTION });

  const instr: [string, string, string][] = [
    [
      'B2B, SEZ, DE',
      'Taxable supplies made to registered taxpayers (invoices only) - B2B, SEZ, DE Invoices',
      'One row per recipient invoice and tax rate. Amounts in rupees; dates as DD-MMM-YYYY.',
    ],
    [
      'CDNR',
      'Credit/ Debit notes issued to the registered taxpayers - CDNR',
      'Note Type is Debit Note or Credit Note.',
    ],
    [
      'CDNUR',
      'Credit/ Debit notes issued to the unregistered persons - CDNUR',
      'UR Type is B2CL, EXPWP or EXPWOP.',
    ],
    ['EXP', 'Export supplies (Invoices only) - EXP', 'Export Type WPAY/WOPAY.'],
    [
      'HSN(B2B)',
      'HSN - wise summary of outward supplies (B2B Supplies)',
      'HSN-wise totals of taxable value and tax.',
    ],
    [
      'HSN(B2C)',
      'HSN - wise summary of outward supplies (B2C Supplies)',
      'HSN-wise totals of taxable value and tax.',
    ],
  ];

  const readme: XlsxCell[][] = [
    [cTitle],
    [{ v: '', t: 's', s: STYLE.TITLE }],
    [{ v: '', t: 's', s: STYLE.TITLE }],
    [label('Financial Year'), label(''), value(fyFromFp(p.fp))],
    [label('Tax Period'), label(''), value(String(p.fp ?? ''))],
    [label('GSTIN'), label(''), value(String(p.gstin ?? ''))],
    [label('Legal Name'), label(''), value(meta.legalName || '')],
    [label('Trade Name (if any)'), label(''), value(meta.tradeName || meta.legalName || '')],
    [label('Date Updated till'), label(''), value(meta.dateTill || '')],
    [XS('')],
    [heading('GSTR-1 Data Entry Instructions')],
    [hd('Worksheet Name'), hd('GSTR-1 Table Reference'), hd('Field Name'), hd('Instructions')],
    ...instr.map(([ws, ref, note]) => [XS(ws), XS(ref), XS(''), XS(note)]),
  ];

  // Read-me merges: title band, each label(A:B)/value(C:F) pair, the instructions heading,
  // the header's Instructions column, and each instruction row's Instructions column (D:F).
  const readmeMerges = ['A1:F3', 'A11:F11', 'D12:F12'];
  for (let r = 4; r <= 9; r++) readmeMerges.push(`A${r}:B${r}`, `C${r}:F${r}`);
  for (let i = 0; i < instr.length; i++) readmeMerges.push(`D${13 + i}:F${13 + i}`);

  // --- b2b, sez, de ---
  const b2bRows: XlsxCell[][] = [];
  (p.b2b || []).forEach((party: any) =>
    (party.inv || []).forEach((inv: any) =>
      (inv.itms || []).forEach((it: any) => {
        const d = it.itm_det || {};
        b2bRows.push([
          XS(party.ctin),
          XS(''), // Receiver Name (not stored)
          XS(inv.inum),
          XS(fmtDate(inv.idt)),
          XN(inv.val),
          XS(posSpaced(inv.pos)),
          XS(inv.rchrg || 'N'),
          XS(''), // Applicable % of Tax Rate
          XS(einvTypeLabel(inv.inv_typ)),
          XS(''), // E-Commerce GSTIN
          XN(d.rt),
          XN(d.txval),
          XN(d.iamt),
          XN(d.camt),
          XN(d.samt),
          XN(d.csamt),
          XS(''),
          XS(''),
          XS(''), // IRN tail
          XS(''),
          XS(''),
          XS(''), // auto-pop tail
        ]);
      }),
    ),
  );

  // --- cdnr ---
  const cdnrRows: XlsxCell[][] = [];
  (p.cdnr || []).forEach((party: any) =>
    (party.nt || []).forEach((nt: any) =>
      (nt.itms || []).forEach((it: any) => {
        const d = it.itm_det || {};
        cdnrRows.push([
          XS(party.ctin),
          XS(''), // Receiver Name
          XS(nt.nt_num),
          XS(fmtDate(nt.nt_dt)),
          XS(noteTypeLabel(nt.ntty)),
          XS(posSpaced(nt.pos)),
          XS(nt.rchrg || 'N'),
          XS(einvTypeLabel(nt.inv_typ)),
          XN(nt.val),
          XS(''), // Applicable % of Tax Rate
          XN(d.rt),
          XN(d.txval),
          XN(d.iamt),
          XN(d.camt),
          XN(d.samt),
          XN(d.csamt),
          XS(''),
          XS(''),
          XS(''),
          XS(''),
          XS(''),
          XS(''),
        ]);
      }),
    ),
  );

  // --- cdnur ---
  const cdnurRows: XlsxCell[][] = [];
  (p.cdnur || []).forEach((nt: any) =>
    (nt.itms || []).forEach((it: any) => {
      const d = it.itm_det || {};
      cdnurRows.push([
        XS(nt.typ),
        XS(nt.nt_num),
        XS(fmtDate(nt.nt_dt)),
        XS(noteTypeLabel(nt.ntty)),
        XS(posSpaced(nt.pos)),
        XN(nt.val),
        XS(''), // Applicable % of Tax Rate
        XN(d.rt),
        XN(d.txval),
        XN(d.iamt),
        XN(d.csamt),
        XS(''),
        XS(''),
        XS(''),
        XS(''),
        XS(''),
        XS(''),
      ]);
    }),
  );

  // --- exp ---
  const expRows: XlsxCell[][] = [];
  (p.exp || []).forEach((g: any) =>
    (g.inv || []).forEach((inv: any) =>
      (inv.itms || []).forEach((it: any) => {
        expRows.push([
          XS(g.exp_typ),
          XS(inv.inum),
          XS(fmtDate(inv.idt)),
          XN(inv.val),
          XS(''), // Port Code
          XS(''), // Shipping Bill Number
          XS(''), // Shipping Bill Date
          XN(it.rt),
          XN(it.txval),
          XN(it.iamt),
          XN(it.csamt),
          XS(''),
          XS(''),
          XS(''),
          XS(''),
          XS(''),
          XS(''),
        ]);
      }),
    ),
  );

  // --- hsn: portal splits B2B/B2C; the books summary isn't split, so all rows land
  // under hsn(b2b) and hsn(b2c) stays header-only (as in the reference file). ---
  const hsnRows: XlsxCell[][] = (p.hsn?.data || []).map((x: any) => [
    XS(x.hsn_sc),
    XS(x.desc),
    XS(String(x.uqc || 'OTH').toUpperCase()),
    XN(x.qty),
    XN(x.txval),
    XN(x.rt),
    XN(x.iamt),
    XN(x.camt),
    XN(x.samt),
    XN(x.csamt),
  ]);

  const B2B_HEADER = [
    'GSTIN/UIN of Recipient',
    'Receiver Name',
    'Invoice number',
    'Invoice date',
    'Invoice value',
    'Place of Supply',
    'Reverse Charge',
    'Applicable % of Tax Rate',
    'Invoice Type',
    'E-Commerce GSTIN',
    'Rate',
    'Taxable Value',
    'Integrated Tax',
    'Central Tax',
    'State/UT Tax',
    'Cess Amount',
    ...IRN_TAIL,
    ...AUTOPOP_TAIL,
  ];
  const CDNR_HEADER = [
    'GSTIN/UIN of Recipient',
    'Receiver Name',
    'Note Number',
    'Note Date',
    'Note Type',
    'Place of Supply',
    'Reverse Charge',
    'Note Supply Type',
    'Note value',
    'Applicable % of Tax Rate',
    'Rate',
    'Taxable Value',
    'Integrated Tax',
    'Central Tax',
    'State/UT Tax',
    'Cess Amount',
    ...IRN_TAIL,
    ...AUTOPOP_TAIL,
  ];
  const CDNUR_HEADER = [
    'UR Type',
    'Note Number',
    'Note Date',
    'Note Type',
    'Place of Supply',
    'Note value',
    'Applicable % of Tax Rate',
    'Rate',
    'Taxable Value',
    'Integrated Tax',
    'Cess Amount',
    ...IRN_TAIL,
    ...AUTOPOP_TAIL,
  ];
  const EXP_HEADER = [
    'Export Type',
    'Invoice Number',
    'Invoice Date',
    'Invoice value',
    'Port Code',
    'Shipping Bill Number',
    'Shipping Bill Date',
    'Rate',
    'Taxable Value',
    'Integrated Tax',
    'Cess Amount',
    ...IRN_TAIL,
    ...AUTOPOP_TAIL,
  ];
  const HSN_HEADER = [
    'HSN',
    'Description',
    'UQC',
    'Total Quantity',
    'Total taxable value',
    'Rate (%)',
    'Integrated tax',
    'Central tax',
    'State/UT tax',
    'Cess',
  ];

  return [
    {
      name: 'Read me',
      rows: readme,
      merges: readmeMerges,
      cols: [
        { min: 1, max: 1, width: 13 },
        { min: 2, max: 2, width: 28 },
        { min: 3, max: 3, width: 29 },
        { min: 4, max: 4, width: 31 },
        { min: 5, max: 5, width: 27 },
        { min: 6, max: 6, width: 28 },
      ],
    },
    einvSheet(
      'b2b, sez, de',
      'Taxable supplies made to registered taxpayers (invoices only) - B2B, SEZ, DE Invoices',
      B2B_HEADER,
      b2bRows,
    ),
    einvSheet(
      'cdnr',
      'Credit/ Debit notes issued to the registered taxpayers - CDNR',
      CDNR_HEADER,
      cdnrRows,
    ),
    einvSheet(
      'cdnur',
      'Credit/ Debit notes issued to the unregistered persons - CDNUR',
      CDNUR_HEADER,
      cdnurRows,
    ),
    einvSheet('exp', 'Export supplies (Invoices only) - EXP', EXP_HEADER, expRows),
    einvSheet(
      'hsn(b2b)',
      'HSN - wise summary of outward supplies (B2B Supplies)',
      HSN_HEADER,
      hsnRows,
    ),
    einvSheet('hsn(b2c)', 'HSN - wise summary of outward supplies (B2C Supplies)', HSN_HEADER, []),
  ];
}

// Portal-format filename: EINV_<GSTIN>_<FY>.xlsx (matches the download name the portal uses).
export function einvFilename(payload: any): string {
  const fy = fyFromFp(payload?.fp) || payload?.fp || '';
  return `EINV_${payload?.gstin || 'Export'}_${fy}.xlsx`;
}

export function downloadWorkbook(payload: any, meta: EinvMeta = {}) {
  const blob = buildXlsxBlob(buildEinvSheets(payload, meta));
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = einvFilename(payload);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Each non-empty section as its own offline-tool CSV. Returns the count downloaded.
export function downloadSectionCsvs(payload: any): number {
  const sections = buildSections(payload);
  sections.forEach((sec) =>
    download(`${base(payload)}_${sec.name}.csv`, sectionToCsv(sec), 'text/csv;charset=utf-8;'),
  );
  return sections.length;
}
