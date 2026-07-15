// Developer-side credentials for the GST integrations (e-Invoice, e-Way Bill, GST Filing).
// Configured via .env (loaded by dotenv at app start), NOT entered in the UI — same approach
// as the WhatsApp credentials (server/whatsapp/devConfig.js).
//
//   GST_PROVIDER        'nic' (default — direct NIC sandbox, free) | 'gsp' (ClearTax / Masters
//                       India / Sandbox-Quicko / any GSP — set the base URLs accordingly)
//   GST_GSTIN           company GSTIN used for auth + document payloads
//   GST_SANDBOX         'true' (default) | 'false'
//   GST_CLIENT_ID       GSP/IRP client id
//   GST_CLIENT_SECRET   GSP/IRP client secret
//   GST_USERNAME        IRP/portal API username
//   GST_PASSWORD        IRP/portal API password
//   GST_APP_KEY         app key (NIC auth handshake)
//   EINVOICE_BASE_URL   host for e-Invoice (default einv-apisandbox.nic.in)
//   EWAYBILL_BASE_URL   host for e-Way Bill (default einv-apisandbox.nic.in)
//
//   GST_FILING_BASE_URL GSP base URL for GSTN return filing (no free direct access)
//   GST_FILING_API_KEY  GSP api key for return filing

function bool(v, def = false) {
  if (v == null || v === '') return def;
  const s = String(v).toLowerCase();
  return s === 'true' || s === '1' || s === 'yes';
}

// e-Invoice + e-Way Bill connection (NIC IRP style auth). null when not configured.
function getGspConfig() {
  const clientId = (process.env.GST_CLIENT_ID || '').trim();
  const username = (process.env.GST_USERNAME || '').trim();
  if (!clientId || !username) return null; // core auth bits missing => not configured
  return {
    provider: (process.env.GST_PROVIDER || 'nic').toLowerCase(),
    gstin: (process.env.GST_GSTIN || '').trim(),
    sandbox: bool(process.env.GST_SANDBOX, true),
    clientId,
    clientSecret: (process.env.GST_CLIENT_SECRET || '').trim(),
    username,
    password: (process.env.GST_PASSWORD || '').trim(),
    appKey: (process.env.GST_APP_KEY || '').trim(),
    einvoiceBaseUrl: (process.env.EINVOICE_BASE_URL || 'einv-apisandbox.nic.in').trim(),
    ewaybillBaseUrl: (process.env.EWAYBILL_BASE_URL || 'einv-apisandbox.nic.in').trim(),
  };
}

// GST return filing connection (via a GSP). null when not configured.
function getFilingConfig() {
  const apiKey = (process.env.GST_FILING_API_KEY || '').trim();
  const baseUrl = (process.env.GST_FILING_BASE_URL || '').trim();
  if (!apiKey || !baseUrl) return null;
  return {
    baseUrl,
    apiKey,
    gstin: (process.env.GST_GSTIN || '').trim(),
    sandbox: bool(process.env.GST_SANDBOX, true),
  };
}

// WhiteBooks (BVM GSP) connection — plain-JSON GSP covering e-Invoice, e-Way Bill AND GST
// return filing on one host. Active only when GST_PROVIDER=whitebooks. null otherwise.
// See server/integrations/WHITEBOOKS_API.md for the endpoint map.
//
//   WHITEBOOKS_BASE_URL   https://apisandbox.whitebooks.in (sandbox) | https://api.whitebooks.in
//   WHITEBOOKS_EMAIL      developer-account email (identity check, must match the creds' account)
//   WHITEBOOKS_IP         optional; public IP auto-detected at runtime when blank
//   WHITEBOOKS_GSTIN      taxpayer GSTIN (shared by e-Invoice/e-Way; also default for returns)
//   e-Invoice group:  WHITEBOOKS_EINV_CLIENT_ID / _SECRET / _USERNAME / _PASSWORD
//   e-Way group:      WHITEBOOKS_EWB_CLIENT_ID / _SECRET  (username/password default to e-Invoice's)
//   GST returns:      WHITEBOOKS_GST_CLIENT_ID / _SECRET / _USERNAME (GSTN user) / _STATE_CD
function getWhitebooksConfig() {
  if ((process.env.GST_PROVIDER || 'nic').toLowerCase() !== 'whitebooks') return null;
  const email = (process.env.WHITEBOOKS_EMAIL || '').trim();
  if (!email) return null;
  const baseUrl = (process.env.WHITEBOOKS_BASE_URL || 'https://apisandbox.whitebooks.in').trim();
  const gstin = (process.env.WHITEBOOKS_GSTIN || process.env.GST_GSTIN || '').trim();
  const einvUser = (process.env.WHITEBOOKS_EINV_USERNAME || '').trim();
  const einvPass = (process.env.WHITEBOOKS_EINV_PASSWORD || '').trim();
  return {
    provider: 'whitebooks',
    baseUrl,
    sandbox: !/\/\/api\.whitebooks\./i.test(baseUrl),
    email,
    ip: (process.env.WHITEBOOKS_IP || '').trim(),
    gstin,
    einv: {
      clientId: (process.env.WHITEBOOKS_EINV_CLIENT_ID || '').trim(),
      clientSecret: (process.env.WHITEBOOKS_EINV_CLIENT_SECRET || '').trim(),
      username: einvUser,
      password: einvPass,
    },
    eway: {
      clientId: (process.env.WHITEBOOKS_EWB_CLIENT_ID || '').trim(),
      clientSecret: (process.env.WHITEBOOKS_EWB_CLIENT_SECRET || '').trim(),
      username: (process.env.WHITEBOOKS_EWB_USERNAME || einvUser).trim(),
      password: (process.env.WHITEBOOKS_EWB_PASSWORD || einvPass).trim(),
    },
    gst: (() => {
      const gstReturnsGstin = (process.env.WHITEBOOKS_GST_GSTIN || gstin).trim(); // returns test GSTIN can differ from e-Invoice's in sandbox
      return {
        clientId: (process.env.WHITEBOOKS_GST_CLIENT_ID || '').trim(),
        clientSecret: (process.env.WHITEBOOKS_GST_CLIENT_SECRET || '').trim(),
        username: (process.env.WHITEBOOKS_GST_USERNAME || '').trim(), // GSTN portal username
        gstin: gstReturnsGstin,
        stateCd: (process.env.WHITEBOOKS_GST_STATE_CD || gstReturnsGstin.slice(0, 2)).trim(),
      };
    })(),
  };
}

// Sandbox (Quicko GSP) connection — plain-JSON GSP covering e-Invoice, e-Way Bill AND GST
// return filing + public GSTIN verification on one host. Active only when GST_PROVIDER=sandbox.
// null otherwise. See server/integrations/sandboxClient.js.
//
//   SANDBOX_API_KEY / _SECRET   platform credentials; key_live_* => production host,
//                               key_test_* => test host (auto-derived from the key prefix).
//   SANDBOX_API_VERSION         defaults to 1.0.0
//   SANDBOX_GSTIN               taxpayer GSTIN (falls back to GST_GSTIN)
//   SANDBOX_EINV_USERNAME/_PASSWORD   NIC e-Invoice API user (for e-Invoice sub-session)
function getSandboxConfig() {
  // Activated purely by key presence — independent of GST_PROVIDER — so the GST reports can
  // read real portal data via Sandbox while e-Invoice/e-Way stay on their own provider.
  const apiKey = (process.env.SANDBOX_API_KEY || '').trim();
  const apiSecret = (process.env.SANDBOX_API_SECRET || '').trim();
  if (!apiKey || !apiSecret) return null;
  const isTest = /^key_test/i.test(apiKey);
  // Test-only guard: a live (key_live_) key is refused unless SANDBOX_ALLOW_LIVE=true, so the
  // app physically cannot hit real GSTN with production credentials by accident.
  const allowLive = bool(process.env.SANDBOX_ALLOW_LIVE, false);
  if (!isTest && !allowLive) return null;
  return {
    provider: 'sandbox',
    apiKey,
    apiSecret,
    apiVersion: (process.env.SANDBOX_API_VERSION || '1.0.0').trim(),
    live: !isTest,
    baseUrl: isTest ? 'https://test-api.sandbox.co.in' : 'https://api.sandbox.co.in',
    gstin: (process.env.SANDBOX_GSTIN || process.env.GST_GSTIN || '').trim(),
    einvUsername: (process.env.SANDBOX_EINV_USERNAME || '').trim(),
    einvPassword: (process.env.SANDBOX_EINV_PASSWORD || '').trim(),
  };
}

// Which GSP backs the GST-PORTAL surface (OTP session, GSTR-2A/2B fetch, return status,
// GSTR-1/3B save+file). Independent of e-Invoice/e-Way routing. Explicit override via
// GST_PORTAL_PROVIDER=sandbox|whitebooks; otherwise prefer Sandbox when its keys are present
// (its returns flow works), else fall back to WhiteBooks.
function getPortalProvider() {
  const explicit = (process.env.GST_PORTAL_PROVIDER || '').toLowerCase();
  if (explicit === 'sandbox' || explicit === 'whitebooks') return explicit;
  if (getSandboxConfig()) return 'sandbox';
  if (getWhitebooksConfig()) return 'whitebooks';
  return null;
}

module.exports = {
  getGspConfig,
  getFilingConfig,
  getWhitebooksConfig,
  getSandboxConfig,
  getPortalProvider,
  isGspConfigured: () => !!getGspConfig(),
  isFilingConfigured: () => !!getFilingConfig(),
  isWhitebooksConfigured: () => !!getWhitebooksConfig(),
  isSandboxConfigured: () => !!getSandboxConfig(),
};
