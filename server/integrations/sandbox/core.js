'use strict';

// Sandbox (sandbox.co.in) GST API — transport + session core.
//
// One host, plain JSON. Auth model (per https://developer.sandbox.co.in openapi.json):
//   1. Platform:  POST /authenticate (x-api-key + x-api-secret) -> access_token (24h) used as
//                 `authorization` on public + taxpayer-auth calls.
//   2. Products:  e-Invoice / e-Way Bill each authenticate with an NIC API user
//                 (username/password/gstin) OVER the platform token, yielding a product
//                 access_token for that product's data calls.
//   3. Taxpayer:  GSTN OTP handshake (generate -> verify) yields a 6h taxpayer session token
//                 used on all /gst/compliance/tax-payer/* returns/ledgers/IMS/notices calls.
//
// All calls resolve to { ok, status, data, error, body } — never throw.

const https = require('https');
const { getSandboxConfig } = require('../gspConfig');

// In-memory session caches (per Electron main process).
const caches = { platform: null, einv: null, eway: null, gst: null };

// Wire-level debug logging (request + response). On by default while the GST portal
// integration is being stabilised; silence with SANDBOX_DEBUG=0 in .env.
const DEBUG = () => process.env.SANDBOX_DEBUG !== '0';

// --- raw HTTPS (phase-aware timeouts: 10s connect / 45s response) ----------------------
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

    if (DEBUG()) {
      const redact = (h) => {
        const o = { ...h };
        for (const k of Object.keys(o)) {
          if (/^(authorization|x-api-key|x-api-secret)$/i.test(k)) {
            const v = String(o[k] || '');
            o[k] = v ? `${v.slice(0, 6)}…(${v.length} chars)` : '(empty)';
          }
        }
        return o;
      };
      console.log(`\n[sandbox →] ${method} ${u.href}`);
      console.log('[sandbox →] headers:', JSON.stringify(redact(opts.headers)));
      console.log('[sandbox →] body:', payload || '(none)');
    }

    const req = https.request(opts, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        if (DEBUG()) {
          console.log(`[sandbox ←] status ${res.statusCode}`);
          console.log('[sandbox ←] body:', d ? d.slice(0, 4000) : '(empty)');
        }
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

// GSTN reports "nothing filed for this period" as an error, not an empty body. Treat those as
// an empty section so a period with no data in one GSTR-2A/GSTR-1 section is a clean skip during
// the multi-section merge, not a hard failure that aborts the whole statement fetch.
const isEmptyGstnDoc = (msg = '') =>
  /no (document|data|invoice|record|detail)|not found|ret1350|invalid request|^http 200$/i.test(
    String(msg).trim(),
  );

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

// Sandbox's GST taxpayer endpoints require an `x-source` header. It is documented
// optional (primary | secondary, default primary), but the live API rejects requests
// that omit it — "Missing required request parameters: [x-source]". We always send
// "primary". See https://developer.sandbox.co.in/reference/gst-taxpayer-authentication
const TAXPAYER_SOURCE = 'primary';

const qsOf = (query) =>
  Object.keys(query).length
    ? '?' +
      new URLSearchParams(
        Object.fromEntries(Object.entries(query).filter(([, v]) => v != null && v !== '')),
      ).toString()
    : '';

// Core authenticated call (platform token). Adds authorization + x-api-key + x-api-version +
// x-source. `headers` overrides.
async function apiCall(method, path, { query = {}, body = null, headers = {}, version } = {}) {
  const cfg = getSandboxConfig();
  if (!cfg) return { ok: false, error: 'Sandbox not configured (.env)' };
  const a = await ensurePlatform(cfg);
  if (!a.ok) return a;
  const res = await httpReq(
    cfg.baseUrl,
    method,
    path + qsOf(query),
    {
      authorization: caches.platform.token,
      'x-api-key': cfg.apiKey,
      'x-api-version': version || cfg.apiVersion,
      'x-source': TAXPAYER_SOURCE,
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
  const res = await httpReq(
    cfg.baseUrl,
    method,
    path + qsOf(query),
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
// The authenticate endpoint requires a `force` query param (true forces a fresh NIC token).
async function einvAuth(cfg, force = false) {
  if (!cfg.einvUsername || !cfg.einvPassword)
    return { ok: false, error: 'Set SANDBOX_EINV_USERNAME/_PASSWORD (NIC e-Invoice API user).' };
  if (!cfg.gstin) return { ok: false, error: 'Set SANDBOX_GSTIN (taxpayer GSTIN).' };
  const p = await ensurePlatform(cfg);
  if (!p.ok) return p;
  const res = await httpReq(
    cfg.baseUrl,
    'POST',
    `/gst/compliance/e-invoice/tax-payer/authenticate?force=${force ? 'true' : 'false'}`,
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

// e-Way Bill: same NIC-user model. Uses dedicated SANDBOX_EWAY_USERNAME/_PASSWORD when set,
// falling back to the e-Invoice API user (NIC allows one API user across both products).
async function ewayAuth(cfg) {
  const user = cfg.ewayUsername || cfg.einvUsername;
  const pass = cfg.ewayPassword || cfg.einvPassword;
  if (!user || !pass)
    return {
      ok: false,
      error: 'Set SANDBOX_EWAY_USERNAME/_PASSWORD (or SANDBOX_EINV_*) — NIC e-Way Bill API user.',
    };
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
    { username: user, password: pass, gstin: cfg.gstin },
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

// --- taxpayer (GSTN OTP) session -------------------------------------------------------
// GSTN's Authentication API (developer.gst.gov.in) requires a `state-cd` header — the 2-digit
// state code the taxpayer belongs to (the GSTIN's first two digits). Sandbox forwards it to
// GSTN; an absent state-cd fails GSTN auth with AUTH4041.
const stateCdOf = (gstin) => String(gstin || '').slice(0, 2);

async function gstOtpRequest(username, gstin) {
  const cfg = getSandboxConfig();
  if (!cfg) return { ok: false, error: 'Sandbox not configured (.env)' };
  const g = gstin || cfg.gstin;
  const r = await apiCall('POST', '/gst/compliance/tax-payer/otp', {
    body: { username, gstin: g },
    headers: { 'state-cd': stateCdOf(g) },
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
    headers: { 'state-cd': stateCdOf(g) },
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

// Extend the active taxpayer session before it lapses (POST /tax-payer/session/refresh).
async function gstRefreshSession() {
  if (!caches.gst || !caches.gst.token) return { ok: false, error: 'No active session.' };
  const r = await gstRequest('POST', '/gst/compliance/tax-payer/session/refresh', {});
  const d = r.data;
  if (r.ok && d && d.access_token) {
    caches.gst = {
      ...caches.gst,
      token: d.access_token,
      expiry: d.session_expiry
        ? new Date(Number(d.session_expiry)).toISOString()
        : new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    };
  }
  return r;
}

// Taxpayer-session data call. Session comes ONLY from the OTP handshake — expired session
// means "log in again", not silent re-auth.
const gstRequest = (method, path, opts = {}) =>
  productCall(
    'gst',
    async () => ({ ok: false, error: 'Taxpayer session expired — request + verify OTP again.' }),
    method,
    path,
    // Taxpayer GST endpoints need x-source + state-cd (GSTN AUTH4041 otherwise); state-cd
    // comes from the authenticated session's GSTIN.
    {
      ...opts,
      headers: {
        'x-source': TAXPAYER_SOURCE,
        'state-cd': stateCdOf(caches.gst && caches.gst.gstin),
        ...(opts.headers || {}),
      },
    },
  );

// Merge several per-section GSTN GETs into one doc-root object { [section]: [suppliers] } shaped
// like a consolidated statement, so gstr2Transform.findDocRoot/buildImportPayload sees the same
// structure it gets from GSTR-2B's single document GET. Sandbox wraps the section array under an
// inner GSTN `data`, so unwrap data.data.{section} (falling back to data.{section}).
async function fetchGstrSections(form, sections, year, month) {
  const merged = {};
  let anyOk = false;
  let lastErr = null;
  for (const s of sections) {
    const r = await gstRequest(
      'GET',
      `/gst/compliance/tax-payer/gstrs/${form}/${s}/${year}/${month}`,
      {},
    );
    if (r.ok) {
      anyOk = true;
      const root = (r.data && (r.data.data || r.data)) || {};
      if (root[s] != null) merged[s] = root[s];
    } else if (!isEmptyGstnDoc(r.error)) {
      lastErr = r.error;
    }
  }
  if (!anyOk && lastErr) return { ok: false, status: 0, data: null, error: lastErr, body: null };
  return { ok: true, status: 200, data: merged, error: null, body: merged };
}

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
    ewaySession: tokenValid(caches.eway),
    gstSession: tokenValid(caches.gst),
    einvUserReady: !!(cfg.einvUsername && cfg.einvPassword),
  };
}

module.exports = {
  caches,
  httpReq,
  isSuccess,
  dataOf,
  errOf,
  normalize,
  tokenValid,
  isEmptyGstnDoc,
  platformAuth,
  ensurePlatform,
  apiCall,
  productCall,
  einvAuth,
  einvRequest,
  ewayAuth,
  ewayRequest,
  stateCdOf,
  gstOtpRequest,
  gstVerifyOtp,
  gstRefreshSession,
  gstRequest,
  fetchGstrSections,
  getStatus,
};
