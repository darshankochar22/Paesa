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
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });

const post = (path, body, headers) => request('POST', path, headers, body);
const get = (path, headers) => request('GET', path, headers);

let _cache = null;

const isTokenValid = () => _cache && new Date() < new Date(_cache.expiry);

const getCache = () => _cache;

const authHeaders = (creds) => ({
  client_id: creds.client_id,
  client_secret: creds.client_secret,
  Gstin: creds.gstin,
  user_name: creds.username,
  authtoken: _cache?.token || '',
});

const authenticate = async (creds) => {
  try {
    const res = await post(
      '/eivital/v1.04/dec/authenticate',
      {
        UserName: creds.username,
        Password: creds.password,
        AppKey: creds.app_key,
        ForceRefreshAccessToken: false,
      },
      {
        client_id: creds.client_id,
        client_secret: creds.client_secret,
        Gstin: creds.gstin,
      },
    );

    if (res.body?.Status === '1') {
      const d = res.body.Data;
      _cache = {
        token: d.AuthToken,
        sek: d.Sek,
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
    if (getWhitebooksConfig()) {
      const r = await wb.einv.request(
        'GET',
        WB_EINV.GSTNDETAILS,
        null,
        `&param1=${encodeURIComponent(gstin)}`,
      );
      return r.ok ? { success: true, data: r.data } : { success: false, error: r.error };
    }
    const auth = await ensureAuth(creds);
    if (!auth.success) return auth;

    const res = await get(`/eivital/v1.04/Master/gstin/${gstin}`, authHeaders(creds));

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

    const res = await post('/eicore/v1.03/Invoice', invoice_payload, authHeaders(creds));

    if (res.body?.Status === '1') {
      const d = res.body.Data;

      // Save to DB
      await db.insert(einvoiceRecords).values({
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
    if (getWhitebooksConfig()) {
      const r = await wb.einv.request(
        'GET',
        WB_EINV.GETIRN,
        null,
        `&param1=${encodeURIComponent(irn)}`,
      );
      return r.ok ? { success: true, data: r.data } : { success: false, error: r.error };
    }
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

const markCancelled = (irn, cancel_reason, cancel_remarks) =>
  db
    .update(einvoiceRecords)
    .set({
      status: 'CANCELLED',
      cancelReason: cancel_reason,
      cancelRemarks: cancel_remarks,
      cancelledAt: sql`datetime('now')`,
      updatedAt: sql`datetime('now')`,
    })
    .where(eq(einvoiceRecords.irn, irn));

const cancelIRN = async (irn, cancel_reason, cancel_remarks, creds) => {
  try {
    if (getWhitebooksConfig()) {
      const r = await wb.einv.request('POST', WB_EINV.CANCEL, {
        Irn: irn,
        CnlRsn: String(cancel_reason),
        CnlRem: cancel_remarks,
      });
      if (!r.ok) return { success: false, error: r.error };
      try {
        await markCancelled(irn, cancel_reason, cancel_remarks);
      } catch (_) {
        /* best-effort */
      }
      return { success: true, data: r.data };
    }
    const auth = await ensureAuth(creds);
    if (!auth.success) return auth;

    const res = await post(
      '/eicore/v1.03/Invoice/Cancel',
      { Irn: irn, CnlRsn: cancel_reason, CnlRem: cancel_remarks },
      authHeaders(creds),
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
          WHERE ${einvoiceCredentials.companyId} = ${data.company_id}`,
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
      await db.insert(einvoiceCredentials).values({
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
          WHERE ${einvoiceCredentials.companyId} = ${company_id}`,
    );
    if (rows.length === 0) return { success: false, error: 'No credentials found' };
    return { success: true, credentials: rows[0] };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const getRecords = async (company_id) => {
  try {
    // Join the voucher + party so the IRN Register shows a real Date + Party (neither is
    // stored on einvoice_records itself).
    const rows = await db.all(
      sql`SELECT er.*, v.date AS date, v.voucher_number AS voucher_number,
                 COALESCE(l.name, v.party_name) AS party_name
          FROM einvoice_records er
          LEFT JOIN vouchers v ON v.voucher_id = er.voucher_id
          LEFT JOIN ledgers l ON l.ledger_id = v.party_ledger_id
          WHERE er.company_id = ${company_id}
          ORDER BY er.created_at DESC`,
    );
    return { success: true, records: rows };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// Latest e-Invoice record for one voucher — drives the IRN/QR block on the voucher view.
const getByVoucher = async (voucher_id) => {
  try {
    const rows = await db.all(
      sql`SELECT * FROM einvoice_records WHERE voucher_id = ${voucher_id}
          ORDER BY irn_id DESC LIMIT 1`,
    );
    if (rows.length === 0) return { success: false, error: 'No e-Invoice for this voucher' };
    return { success: true, record: rows[0] };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const getRecordByIRN = async (irn) => {
  try {
    const rows = await db.all(
      sql`SELECT * FROM ${einvoiceRecords}
          WHERE ${einvoiceRecords.irn} = ${irn}`,
    );
    if (rows.length === 0) return { success: false, error: 'Record not found' };
    return { success: true, record: rows[0] };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ---- developer-side (.env) path via the shared NIC client -------------------------
// Mirrors ewayBillService: credentials come from gspConfig/.env, never the renderer.

const nic = require('../integrations/nicClient');
const wb = require('../integrations/whitebooksClient');
const { getGspConfig, getWhitebooksConfig } = require('../integrations/gspConfig');
const { buildIrnPayload } = require('./eInvoicePayload');

// WhiteBooks e-Invoice endpoints (plain JSON; auth handled by whitebooksClient).
const WB_EINV = {
  GENERATE: '/einvoice/type/GENERATE/version/V1_03',
  CANCEL: '/einvoice/type/CANCEL/version/V1_03',
  GETIRN: '/einvoice/type/GETIRN/version/V1_03',
  GETIRNBYDOCDETAILS: '/einvoice/type/GETIRNBYDOCDETAILS/version/V1_03',
  GSTNDETAILS: '/einvoice/type/GSTNDETAILS/version/V1_03',
};

const EINV = () => getGspConfig()?.einvoiceBaseUrl || SANDBOX_HOST;

// Renderer-safe status (no secret) + how many IRNs exist for this company.
const getStatus = async (company_id) => {
  const st = getWhitebooksConfig() ? wb.getStatus() : nic.getStatus();
  let records = 0;
  try {
    const r = await db.all(
      sql`SELECT COUNT(*) AS n FROM ${einvoiceRecords} WHERE ${einvoiceRecords.companyId} = ${company_id}`,
    );
    records = r[0]?.n || 0;
  } catch (_) {
    /* ignore */
  }
  return { success: true, ...st, records };
};

// Build the IRN payload straight from the voucher in books and push it to the IRP.
const generateFromVoucher = async (company_id, voucher_id) => {
  try {
    const vRows = await db.all(
      sql`SELECT v.*, l.name AS party_name, l.gstin AS party_gstin, l.state AS party_state,
                 l.address1 AS party_address, l.pincode AS party_pincode
          FROM vouchers v
          LEFT JOIN ledgers l ON l.ledger_id = v.party_ledger_id
          WHERE v.voucher_id = ${voucher_id} AND v.company_id = ${company_id}`,
    );
    if (vRows.length === 0) return { success: false, error: 'Voucher not found' };
    const voucher = vRows[0];

    voucher.stock_entries = await db.all(
      sql`SELECT * FROM voucher_stock_entries WHERE voucher_id = ${voucher_id}`,
    );
    if (voucher.stock_entries.length === 0) {
      return {
        success: false,
        error: 'Voucher has no stock items — an e-Invoice needs at least one line item.',
      };
    }

    // Credit/Debit notes must carry the original invoice reference (NIC PrecDocDtls).
    if (voucher.voucher_type === 'Credit Note' || voucher.voucher_type === 'Debit Note') {
      const table =
        voucher.voucher_type === 'Credit Note'
          ? 'voucher_credit_note_details'
          : 'voucher_debit_note_details';
      const ndRows = await db.all(
        table === 'voucher_credit_note_details'
          ? sql`SELECT original_invoice_no AS no, original_invoice_date AS dt FROM voucher_credit_note_details WHERE voucher_id = ${voucher_id} LIMIT 1`
          : sql`SELECT original_invoice_no AS no, original_invoice_date AS dt FROM voucher_debit_note_details WHERE voucher_id = ${voucher_id} LIMIT 1`,
      );
      const nd = ndRows[0] || {};
      if (!nd.no || !nd.dt) {
        return {
          success: false,
          error:
            'Enter the original invoice number & date on this note before generating the e-Invoice (required for Credit/Debit Note IRN).',
        };
      }
      voucher.orig_invoice_no = nd.no;
      voucher.orig_invoice_date = nd.dt;
    }

    const compRows = await db.all(sql`SELECT * FROM companies WHERE company_id = ${company_id}`);
    const company = compRows[0] || {};
    const regRows = await db.all(
      sql`SELECT * FROM gst_registrations WHERE company_id = ${company_id} AND is_active = 1 LIMIT 1`,
    );
    const reg = regRows[0] || {};

    const seller = {
      gstin: reg.gstin || getGspConfig()?.gstin || '',
      name: company.mailing_name || company.name || '',
      addr: company.address1 || 'NA',
      loc: company.state || 'NA',
      pin: company.pincode || '',
      state: company.state || reg.state_id || '',
    };
    const buyer = {
      gstin: voucher.party_gstin || '',
      name: voucher.party_name || '',
      addr: voucher.party_address || 'NA',
      loc: voucher.party_state || 'NA',
      pin: voucher.party_pincode || '',
      state: voucher.party_state || '',
    };

    const payload = buildIrnPayload(voucher, seller, buyer);
    let r, d;
    if (getWhitebooksConfig()) {
      // NIC sandbox intermittently returns 5001/5002 ("application error, please try
      // again"); retry those transient failures a couple of times before surfacing.
      for (let attempt = 0; attempt < 3; attempt++) {
        r = await wb.einv.request('POST', WB_EINV.GENERATE, payload);
        if (r.ok || !/500[12]/.test(String(r.error || ''))) break;
      }
      // Already registered (invoice re-submitted): recover the existing IRN by doc details
      // and treat it as success rather than surfacing a scary "Duplicate IRN".
      if (!r.ok && /2150|Duplicate IRN/i.test(String(r.error || ''))) {
        const dup = await wb.einv.request(
          'GET',
          WB_EINV.GETIRNBYDOCDETAILS,
          null,
          `&param1=${payload.DocDtls.Typ}&supplier_gstn=${encodeURIComponent(payload.SellerDtls.Gstin)}`,
          { docnum: String(payload.DocDtls.No), docdate: payload.DocDtls.Dt },
        );
        if (dup.ok && dup.data && dup.data.Irn) {
          r = dup;
        } else {
          return { success: false, error: 'This invoice already has an IRN (generated earlier).' };
        }
      }
      if (!r.ok) return { success: false, error: r.error };
      d = r.data || {};
    } else {
      r = await nic.authedRequest(EINV(), 'POST', '/eicore/v1.03/Invoice', payload);
      if (!r.ok) return { success: false, error: r.error };
      d = r.body.Data || {};
    }
    try {
      await db.insert(einvoiceRecords).values({
        companyId: company_id,
        voucherId: voucher_id,
        invoiceNumber: payload.DocDtls?.No,
        invoiceDate: payload.DocDtls?.Dt,
        buyerGstin: payload.BuyerDtls?.Gstin,
        irn: d.Irn,
        ackNo: d.AckNo,
        ackDt: d.AckDt,
        signedInvoice: d.SignedInvoice,
        signedQrCode: d.SignedQRCode,
        ewbNo: d.EwbNo || null,
        ewbDt: d.EwbDt || null,
        status: 'GENERATED',
        rawResponse: JSON.stringify(r.body),
      });
    } catch (_) {
      /* best-effort persist */
    }

    return { success: true, data: d };
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
  getByVoucher,
  getRecordByIRN,
  isTokenValid,
  getCache,
  getStatus,
  generateFromVoucher,
};
