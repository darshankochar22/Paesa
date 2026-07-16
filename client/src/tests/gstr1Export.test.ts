import { describe, it, expect } from 'vitest';
import {
  buildSections,
  buildPortalJson,
  buildWorkbookXml,
  sectionToCsv,
  posLabel,
} from '@/lib/gstr1Export';

// A minimal but representative GSTR-1 payload in the server's section shapes.
const payload = {
  gstin: '24ABCDE1234F1Z5',
  fp: '062026',
  cur_gt: 1000.5,
  b2b: [
    {
      ctin: '27AAACX1234K1Z0',
      inv: [
        {
          inum: 'INV-1',
          idt: '15-06-2026',
          val: 1180,
          pos: '27',
          rchrg: 'N',
          inv_typ: 'R',
          itms: [
            { num: 1, itm_det: { txval: 1000, rt: 18, iamt: 180, camt: 0, samt: 0, csamt: 0 } },
          ],
        },
      ],
    },
  ],
  b2cs: [
    { sply_ty: 'INTRA', pos: '24', rt: 12, txval: 500, iamt: 0, camt: 30, samt: 30, csamt: 0 },
  ],
  cdnr: [],
  cdnur: [],
  exp: [],
  nil: { inv: [{ sply_ty: 'INTRB2B', nil_amt: 100, expt_amt: 0, ngsup_amt: 0 }] },
  hsn: {
    data: [
      {
        num: 1,
        hsn_sc: '1001',
        desc: 'Wheat',
        uqc: 'KGS',
        rt: 18,
        qty: 10,
        txval: 1000,
        iamt: 180,
        camt: 0,
        samt: 0,
        csamt: 0,
      },
    ],
  },
};

describe('posLabel', () => {
  it('formats "code-Name" the offline tool expects', () => {
    expect(posLabel('24')).toBe('24-Gujarat');
    expect(posLabel('7')).toBe('07-Delhi');
  });
  it('falls back to the raw code when unknown', () => {
    expect(posLabel('99')).toBe('99');
  });
});

describe('buildSections', () => {
  const sections = buildSections(payload);
  const byName = Object.fromEntries(sections.map((s) => [s.name, s]));

  it('emits only non-empty sections', () => {
    expect(Object.keys(byName).sort()).toEqual(['b2b', 'b2cs', 'exemp', 'hsn']);
  });

  it('b2b uses the exact offline-tool header order', () => {
    expect(byName.b2b.header).toEqual([
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
    ]);
  });

  it('b2b flattens invoice×rate into a row with POS label + Regular type', () => {
    const row = byName.b2b.rows[0].map((c) => c.v);
    expect(row).toEqual([
      '27AAACX1234K1Z0',
      '',
      'INV-1',
      '15-06-2026',
      1180,
      '27-Maharashtra',
      'N',
      '',
      'Regular',
      '',
      18,
      1000,
      0,
    ]);
  });

  it('hsn Total Value = taxable + all taxes', () => {
    const totalValueCell = byName.hsn.rows[0][4];
    expect(totalValueCell.v).toBe(1180); // 1000 + 180
  });

  it('exemp maps the supply-type code to its description', () => {
    expect(byName.exemp.rows[0][0].v).toBe('Intra-State supplies to registered persons');
  });
});

describe('buildPortalJson', () => {
  const env = buildPortalJson(payload);
  it('keeps gstin + fp and prunes empty sections', () => {
    expect(env.gstin).toBe('24ABCDE1234F1Z5');
    expect(env.fp).toBe('062026');
    expect(env.cdnr).toBeUndefined();
    expect(env.exp).toBeUndefined();
    expect(env.b2b).toBeDefined();
    expect(env.hsn).toBeDefined();
  });
  it('defaults b2cs typ to OE', () => {
    expect(env.b2cs[0].typ).toBe('OE');
  });
});

describe('sectionToCsv', () => {
  it('quotes cells and starts with the header row', () => {
    const csv = sectionToCsv(buildSections(payload)[0]);
    expect(csv.startsWith('"GSTIN/UIN of Recipient","Receiver Name"')).toBe(true);
  });
});

describe('buildWorkbookXml', () => {
  const xml = buildWorkbookXml(payload);
  it('is a SpreadsheetML workbook with a sheet per section', () => {
    expect(xml).toContain('<?mso-application progid="Excel.Sheet"?>');
    expect(xml).toContain('ss:Name="b2b"');
    expect(xml).toContain('ss:Name="hsn"');
  });
  it('types numeric cells as Number', () => {
    expect(xml).toContain('ss:Type="Number">1000<');
  });
});
