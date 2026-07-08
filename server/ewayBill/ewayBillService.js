// e-Way Bill service. Generates the EWB from a voucher's existing IRN via the NIC IRP
// (shared nicClient; credentials are developer-side via .env). Persists to ewaybill_records.

const { db } = require('../db/index');
const { sql, eq } = require('drizzle-orm');
const { ewaybillRecords, einvoiceRecords } = require('../db/schema');
const nic = require('../integrations/nicClient');
const wb = require('../integrations/whitebooksClient');
const { getGspConfig, getWhitebooksConfig } = require('../integrations/gspConfig');

const EWB = () => getGspConfig()?.ewaybillBaseUrl || 'einv-apisandbox.nic.in';

const getStatus = async (company_id) => {
  const st = getWhitebooksConfig() ? wb.getStatus() : nic.getStatus();
  let records = 0;
  try {
    const r = await db.all(
      sql`SELECT COUNT(*) AS n FROM ${ewaybillRecords} WHERE ${ewaybillRecords.companyId} = ${company_id}`,
    );
    records = r[0]?.n || 0;
  } catch (_) {
    /* ignore */
  }
  return { success: true, ...st, records };
};

// transport: { distance, trans_mode (1 Road/2 Rail/3 Air/4 Ship), trans_id, trans_name,
//              trans_doc_no, trans_doc_dt, veh_no, veh_type (R/O) }
const generateByIrn = async (company_id, voucher_id, irn, transport = {}) => {
  const body = {
    Irn: irn,
    Distance: Number(transport.distance) || 0,
    TransMode: String(transport.trans_mode || '1'),
    TransId: transport.trans_id || undefined,
    TransName: transport.trans_name || undefined,
    TransDocNo: transport.trans_doc_no || undefined,
    TransDocDt: transport.trans_doc_dt || undefined,
    VehNo: transport.veh_no || undefined,
    VehType: transport.veh_type || undefined,
  };
  // WhiteBooks generates the EWB from an existing IRN via its e-Invoice product endpoint.
  let r, d;
  if (getWhitebooksConfig()) {
    r = await wb.einv.request('POST', '/einvoice/type/GENERATE_EWAYBILL/version/V1_03', body);
    if (!r.ok) return { success: false, error: r.error };
    d = r.data || {};
  } else {
    r = await nic.authedRequest(EWB(), 'POST', '/eiewb/v1.03/ewaybill', body);
    if (!r.ok) return { success: false, error: r.error };
    d = r.body.Data || {};
  }
  try {
    await db.insert(ewaybillRecords).values({
      companyId: company_id,
      voucherId: voucher_id || null,
      irn,
      ewbNo: String(d.EwbNo || ''),
      ewbDate: d.EwbDt || null,
      validUpto: d.EwbValidTill || null,
      transMode: String(transport.trans_mode || ''),
      vehNo: transport.veh_no || null,
      distance: Number(transport.distance) || 0,
      status: 'GENERATED',
      rawResponse: JSON.stringify(r.body),
    });
  } catch (_) {
    /* best-effort */
  }
  return { success: true, data: d };
};

// Look up the voucher's IRN, then generate the EWB against it.
const generateFromVoucher = async (company_id, voucher_id, transport) => {
  try {
    const rows = await db.all(
      sql`SELECT irn FROM ${einvoiceRecords}
          WHERE ${einvoiceRecords.voucherId} = ${voucher_id} AND ${einvoiceRecords.status} = 'GENERATED'
          ORDER BY ${einvoiceRecords.createdAt} DESC LIMIT 1`,
    );
    const irn = rows[0]?.irn;
    if (!irn)
      return { success: false, error: 'Generate the e-Invoice (IRN) first, then the e-Way Bill.' };
    return await generateByIrn(company_id, voucher_id, irn, transport);
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const cancel = async (ewbNo, cancel_reason, cancel_remarks) => {
  const isWb = !!getWhitebooksConfig();
  const cancelBody = {
    ewbNo: Number(ewbNo),
    cancelRsnCode: Number(cancel_reason) || 2,
    cancelRmrk: cancel_remarks || 'Cancelled',
  };
  const r = isWb
    ? await wb.eway.request('POST', '/ewaybillapi/v1.03/ewayapi/canewb', cancelBody)
    : await nic.authedRequest(EWB(), 'POST', '/eiewb/v1.03/ewaybill/cancel', cancelBody);
  if (!r.ok) return { success: false, error: r.error };
  try {
    await db
      .update(ewaybillRecords)
      .set({
        status: 'CANCELLED',
        cancelReason: String(cancel_reason),
        cancelRemarks: cancel_remarks,
        cancelledAt: sql`datetime('now')`,
        updatedAt: sql`datetime('now')`,
      })
      .where(eq(ewaybillRecords.ewbNo, String(ewbNo)));
  } catch (_) {
    /* best-effort */
  }
  return { success: true, data: isWb ? r.data : r.body.Data };
};

const get = async (ewbNo) => {
  const isWb = !!getWhitebooksConfig();
  const r = isWb
    ? await wb.eway.request(
        'GET',
        '/ewaybillapi/v1.03/ewayapi/getewaybill',
        null,
        `&ewbNo=${encodeURIComponent(ewbNo)}`,
      )
    : await nic.authedRequest(EWB(), 'GET', `/eiewb/v1.03/ewaybill?ewbNo=${ewbNo}`);
  return r.ok
    ? { success: true, data: isWb ? r.data : r.body.Data }
    : { success: false, error: r.error };
};

const getRecords = async (company_id) => {
  try {
    const rows = await db.all(
      sql`SELECT * FROM ${ewaybillRecords} WHERE ${ewaybillRecords.companyId} = ${company_id} ORDER BY ${ewaybillRecords.createdAt} DESC`,
    );
    return { success: true, records: rows };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = { getStatus, generateByIrn, generateFromVoucher, cancel, get, getRecords };
