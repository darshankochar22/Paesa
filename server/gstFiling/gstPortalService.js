// GST portal READ/DOWNLOAD surface (WhiteBooks GSTN return-filing catalog).
//
// The write/filing lifecycle (retsave/retfile + gst_filings tracking) lives in
// gstFilingService.js. This module covers everything else on developer.whitebooks.in/gstapis:
// section downloads, summaries, return tracking, public taxpayer lookups — plus a generic,
// namespace-guarded escape hatch so ANY endpoint on the catalog is reachable end-to-end.
//
// All calls ride the same authenticated GSTN OTP session held by whitebooksClient (gst.request);
// they fail with a clear "authenticate first" until requestOtp -> authenticate(otp) is done.
// gstin is injected from .env (developer-side); the transport adds email + session headers.

const wb = require('../integrations/whitebooksClient');
const { getWhitebooksConfig } = require('../integrations/gspConfig');

const cfg = () => getWhitebooksConfig();
const notConfigured = () =>
  cfg() ? null : { success: false, error: 'WhiteBooks GST filing not configured (.env)' };
const gstinOf = () => cfg()?.gst?.gstin || '';
const panOf = (g) => (g && g.length >= 12 ? g.slice(2, 12) : '');
const wrap = (r) => (r.ok ? { success: true, data: r.data } : { success: false, error: r.error });

// Only GST-portal namespaces — the transport is already host-locked to WhiteBooks, this is a
// second guard so a stray path can't be sent. Covers the whole /gstapis catalog.
const PORTAL_NS =
  /^\/(gstr|gstr1|gstr1a|gstr2a|gstr2b|gstr2x|gstr3b|gstr4|gstr4a|gstr5|gstr6|gstr6a|gstr7|gstr8|gstr9|gstr9a|gstr9c|public|authentication|ledger|payment|challan|ims|itc03|itc04|cmp|notices|returns|spike)(\/|$)/i;

// Generic GET with gstin auto-injected into the query.
async function portalGet(path, query = {}) {
  const nc = notConfigured();
  if (nc) return nc;
  return wrap(await wb.gst.request('GET', path, { query: { gstin: gstinOf(), ...query } }));
}

// Generic catalog call — method + path from the WhiteBooks docs. Every endpoint not given a
// named wrapper below (ledger balances, challan create/track, IMS, notices, ITC-03/04, CMP,
// GSTR-2A/2B section downloads, other returns' section GETs) is reachable through this.
async function portalRequest({ method = 'GET', path, query = {}, headers = {}, body = null } = {}) {
  const nc = notConfigured();
  if (nc) return nc;
  if (!path || !PORTAL_NS.test(path))
    return { success: false, error: 'Path is not in the GST portal namespace.' };
  const opts = { query: { gstin: gstinOf(), ...query }, headers };
  if (body != null) opts.body = body;
  return wrap(await wb.gst.request(String(method).toUpperCase(), path, opts));
}

// Section download for any return: GET /{type}/{section}. The /{type}/{section} shape is the
// GSTN convention confirmed for GSTR-1 (retsum/dociss/cdnra/b2cl/b2ba/ata/txp/supeco/…); the
// caller passes the type + section from the docs (e.g. gstr2a + b2b), so no path is guessed.
async function getSection(type, section, query = {}) {
  if (!type || !section) return { success: false, error: 'type and section are required.' };
  return portalGet(`/${String(type).toLowerCase()}/${String(section).toLowerCase()}`, query);
}

// Return summary: GET /{type}/retsum (confirmed for GSTR-1). query: { retperiod, smrytyp? }.
async function getSummary(type, query = {}) {
  if (!type) return { success: false, error: 'type is required.' };
  return portalGet(`/${String(type).toLowerCase()}/retsum`, query);
}

// --- confirmed named wrappers ------------------------------------------------------
// GSTN return tracking (filed/status trail for a period).
const retTrack = (query = {}) => portalGet('/gstr/rettrack', query); // { returnperiod, type? }
// Public (no OTP session needed, but same transport): search a taxpayer, track their returns.
const publicSearch = (query = {}) => portalGet('/public/search', query); // { gstin }
const publicRetTrack = (query = {}) => portalGet('/public/rettrack', query); // { gstin, fy, type }
const getPreferences = (query = {}) => portalGet('/public/pref', query); // { gstin, fy }
const urdDetails = (query = {}) => portalGet('/public/unregistered-applicants', query); // { uid }
const urdValidate = (query = {}) => portalGet('/public/unregistered-applicants-validation', query); // { uid, mobile, ecomEmail? }

// Extend the OTP session (avoids re-doing the OTP handshake mid-work).
async function refreshToken() {
  const nc = notConfigured();
  if (nc) return nc;
  return wrap(await wb.gst.request('GET', '/authentication/refreshtoken', {}));
}

// EVC-OTP init for a specific form (GSTR-9/9C filing needs form_type; the GSTR-1/3B helper in
// gstFilingService omits it). pan derived from the configured gstin.
async function requestEvcFor(form_type) {
  const nc = notConfigured();
  if (nc) return nc;
  return wrap(
    await wb.gst.request('GET', '/authentication/otpforevc', {
      query: { gstin: gstinOf(), pan: panOf(gstinOf()), form_type: form_type || '' },
    }),
  );
}

module.exports = {
  portalRequest,
  getSection,
  getSummary,
  retTrack,
  publicSearch,
  publicRetTrack,
  getPreferences,
  urdDetails,
  urdValidate,
  refreshToken,
  requestEvcFor,
};
