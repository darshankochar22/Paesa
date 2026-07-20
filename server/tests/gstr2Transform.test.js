'use strict';

// gstr2Transform normalizes portal GSTR-2A/2B downloads into the shape
// portalRecon.buildPortalMap reads: top-level b2b/b2ba with itm_det iamt/camt/samt.

const { buildImportPayload } = require('../gstFiling/gstr2Transform');

describe('gstr2Transform.buildImportPayload', () => {
  it('unwraps official GSTR-2B (data.docdata) and maps flat igst/cgst/sgst → iamt/camt/samt', () => {
    const raw2b = {
      data: {
        docdata: {
          b2b: [
            {
              ctin: '27AAAAA0000A1Z5',
              inv: [
                {
                  inum: 'INV-001',
                  val: 1180,
                  items: [{ num: 1, rt: 18, txval: 1000, igst: 0, cgst: 90, sgst: 90, cess: 0 }],
                },
              ],
            },
          ],
          cdnr: [
            {
              ctin: '27BBBBB0000B1Z5',
              nt: [
                { ntnum: 'CN-9', val: 236, items: [{ txval: 200, igst: 36, cgst: 0, sgst: 0 }] },
              ],
            },
          ],
        },
      },
    };
    const { payload, suppliers, documents } = buildImportPayload({ all: raw2b });
    expect(suppliers).toBe(2); // one b2b supplier + one cdn supplier
    expect(documents).toBe(2);
    const inv = payload.b2b.find((s) => s.ctin === '27AAAAA0000A1Z5').inv[0];
    expect(inv.inum).toBe('INV-001');
    expect(inv.itms[0].itm_det).toMatchObject({ txval: 1000, camt: 90, samt: 90, iamt: 0 });
    // Notes live in their OWN bucket, not b2b: they belong to the Credit/Debit Notes
    // section, and ntty must survive so a credit note can reduce the portal totals.
    expect(payload.b2b.find((s) => s.ctin === '27BBBBB0000B1Z5')).toBeUndefined();
    const note = payload.cdn.find((s) => s.ctin === '27BBBBB0000B1Z5').inv[0];
    expect(note.inum).toBe('CN-9');
    expect(note.itms[0].itm_det.iamt).toBe(36);
  });

  it('handles GSTR-2A section GETs already in inv/itm_det/iamt shape', () => {
    const raw2aB2b = [
      {
        ctin: '29CCCCC0000C1Z5',
        inv: [
          {
            inum: '7',
            val: 5900,
            itms: [{ itm_det: { txval: 5000, iamt: 900, camt: 0, samt: 0 } }],
          },
        ],
      },
    ];
    const { payload, documents } = buildImportPayload({ b2b: raw2aB2b });
    expect(documents).toBe(1);
    expect(payload.b2b[0].inv[0].itms[0].itm_det).toMatchObject({ txval: 5000, iamt: 900 });
  });

  it('captures invoice-level taxes when a 2B feed carries no items[] array', () => {
    // Flattened shape: txval + igst/cgst/sgst sit on the invoice, and CDNR notes never nest items.
    const raw2b = {
      data: {
        docdata: {
          b2b: [
            {
              ctin: '27AAAAA0000A1Z5',
              inv: [
                { inum: 'FLAT-1', val: 1180, txval: 1000, igst: 0, cgst: 90, sgst: 90, cess: 0 },
              ],
            },
          ],
          cdnr: [
            {
              ctin: '27BBBBB0000B1Z5',
              nt: [{ ntnum: 'CN-2', val: 236, txval: 200, igst: 36, cgst: 0, sgst: 0, cess: 0 }],
            },
          ],
        },
      },
    };
    const { payload, documents } = buildImportPayload({ all: raw2b });
    expect(documents).toBe(2);
    const inv = payload.b2b.find((s) => s.ctin === '27AAAAA0000A1Z5').inv[0];
    expect(inv.itms[0].itm_det).toMatchObject({ txval: 1000, camt: 90, samt: 90, iamt: 0 });
    const note = payload.cdn.find((s) => s.ctin === '27BBBBB0000B1Z5').inv[0];
    expect(note.inum).toBe('CN-2');
    expect(note.itms[0].itm_det).toMatchObject({ txval: 200, iamt: 36 });
  });

  it('routes b2ba into the amendments bucket and ignores empty sections', () => {
    const { payload, suppliers } = buildImportPayload({
      b2ba: [{ ctin: '27DDDDD0000D1Z5', inv: [{ inum: 'A1', val: 100, itms: [] }] }],
      cdn: null,
    });
    expect(payload.b2ba.length).toBe(1);
    expect(payload.b2b.length).toBe(0);
    expect(suppliers).toBe(1);
  });

  it('returns zero documents for empty/garbage input without throwing', () => {
    expect(buildImportPayload({}).documents).toBe(0);
    expect(buildImportPayload({ all: { nonsense: true } }).documents).toBe(0);
    expect(buildImportPayload({ all: [] }).documents).toBe(0);
  });
});
