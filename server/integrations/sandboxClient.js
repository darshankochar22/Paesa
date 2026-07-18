'use strict';

// Sandbox (sandbox.co.in) GST API client — full GST Compliance surface on one host:
// Public verification, Taxpayer OTP session + returns (GSTR-1/1A/2A/2B/3B/4/9), ledgers,
// IMS, notices, e-Invoice and e-Way Bill. Every path/param is taken from Sandbox's official
// OpenAPI spec (developer.sandbox.co.in api-reference/gst/compliance/openapi.json) — nothing
// inferred.
//
// Layout: transport + sessions live in ./sandbox/core.js; endpoint groups in
// ./sandbox/{publicApi,taxpayer,einvoice,eway}.js. This module assembles the stable export
// shape consumed by gstFilingService / gstPortalService / returnActivities.

const { getSandboxConfig } = require('./gspConfig');
const core = require('./sandbox/core');
const publicApi = require('./sandbox/publicApi');
const taxpayer = require('./sandbox/taxpayer');
const einvoice = require('./sandbox/einvoice');
const eway = require('./sandbox/eway');

module.exports = {
  getStatus: core.getStatus,
  isConfigured: () => !!getSandboxConfig(),
  _internal: {
    isSuccess: core.isSuccess,
    dataOf: core.dataOf,
    errOf: core.errOf,
    caches: core.caches,
    httpReq: core.httpReq,
    platformAuth: core.platformAuth,
  },
  platform: {
    authenticate: async () => {
      const c = getSandboxConfig();
      return c ? core.platformAuth(c) : { ok: false, error: 'not configured' };
    },
  },
  request: core.apiCall,

  // Public GST verification (platform token only — NO taxpayer OTP session) ------------
  searchGstin: publicApi.searchGstin,
  verifyGstin: publicApi.verifyGstin,
  searchGstinByPan: publicApi.searchGstinByPan,
  getReturnPreference: publicApi.getReturnPreference,
  trackReturns: publicApi.trackReturns,
  getFiledReturns: publicApi.getFiledReturns,

  // e-Invoice (NIC API user session; SANDBOX_EINV_USERNAME/_PASSWORD + SANDBOX_GSTIN) ---
  einv: einvoice,

  // e-Way Bill (NIC API user session; SANDBOX_EWAY_* falling back to SANDBOX_EINV_*) ----
  eway,

  // GST return filing — taxpayer OTP session (6h, refreshable) --------------------------
  gst: taxpayer,
};
