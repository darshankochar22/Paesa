'use strict';

// Replays the responses observed live against the WhiteBooks sandbox through
// fetchGstr2FromPortal, proving each classifies correctly:
//  - "No document found" (RET13509) / blank-200 → empty, not a failure
//  - a populated b2b section → imported with the right document count
//  - a real auth error → surfaced so the client can prompt an OTP login.

jest.mock('../integrations/gspConfig', () => ({
  getWhitebooksConfig: () => ({ gst: { gstin: '27AAGCB1286Q1Z4' } }),
  getSandboxConfig: () => null,
  getPortalProvider: () => 'whitebooks',
}));

const mockRequest = jest.fn();
jest.mock('../integrations/whitebooksClient', () => ({
  gst: { request: (...a) => mockRequest(...a) },
}));

const mockImport2A = jest.fn(async () => ({ success: true }));
const mockImport2B = jest.fn(async () => ({ success: true }));
jest.mock('../gst/reconciliationService', () => ({
  importGSTR2A: (...a) => mockImport2A(...a),
  importGSTR2B: (...a) => mockImport2B(...a),
}));

const { fetchGstr2FromPortal } = require('../gstFiling/gstPortalService');

const NO_DOC = { ok: false, error: 'No document found for the provided Inputs' };
const BLANK_200 = { ok: false, error: 'HTTP 200' };
const AUTH_ERR = {
  ok: false,
  error: 'GST session not authenticated — request an OTP and authenticate first.',
};
const args = { company_id: 1, fy_id: 1, return_period: '072024' };

beforeEach(() => {
  mockRequest.mockReset();
  mockImport2A.mockClear();
  mockImport2B.mockClear();
});

describe('fetchGstr2FromPortal — live-observed response classification', () => {
  it('2A: "No document found" across sections → success, imported:false, no import call', async () => {
    mockRequest.mockResolvedValue(NO_DOC);
    const res = await fetchGstr2FromPortal('2A', args);
    expect(res.success).toBe(true);
    expect(res.imported).toBe(false);
    expect(mockImport2A).not.toHaveBeenCalled();
  });

  it('2B: blank-200 on all + fallback sections → success, imported:false', async () => {
    mockRequest.mockResolvedValue(BLANK_200);
    const res = await fetchGstr2FromPortal('2B', args);
    expect(res.success).toBe(true);
    expect(res.imported).toBe(false);
    expect(mockImport2B).not.toHaveBeenCalled();
  });

  it('2B: populated b2b → normalizes and imports the documents', async () => {
    // `all` blank, then b2b fallback carries one supplier/invoice (official 2B shape).
    mockRequest.mockImplementation(async (_m, path) => {
      if (path === '/gstr2b/all') return BLANK_200;
      if (path === '/gstr2b/b2b')
        return {
          ok: true,
          data: {
            b2b: [
              {
                ctin: '27AAAAA0000A1Z5',
                inv: [
                  {
                    inum: 'INV-1',
                    val: 1180,
                    items: [{ txval: 1000, igst: 0, cgst: 90, sgst: 90 }],
                  },
                ],
              },
            ],
          },
        };
      return NO_DOC;
    });
    const res = await fetchGstr2FromPortal('2B', args);
    expect(res.success).toBe(true);
    expect(res.imported).toBe(true);
    expect(res.documents).toBe(1);
    expect(mockImport2B).toHaveBeenCalledTimes(1);
    // The importer receives the normalized books shape, not the raw portal envelope.
    const payload = mockImport2B.mock.calls[0][3];
    expect(payload.b2b[0].inv[0].itms[0].itm_det).toMatchObject({ camt: 90, samt: 90 });
  });

  it('surfaces a genuine auth error so the client can prompt an OTP login', async () => {
    mockRequest.mockResolvedValue(AUTH_ERR);
    const res = await fetchGstr2FromPortal('2A', args);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/not authenticated/i);
  });

  it('rejects a bad return period before hitting the portal', async () => {
    const res = await fetchGstr2FromPortal('2B', {
      company_id: 1,
      fy_id: 1,
      return_period: '2024',
    });
    expect(res.success).toBe(false);
    expect(mockRequest).not.toHaveBeenCalled();
  });
});
