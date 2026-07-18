'use strict';

// Sandbox GST Compliance — Taxpayer APIs (GSTN OTP session required except where noted).
// Every path/param verified against the official OpenAPI spec
// (api-reference/gst/compliance/openapi.json, 153 operations).

const {
  caches,
  productCall,
  gstOtpRequest,
  gstVerifyOtp,
  gstRefreshSession,
  gstRequest,
  fetchGstrSections,
} = require('./core');

const P = '/gst/compliance/tax-payer';

// --- authentication --------------------------------------------------------------------
// EVC OTP for filing (distinct from the login OTP). Per spec: POST /tax-payer/evc/otp with
// query gstr ("gstr-1" | "gstr-3b" | ...) + body {pan}, on the TAXPAYER session token.
const requestEvcOtp = (pan, gstr = 'gstr-3b') =>
  gstRequest('POST', `${P}/evc/otp`, { query: { gstr }, body: { pan } });

// Invalidate the current session (frees the GSP account's concurrent-session slot).
const logout = async () => {
  if (!caches.gst || !caches.gst.token) return { ok: false, error: 'No active session.' };
  const r = await productCall('gst', async () => ({ ok: true }), 'POST', `${P}/logout`, {});
  caches.gst = null;
  return r;
};

const session = () =>
  caches.gst && caches.gst.token
    ? { active: true, gstin: caches.gst.gstin, username: caches.gst.username }
    : { active: false };

// --- common ----------------------------------------------------------------------------
// Aggregate Annual Turnover. financial_year format "FY 2024-25".
const getAato = (financialYear) =>
  gstRequest('GET', `${P}/aato`, { query: { financial_year: financialYear } });

// Filing preference on the taxpayer session (monthly/quarterly per quarter).
const getFilingPreference = (financialYear) =>
  gstRequest('GET', `${P}/gstrs/preference`, { query: { financial_year: financialYear } });
const saveFilingPreference = (body) => gstRequest('POST', `${P}/gstrs/preference`, { body });

// Status of an async GSTN operation (save/file) by its reference id.
const getReturnStatus = (year, month, referenceId) =>
  gstRequest('GET', `${P}/gstrs/${year}/${month}/status`, { query: { reference_id: referenceId } });

// Track returns for a period on the taxpayer session (return_type optional, e.g. "GSTR1").
const trackReturns = (year, month, returnType) =>
  gstRequest('GET', `${P}/gstrs/${year}/${month}/track`, { query: { return_type: returnType } });

// File-details download job (submit returns a token; poll with it).
const submitFileDetailsDownload = (year, month, body) =>
  gstRequest('POST', `${P}/gstrs/${year}/${month}/file-details/download`, { body });
const pollFileDetailsDownload = (jobId) =>
  gstRequest('GET', `${P}/gstrs/file-details/download`, { query: { job_id: jobId } });

// --- GSTR-1 / GSTR-1A ------------------------------------------------------------------
// All 24 GSTR-1 sections are GET /gstrs/gstr-1/{section}/{year}/{month}; GSTR-1A mirrors it.
// `query` passes section-specific filters (action_required, from, counterparty_gstin,
// state_code, sub_section, recipient_gstin) straight through.
const getGstr1Section = (section, year, month, query = {}) =>
  gstRequest('GET', `${P}/gstrs/gstr-1/${section}/${year}/${month}`, { query });
const getGstr1Summary = (year, month, summaryType) =>
  gstRequest('GET', `${P}/gstrs/gstr-1/${year}/${month}`, {
    query: { summary_type: summaryType },
  });
const saveGstr1 = (year, month, body) =>
  gstRequest('POST', `${P}/gstrs/gstr-1/${year}/${month}`, { body });
const resetGstr1 = (year, month) =>
  gstRequest('POST', `${P}/gstrs/gstr-1/${year}/${month}/reset`, {});
const fileGstr1 = (year, month, { pan, otp }, body) =>
  gstRequest('POST', `${P}/gstrs/gstr-1/${year}/${month}/file`, { query: { pan, otp }, body });

const getGstr1aSection = (section, year, month, query = {}) =>
  gstRequest('GET', `${P}/gstrs/gstr-1a/${section}/${year}/${month}`, { query });
const getGstr1aSummary = (year, month) =>
  gstRequest('GET', `${P}/gstrs/gstr-1a/${year}/${month}`, {});
const getGstr1aDeclaration = (year, month) =>
  gstRequest('GET', `${P}/gstrs/gstr-1a/declaration-details/${year}/${month}`, {});

// Multi-section merge used by the reconciliation importers.
const getGstr1 = (year, month) =>
  fetchGstrSections(
    'gstr-1',
    ['b2b', 'b2cl', 'b2cs', 'cdnr', 'cdnur', 'exp', 'hsn', 'nil', 'at', 'txp'],
    year,
    month,
  );

// --- GSTR-2A / GSTR-2B -----------------------------------------------------------------
const getGstr2aSection = (section, year, month, query = {}) =>
  gstRequest('GET', `${P}/gstrs/gstr-2a/${section}/${year}/${month}`, { query });
const getGstr2aDocument = (year, month) =>
  gstRequest('GET', `${P}/gstrs/gstr-2a/${year}/${month}`, {});
// ITC-relevant sections merged into one statement for the recon importer.
const getGstr2a = (year, month) =>
  fetchGstrSections('gstr-2a', ['b2b', 'b2ba', 'cdn', 'cdna'], year, month);

const getGstr2b = (year, month, fileNumber) =>
  gstRequest('GET', `${P}/gstrs/gstr-2b/${year}/${month}`, { query: { file_number: fileNumber } });
const regenerateGstr2b = (year, month) =>
  gstRequest('POST', `${P}/gstrs/gstr-2b/${year}/${month}/regenerate`, {});
const gstr2bRegenerationStatus = (referenceId) =>
  gstRequest('GET', `${P}/gstrs/gstr-2b/regenerate`, { query: { reference_id: referenceId } });

// --- GSTR-3B ---------------------------------------------------------------------------
const getGstr3b = (year, month) => gstRequest('GET', `${P}/gstrs/gstr-3b/${year}/${month}`, {});
const saveGstr3b = (year, month, body) =>
  gstRequest('POST', `${P}/gstrs/gstr-3b/${year}/${month}`, { body });
const validateGstr3b = (year, month, body) =>
  gstRequest('POST', `${P}/gstrs/gstr-3b/${year}/${month}/validate`, { body });
const getGstr3bAutoLiability = (year, month) =>
  gstRequest('GET', `${P}/gstrs/gstr-3b/${year}/${month}/auto-liability-calc`, {});
const offsetGstr3bLiability = (year, month, body) =>
  gstRequest('POST', `${P}/gstrs/gstr-3b/${year}/${month}/offset-liability`, { body });
const fileGstr3b = (year, month, { pan, otp }, body) =>
  gstRequest('POST', `${P}/gstrs/gstr-3b/${year}/${month}/file`, { query: { pan, otp }, body });

// --- proceed-to-file (generic across GSTRs; gstr e.g. "gstr-1") ------------------------
const proceedToFile = (gstr, year, month, body = {}) =>
  gstRequest('POST', `${P}/gstrs/${gstr}/${year}/${month}/proceed`, { body });
const newProceedToFile = (gstr, year, month, { isNil, body = {} } = {}) =>
  gstRequest('POST', `${P}/gstrs/${gstr}/${year}/${month}/new-proceed`, {
    query: isNil != null ? { is_nil: isNil } : {},
    body,
  });

// --- GSTR-4 (annual, composition) ------------------------------------------------------
// financial_period format per spec (e.g. "FY 2024-25").
const getGstr4AnnualSummary = (financialPeriod) =>
  gstRequest('GET', `${P}/gstrs/gstr-4-annual/summary`, {
    query: { financial_period: financialPeriod },
  });
const getGstr4AnnualInOutSupply = (financialPeriod) =>
  gstRequest('GET', `${P}/gstrs/gstr-4-annual/in-out-supply`, {
    query: { financial_period: financialPeriod },
  });
const getGstr4AnnualTdsCmpSummary = (financialPeriod) =>
  gstRequest('GET', `${P}/gstrs/gstr-4-annual/tdscmp-summary`, {
    query: { financial_period: financialPeriod },
  });
const saveGstr4Annual = (year, month, body) =>
  gstRequest('POST', `${P}/gstrs/gstr-4-annual/${year}/${month}`, { body });
const fileGstr4Annual = (year, month, { pan, otp }, body) =>
  gstRequest('POST', `${P}/gstrs/gstr-4-annual/${year}/${month}/proceed`, {
    query: { pan, otp },
    body,
  });

// --- GSTR-9 (annual return) ------------------------------------------------------------
// financial_year format "FY 2024-25".
const getGstr9 = (financialYear) =>
  gstRequest('GET', `${P}/gstrs/gstr-9`, { query: { financial_year: financialYear } });
const getGstr9AutoCalculated = (financialYear) =>
  gstRequest('GET', `${P}/gstrs/gstr-9/auto-calculated`, {
    query: { financial_year: financialYear },
  });
const getGstr9Table8a = (financialYear, fileNumber) =>
  gstRequest('GET', `${P}/gstrs/gstr-9/table-8a`, {
    query: { financial_year: financialYear, file_number: fileNumber },
  });
const saveGstr9 = (financialYear, body) =>
  gstRequest('POST', `${P}/gstrs/gstr-9/save`, { query: { financial_year: financialYear }, body });
const fileGstr9 = ({ pan, financialYear, otp }, body) =>
  gstRequest('POST', `${P}/gstrs/gstr-9/file`, {
    query: { pan, financial_year: financialYear, otp },
    body,
  });

// --- ledgers ---------------------------------------------------------------------------
// from/to are DD-MM-YYYY date strings per the portal convention.
const getCashLedger = (from, to) => gstRequest('GET', `${P}/ledgers/cash`, { query: { from, to } });
const getItcLedger = (from, to) => gstRequest('GET', `${P}/ledgers/itc`, { query: { from, to } });
const getReturnLiabilityLedger = (year, month, from, to) =>
  gstRequest('GET', `${P}/ledgers/tax/${year}/${month}`, { query: { from, to } });
const getCashItcBalance = (year, month) =>
  gstRequest('GET', `${P}/ledgers/bal/${year}/${month}`, {});

// --- Invoice Management System (IMS) ---------------------------------------------------
const imsGetInvoices = (section, status) =>
  gstRequest('GET', `${P}/invoices`, { query: { section, status } });
const imsGetInvoiceCount = (typeOfGoods) =>
  gstRequest('GET', `${P}/invoices/count`, { query: { type_of_goods: typeOfGoods } });
const imsSaveInvoiceStatus = (body) => gstRequest('POST', `${P}/invoices/status/save`, { body });
const imsResetInvoiceStatus = (body) => gstRequest('POST', `${P}/invoices/status/reset`, { body });
const imsCheckInvoiceStatus = (referenceId) =>
  gstRequest('GET', `${P}/invoices/status`, { query: { reference_id: referenceId } });
const imsGetSalesInvoices = (year, month, section, returnType) =>
  gstRequest('GET', `${P}/invoices/${year}/${month}/sales`, {
    query: { section, return_type: returnType },
  });
const imsGetAddedBackLiabilities = (year, month, section) =>
  gstRequest('GET', `${P}/invoices/added-back-liabilities/${year}/${month}`, {
    query: { section },
  });

// --- notices (front office) ------------------------------------------------------------
const listNotices = (date) => gstRequest('GET', `${P}/notices`, { query: { date } });
const getNoticeDetails = (referenceId) =>
  gstRequest('GET', `${P}/notices/${encodeURIComponent(referenceId)}`, {});

// --- taxpayer-scoped e-Invoice reads ---------------------------------------------------
const getEInvoiceByIrn = (irn) =>
  gstRequest('GET', `${P}/e-invoice/${encodeURIComponent(irn)}`, {});
const getEInvoiceHsnSummary = (year, month) =>
  gstRequest('GET', `${P}/e-invoices/hsn/${year}/${month}`, {});
// Bulk e-invoice listing is an async job: submit returns a job_id; poll with it.
// supply_type per spec (e.g. "B2B").
const submitSalesEInvoicesJob = (year, month, supplyType) =>
  gstRequest('POST', `${P}/e-invoices/${year}/${month}/sales`, {
    query: { supply_type: supplyType },
  });
const pollSalesEInvoicesJob = (year, month, jobId) =>
  gstRequest('GET', `${P}/e-invoices/${year}/${month}/sales`, { query: { job_id: jobId } });
const submitPurchaseEInvoicesJob = (year, month, supplyType) =>
  gstRequest('POST', `${P}/e-invoices/${year}/${month}/purchases`, {
    query: { supply_type: supplyType },
  });
const pollPurchaseEInvoicesJob = (year, month, jobId) =>
  gstRequest('GET', `${P}/e-invoices/${year}/${month}/purchases`, { query: { job_id: jobId } });

module.exports = {
  // auth
  otpRequest: gstOtpRequest,
  verifyOtp: gstVerifyOtp,
  refreshSession: gstRefreshSession,
  requestEvcOtp,
  logout,
  session,
  request: gstRequest,
  // common
  getAato,
  getFilingPreference,
  saveFilingPreference,
  getReturnStatus,
  trackReturns,
  submitFileDetailsDownload,
  pollFileDetailsDownload,
  // gstr-1 / 1a
  getGstr1,
  getGstr1Section,
  getGstr1Summary,
  saveGstr1,
  resetGstr1,
  fileGstr1,
  getGstr1aSection,
  getGstr1aSummary,
  getGstr1aDeclaration,
  // gstr-2a / 2b
  getGstr2a,
  getGstr2aSection,
  getGstr2aDocument,
  getGstr2b,
  regenerateGstr2b,
  gstr2bRegenerationStatus,
  // gstr-3b
  getGstr3b,
  saveGstr3b,
  validateGstr3b,
  getGstr3bAutoLiability,
  offsetGstr3bLiability,
  fileGstr3b,
  // proceed
  proceedToFile,
  newProceedToFile,
  // gstr-4 annual
  getGstr4AnnualSummary,
  getGstr4AnnualInOutSupply,
  getGstr4AnnualTdsCmpSummary,
  saveGstr4Annual,
  fileGstr4Annual,
  // gstr-9
  getGstr9,
  getGstr9AutoCalculated,
  getGstr9Table8a,
  saveGstr9,
  fileGstr9,
  // ledgers
  getCashLedger,
  getItcLedger,
  getReturnLiabilityLedger,
  getCashItcBalance,
  // IMS
  imsGetInvoices,
  imsGetInvoiceCount,
  imsSaveInvoiceStatus,
  imsResetInvoiceStatus,
  imsCheckInvoiceStatus,
  imsGetSalesInvoices,
  imsGetAddedBackLiabilities,
  // notices
  listNotices,
  getNoticeDetails,
  // taxpayer e-invoice reads
  getEInvoiceByIrn,
  getEInvoiceHsnSummary,
  submitSalesEInvoicesJob,
  pollSalesEInvoicesJob,
  submitPurchaseEInvoicesJob,
  pollPurchaseEInvoicesJob,
};
