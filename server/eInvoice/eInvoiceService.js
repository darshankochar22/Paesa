const https = require('https');
const { db } = require('../db/index');
const { sql, eq } = require('drizzle-orm');
const { einvoiceRecords, einvoiceCredentials } = require('../db/schema');

const SANDBOX_HOST = 'einv-apisandbox.nic.in';

const request = (method, path, headers = {}, body = null) =>
  new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: SANDBOX_HOST,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...headers,
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });

const post = (path, body, headers) => request('POST', path, headers, body);
const get  = (path, headers)       => request('GET',  path, headers);

let _cache = null;

const isTokenValid = () =>
  _cache && new Date() < new Date(_cache.expiry);

const getCache = () => _cache;

const authHeaders = (creds) => ({
  'client_id':     creds.client_id,
  'client_secret': creds.client_secret,
  'Gstin':         creds.gstin,
  'user_name':     creds.username,
  'authtoken':     _cache?.token || '',
});

const authenticate = async (creds) => {
  try {
    const res = await post(
      '/eivital/v1.04/dec/authenticate',
      {
        UserName: creds.username,
        Password: creds.password,
        AppKey:   creds.app_key,
        ForceRefreshAccessToken: false,
      },
      {
        'client_id':     creds.client_id,
        'client_secret': creds.client_secret,
        'Gstin':         creds.gstin,
      }
    );

    if (res.body?.Status === '1') {
      const d = res.body.Data;
      _cache = {
        token:  d.AuthToken,
        sek:    d.Sek,
        expiry: d.TokenExpiry,
      };
      return { success: true, token: _cache.token };
    }

    return {
      success: false,
      error: res.body?.ErrorDetails?.[0]?.ErrorMessage || 'Authentication failed',
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const ensureAuth = async (creds) => {
  if (isTokenValid()) return { success: true };
  return await authenticate(creds);
};

const getGSTINDetails = async (gstin, creds) => {
  try {
    const auth = await ensureAuth(creds);
    if (!auth.success) return auth;

    const res = await get(
      `/eivital/v1.04/Master/gstin/${gstin}`,
      authHeaders(creds)
    );

    if (res.body?.Status === '1') return { success: true, data: res.body.Data };
    return {
      success: false,
      error: res.body?.ErrorDetails?.[0]?.ErrorMessage || 'Failed to fetch GSTIN details',
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const generateIRN = async (company_id, voucher_id, invoice_payload, creds) => {
  try {
    const auth = await ensureAuth(creds);
    if (!auth.success) return auth;

    const res = await post(
      '/eicore/v1.03/Invoice',
      invoice_payload,
      authHeaders(creds)
    );

    if (res.body?.Status === '1') {
      const d = res.body.Data;

      // Save to DB
      await db
        .insert(einvoiceRecords)
        .values({
          companyId: company_id,
          voucherId: voucher_id || null,
          invoiceNumber: invoice_payload.DocDtls?.No,
          invoiceDate: invoice_payload.DocDtls?.Dt,
          buyerGstin: invoice_payload.BuyerDtls?.Gstin,
          irn: d.Irn,
          ackNo: d.AckNo,
          ackDt: d.AckDt,
          signedInvoice: d.SignedInvoice,
          signedQrCode: d.SignedQRCode,
          ewbNo: d.EwbNo || null,
          ewbDt: d.EwbDt || null,
          status: 'GENERATED',
          rawResponse: JSON.stringify(res.body),
        });

      return { success: true, data: d };
    }

    return {
      success: false,
      error: res.body?.ErrorDetails?.[0]?.ErrorMessage || 'IRN generation failed',
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};


const getIRNDetails = async (irn, creds) => {
  try {
    const auth = await ensureAuth(creds);
    if (!auth.success) return auth;

    const res = await get(`/eicore/v1.03/Invoice/irn/${irn}`, authHeaders(creds));

    if (res.body?.Status === '1') return { success: true, data: res.body.Data };
    return {
      success: false,
      error: res.body?.ErrorDetails?.[0]?.ErrorMessage || 'Failed to fetch IRN details',
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const cancelIRN = async (irn, cancel_reason, cancel_remarks, creds) => {
  try {
    const auth = await ensureAuth(creds);
    if (!auth.success) return auth;

    const res = await post(
      '/eicore/v1.03/Invoice/Cancel',
      { Irn: irn, CnlRsn: cancel_reason, CnlRem: cancel_remarks },
      authHeaders(creds)
    );

    if (res.body?.Status === '1') {
      await db
        .update(einvoiceRecords)
        .set({
          status: 'CANCELLED',
          cancelReason: cancel_reason,
          cancelRemarks: cancel_remarks,
          cancelledAt: sql`datetime('now')`,
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(einvoiceRecords.irn, irn));
      return { success: true, data: res.body.Data };
    }

    return {
      success: false,
      error: res.body?.ErrorDetails?.[0]?.ErrorMessage || 'IRN cancellation failed',
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const saveCredentials = async (data) => {
  try {
    const existing = await db.all(
      sql`SELECT * FROM ${einvoiceCredentials}
          WHERE ${einvoiceCredentials.companyId} = ${data.company_id}`
    );

    if (existing.length > 0) {
      await db
        .update(einvoiceCredentials)
        .set({
          clientId: data.client_id,
          clientSecret: data.client_secret,
          username: data.username,
          password: data.password,
          appKey: data.app_key,
          isSandbox: data.is_sandbox ?? 1,
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(einvoiceCredentials.companyId, data.company_id));
    } else {
      await db
        .insert(einvoiceCredentials)
        .values({
          companyId: data.company_id,
          clientId: data.client_id,
          clientSecret: data.client_secret,
          username: data.username,
          password: data.password,
          appKey: data.app_key,
          isSandbox: data.is_sandbox ?? 1,
        });
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const getCredentials = async (company_id) => {
  try {
    const rows = await db.all(
      sql`SELECT * FROM ${einvoiceCredentials}
          WHERE ${einvoiceCredentials.companyId} = ${company_id}`
    );
    if (rows.length === 0) return { success: false, error: 'No credentials found' };
    return { success: true, credentials: rows[0] };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const getRecords = async (company_id) => {
  try {
    const rows = await db.all(
      sql`SELECT * FROM ${einvoiceRecords}
          WHERE ${einvoiceRecords.companyId} = ${company_id}
          ORDER BY ${einvoiceRecords.createdAt} DESC`
    );
    return { success: true, records: rows };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const getRecordByIRN = async (irn) => {
  try {
    const rows = await db.all(
      sql`SELECT * FROM ${einvoiceRecords}
          WHERE ${einvoiceRecords.irn} = ${irn}`
    );
    if (rows.length === 0) return { success: false, error: 'Record not found' };
    return { success: true, record: rows[0] };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = {
  authenticate,
  getGSTINDetails,
  generateIRN,
  getIRNDetails,
  cancelIRN,
  saveCredentials,
  getCredentials,
  getRecords,
  getRecordByIRN,
  isTokenValid,
  getCache,
};