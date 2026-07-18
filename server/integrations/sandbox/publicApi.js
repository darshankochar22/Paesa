'use strict';

// Sandbox GST Compliance — Public APIs (platform token only, NO taxpayer OTP session).
// Paths verified against the official OpenAPI spec (api-reference/gst/compliance/openapi.json).

const { apiCall } = require('./core');

// GSTIN registration profile (legal/trade name, status, addresses).
const searchGstin = (gstin) =>
  apiCall('POST', '/gst/compliance/public/gstin/search', { body: { gstin } });

// Checksum + registry validation of a GSTIN (lighter than the full search profile).
const verifyGstin = (gstin) =>
  apiCall('POST', '/gst/compliance/public/gstin/verify', { body: { gstin } });

// All GSTINs registered against a PAN in one state. state_code is the 2-digit GST state code.
const searchGstinByPan = (pan, stateCode) =>
  apiCall('POST', '/gst/compliance/public/pan/search', {
    query: { state_code: stateCode },
    body: { pan },
  });

// Filing-frequency preference (monthly vs quarterly, per quarter) for a GSTIN.
// financial_year format: "FY 2025-26".
const getReturnPreference = (gstin, financialYear) =>
  apiCall('POST', '/gst/compliance/public/gstrs/preference', {
    query: { financial_year: financialYear },
    body: { gstin },
  });

// Return-filing history. financial_year format "FY 2025-26"; gstr filter optional ("gstr-1").
const trackReturns = (gstin, fy, gstr) =>
  apiCall('POST', '/gst/compliance/public/gstrs/track', {
    query: { financial_year: fy, ...(gstr ? { gstr } : {}) },
    body: { gstin },
  });

// Normalized real filing status for the GST reports (public API — no OTP). Returns a map
// keyed by return period (MMYYYY) -> { rtntype: { arn, dof, status, valid } }. fy is a start
// year (2024) or a label; we coerce to the "FY 2024-25" the API expects.
const getFiledReturns = async (gstin, fy) => {
  const yr = String(fy).match(/(\d{4})/);
  const start = yr ? Number(yr[1]) : new Date().getFullYear();
  const fyLabel = /^FY /i.test(String(fy)) ? fy : `FY ${start}-${String(start + 1).slice(-2)}`;
  const r = await trackReturns(gstin, fyLabel);
  if (!r.ok) return { ok: false, error: r.error, byPeriod: {} };
  const list = (r.data && r.data.data && r.data.data.EFiledlist) || [];
  const byPeriod = {};
  for (const e of list) {
    const p = String(e.ret_prd || '');
    const t = String(e.rtntype || '').toUpperCase(); // GSTR1, GSTR3B, GSTR9…
    if (!p || !t) continue;
    (byPeriod[p] = byPeriod[p] || {})[t] = {
      arn: e.arn,
      dof: e.dof,
      status: e.status,
      valid: e.valid,
    };
  }
  return { ok: true, byPeriod, count: list.length };
};

module.exports = {
  searchGstin,
  verifyGstin,
  searchGstinByPan,
  getReturnPreference,
  trackReturns,
  getFiledReturns,
};
