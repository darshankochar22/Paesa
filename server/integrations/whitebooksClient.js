// WhiteBooks (BVM GSP) transport — plain JSON, one host, three products (e-Invoice,
// e-Way Bill, GST return filing), each with its own auth endpoint + token cache.
// Active only when GST_PROVIDER=whitebooks. See WHITEBOOKS_API.md for the endpoint map.
//
// WhiteBooks does all NIC encryption server-side, so requests/responses are plain JSON.
// Envelope: { status_cd: "1"|"Sucess"|"0"|"Failure", status_desc, data, error }.
// Normalized result for *.request(): { ok, status, data, error, body }.

const https = require('https');
const { URL } = require('url');
const { getWhitebooksConfig } = require('./gspConfig');

// --- public IP (WhiteBooks requires an ip_address header on every call) --------------
let _ip = null;
function fetchIp() {
  return new Promise((resolve) => {
    const r = https.get('https://api.ipify.org', (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve(d.trim()));
    });
    r.on('error', () => resolve(''));
    r.setTimeout(8000, () => {
      r.destroy();
      resolve('');
    });
  });
}
async function publicIp(cfg) {
  if (cfg.ip) return cfg.ip;
  if (_ip) return _ip;
  // Cache only a real lookup — never the fallback, so a transient network outage
  // doesn't pin ip_address to 127.0.0.1 until the app restarts.
  const got = await fetchIp();
  if (got) _ip = got;
  return _ip || '127.0.0.1';
}

// --- raw HTTPS ----------------------------------------------------------------------
function httpReq(baseUrl, method, path, headers, body) {
  return new Promise((resolve) => {
    let u;
    try {
      u = new URL(baseUrl.replace(/\/+$/, '') + path);
    } catch {
      return resolve({ status: 0, body: null, netErr: 'Bad WHITEBOOKS_BASE_URL' });
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
    // Timeouts are managed explicitly — Node ≥19's globalAgent applies a 5s socket
    // idle timeout by default, which silently killed every GSP response slower than
    // 5s as a bare "timeout" (NIC IRN generation regularly takes longer). Two phases:
    //  - connect: an unreachable host (VPN/firewall dropping packets) fails in 10s
    //    with a clear "check your network" message instead of hanging;
    //  - response: once connected, allow the GSP/NIC up to 45s of socket idle.
    req.on('socket', (socket) => {
      const armResponseTimeout = () =>
        socket.setTimeout(45000, () =>
          req.destroy(
            new Error(`${u.hostname} did not respond within 45s — GSP/NIC is slow, try again`),
          ),
        );
      if (socket.connecting) {
        const w = setTimeout(
          () =>
            req.destroy(
              new Error(
                `Cannot reach ${u.hostname} — check internet/VPN/firewall (connection timed out)`,
              ),
            ),
          10000,
        );
        socket.once('connect', () => {
          clearTimeout(w);
          armResponseTimeout();
        });
        socket.once('close', () => clearTimeout(w));
      } else {
        armResponseTimeout(); // reused keep-alive socket
      }
    });
    req.on('error', (e) => resolve({ status: 0, body: null, netErr: e.message }));
    if (payload) req.write(payload);
    req.end();
  });
}

// --- envelope helpers ---------------------------------------------------------------
const isSuccess = (b) => {
  if (!b || typeof b !== 'object') return false;
  const s = String(b.status_cd == null ? '' : b.status_cd);
  return s === '1' || /^suc?cess$/i.test(s); // WhiteBooks spells it "Sucess"
};
const dataOf = (b) => {
  let d = b && b.data;
  if (typeof d === 'string') {
    try {
      d = JSON.parse(d);
    } catch {
      /* keep raw string */
    }
  }
  return d;
};
const errOf = (res) => {
  if (res.netErr) return res.netErr;
  const b = res.body;
  if (b && typeof b === 'object') {
    if (b.error)
      return (
        b.error.message ||
        b.error.error_cd ||
        (typeof b.error === 'string' ? b.error : JSON.stringify(b.error))
      );
    const d = dataOf(b);
    if (d && d.ErrorDetails && d.ErrorDetails[0]) return d.ErrorDetails[0].ErrorMessage; // NIC error passthrough
    if (b.status_desc && !isSuccess(b)) return b.status_desc;
  }
  if (typeof b === 'string' && b) return b.slice(0, 300);
  return `HTTP ${res.status}`;
};
const normalize = (res) => {
  const ok = res.status >= 200 && res.status < 300 && isSuccess(res.body);
  return {
    ok,
    status: res.status,
    data: dataOf(res.body),
    body: res.body,
    error: ok ? null : errOf(res),
  };
};

// --- token caches per product -------------------------------------------------------
const caches = { einv: null, eway: null, gst: null };
// The GST-returns login is per-registration: the taxpayer picks one of the company's
// GST Registrations, and its GSTN username/GSTIN/state drive the OTP handshake while the
// GSP client_id/secret stay shared (.env). `activeGst` holds the registration currently
// logged in (or mid-login), so subsequent data calls ride the right session.
let activeGst = null;
// Merge a selected registration over the .env GST defaults. Client creds are always the
// shared .env ones; username/gstin/state come from the chosen registration.
function resolveGstReg(cfg, reg) {
  const base = cfg.gst;
  const r = reg || activeGst || base;
  const gstin = String(r.gstin || base.gstin || '').trim();
  return {
    clientId: base.clientId,
    clientSecret: base.clientSecret,
    username: String(r.username || base.username || '').trim(),
    gstin,
    stateCd: String(r.stateCd || (gstin ? gstin.slice(0, 2) : base.stateCd) || '').trim(),
  };
}
const tokenValid = (c) =>
  c && c.expiry && new Date() < new Date(String(c.expiry).replace(' ', 'T'));
const q = (email, extra = '') => `?email=${encodeURIComponent(email)}${extra}`;

// ===================================================================================
// e-Invoice
// ===================================================================================
async function einvAuth(cfg) {
  const ip = await publicIp(cfg);
  const g = cfg.einv;
  const res = await httpReq(cfg.baseUrl, 'GET', '/einvoice/authenticate' + q(cfg.email), {
    username: g.username,
    password: g.password,
    ip_address: ip,
    client_id: g.clientId,
    client_secret: g.clientSecret,
    gstin: cfg.gstin,
  });
  const d = dataOf(res.body);
  if (isSuccess(res.body) && d && d.AuthToken) {
    caches.einv = { token: d.AuthToken, sek: d.Sek, expiry: d.TokenExpiry, ip };
    return { ok: true };
  }
  return { ok: false, error: errOf(res) };
}

async function einvRequest(method, path, body, extraQuery = '', extraHeaders = {}) {
  const cfg = getWhitebooksConfig();
  if (!cfg) return { ok: false, error: 'WhiteBooks not configured (.env)' };
  if (!tokenValid(caches.einv)) {
    const a = await einvAuth(cfg);
    if (!a.ok) return a;
  }
  const g = cfg.einv;
  const res = await httpReq(
    cfg.baseUrl,
    method,
    path + q(cfg.email, extraQuery),
    {
      ip_address: caches.einv.ip,
      client_id: g.clientId,
      client_secret: g.clientSecret,
      username: g.username,
      'auth-token': caches.einv.token,
      gstin: cfg.gstin,
      ...extraHeaders,
    },
    body,
  );
  if (res.status === 401 || res.status === 403) caches.einv = null; // force re-auth next call
  return normalize(res);
}

// ===================================================================================
// e-Way Bill
// ===================================================================================
async function ewayAuth(cfg) {
  const ip = await publicIp(cfg);
  const g = cfg.eway;
  const res = await httpReq(
    cfg.baseUrl,
    'GET',
    '/ewaybillapi/v1.03/authenticate' +
      q(
        cfg.email,
        `&username=${encodeURIComponent(g.username)}&password=${encodeURIComponent(g.password)}`,
      ),
    {
      ip_address: ip,
      client_id: g.clientId,
      client_secret: g.clientSecret,
      gstin: cfg.gstin,
    },
  );
  // e-Way auth returns status_cd:"1" with NO token — WhiteBooks holds the NIC session
  // server-side; data calls are authorized by client_id/secret + gstin. Cache a synthetic
  // expiry so we re-auth roughly hourly and don't churn a handshake on every call.
  if (isSuccess(res.body)) {
    const d = dataOf(res.body) || {};
    const expiry = d.TokenExpiry || new Date(Date.now() + 50 * 60 * 1000).toISOString();
    caches.eway = { token: d.AuthToken || null, expiry, ip };
    return { ok: true };
  }
  return { ok: false, error: errOf(res) };
}

async function ewayRequest(method, path, body, extraQuery = '') {
  const cfg = getWhitebooksConfig();
  if (!cfg) return { ok: false, error: 'WhiteBooks not configured (.env)' };
  if (!tokenValid(caches.eway)) {
    const a = await ewayAuth(cfg);
    if (!a.ok) return a;
  }
  const g = cfg.eway;
  const res = await httpReq(
    cfg.baseUrl,
    method,
    path + q(cfg.email, extraQuery),
    {
      ip_address: caches.eway.ip,
      client_id: g.clientId,
      client_secret: g.clientSecret,
      gstin: cfg.gstin,
      ...(caches.eway.token ? { 'auth-token': caches.eway.token } : {}),
    },
    body,
  );
  if (res.status === 401 || res.status === 403) caches.eway = null;
  return normalize(res);
}

// ===================================================================================
// GST Return Filing — GSTN OTP session (taxpayer receives an OTP on their mobile)
// ===================================================================================
async function gstOtpRequest(reg) {
  const cfg = getWhitebooksConfig();
  if (!cfg) return { ok: false, error: 'WhiteBooks not configured (.env)' };
  const g = resolveGstReg(cfg, reg);
  if (!g.username) return { ok: false, error: 'Registration has no GST Username configured.' };
  activeGst = g; // the picked registration drives this and the follow-up authenticate
  const ip = await publicIp(cfg);
  const res = await httpReq(cfg.baseUrl, 'GET', '/authentication/otprequest' + q(cfg.email), {
    gst_username: g.username,
    state_cd: g.stateCd,
    ip_address: ip,
    client_id: g.clientId,
    client_secret: g.clientSecret,
  });
  const n = normalize(res);
  if (n.ok)
    caches.gst = {
      ...(caches.gst || {}),
      gstin: g.gstin,
      username: g.username,
      pendingTxn:
        (n.data && n.data.txn) || (res.body && res.body.header && res.body.header.txn) || null,
      ip,
    };
  return n;
}

async function gstAuthenticate(reg, otp) {
  const cfg = getWhitebooksConfig();
  if (!cfg) return { ok: false, error: 'WhiteBooks not configured (.env)' };
  const g = resolveGstReg(cfg, reg);
  activeGst = g;
  const ip = (caches.gst && caches.gst.ip) || (await publicIp(cfg));
  const txn = (caches.gst && caches.gst.pendingTxn) || '';
  if (!txn) return { ok: false, error: 'Request an OTP first (no txn in session).' };
  const res = await httpReq(
    cfg.baseUrl,
    'GET',
    '/authentication/authtoken' + q(cfg.email, `&otp=${encodeURIComponent(otp)}`),
    {
      gst_username: g.username,
      state_cd: g.stateCd,
      ip_address: ip,
      txn,
      client_id: g.clientId,
      client_secret: g.clientSecret,
    },
  );
  // Like e-Way, authtoken returns status_cd:"1" with no token — the OTP is validated
  // server-side and the session is keyed by (client_id, txn). Data calls carry the txn.
  if (isSuccess(res.body)) {
    const d = dataOf(res.body) || {};
    const expiry = d.expiry || d.TokenExpiry || new Date(Date.now() + 50 * 60 * 1000).toISOString();
    caches.gst = {
      token: d.auth_token || d.AuthToken || 'session',
      txn: d.txn || txn,
      expiry,
      ip,
      gstin: g.gstin,
      username: g.username,
    };
    return { ok: true };
  }
  return { ok: false, error: errOf(res) };
}

// Release the GSTN session (frees the per-username concurrent-session slot).
async function gstLogout(reg) {
  const cfg = getWhitebooksConfig();
  if (!cfg) return { ok: false, error: 'WhiteBooks not configured (.env)' };
  const g = resolveGstReg(cfg, reg);
  const ip = (caches.gst && caches.gst.ip) || (await publicIp(cfg));
  const res = await httpReq(cfg.baseUrl, 'GET', '/authentication/logout' + q(cfg.email), {
    gst_username: g.username,
    state_cd: g.stateCd,
    ip_address: ip,
    txn: (caches.gst && caches.gst.txn) || '',
    client_id: g.clientId,
    client_secret: g.clientSecret,
  });
  caches.gst = null;
  activeGst = null;
  return normalize(res);
}

// GST data call. GETs put gstin/period in the query; writes (retsave/retfile) put them in
// headers — so the caller specifies { query, headers, body } explicitly.
//   gstRequest('GET', '/gstr/retstatus', { query: { gstin, returnperiod } })
//   gstRequest('PUT', '/gstr1/retsave',  { headers: { gstin, ret_period }, body })
async function gstRequest(method, path, { query = {}, headers = {}, body = null } = {}) {
  const cfg = getWhitebooksConfig();
  if (!cfg) return { ok: false, error: 'WhiteBooks not configured (.env)' };
  if (!tokenValid(caches.gst))
    return {
      ok: false,
      error: 'GST session not authenticated — request an OTP and authenticate first.',
    };
  const g = resolveGstReg(cfg); // ride the logged-in registration's session
  const qs = new URLSearchParams({ email: cfg.email, ...query }).toString();
  const res = await httpReq(
    cfg.baseUrl,
    method,
    `${path}?${qs}`,
    {
      gst_username: g.username,
      state_cd: g.stateCd,
      ip_address: caches.gst.ip,
      txn: caches.gst.txn,
      client_id: g.clientId,
      client_secret: g.clientSecret,
      ...headers,
    },
    body,
  );
  return normalize(res);
}

// --- renderer-safe status (no secrets) ---------------------------------------------
function getStatus() {
  const cfg = getWhitebooksConfig();
  if (!cfg) return { configured: false, provider: 'whitebooks' };
  return {
    configured: true,
    provider: 'whitebooks',
    sandbox: cfg.sandbox,
    baseUrl: cfg.baseUrl,
    gstin: cfg.gstin || null,
    einvReady: !!(cfg.einv.clientId && cfg.einv.username),
    ewayReady: !!cfg.eway.clientId,
    gstReady: !!cfg.gst.clientId, // per-registration username comes from the DB, not .env
    gstSession: tokenValid(caches.gst),
    activeGstin: (caches.gst && caches.gst.gstin) || null,
  };
}

module.exports = {
  getStatus,
  isConfigured: () => !!getWhitebooksConfig(),
  _internal: { isSuccess, dataOf, errOf, caches, httpReq },
  einv: {
    authenticate: async () => {
      const c = getWhitebooksConfig();
      return c ? einvAuth(c) : { ok: false, error: 'not configured' };
    },
    request: einvRequest,
  },
  eway: {
    authenticate: async () => {
      const c = getWhitebooksConfig();
      return c ? ewayAuth(c) : { ok: false, error: 'not configured' };
    },
    request: ewayRequest,
  },
  gst: {
    otpRequest: gstOtpRequest,
    authenticate: gstAuthenticate,
    logout: gstLogout,
    request: gstRequest,
    // Bump the local session expiry after a successful portal-side refreshtoken —
    // the portal extends its session but returns no new expiry to store.
    touch: (mins = 50) => {
      if (caches.gst) caches.gst.expiry = new Date(Date.now() + mins * 60 * 1000).toISOString();
      return { ok: !!caches.gst };
    },
  },
};
