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
const sbx = require('../integrations/sandboxClient');
const {
  getWhitebooksConfig,
  getSandboxConfig,
  getPortalProvider,
} = require('../integrations/gspConfig');
const { buildImportPayload } = require('./gstr2Transform');

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

// Extend the OTP session (avoids re-doing the OTP handshake mid-work). On success the
// local session cache's expiry is bumped too — otherwise the portal session gets
// extended but our cache still lapses at the original time and calls start failing.
async function refreshToken() {
  const nc = notConfigured();
  if (nc) return nc;
  const r = wrap(await wb.gst.request('GET', '/authentication/refreshtoken', {}));
  if (r.success) wb.gst.touch?.();
  return r;
}

// Close the GSTN OTP session (portal-side + local cache).
async function logout() {
  const nc = notConfigured();
  if (nc) return nc;
  return wrap(await wb.gst.logout());
}

// ---- GSTR-2A/2B → reconciliation import ------------------------------------------
// One-call bridge: download the inward statement for a period over the live OTP
// session, normalize it (gstr2Transform), and store it via the reconciliation
// importers so the 2A/2B recon screens match against real portal data.
//
// 2B `all` is the consolidated per-period statement; per-section fallbacks cover
// catalogs that don't expose it. 2A has no `all` — its sections are pulled and merged.
const GSTR2_SECTIONS = {
  '2A': { type: 'gstr2a', primary: ['b2b', 'b2ba', 'cdn'], fallback: [] },
  '2B': { type: 'gstr2b', primary: ['all'], fallback: ['b2b', 'cdnr'] },
};

// The portal reports "nothing filed for this period" as an error, not an empty body —
// treat those replies as an empty section rather than a failed fetch. Verified live
// against the WhiteBooks sandbox: a period with no inward data returns
// "No document found for the provided Inputs" (RET13509), and a not-yet-generated
// GSTR-2B returns a blank HTTP 200 (surfaced by the transport as the literal
// "HTTP 200" — a real transport fault is a 4xx/5xx or a network error, never a bare 200).
const isEmptySectionError = (msg = '') =>
  /no (document|data|invoice|record|detail)|not found|ret13509|invalid request|^http 200$/i.test(
    String(msg).trim(),
  );

// Sandbox exposes the whole statement in one GET (gstr-2a / gstr-2b document), so we fetch
// once and hand the raw envelope to buildImportPayload — its findDocRoot walks the data/docdata
// layers just like it does for the WhiteBooks section GETs.
async function fetchGstr2FromPortalSandbox(kind, { company_id, fy_id, return_period }) {
  if (!getSandboxConfig()) return { success: false, error: 'Sandbox not configured (.env)' };
  if (!company_id || !fy_id) return { success: false, error: 'company_id and fy_id are required.' };
  if (!/^\d{6}$/.test(String(return_period || '')))
    return { success: false, error: 'Enter the return period as MMYYYY (e.g. 062026).' };
  if (!sbx.gst.session().active)
    return { success: false, error: 'Authenticate the GST portal (OTP) first.' };
  const year = String(return_period).slice(2);
  const month = String(return_period).slice(0, 2);
  const r =
    kind === '2A' ? await sbx.gst.getGstr2a(year, month) : await sbx.gst.getGstr2b(year, month);
  if (!r.ok) {
    if (isEmptySectionError(r.error))
      return {
        success: true,
        imported: false,
        suppliers: 0,
        documents: 0,
        sections: [],
        warning: `The portal has no GSTR-${kind} documents for ${return_period}.`,
      };
    return { success: false, error: r.error };
  }
  const { payload, suppliers, documents } = buildImportPayload({ all: r.data });
  if (!documents)
    return {
      success: true,
      imported: false,
      suppliers: 0,
      documents: 0,
      sections: ['all'],
      warning: `The portal has no GSTR-${kind} documents for ${return_period}.`,
    };
  const reconciliationService = require('../gst/reconciliationService');
  const importer =
    kind === '2A' ? reconciliationService.importGSTR2A : reconciliationService.importGSTR2B;
  const imp = await importer(company_id, fy_id, String(return_period), payload);
  if (!imp?.success) return { success: false, error: imp?.error || 'Import into books failed.' };
  return { success: true, imported: true, suppliers, documents, sections: ['all'] };
}

async function fetchGstr2FromPortal(kind, { company_id, fy_id, return_period } = {}) {
  if (getPortalProvider() === 'sandbox')
    return fetchGstr2FromPortalSandbox(kind, { company_id, fy_id, return_period });
  const nc = notConfigured();
  if (nc) return nc;
  const def = GSTR2_SECTIONS[kind];
  if (!def) return { success: false, error: `Unknown statement kind: ${kind}` };
  if (!company_id || !fy_id) return { success: false, error: 'company_id and fy_id are required.' };
  if (!/^\d{6}$/.test(String(return_period || '')))
    return { success: false, error: 'Enter the return period as MMYYYY (e.g. 062026).' };

  const fetched = {};
  const failures = [];
  const pull = async (sections) => {
    for (const section of sections) {
      const r = await getSection(def.type, section, { retperiod: String(return_period) });
      if (r.success && r.data != null) fetched[section] = r.data;
      else if (!r.success && !isEmptySectionError(r.error)) failures.push(r.error);
    }
  };
  await pull(def.primary);
  if (!Object.keys(fetched).length && def.fallback.length) await pull(def.fallback);

  // A real failure (auth/transport) is surfaced verbatim so the client can prompt an
  // OTP login. "Nothing filed for this period" is NOT a failure — every section came
  // back empty-but-valid (e.g. RET13509 / blank-200), so report a clean no-op.
  if (failures.length && !Object.keys(fetched).length) {
    return { success: false, error: failures[0] };
  }

  const { payload, suppliers, documents } = buildImportPayload(fetched);
  if (!documents) {
    // Don't overwrite a previous import for the period with an empty statement.
    return {
      success: true,
      imported: false,
      suppliers: 0,
      documents: 0,
      sections: Object.keys(fetched),
      warning: `The portal has no GSTR-${kind} documents for ${return_period}.`,
    };
  }

  // Lazy require — keeps gstPortalService free of the DB module chain at load time.
  const reconciliationService = require('../gst/reconciliationService');
  const importer =
    kind === '2A' ? reconciliationService.importGSTR2A : reconciliationService.importGSTR2B;
  const imp = await importer(company_id, fy_id, String(return_period), payload);
  if (!imp?.success) return { success: false, error: imp?.error || 'Import into books failed.' };
  return { success: true, imported: true, suppliers, documents, sections: Object.keys(fetched) };
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
  logout,
  fetchGstr2FromPortal,
};
