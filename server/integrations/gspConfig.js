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

module.exports = {
  getGspConfig,
  getFilingConfig,
  getWhitebooksConfig,
  isGspConfigured: () => !!getGspConfig(),
  isFilingConfigured: () => !!getFilingConfig(),
  isWhitebooksConfigured: () => !!getWhitebooksConfig(),
};
