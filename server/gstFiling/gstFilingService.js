// GST return filing service. The return is COMPUTED locally by the existing GST services
// (gstr1Service / gstr3bService) and then pushed to a GSP for save + file. GSP credentials
// are developer-side (.env via gspConfig). Lifecycle is tracked in gst_filings.
//
// The GSP endpoint paths below are a sensible default shape; adjust them to your chosen GSP
// (ClearTax / Masters India / Sandbox-Quicko) — only this file needs to change.

const { db } = require('../db/index');
const { sql, eq } = require('drizzle-orm');
const { gstFilings } = require('../db/schema');
const filing = require('../integrations/gstFilingClient');
const wb = require('../integrations/whitebooksClient');
const sbx = require('../integrations/sandboxClient');
const {
  getFilingConfig,
  getWhitebooksConfig,
  getSandboxConfig,
  getPortalProvider,
} = require('../integrations/gspConfig');

// year/month path segments Sandbox wants from a MMYYYY return period.
const ymOf = (period) => ({ year: String(period).slice(2), month: String(period).slice(0, 2) });
const gstr1Service = require('../gst/gstr1Service');
const gstr3bService = require('../gst/gstr3bService');
const gstRegistrationService = require('../gstRegistration/gstRegistrationService');

// The GSTN OTP login is per GST Registration. The renderer sends the chosen registration's
// gstin; we look up its GSTN username here (authoritative — never trust a client-sent
// username) and derive the state code from the GSTIN. Returns null to fall back to the
// .env default registration, or { error } when the picked registration is unusable.
const resolveReg = async (company_id, gstin) => {
  if (!gstin) return null;
  const r = await gstRegistrationService.getAll(company_id);
  const rows = (r && r.success && r.gstRegistrations) || [];
  const row = rows.find((x) => String(x.gstin || '').trim() === String(gstin).trim());
  if (!row) return { error: `No GST Registration found for ${gstin}.` };
  if (!row.gst_username)
    return { error: `Set the GST Portal Username on registration ${gstin} first.` };
  return {
    username: String(row.gst_username).trim(),
    gstin: String(row.gstin).trim(),
    stateCd: String(row.gstin).slice(0, 2),
  };
};

// WhiteBooks GSTN return endpoints (retsave = save data; retevcfile = file with EVC OTP).
const WB_RET = {
  GSTR1: { save: '/gstr1/retsave', file: '/gstr1/retevcfile' },
  GSTR3B: { save: '/gstr3b/retsave', file: '/gstr3b/retevcfile' },
};
// Any other return type follows the same /{type}/retsave + /{type}/retevcfile convention.
const retPathsFor = (t) =>
  WB_RET[t] || {
    save: `/${String(t).toLowerCase()}/retsave`,
    file: `/${String(t).toLowerCase()}/retevcfile`,
  };
// Return types we can BUILD from the books. Everything else must be saved/filed with an
// externally-supplied payload (no local source model for composition/TDS/TCS/IMS/etc.).
const LOCAL_COMPUTE = new Set(['GSTR1', 'GSTR3B']);
const panOf = (gstin) => (gstin && gstin.length >= 12 ? gstin.slice(2, 12) : '');

// GSTN rejects empty optional sections (e.g. hsn:{data:[]}, nil:{inv:[]}, b2b:[]) with a
// "only 1 subschema matches" error, so strip empty arrays/objects before save/file. Keeps
// gstin/fp and any zero-valued numeric rows (those are objects with keys, not empty).
const pruneEmptyGstn = (v) => {
  if (Array.isArray(v)) {
    const arr = v.map(pruneEmptyGstn).filter((x) => x !== undefined);
    return arr.length ? arr : undefined;
  }
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, val] of Object.entries(v)) {
      const pv = pruneEmptyGstn(val);
      if (pv !== undefined) out[k] = pv;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return v;
};

// Our computed payloads carry a few UI-only helper keys (GSTR-3B's total_vouchers / warnings)
// that are NOT in the GSTN schema — GSTN rejects unknown properties, so strip them before
// save/file. GSTR-1's payload is already schema-clean.
const NON_SCHEMA_KEYS = { GSTR3B: ['total_vouchers', 'warnings'] };
const stripNonSchema = (return_type, payload) => {
  if (!payload || typeof payload !== 'object') return payload;
  const drop = NON_SCHEMA_KEYS[return_type];
  if (!drop) return payload;
  const out = { ...payload };
  for (const k of drop) delete out[k];
  return out;
};

// Filing always uses a FRESH computation (generateGSTR1), never the cached gstr1_exports
// snapshot that the report screens read — you must save/file the current books, not stale data.
const compute = (return_type, company_id, fy_id, return_period) =>
  return_type === 'GSTR3B'
    ? gstr3bService.getGSTR3B(company_id, fy_id, return_period)
    : gstr1Service.generateGSTR1(company_id, fy_id, return_period);

const upsertFiling = async (company_id, return_type, return_period, fields) => {
  const existing = await db.all(
    sql`SELECT filing_id FROM ${gstFilings}
        WHERE ${gstFilings.companyId} = ${company_id}
          AND ${gstFilings.returnType} = ${return_type}
          AND ${gstFilings.returnPeriod} = ${return_period}`,
  );
  if (existing.length) {
    await db
      .update(gstFilings)
      .set({ ...fields, updatedAt: sql`datetime('now')` })
      .where(eq(gstFilings.filingId, existing[0].filing_id));
    return existing[0].filing_id;
  }
  const ins = await db
    .insert(gstFilings)
    .values({
      companyId: company_id,
      returnType: return_type,
      returnPeriod: return_period,
      ...fields,
    })
    .returning({ id: gstFilings.filingId });
  return ins?.[0]?.id;
};

const getStatus = async (company_id) => {
  const cfg = getFilingConfig();
  let records = 0;
  try {
    const r = await db.all(
      sql`SELECT COUNT(*) AS n FROM ${gstFilings} WHERE ${gstFilings.companyId} = ${company_id}`,
    );
    records = r[0]?.n || 0;
  } catch (_) {
    /* ignore */
  }
  // Report the provider that actually backs the portal (getPortalProvider prefers Sandbox when
  // its keys are present), so the auth banner reflects the session that OTP/2A/2B/save/file use —
  // not whichever GSP env happens to be present. Otherwise a Sandbox-routed portal would show a
  // stale WhiteBooks session and the user could never see their real login state.
  if (getPortalProvider() === 'sandbox') {
    const st = sbx.getStatus(); // { configured, live, baseUrl, gstin, platformSession, gstSession }
    const sess = sbx.gst.session(); // { active, gstin, username }
    return {
      success: true,
      configured: !!st.configured,
      provider: 'sandbox',
      gstin: st.gstin || null,
      sandbox: !st.live, // test host (test-api.sandbox.co.in) vs production (api.sandbox.co.in)
      gstSession: !!st.gstSession,
      activeGstin: sess.active ? sess.gstin : null,
      records,
    };
  }
  const wbc = getWhitebooksConfig();
  if (wbc) {
    const st = wb.getStatus();
    return {
      success: true,
      configured: !!st.gstReady,
      provider: 'whitebooks',
      gstin: wbc.gst.gstin || null,
      sandbox: st.sandbox,
      gstSession: st.gstSession,
      activeGstin: st.activeGstin || null,
      records,
    };
  }
  return {
    success: true,
    configured: !!cfg,
    gstin: cfg?.gstin || null,
    sandbox: cfg?.sandbox ?? true,
    records,
  };
};

// --- WhiteBooks GSTN session (return filing needs the taxpayer's live OTP) ----------
// Flow: requestOtp -> authenticate(otp) [login session] -> saveToPortal -> requestEvc
//       -> fileReturn(evc_otp). The two OTPs are distinct: login vs EVC-for-filing.

// Send the GSTN login OTP to the chosen registration's registered mobile & e-mail.
// Routes to whichever GSP backs the portal (Sandbox preferred when configured).
const requestOtp = async (company_id, { gstin } = {}) => {
  const provider = getPortalProvider();
  if (!provider) return { success: false, error: 'No GST portal provider configured (.env)' };
  const reg = await resolveReg(company_id, gstin);
  if (reg && reg.error) return { success: false, error: reg.error };
  const r =
    provider === 'sandbox'
      ? await sbx.gst.otpRequest(reg.username, reg.gstin)
      : await wb.gst.otpRequest(reg);
  return r.ok
    ? { success: true, message: 'OTP sent to the registered mobile & e-mail.' }
    : { success: false, error: r.error };
};

// Exchange the login OTP for a GSTN session on the chosen registration.
const authenticate = async (company_id, { gstin, otp } = {}) => {
  const provider = getPortalProvider();
  if (!provider) return { success: false, error: 'No GST portal provider configured (.env)' };
  if (!otp) return { success: false, error: 'OTP is required.' };
  const reg = await resolveReg(company_id, gstin);
  if (reg && reg.error) return { success: false, error: reg.error };
  const r =
    provider === 'sandbox'
      ? await sbx.gst.verifyOtp(String(otp).trim(), reg.username, reg.gstin)
      : await wb.gst.authenticate(reg, String(otp).trim());
  return r.ok ? { success: true } : { success: false, error: r.error };
};

// Request an EVC OTP for the actual filing (separate from the login OTP above).
const requestEvc = async (company_id, { gstin } = {}) => {
  const provider = getPortalProvider();
  if (provider === 'sandbox') {
    const reg = await resolveReg(company_id, gstin);
    const pan = panOf((reg && reg.gstin) || getSandboxConfig()?.gstin || '');
    const r = await sbx.gst.requestEvcOtp(pan);
    return r.ok
      ? { success: true, message: 'EVC OTP sent to the taxpayer’s registered mobile.' }
      : { success: false, error: r.error };
  }
  const wbc = getWhitebooksConfig();
  if (!wbc) return { success: false, error: 'WhiteBooks GST filing not configured (.env)' };
  const r = await wb.gst.request('GET', '/authentication/otpforevc', {
    query: { pan: panOf(wbc.gst.gstin) },
  });
  return r.ok
    ? { success: true, message: 'EVC OTP sent to the taxpayer’s registered mobile.' }
    : { success: false, error: r.error };
};

// Live GSTN-side status of a return period (as opposed to the local gst_filings record).
const getReturnStatus = async (company_id, { return_period, gstin } = {}) => {
  const provider = getPortalProvider();
  if (provider === 'sandbox') {
    // Public track needs no session; filter is optional so we return the whole period set.
    const reg = await resolveReg(company_id, gstin);
    const g = (reg && reg.gstin) || getSandboxConfig()?.gstin || '';
    const startYear =
      Number(String(return_period).slice(2)) -
      (Number(String(return_period).slice(0, 2)) < 4 ? 1 : 0);
    const r = await sbx.getFiledReturns(g, startYear);
    if (!r.ok) return { success: false, error: r.error };
    return { success: true, data: r.byPeriod[String(return_period)] || {} };
  }
  const wbc = getWhitebooksConfig();
  if (!wbc) return { success: false, error: 'WhiteBooks GST filing not configured (.env)' };
  const r = await wb.gst.request('GET', '/gstr/retstatus', {
    query: { gstin: wbc.gst.gstin, returnperiod: return_period },
  });
  return r.ok ? { success: true, data: r.data } : { success: false, error: r.error };
};

// Compute the return locally and store it as a DRAFT (no network).
const prepare = async (company_id, { return_type = 'GSTR1', fy_id, return_period }) => {
  const res = await compute(return_type, company_id, fy_id, return_period);
  if (!res.success) return res;
  const payload = res.payload || res;
  await upsertFiling(company_id, return_type, return_period, {
    status: 'DRAFT',
    summary: JSON.stringify(payload),
    fyId: fy_id,
  });
  return { success: true, return_type, return_period, payload };
};

// Push the computed return to the GSP (save to GSTN — reversible, before filing).
// `payload` (optional) lets the caller save a return we can't build from books (GSTR-9/9C and
// the composition/TDS/TCS/IMS family) by supplying the GSTN JSON directly.
const saveToPortal = async (
  company_id,
  { return_type = 'GSTR1', fy_id, return_period, payload: externalPayload } = {},
) => {
  if (getPortalProvider() === 'sandbox') {
    const sess = sbx.gst.session();
    if (!sess.active) return { success: false, error: 'Authenticate the GST portal (OTP) first.' };
    const gstin = sess.gstin;
    let payload;
    if (externalPayload) payload = pruneEmptyGstn(externalPayload) || { gstin, fp: return_period };
    else if (LOCAL_COMPUTE.has(return_type)) {
      const res = await compute(return_type, company_id, fy_id, return_period);
      if (!res.success) return res;
      payload = pruneEmptyGstn(stripNonSchema(return_type, res.payload || res)) || {
        gstin,
        fp: return_period,
      };
    } else {
      return {
        success: false,
        error: `No local builder for ${return_type} — pass a payload to save it.`,
      };
    }
    const { year, month } = ymOf(return_period);
    const saveFn =
      return_type === 'GSTR3B'
        ? sbx.gst.saveGstr3b
        : return_type === 'GSTR1'
          ? sbx.gst.saveGstr1
          : null;
    if (!saveFn) return { success: false, error: `Sandbox save supports GSTR-1/GSTR-3B only.` };
    const r = await saveFn(year, month, payload);
    const refId = (r.data && (r.data.reference_id || r.data.ref_id)) || null;
    await upsertFiling(company_id, return_type, return_period, {
      status: r.ok ? 'SAVED' : 'ERROR',
      summary: JSON.stringify(payload),
      referenceId: refId,
      rawResponse: JSON.stringify(r.body || r.error),
      fyId: fy_id,
    });
    return r.ok ? { success: true, reference_id: refId } : { success: false, error: r.error };
  }
  const wbc = getWhitebooksConfig();
  if (wbc) {
    let payload;
    if (externalPayload) {
      payload = pruneEmptyGstn(externalPayload) || { gstin: wbc.gst.gstin, fp: return_period };
    } else if (LOCAL_COMPUTE.has(return_type)) {
      const res = await compute(return_type, company_id, fy_id, return_period);
      if (!res.success) return res;
      payload = pruneEmptyGstn(stripNonSchema(return_type, res.payload || res)) || {
        gstin: wbc.gst.gstin,
        fp: return_period,
      };
    } else {
      return {
        success: false,
        error: `No local builder for ${return_type} — pass a payload to save it.`,
      };
    }
    const paths = retPathsFor(return_type);
    const r = await wb.gst.request('PUT', paths.save, {
      headers: { gstin: wbc.gst.gstin, ret_period: return_period },
      body: payload,
    });
    const refId = (r.data && (r.data.reference_id || r.data.ref_id)) || null;
    await upsertFiling(company_id, return_type, return_period, {
      status: r.ok ? 'SAVED' : 'ERROR',
      summary: JSON.stringify(payload),
      referenceId: refId,
      rawResponse: JSON.stringify(r.body || r.error),
      fyId: fy_id,
    });
    return r.ok ? { success: true, reference_id: refId } : { success: false, error: r.error };
  }
  const cfg = getFilingConfig();
  if (!cfg) return { success: false, error: 'GST filing not configured (.env)' };
  const res = await compute(return_type, company_id, fy_id, return_period);
  if (!res.success) return res;
  const payload = res.payload || res;
  const r = await filing.request('POST', `/gsp/gstn/${return_type.toLowerCase()}/save`, {
    gstin: cfg.gstin,
    ret_period: return_period,
    data: payload,
  });
  const refId = r.body?.reference_id || r.body?.ref_id || null;
  await upsertFiling(company_id, return_type, return_period, {
    status: r.ok ? 'SAVED' : 'ERROR',
    summary: JSON.stringify(payload),
    referenceId: refId,
    rawResponse: JSON.stringify(r.body || r.error),
    fyId: fy_id,
  });
  return r.ok ? { success: true, reference_id: refId } : { success: false, error: r.error };
};

// File the return with EVC/OTP (the irreversible commit). Caller must confirm first.
// `payload` (optional) files a caller-supplied return (see saveToPortal).
const fileReturn = async (
  company_id,
  { return_type = 'GSTR1', fy_id, return_period, evc_otp, payload: externalPayload } = {},
) => {
  if (getPortalProvider() === 'sandbox') {
    if (!evc_otp) return { success: false, error: 'EVC OTP is required to file.' };
    const sess = sbx.gst.session();
    if (!sess.active) return { success: false, error: 'Authenticate the GST portal (OTP) first.' };
    const gstin = sess.gstin;
    let payload;
    if (externalPayload) payload = pruneEmptyGstn(externalPayload) || { gstin, fp: return_period };
    else if (LOCAL_COMPUTE.has(return_type)) {
      const res = await compute(return_type, company_id, fy_id, return_period);
      if (!res.success) return res;
      payload = pruneEmptyGstn(stripNonSchema(return_type, res.payload || res)) || {
        gstin,
        fp: return_period,
      };
    } else {
      return {
        success: false,
        error: `No local builder for ${return_type} — pass a payload to file it.`,
      };
    }
    const { year, month } = ymOf(return_period);
    const fileFn =
      return_type === 'GSTR3B'
        ? sbx.gst.fileGstr3b
        : return_type === 'GSTR1'
          ? sbx.gst.fileGstr1
          : null;
    if (!fileFn) return { success: false, error: `Sandbox file supports GSTR-1/GSTR-3B only.` };
    const r = await fileFn(
      year,
      month,
      { pan: panOf(gstin), otp: String(evc_otp).trim() },
      payload,
    );
    if (!r.ok) {
      await upsertFiling(company_id, return_type, return_period, {
        status: 'ERROR',
        rawResponse: JSON.stringify(r.body || r.error),
      });
      return { success: false, error: r.error };
    }
    const arn = (r.data && (r.data.arn || r.data.ARN)) || null;
    await upsertFiling(company_id, return_type, return_period, {
      status: 'FILED',
      arn,
      rawResponse: JSON.stringify(r.body || r.data),
      fyId: fy_id,
    });
    return { success: true, arn };
  }
  const wbc = getWhitebooksConfig();
  if (wbc) {
    if (!evc_otp) return { success: false, error: 'EVC OTP is required to file.' };
    let payload;
    if (externalPayload) {
      payload = pruneEmptyGstn(externalPayload) || { gstin: wbc.gst.gstin, fp: return_period };
    } else if (LOCAL_COMPUTE.has(return_type)) {
      const res = await compute(return_type, company_id, fy_id, return_period);
      if (!res.success) return res;
      payload = pruneEmptyGstn(stripNonSchema(return_type, res.payload || res)) || {
        gstin: wbc.gst.gstin,
        fp: return_period,
      };
    } else {
      return {
        success: false,
        error: `No local builder for ${return_type} — pass a payload to file it.`,
      };
    }
    const paths = retPathsFor(return_type);
    const r = await wb.gst.request('POST', paths.file, {
      query: { pan: panOf(wbc.gst.gstin), evcotp: String(evc_otp).trim() },
      headers: { gstin: wbc.gst.gstin, ret_period: return_period },
      body: payload,
    });
    if (!r.ok) {
      await upsertFiling(company_id, return_type, return_period, {
        status: 'ERROR',
        rawResponse: JSON.stringify(r.body || r.error),
      });
      return { success: false, error: r.error };
    }
    const arn = (r.data && (r.data.arn || r.data.ARN)) || null;
    await upsertFiling(company_id, return_type, return_period, {
      status: 'FILED',
      arn,
      filedAt: sql`datetime('now')`,
      rawResponse: JSON.stringify(r.body),
    });
    return { success: true, arn };
  }
  const cfg = getFilingConfig();
  if (!cfg) return { success: false, error: 'GST filing not configured (.env)' };
  const r = await filing.request('POST', `/gsp/gstn/${return_type.toLowerCase()}/file`, {
    gstin: cfg.gstin,
    ret_period: return_period,
    evc: evc_otp,
  });
  if (!r.ok) {
    await upsertFiling(company_id, return_type, return_period, {
      status: 'ERROR',
      rawResponse: JSON.stringify(r.body || r.error),
    });
    return { success: false, error: r.error };
  }
  const arn = r.body?.arn || r.body?.ARN || null;
  await upsertFiling(company_id, return_type, return_period, {
    status: 'FILED',
    arn,
    filedAt: sql`datetime('now')`,
    rawResponse: JSON.stringify(r.body),
  });
  return { success: true, arn };
};

const getFilings = async (company_id) => {
  try {
    const rows = await db.all(
      sql`SELECT filing_id, company_id, fy_id, return_type, return_period, status, arn, reference_id, filed_at, created_at, updated_at
          FROM ${gstFilings} WHERE ${gstFilings.companyId} = ${company_id} ORDER BY ${gstFilings.updatedAt} DESC`,
    );
    return { success: true, filings: rows };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// Manual "Mark as Filed" (Tally F10) — records the return as FILED in gst_filings
// without any GSP round-trip. Track GST Return Activities reads this same table,
// so marking here flips that dashboard's "Pending to Be Filed" to No.
const markAsFiled = async (
  company_id,
  { return_type = 'GSTR1', fy_id, return_period, arn = null, filed_date = null },
) => {
  try {
    const fields = {
      status: 'FILED',
      fyId: fy_id ?? null,
      arn: arn || null,
      filedAt: filed_date || new Date().toISOString().slice(0, 10),
    };
    const id = await upsertFiling(company_id, return_type, return_period, fields);
    return {
      success: true,
      filing_id: id,
      status: 'FILED',
      arn: fields.arn,
      filed_at: fields.filedAt,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// Update only the ARN/ARN-date of an existing (or new) filing record ("A: Manually Update ARN").
const updateArn = async (
  company_id,
  { return_type = 'GSTR1', fy_id, return_period, arn, arn_date = null },
) => {
  try {
    const id = await upsertFiling(company_id, return_type, return_period, {
      fyId: fy_id ?? null,
      arn: arn || null,
      ...(arn_date ? { filedAt: arn_date } : {}),
    });
    return { success: true, filing_id: id, arn: arn || null };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// Filing status of one return period — drives the Status / ARN / ARN Date header lines.
const getFilingInfo = async (company_id, { return_type = 'GSTR1', return_period }) => {
  try {
    const rows = await db.all(
      sql`SELECT status, arn, filed_at FROM ${gstFilings}
          WHERE ${gstFilings.companyId} = ${company_id}
            AND ${gstFilings.returnType} = ${return_type}
            AND ${gstFilings.returnPeriod} = ${return_period}
          ORDER BY ${gstFilings.filingId} DESC LIMIT 1`,
    );
    const row = rows[0];
    return {
      success: true,
      status: row?.status === 'FILED' ? 'Filed' : 'Not Filed',
      arn: row?.arn || null,
      filed_at: row?.filed_at || null,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = {
  getStatus,
  prepare,
  saveToPortal,
  fileReturn,
  getFilings,
  markAsFiled,
  updateArn,
  getFilingInfo,
  requestOtp,
  authenticate,
  requestEvc,
  getReturnStatus,
};
