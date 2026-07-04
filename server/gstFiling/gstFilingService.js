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
const { getFilingConfig } = require('../integrations/gspConfig');
const gstr1Service = require('../gst/gstr1Service');
const gstr3bService = require('../gst/gstr3bService');

const compute = (return_type, company_id, fy_id, return_period) =>
  return_type === 'GSTR3B'
    ? gstr3bService.getGSTR3B(company_id, fy_id, return_period)
    : gstr1Service.getGSTR1(company_id, fy_id, return_period);

const upsertFiling = async (company_id, return_type, return_period, fields) => {
  const existing = await db.all(
    sql`SELECT filing_id FROM ${gstFilings}
        WHERE ${gstFilings.companyId} = ${company_id}
          AND ${gstFilings.returnType} = ${return_type}
          AND ${gstFilings.returnPeriod} = ${return_period}`
  );
  if (existing.length) {
    await db.update(gstFilings).set({ ...fields, updatedAt: sql`datetime('now')` })
      .where(eq(gstFilings.filingId, existing[0].filing_id));
    return existing[0].filing_id;
  }
  const ins = await db.insert(gstFilings)
    .values({ companyId: company_id, returnType: return_type, returnPeriod: return_period, ...fields })
    .returning({ id: gstFilings.filingId });
  return ins?.[0]?.id;
};

const getStatus = async (company_id) => {
  const cfg = getFilingConfig();
  let records = 0;
  try {
    const r = await db.all(sql`SELECT COUNT(*) AS n FROM ${gstFilings} WHERE ${gstFilings.companyId} = ${company_id}`);
    records = r[0]?.n || 0;
  } catch (_) { /* ignore */ }
  return { success: true, configured: !!cfg, gstin: cfg?.gstin || null, sandbox: cfg?.sandbox ?? true, records };
};

// Compute the return locally and store it as a DRAFT (no network).
const prepare = async (company_id, { return_type = 'GSTR1', fy_id, return_period }) => {
  const res = await compute(return_type, company_id, fy_id, return_period);
  if (!res.success) return res;
  const payload = res.payload || res;
  await upsertFiling(company_id, return_type, return_period, { status: 'DRAFT', summary: JSON.stringify(payload), fyId: fy_id });
  return { success: true, return_type, return_period, payload };
};

// Push the computed return to the GSP (save to GSTN — reversible, before filing).
const saveToPortal = async (company_id, { return_type = 'GSTR1', fy_id, return_period }) => {
  const cfg = getFilingConfig();
  if (!cfg) return { success: false, error: 'GST filing not configured (.env)' };
  const res = await compute(return_type, company_id, fy_id, return_period);
  if (!res.success) return res;
  const payload = res.payload || res;
  const r = await filing.request('POST', `/gsp/gstn/${return_type.toLowerCase()}/save`, {
    gstin: cfg.gstin, ret_period: return_period, data: payload,
  });
  const refId = r.body?.reference_id || r.body?.ref_id || null;
  await upsertFiling(company_id, return_type, return_period, {
    status: r.ok ? 'SAVED' : 'ERROR', summary: JSON.stringify(payload),
    referenceId: refId, rawResponse: JSON.stringify(r.body || r.error), fyId: fy_id,
  });
  return r.ok ? { success: true, reference_id: refId } : { success: false, error: r.error };
};

// File the return with EVC/OTP (the irreversible commit). Caller must confirm first.
const fileReturn = async (company_id, { return_type = 'GSTR1', return_period, evc_otp }) => {
  const cfg = getFilingConfig();
  if (!cfg) return { success: false, error: 'GST filing not configured (.env)' };
  const r = await filing.request('POST', `/gsp/gstn/${return_type.toLowerCase()}/file`, {
    gstin: cfg.gstin, ret_period: return_period, evc: evc_otp,
  });
  if (!r.ok) {
    await upsertFiling(company_id, return_type, return_period, { status: 'ERROR', rawResponse: JSON.stringify(r.body || r.error) });
    return { success: false, error: r.error };
  }
  const arn = r.body?.arn || r.body?.ARN || null;
  await upsertFiling(company_id, return_type, return_period, { status: 'FILED', arn, filedAt: sql`datetime('now')`, rawResponse: JSON.stringify(r.body) });
  return { success: true, arn };
};

const getFilings = async (company_id) => {
  try {
    const rows = await db.all(
      sql`SELECT filing_id, company_id, fy_id, return_type, return_period, status, arn, reference_id, filed_at, created_at, updated_at
          FROM ${gstFilings} WHERE ${gstFilings.companyId} = ${company_id} ORDER BY ${gstFilings.updatedAt} DESC`
    );
    return { success: true, filings: rows };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// Manual "Mark as Filed" (Tally F10) — records the return as FILED in gst_filings
// without any GSP round-trip. Track GST Return Activities reads this same table,
// so marking here flips that dashboard's "Pending to Be Filed" to No.
const markAsFiled = async (company_id, { return_type = 'GSTR1', fy_id, return_period, arn = null, filed_date = null }) => {
  try {
    const fields = {
      status: 'FILED',
      fyId: fy_id ?? null,
      arn: arn || null,
      filedAt: filed_date || new Date().toISOString().slice(0, 10),
    };
    const id = await upsertFiling(company_id, return_type, return_period, fields);
    return { success: true, filing_id: id, status: 'FILED', arn: fields.arn, filed_at: fields.filedAt };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// Update only the ARN/ARN-date of an existing (or new) filing record ("A: Manually Update ARN").
const updateArn = async (company_id, { return_type = 'GSTR1', fy_id, return_period, arn, arn_date = null }) => {
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
          ORDER BY ${gstFilings.filingId} DESC LIMIT 1`
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

module.exports = { getStatus, prepare, saveToPortal, fileReturn, getFilings, markAsFiled, updateArn, getFilingInfo };
