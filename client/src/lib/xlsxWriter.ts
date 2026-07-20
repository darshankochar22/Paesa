// Minimal, dependency-free .xlsx (OOXML SpreadsheetML) writer with a small fixed style set.
// Produces a real multi-sheet .xlsx workbook as a Blob — so exports open in Excel with proper
// sheet tabs, a .xlsx extension, merged banner cells, coloured headers and column widths.
// Strings are written inline (no shared-strings table); the package is zipped with STORE (no
// compression), which .xlsx permits, so no deflate dependency is needed.

/* eslint-disable @typescript-eslint/no-bitwise */

// Style ids — indices into the fixed cellXfs table emitted in styles.xml below.
export const STYLE = {
  DEFAULT: 0,
  TITLE: 1, // navy fill, white text, centred (workbook / section banner)
  SECTION: 2, // cream fill, centred, thin bottom border
  HEADER: 3, // navy fill, white text, centred, wrapped (column headers)
  META_LABEL: 4, // cream fill, right-aligned, thin bottom border
  NUM: 5, // right-aligned, 0.00 number format
  META_VALUE: 6, // left-aligned, thin bottom border
} as const;

export type XlsxCell = { v: string | number; t: 's' | 'n'; s?: number };
export interface XlsxCol {
  min: number; // 1-based first column
  max: number; // 1-based last column
  width: number;
}
export interface XlsxSheet {
  name: string; // tab name (Excel limit 31 chars, no : \ / ? * [ ])
  rows: XlsxCell[][];
  merges?: string[]; // e.g. ['A1:V2']
  cols?: XlsxCol[];
}

// ---- cell reference helpers ----
export function colLetter(i: number): string {
  let s = '';
  let n = i + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

const xmlEsc = (v: unknown) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Excel forbids these in sheet names and caps them at 31 chars.
export function safeSheetName(name: string): string {
  return name.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31) || 'Sheet';
}

function sheetXml(sheet: XlsxSheet): string {
  const cols = sheet.cols?.length
    ? '<cols>' +
      sheet.cols
        .map((c) => `<col min="${c.min}" max="${c.max}" width="${c.width}" customWidth="1"/>`)
        .join('') +
      '</cols>'
    : '';

  const rows = sheet.rows
    .map((cells, ri) => {
      const r = ri + 1;
      const cs = cells
        .map((c, ci) => {
          const ref = `${colLetter(ci)}${r}`;
          const s = c.s ? ` s="${c.s}"` : '';
          if (c.t === 'n') {
            const num = Number.isFinite(Number(c.v)) ? Number(c.v) : 0;
            return `<c r="${ref}"${s}><v>${num}</v></c>`;
          }
          const text = xmlEsc(c.v);
          if (text === '') return `<c r="${ref}"${s}/>`;
          return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${text}</t></is></c>`;
        })
        .join('');
      return `<row r="${r}">${cs}</row>`;
    })
    .join('');

  const merges = sheet.merges?.length
    ? `<mergeCells count="${sheet.merges.length}">` +
      sheet.merges.map((m) => `<mergeCell ref="${m}"/>`).join('') +
      '</mergeCells>'
    : '';

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `${cols}<sheetData>${rows}</sheetData>${merges}</worksheet>`
  );
}

// Fixed style table mirroring the GST-portal template (navy headers, cream section rows).
const STYLES_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<numFmts count="1"><numFmt numFmtId="164" formatCode="0.00"/></numFmts>' +
  '<fonts count="2">' +
  '<font><sz val="11"/><name val="Calibri"/></font>' +
  '<font><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>' +
  '</fonts>' +
  '<fills count="4">' +
  '<fill><patternFill patternType="none"/></fill>' +
  '<fill><patternFill patternType="gray125"/></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FF0B1E59"/></patternFill></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/></patternFill></fill>' +
  '</fills>' +
  '<borders count="2">' +
  '<border><left/><right/><top/><bottom/><diagonal/></border>' +
  '<border><left/><right/><top/><bottom style="thin"><color rgb="FFBFBFBF"/></bottom><diagonal/></border>' +
  '</borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="7">' +
  // 0 DEFAULT
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  // 1 TITLE
  '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
  // 2 SECTION
  '<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
  // 3 HEADER
  '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
  // 4 META_LABEL
  '<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right"/></xf>' +
  // 5 NUM
  '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right"/></xf>' +
  // 6 META_VALUE
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="left"/></xf>' +
  '</cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  '</styleSheet>';

function workbookXml(sheets: XlsxSheet[]): string {
  const s = sheets
    .map((sh, i) => `<sheet name="${xmlEsc(sh.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
    .join('');
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheets>${s}</sheets></workbook>`
  );
}

function workbookRels(sheets: XlsxSheet[]): string {
  // Worksheets get rId1..rIdN; styles.xml takes the next id.
  const rels = sheets
    .map(
      (_, i) =>
        `<Relationship Id="rId${i + 1}" ` +
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" ' +
        `Target="worksheets/sheet${i + 1}.xml"/>`,
    )
    .join('');
  const styleRel =
    `<Relationship Id="rId${sheets.length + 1}" ` +
    'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" ' +
    'Target="styles.xml"/>';
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    `${rels}${styleRel}</Relationships>`
  );
}

function contentTypes(sheets: XlsxSheet[]): string {
  const overrides = sheets
    .map(
      (_, i) =>
        `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ` +
        'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>',
    )
    .join('');
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ' +
    'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/styles.xml" ' +
    'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    `${overrides}</Types>`
  );
}

const ROOT_RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" ' +
  'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" ' +
  'Target="xl/workbook.xml"/></Relationships>';

// ---- ZIP (STORE / no compression) ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

interface ZipEntry {
  name: string;
  data: Uint8Array;
  crc: number;
  offset: number;
}

export function zip(files: { name: string; content: string }[]): Blob {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const entries: ZipEntry[] = [];
  let offset = 0;

  const push = (u: Uint8Array) => {
    chunks.push(u);
    offset += u.length;
  };

  const u16 = (n: number) => new Uint8Array([n & 0xff, (n >>> 8) & 0xff]);
  const u32 = (n: number) =>
    new Uint8Array([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]);

  for (const f of files) {
    const nameBytes = enc.encode(f.name);
    const data = enc.encode(f.content);
    const crc = crc32(data);
    const localOffset = offset;

    // Local file header — method 0 (store), UTF-8 name flag (bit 11), fixed dostime.
    push(u32(0x04034b50));
    push(u16(20)); // version needed
    push(u16(0x0800)); // flags: UTF-8
    push(u16(0)); // method: store
    push(u16(0)); // mod time
    push(u16(0x21)); // mod date (1980-01-01)
    push(u32(crc));
    push(u32(data.length)); // compressed size
    push(u32(data.length)); // uncompressed size
    push(u16(nameBytes.length));
    push(u16(0)); // extra len
    push(nameBytes);
    push(data);

    entries.push({ name: f.name, data, crc, offset: localOffset });
  }

  // Central directory.
  const cdStart = offset;
  for (const e of entries) {
    const nameBytes = enc.encode(e.name);
    push(u32(0x02014b50));
    push(u16(20)); // version made by
    push(u16(20)); // version needed
    push(u16(0x0800)); // flags: UTF-8
    push(u16(0)); // method
    push(u16(0)); // time
    push(u16(0x21)); // date
    push(u32(e.crc));
    push(u32(e.data.length));
    push(u32(e.data.length));
    push(u16(nameBytes.length));
    push(u16(0)); // extra
    push(u16(0)); // comment
    push(u16(0)); // disk
    push(u16(0)); // internal attrs
    push(u32(0)); // external attrs
    push(u32(e.offset));
    push(nameBytes);
  }
  const cdSize = offset - cdStart;

  // End of central directory.
  push(u32(0x06054b50));
  push(u16(0)); // disk
  push(u16(0)); // cd disk
  push(u16(entries.length));
  push(u16(entries.length));
  push(u32(cdSize));
  push(u32(cdStart));
  push(u16(0)); // comment len

  return new Blob(chunks as BlobPart[], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

// Assemble the full .xlsx package from sheet definitions.
export function buildXlsxBlob(sheets: XlsxSheet[]): Blob {
  const named = sheets.map((s) => ({ ...s, name: safeSheetName(s.name) }));
  const files: { name: string; content: string }[] = [
    { name: '[Content_Types].xml', content: contentTypes(named) },
    { name: '_rels/.rels', content: ROOT_RELS },
    { name: 'xl/workbook.xml', content: workbookXml(named) },
    { name: 'xl/_rels/workbook.xml.rels', content: workbookRels(named) },
    { name: 'xl/styles.xml', content: STYLES_XML },
    ...named.map((s, i) => ({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      content: sheetXml(s),
    })),
  ];
  return zip(files);
}
