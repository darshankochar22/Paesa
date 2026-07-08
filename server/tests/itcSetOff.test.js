// Electronic credit ledger — ITC set-off order (Section 49 / Rule 88A) + FY period math.

const { computeItcSetOff } = require('../gst/itcSetOff');
const { periodsForFY, periodFigures } = require('../gst/gstCreditLedgerService');

describe('computeItcSetOff — statutory ITC utilisation order', () => {
  it('uses same-head credit first', () => {
    const r = computeItcSetOff({ igst: 100 }, { igst: 60 });
    expect(r.net_liability.igst).toBe(40);
    expect(r.closing.igst).toBe(0);
    expect(r.utilized.igst).toBe(60);
  });

  it('IGST credit surplus pays CGST then SGST', () => {
    const r = computeItcSetOff({ cgst: 50, sgst: 50 }, { igst: 80 });
    expect(r.net_liability.cgst).toBe(0); // 50 paid from IGST
    expect(r.net_liability.sgst).toBe(20); // remaining 30 of IGST → SGST
    expect(r.closing.igst).toBe(0);
  });

  it('CGST credit surplus can pay IGST', () => {
    const r = computeItcSetOff({ igst: 100 }, { cgst: 40 });
    expect(r.net_liability.igst).toBe(60);
    expect(r.closing.cgst).toBe(0);
  });

  it('SGST credit can NEVER pay CGST liability (stays as closing balance)', () => {
    const r = computeItcSetOff({ cgst: 50 }, { sgst: 50 });
    expect(r.net_liability.cgst).toBe(50); // unpaid — SGST cannot offset CGST
    expect(r.closing.sgst).toBe(50); // credit untouched
  });

  it('Cess credit only offsets Cess', () => {
    const r = computeItcSetOff({ igst: 20, cess: 20 }, { cess: 20 });
    expect(r.net_liability.cess).toBe(0);
    expect(r.net_liability.igst).toBe(20); // cess credit can't touch IGST
    expect(r.closing.cess).toBe(0);
  });

  it('excess credit becomes the closing balance (carried forward)', () => {
    const r = computeItcSetOff({}, { igst: 100 });
    expect(r.closing.igst).toBe(100);
    expect(r.net_liability.igst).toBe(0);
  });
});

describe('periodFigures — extracts liability + ITC from a GSTR-3B payload', () => {
  it('liability = regular outward + RCM; credit = all ITC-available minus reversals', () => {
    const payload = {
      sup_details: {
        osup_det: { iamt: 100, camt: 50, samt: 50, cess: 10 },
        isup_rev: { iamt: 20, camt: 0, samt: 0, cess: 0 }, // RCM adds to liability
      },
      itc_elg: {
        itc_avl: [
          { iamt: 30, camt: 0, samt: 0, cess: 0 },
          { iamt: 0, camt: 40, samt: 40, cess: 5 },
        ],
        itc_rev: [{ iamt: 10, camt: 0, samt: 0, cess: 0 }],
      },
    };
    const { liability, credit } = periodFigures(payload);
    expect(liability).toEqual({ igst: 120, cgst: 50, sgst: 50, cess: 10 });
    expect(credit).toEqual({ igst: 20, cgst: 40, sgst: 40, cess: 5 });
  });
});

describe('periodsForFY', () => {
  it('yields the 12 MMYYYY periods Apr→Mar in order', () => {
    const p = periodsForFY('2026-04-01');
    expect(p).toHaveLength(12);
    expect(p[0]).toBe('042026');
    expect(p[11]).toBe('032027');
  });
});
