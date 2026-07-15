// Sandbox (Quicko GSP) transport — https://sandbox.co.in.
// One host, plain JSON, covers e-Invoice, e-Way Bill, GST returns (taxpayer OTP session) and
// public GST verification. Active when GST_PROVIDER=sandbox. See developer.sandbox.co.in.
//
// Two auth layers:
//  1. Platform: POST /authenticate  (x-api-key + x-api-secret headers) -> access_token (24h),
//     sent as the `authorization` header (NO "Bearer" prefix) on every subsequent call.
//  2. Product sub-sessions (e-Invoice / e-Way / taxpayer returns) each have their own
//     authenticate call; Sandbox keys the session to (api-key + gstin) server-side.
//
// Envelope: { code, data, message?, timestamp, transaction_id }. code 200/201 = ok.
// Normalized result: { ok, status, data, error, body }.

const https = require('https');
const { URL } = require('url');
const { getSandboxConfig } = require('./gspConfig');

const caches = { platform: null, einv: null, eway: null, gst: null };

// --- raw HTTPS (shares the phase-aware timeout discipline used for WhiteBooks) ----------
function httpReq(baseUrl, method, path, headers, body) {
  return new Promise((resolve) => {
    let u;
    try {
      u = new URL(baseUrl.replace(/\/+$/, '') + path);
    } catch {
      return resolve({ status: 0, body: null, netErr: 'Bad SANDBOX base URL' });
    }
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method,
      headers: {
        Accept: 'application/json',
        ...(payload
          ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
          : {}),
        ...headers,
      },
    };
    const req = https.request(opts, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(d) });
        } catch {
          resolve({ status: res.statusCode, body: d });
        }
      });
    });
    req.on('socket', (socket) => {
      const armResponse = () =>
        socket.setTimeout(45000, () =>
          req.destroy(new Error(`${u.hostname} did not respond within 45s — try again`)),
        );
      if (socket.connecting) {
        const w = setTimeout(
          () => req.destroy(new Error(`Cannot reach ${u.hostname} — check internet/VPN/firewall`)),
          10000,
        );
        socket.once('connect', () => {
          clearTimeout(w);
          armResponse();
        });
        socket.once('close', () => clearTimeout(w));
      } else {
        armResponse();
      }
    });
    req.on('error', (e) => resolve({ status: 0, body: null, netErr: e.message }));
    if (payload) req.write(payload);
    req.end();
  });
}

// --- envelope helpers ------------------------------------------------------------------
// GSTN-wrapped calls (taxpayer OTP/returns) return HTTP 200 with an inner status_cd:"0" +
// error even on failure — so a 200 alone is NOT success; the inner GSTN status must be clean.
const innerGstnError = (b) => {
  const d = b && b.data;
  if (!d || typeof d !== 'object') return null;
  if (String(d.status_cd) === '0')
    return (
      (d.error && (d.error.message || d.error.error_cd)) || 'GSTN request failed (status_cd 0)'
    );
  return null;
};
const isSuccess = (b) =>
  !!b && typeof b === 'object' && (b.code === 200 || b.code === 201) && !innerGstnError(b);
const dataOf = (b) => (b && typeof b === 'object' ? b.data : null);
const errOf = (res) => {
  if (res.netErr) return res.netErr;
  const b = res.body;
  const inner = innerGstnError(b);
  if (inner) return inner;
  if (b && typeof b === 'object') {
    // Sandbox surfaces errors as { message } or nested { error }, sometimes with a NIC
    // envelope tucked in data.error / data.message.
    const d = b.data;
    return (
      b.message ||
      (b.error && (b.error.message || b.error)) ||
      (d && (d.error || d.message)) ||
      JSON.stringify(b)
    );
  }
  return b ? String(b).slice(0, 300) : `HTTP ${res.status}`;
};
const normalize = (res) => ({
  ok: isSuccess(res.body),
  status: res.status,
  data: dataOf(res.body),
  error: isSuccess(res.body) ? null : errOf(res),
  body: res.body,
});

const tokenValid = (c) =>
  !!(c && c.token && (!c.expiry || Date.parse(c.expiry) > Date.now() + 60000));

// --- platform auth ---------------------------------------------------------------------
async function platformAuth(cfg) {
  const res = await httpReq(cfg.baseUrl, 'POST', '/authenticate', {
    'x-api-key': cfg.apiKey,
    'x-api-secret': cfg.apiSecret,
    'x-api-version': cfg.apiVersion,
  });
  const d = dataOf(res.body);
  if (isSuccess(res.body) && d && d.access_token) {
    // Platform tokens last 24h; refresh a little early.
    caches.platform = {
      token: d.access_token,
      expiry: new Date(Date.now() + 23 * 3600 * 1000).toISOString(),
    };
    return { ok: true };
  }
  return { ok: false, error: errOf(res) };
}

async function ensurePlatform(cfg) {
  if (tokenValid(caches.platform)) return { ok: true };
  return platformAuth(cfg);
}

// Core authenticated call. Adds authorization + x-api-key + x-api-version. `headers` overrides.
async function apiCall(method, path, { query = {}, body = null, headers = {}, version } = {}) {
  const cfg = getSandboxConfig();
  if (!cfg) return { ok: false, error: 'Sandbox not configured (.env)' };
  const a = await ensurePlatform(cfg);
  if (!a.ok) return a;
  const qs = Object.keys(query).length
    ? '?' +
      new URLSearchParams(
        Object.fromEntries(Object.entries(query).filter(([, v]) => v != null && v !== '')),
      ).toString()
    : '';
  const res = await httpReq(
    cfg.baseUrl,
    method,
    path + qs,
    {
      authorization: caches.platform.token,
      'x-api-key': cfg.apiKey,
      'x-api-version': version || cfg.apiVersion,
      ...headers,
    },
    body,
  );
  if (res.status === 401 || res.status === 403) caches.platform = null; // force re-auth next call
  return normalize(res);
}

// --- product sub-sessions --------------------------------------------------------------
// Each product (e-Invoice / e-Way / taxpayer returns) has its own authenticate call, made
// WITH the platform token, that returns a product access_token used as `authorization` on
// that product's data calls. Sandbox keys the NIC session to (api-key + gstin) server-side.

// Generic product data call: ensure the product token, put it in authorization.
async function productCall(
  cacheKey,
  ensureFn,
  method,
  path,
  { query = {}, body = null, headers = {}, version } = {},
) {
  const cfg = getSandboxConfig();
  if (!cfg) return { ok: false, error: 'Sandbox not configured (.env)' };
  if (!tokenValid(caches[cacheKey])) {
    const a = await ensureFn(cfg);
    if (!a.ok) return a;
  }
  const qs = Object.keys(query).length
    ? '?' +
      new URLSearchParams(
        Object.fromEntries(Object.entries(query).filter(([, v]) => v != null && v !== '')),
      ).toString()
    : '';
  const res = await httpReq(
    cfg.baseUrl,
    method,
    path + qs,
    {
      authorization: caches[cacheKey].token,
      'x-api-key': cfg.apiKey,
      'x-api-version': version || cfg.apiVersion,
      ...headers,
    },
    body,
  );
  if (res.status === 401 || res.status === 403) caches[cacheKey] = null;
  return normalize(res);
}

// e-Invoice: NIC API user (username/password created on the e-Invoice portal) + taxpayer GSTIN.
async function einvAuth(cfg) {
  if (!cfg.einvUsername || !cfg.einvPassword)
    return { ok: false, error: 'Set SANDBOX_EINV_USERNAME/_PASSWORD (NIC e-Invoice API user).' };
  if (!cfg.gstin) return { ok: false, error: 'Set SANDBOX_GSTIN (taxpayer GSTIN).' };
  const p = await ensurePlatform(cfg);
  if (!p.ok) return p;
  const res = await httpReq(
    cfg.baseUrl,
    'POST',
    '/gst/compliance/e-invoice/tax-payer/authenticate',
    {
      authorization: caches.platform.token,
      'x-api-key': cfg.apiKey,
      'x-api-version': cfg.apiVersion,
    },
    { username: cfg.einvUsername, password: cfg.einvPassword, gstin: cfg.gstin },
  );
  const d = dataOf(res.body);
  if (isSuccess(res.body) && d && d.access_token) {
    caches.einv = {
      token: d.access_token,
      expiry: d.expiry ? new Date(Number(d.expiry)).toISOString() : null,
    };
    return { ok: true };
  }
  return { ok: false, error: errOf(res) };
}
const einvRequest = (method, path, opts) => productCall('einv', einvAuth, method, path, opts);

// e-Way Bill: same NIC-user pattern (path inferred from the e-Invoice/e-Way naming convention;
// re-verify against the console if it 404s).
async function ewayAuth(cfg) {
  if (!cfg.gstin) return { ok: false, error: 'Set SANDBOX_GSTIN (taxpayer GSTIN).' };
  const p = await ensurePlatform(cfg);
  if (!p.ok) return p;
  const res = await httpReq(
    cfg.baseUrl,
    'POST',
    '/gst/compliance/e-way-bill/tax-payer/authenticate',
    {
      authorization: caches.platform.token,
      'x-api-key': cfg.apiKey,
      'x-api-version': cfg.apiVersion,
    },
    { username: cfg.einvUsername, password: cfg.einvPassword, gstin: cfg.gstin },
  );
  const d = dataOf(res.body);
  if (isSuccess(res.body) && d && d.access_token) {
    caches.eway = {
      token: d.access_token,
      expiry: d.expiry ? new Date(Number(d.expiry)).toISOString() : null,
    };
    return { ok: true };
  }
  return { ok: false, error: errOf(res) };
}
const ewayRequest = (method, path, opts) => productCall('eway', ewayAuth, method, path, opts);

// Taxpayer returns session — GSTN OTP (taxpayer receives an OTP on their registered mobile).
async function gstOtpRequest(username, gstin) {
  const cfg = getSandboxConfig();
  if (!cfg) return { ok: false, error: 'Sandbox not configured (.env)' };
  const g = gstin || cfg.gstin;
  const r = await apiCall('POST', '/gst/compliance/tax-payer/otp', {
    body: { username, gstin: g },
  });
  if (r.ok) caches.gst = { ...(caches.gst || {}), pendingUser: username, pendingGstin: g };
  return r;
}
async function gstVerifyOtp(otp, username, gstin) {
  const cfg = getSandboxConfig();
  if (!cfg) return { ok: false, error: 'Sandbox not configured (.env)' };
  const u = username || (caches.gst && caches.gst.pendingUser);
  const g = gstin || (caches.gst && caches.gst.pendingGstin) || cfg.gstin;
  const r = await apiCall('POST', '/gst/compliance/tax-payer/otp/verify', {
    query: { otp },
    body: { username: u, gstin: g },
  });
  const d = r.data;
  if (r.ok && d && d.access_token) {
    caches.gst = {
      token: d.access_token,
      username: u,
      gstin: g,
      expiry: d.session_expiry
        ? new Date(Number(d.session_expiry)).toISOString()
        : new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    };
    return { ok: true };
  }
  return { ok: false, error: r.error || 'OTP verification failed' };
}
const gstRequest = (method, path, opts) =>
  productCall(
    'gst',
    async () => ({ ok: false, error: 'Taxpayer session expired — request + verify OTP again.' }),
    method,
    path,
    opts,
  );

// --- renderer-safe status --------------------------------------------------------------
function getStatus() {
  const cfg = getSandboxConfig();
  if (!cfg) return { configured: false, provider: 'sandbox' };
  return {
    configured: true,
    provider: 'sandbox',
    live: cfg.live,
    baseUrl: cfg.baseUrl,
    gstin: cfg.gstin || null,
    platformSession: tokenValid(caches.platform),
    einvSession: tokenValid(caches.einv),
    gstSession: tokenValid(caches.gst),
    einvUserReady: !!(cfg.einvUsername && cfg.einvPassword),
  };
}

module.exports = {
  getStatus,
  isConfigured: () => !!getSandboxConfig(),
  _internal: { isSuccess, dataOf, errOf, caches, httpReq, platformAuth },
  platform: {
    authenticate: async () => {
      const c = getSandboxConfig();
      return c ? platformAuth(c) : { ok: false, error: 'not configured' };
    },
  },
  request: apiCall,
  // Public GST verification (only needs the platform token) --------------------------
  searchGstin: (gstin) =>
    apiCall('POST', '/gst/compliance/public/gstin/search', { body: { gstin } }),
  // financial_year format is "FY 2025-26"; gstr filter is optional (e.g. "gstr-1").
  trackReturns: (gstin, fy, gstr) =>
    apiCall('POST', '/gst/compliance/public/gstrs/track', {
      query: { financial_year: fy, ...(gstr ? { gstr } : {}) },
      body: { gstin },
    }),
  // Normalized real filing status for the GST reports (public API — no OTP). Returns a map
  // keyed by return period (MMYYYY) -> { rtntype: { arn, dof, status, valid } }. fy is a start
  // year (2024) or a label; we coerce to the "FY 2024-25" the API expects.
  getFiledReturns: async (gstin, fy) => {
    const yr = String(fy).match(/(\d{4})/);
    const start = yr ? Number(yr[1]) : new Date().getFullYear();
    const fyLabel = /^FY /i.test(String(fy)) ? fy : `FY ${start}-${String(start + 1).slice(-2)}`;
    const r = await apiCall('POST', '/gst/compliance/public/gstrs/track', {
      query: { financial_year: fyLabel },
      body: { gstin },
    });
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
  },
  // e-Invoice (needs SANDBOX_EINV_USERNAME/_PASSWORD + SANDBOX_GSTIN) -----------------
  einv: {
    authenticate: async () => {
      const c = getSandboxConfig();
      return c ? einvAuth(c) : { ok: false, error: 'not configured' };
    },
    request: einvRequest,
    generate: (invoice) =>
      einvRequest('POST', '/gst/compliance/e-invoice/tax-payer/invoice', { body: invoice }),
    cancel: (body) => einvRequest('POST', '/gst/compliance/e-invoice/tax-payer/cancel', { body }),
    getByIrn: (irn) =>
      einvRequest('GET', '/gst/compliance/e-invoice/tax-payer/invoice', { query: { irn } }),
    generateEwbByIrn: (body) =>
      einvRequest('POST', '/gst/compliance/e-invoice/tax-payer/e-way-bill', { body }),
    searchGstin: (gstin) =>
      einvRequest('GET', '/gst/compliance/e-invoice/tax-payer/gstin', { query: { gstin } }),
  },
  // e-Way Bill (path pattern inferred — re-verify if it 404s) -------------------------
  eway: {
    authenticate: async () => {
      const c = getSandboxConfig();
      return c ? ewayAuth(c) : { ok: false, error: 'not configured' };
    },
    request: ewayRequest,
    generate: (body) => ewayRequest('POST', '/gst/compliance/e-way-bill/consignor/bill', { body }),
    cancel: (body) => ewayRequest('POST', '/gst/compliance/e-way-bill/consignor/cancel', { body }),
    getByDate: (date, rejected) =>
      ewayRequest('GET', '/gst/compliance/e-way-bill/consignor/bills', {
        query: { date, rejected },
      }),
  },
  // GST return filing — taxpayer OTP session (6h) ------------------------------------
  gst: {
    otpRequest: gstOtpRequest,
    verifyOtp: gstVerifyOtp,
    request: gstRequest,
    // year/month are the return-period path segments, e.g. saveGstr1('2024','03', body).
    // --- Reads (reconciliation + review) ---
    getGstr2a: (year, month) =>
      gstRequest('GET', `/gst/compliance/tax-payer/gstrs/gstr-2a/${year}/${month}`, {}),
    getGstr2b: (year, month) =>
      gstRequest('GET', `/gst/compliance/tax-payer/gstrs/gstr-2b/${year}/${month}`, {}),
    getGstr3b: (year, month) =>
      gstRequest('GET', `/gst/compliance/tax-payer/gstrs/gstr-3b/${year}/${month}`, {}),
    getGstr1: (year, month) =>
      gstRequest('GET', `/gst/compliance/tax-payer/gstrs/gstr-1/${year}/${month}`, {}),
    // --- Writes (save = reversible; file = commits with EVC OTP) ---
    saveGstr1: (year, month, body) =>
      gstRequest('POST', `/gst/compliance/tax-payer/gstrs/gstr-1/${year}/${month}`, { body }),
    saveGstr3b: (year, month, body) =>
      gstRequest('POST', `/gst/compliance/tax-payer/gstrs/gstr-3b/${year}/${month}`, { body }),
    fileGstr1: (year, month, { pan, otp }, body) =>
      gstRequest('POST', `/gst/compliance/tax-payer/gstrs/gstr-1/${year}/${month}/file`, {
        query: { pan, otp },
        body,
      }),
    fileGstr3b: (year, month, { pan, otp }, body) =>
      gstRequest('POST', `/gst/compliance/tax-payer/gstrs/gstr-3b/${year}/${month}/file`, {
        query: { pan, otp },
        body,
      }),
    // EVC OTP for filing (separate from the login OTP).
    requestEvcOtp: (pan) =>
      apiCall('POST', '/gst/compliance/tax-payer/otp/evc', { query: { pan } }),
    // Invalidate the current session (frees the GSP account's concurrent-session slot).
    logout: async () => {
      if (!caches.gst || !caches.gst.token) return { ok: false, error: 'No active session.' };
      const r = await productCall(
        'gst',
        async () => ({ ok: true }),
        'POST',
        '/gst/compliance/tax-payer/logout',
        {},
      );
      caches.gst = null;
      return r;
    },
    session: () =>
      caches.gst && caches.gst.token
        ? { active: true, gstin: caches.gst.gstin, username: caches.gst.username }
        : { active: false },
  },
};
