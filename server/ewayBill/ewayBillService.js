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
  const transMode = String(transport.trans_mode || '1');
  // NIC requires VehType when the mode is Road (1) — default to Regular ('R') if the caller
  // didn't supply one, so Road e-Way Bills never fail with "vehicle type should be passed".
  const vehType = transport.veh_type || (transMode === '1' ? 'R' : undefined);
  // Transporter ID must be a 15-char GSTIN-format value; a stray/partial one makes NIC reject
  // the whole request. Only send it when valid — NIC allows omitting it when a vehicle no. is
  // given (Part-B by vehicle).
  const transId =
    transport.trans_id && /^[0-9]{2}[0-9A-Z]{13}$/.test(String(transport.trans_id).trim())
      ? String(transport.trans_id).trim()
      : undefined;
  const body = {
    Irn: irn,
    Distance: Number(transport.distance) || 0,
    TransMode: transMode,
    TransId: transId,
    TransName: transport.trans_name || undefined,
    TransDocNo: transport.trans_doc_no || undefined,
    TransDocDt: transport.trans_doc_dt || undefined,
    VehNo: transport.veh_no || undefined,
    VehType: vehType,
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
  // Mirror the EWB no/date onto the voucher's e-invoice record so it shows on the
  // voucher block, the invoice bill, and the IRN register.
  if (voucher_id && d.EwbNo) {
    try {
      await db
        .update(einvoiceRecords)
        .set({ ewbNo: String(d.EwbNo), ewbDt: d.EwbDt || null, updatedAt: sql`datetime('now')` })
        .where(eq(einvoiceRecords.voucherId, voucher_id));
    } catch (_) {
      /* best-effort */
    }
  }
  return { success: true, data: d };
};

// Map the voucher's stored "Provide GST/e-Way Bill details" popup (voucher_gst_eway_details)
// to the NIC transport shape so the data the user entered at voucher entry actually flows into
// EWB generation (previously it was captured but ignored). Distance isn't stored — NIC computes
// it pin-to-pin when 0.
const ISO_TO_NIC_DATE = (d) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : d || undefined;
};
const mapEwayDetailsToTransport = (ge) => {
  if (!ge) return {};
  const modeDigit = /^\s*([1-4])/.exec(String(ge.mode || ''));
  const vt = String(ge.vehicle_type || '').toLowerCase();
  return {
    trans_mode: modeDigit ? modeDigit[1] : undefined,
    trans_id: ge.transporter_id || undefined,
    trans_name: ge.transporter_name || undefined,
    trans_doc_no: ge.doc_lading_no || undefined,
    trans_doc_dt: ge.doc_lading_date ? ISO_TO_NIC_DATE(ge.doc_lading_date) : undefined,
    veh_no: ge.vehicle_number || undefined,
    veh_type: vt.includes('over dimensional') ? 'O' : vt.includes('regular') ? 'R' : undefined,
  };
};

// Look up the voucher's IRN, merge the stored transport details with any explicitly-passed
// transport (explicit wins), then generate the EWB against the IRN.
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

    let stored = {};
    try {
      const ge = await db.all(
        sql`SELECT * FROM voucher_gst_eway_details WHERE voucher_id = ${voucher_id} LIMIT 1`,
      );
      stored = mapEwayDetailsToTransport(ge[0]);
    } catch (_) {
      /* details are optional */
    }
    // Explicit caller values override the stored ones; drop empty keys so they don't clobber.
    const clean = Object.fromEntries(
      Object.entries(transport || {}).filter(([, v]) => v != null && v !== ''),
    );
    const merged = { ...stored, ...clean };
    return await generateByIrn(company_id, voucher_id, irn, merged);
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

// Fetch EWB details for an existing IRN (WhiteBooks serves this off the e-Invoice product;
// NIC exposes the same lookup under its e-Way base path).
const getByIrn = async (irn) => {
  if (!irn) return { success: false, error: 'IRN is required.' };
  const isWb = !!getWhitebooksConfig();
  const r = isWb
    ? await wb.einv.request(
        'GET',
        '/einvoice/type/GETEWAYBILLIRN/version/V1_03',
        null,
        `&param1=${encodeURIComponent(irn)}`,
      )
    : await nic.authedRequest(EWB(), 'GET', `/eiewb/v1.03/ewaybill/irn/${irn}`);
  return r.ok
    ? { success: true, data: isWb ? r.data : r.body.Data }
    : { success: false, error: r.error };
};

// ---- full WhiteBooks e-Way Bill product surface -----------------------------------
// Every operation on developer.whitebooks.in/ewaybillapis. Writes take a NIC-shaped JSON
// body (caller-supplied); reads take the documented query params. All ride wb.eway.request
// (client-cred auth — no taxpayer OTP). WhiteBooks-only (.env GSP path); the IRN-linked
// generate/cancel/get above keep their NIC fallback.
const EWB_API = '/ewaybillapi/v1.03/ewayapi';
const wbGuard = () =>
  getWhitebooksConfig()
    ? null
    : { success: false, error: 'WhiteBooks e-Way Bill not configured (.env)' };
const wrapEwb = (r) =>
  r.ok ? { success: true, data: r.data } : { success: false, error: r.error };
const qstr = (params = {}) =>
  Object.entries(params)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `&${k}=${encodeURIComponent(v)}`)
    .join('');
const ewbPost = async (op, body) => {
  const g = wbGuard();
  if (g) return g;
  return wrapEwb(await wb.eway.request('POST', `${EWB_API}/${op}`, body || {}));
};
const ewbGet = async (op, query) => {
  const g = wbGuard();
  if (g) return g;
  return wrapEwb(await wb.eway.request('GET', `${EWB_API}/${op}`, null, qstr(query)));
};

// writes (caller supplies the NIC-shaped JSON body)
const generate = (body) => ewbPost('genewaybill', body);
const updatePartB = (body) => ewbPost('vehewb', body);
const generateConsolidated = (body) => ewbPost('gencewb', body);
const reject = (body) => ewbPost('rejewb', body);
const updateTransporter = (body) => ewbPost('updatetransporter', body);
const extendValidity = (body) => ewbPost('extendvalidity', body);
const regenerateConsolidated = (body) => ewbPost('regentripsheet', body);
const initMultiVehicle = (body) => ewbPost('initmulti', body);
const addMultiVehicle = (body) => ewbPost('addmulti', body);
const changeMultiVehicle = (body) => ewbPost('chngmulti', body);
const closeEwb = (body) => ewbPost('clsewb', body);

// reads / lookups
const forTransporterByDate = (date) => ewbGet('getewaybillsfortransporter', { date });
const forTransporterByState = (stateCode, date) =>
  ewbGet('getewaybillsfortransporterbystate', { stateCode, date });
const forTransporterByGstin = (genGstin, date) =>
  ewbGet('getewaybillsfortransporterbygstin', { Gen_gstin: genGstin, date });
const reportByTransporterAssignedDate = (date, stateCode) =>
  ewbGet('getewaybillreportbytransporterassigneddate', { date, stateCode });
const byDate = (date) => ewbGet('getewaybillsbydate', { date });
const rejectedByOthers = (date) => ewbGet('getewaybillsrejectedbyothers', { date });
const ofOtherParty = (date) => ewbGet('getewaybillsofotherparty', { date });
const getConsolidated = (tripSheetNo) => ewbGet('gettripsheet', { tripSheetNo });
const byConsigner = (docType, docNo) =>
  ewbGet('getewaybillgeneratedbyconsigner', { docType, docNo });
const getErrorList = () => ewbGet('geterrorlist', {});
const getGstinDetails = (gstin) => ewbGet('getgstindetails', { GSTIN: gstin });
const getTransporterDetails = (trnNo) => ewbGet('gettransporterdetails', { trn_no: trnNo });
const getHsnDetails = (hsncode) => ewbGet('gethsndetailsbyhsncode', { hsncode });

// generic seam — any e-Way endpoint by path (namespace-guarded).
const ewayRequest = async ({ method = 'GET', path, query = {}, body = null } = {}) => {
  const g = wbGuard();
  if (g) return g;
  if (!path || !/^\/ewaybillapi\//.test(path))
    return { success: false, error: 'Path is not in the e-Way Bill namespace.' };
  return wrapEwb(await wb.eway.request(String(method).toUpperCase(), path, body, qstr(query)));
};

// Latest e-Way Bill record for one voucher — drives the EWB line on the voucher block and the
// printable e-Way Bill slip.
const getByVoucher = async (voucher_id) => {
  try {
    const rows = await db.all(
      sql`SELECT * FROM ${ewaybillRecords} WHERE ${ewaybillRecords.voucherId} = ${voucher_id}
          ORDER BY ${ewaybillRecords.ewbId} DESC LIMIT 1`,
    );
    if (rows.length === 0) return { success: false, error: 'No e-Way Bill for this voucher' };
    return { success: true, record: rows[0] };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const getRecords = async (company_id) => {
  try {
    // Join the voucher + party so the EWB Register shows a real Party (matching the e-Invoice
    // register), which the ewaybill_records row does not carry itself.
    const rows = await db.all(
      sql`SELECT er.*, v.date AS date, v.voucher_number AS voucher_number,
                 COALESCE(l.name, v.party_name) AS party_name
          FROM ewaybill_records er
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

module.exports = {
  getStatus,
  generateByIrn,
  generateFromVoucher,
  cancel,
  get,
  getByIrn,
  getByVoucher,
  getRecords,
  // full e-Way Bill product surface
  generate,
  updatePartB,
  generateConsolidated,
  reject,
  updateTransporter,
  extendValidity,
  regenerateConsolidated,
  initMultiVehicle,
  addMultiVehicle,
  changeMultiVehicle,
  closeEwb,
  forTransporterByDate,
  forTransporterByState,
  forTransporterByGstin,
  reportByTransporterAssignedDate,
  byDate,
  rejectedByOthers,
  ofOtherParty,
  getConsolidated,
  byConsigner,
  getErrorList,
  getGstinDetails,
  getTransporterDetails,
  getHsnDetails,
  ewayRequest,
};
