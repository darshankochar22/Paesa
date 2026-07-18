'use strict';

// Sandbox GST Compliance — e-Way Bill APIs (NIC e-Way Bill API-user session).
// Full catalog per the official OpenAPI spec: common lookups + consignor (generate/cancel/
// update/extend/consolidated/multi-vehicle) + consignee (list/reject) + transporter mirror.
// Dates are DD/MM/YYYY strings throughout (NIC convention).

const { getSandboxConfig } = require('../gspConfig');
const { ewayAuth, ewayRequest } = require('./core');

const P = '/gst/compliance/e-way-bill';
const enc = encodeURIComponent;

const authenticate = () => {
  const c = getSandboxConfig();
  return c ? ewayAuth(c) : Promise.resolve({ ok: false, error: 'not configured' });
};

// --- common (any role) -----------------------------------------------------------------
const getByEwbNo = (ewbNo) => ewayRequest('GET', `${P}/tax-payer/bill/${enc(ewbNo)}`, {});
const getErrorList = () => ewayRequest('GET', `${P}/tax-payer/error-list`, {});
const getHsnDetails = (hsnCode) =>
  ewayRequest('GET', `${P}/tax-payer/hsn`, { query: { hsn_code: hsnCode } });
const searchGstin = (gstin) =>
  ewayRequest('POST', `${P}/tax-payer/gstin/search`, { body: { gstin } });
const searchTransporter = (transin) =>
  ewayRequest('POST', `${P}/tax-payer/transin/search`, { body: { transin } });

// --- consignor -------------------------------------------------------------------------
const generate = (body) => ewayRequest('POST', `${P}/consignor/bill`, { body });
// body = { ewbNo, cancelRsnCode, cancelRmrk }.
const cancel = (ewbNo, body) =>
  ewayRequest('POST', `${P}/consignor/bill/${enc(ewbNo)}/cancel`, { body });
const getByDate = (generatedDate, rejected) =>
  ewayRequest('GET', `${P}/consignor/bills`, {
    query: { generated_date: generatedDate, ...(rejected ? { rejected: 'true' } : {}) },
  });
const getByDocument = (documentType, documentNumber) =>
  ewayRequest('GET', `${P}/consignor/bill`, {
    query: { document_type: documentType, document_number: documentNumber },
  });
const extendValidity = (ewbNo, body) =>
  ewayRequest('POST', `${P}/consignor/bill/${enc(ewbNo)}/extend`, { body });
const updateTransporter = (ewbNo, body) =>
  ewayRequest('PUT', `${P}/consignor/bill/${enc(ewbNo)}/transporter`, { body });
const updateVehicle = (ewbNo, body) =>
  ewayRequest('PUT', `${P}/consignor/bill/${enc(ewbNo)}/vehicle`, { body });
const initMultiVehicle = (ewbNo, body) =>
  ewayRequest('POST', `${P}/consignor/bill/${enc(ewbNo)}/multi-vehicle`, { body });
const addMultiVehicle = (ewbNo, body) =>
  ewayRequest('POST', `${P}/consignor/bill/${enc(ewbNo)}/multi-vehicle/vehicle`, { body });
const changeMultiVehicle = (ewbNo, body) =>
  ewayRequest('PUT', `${P}/consignor/bill/${enc(ewbNo)}/multi-vehicle/vehicle`, { body });
const consolidate = (body) => ewayRequest('POST', `${P}/consignor/consolidated-bill`, { body });
const getConsolidated = (consolidatedEwbNo) =>
  ewayRequest('GET', `${P}/consignor/consolidated-bill/${enc(consolidatedEwbNo)}`, {});
const regenerateConsolidated = (consolidatedEwbNo, body) =>
  ewayRequest('POST', `${P}/consignor/consolidated-bill/${enc(consolidatedEwbNo)}/regenerate`, {
    body,
  });

// --- consignee -------------------------------------------------------------------------
const consigneeGetByDate = (generatedDate) =>
  ewayRequest('GET', `${P}/consignee/bills`, { query: { generated_date: generatedDate } });
const reject = (ewbNo, body = {}) =>
  ewayRequest('POST', `${P}/consignee/bill/${enc(ewbNo)}/reject`, { body });

// --- transporter -----------------------------------------------------------------------
const transporterGetByDateAndState = (generatorStateCode, { generatedDate, assignedDate } = {}) =>
  ewayRequest('GET', `${P}/transporter/bills`, {
    query: {
      generator_state_code: generatorStateCode,
      generated_date: generatedDate,
      assigned_date: assignedDate,
    },
  });
const transporterListByGenerator = (generatorGstin, generatedDate) =>
  ewayRequest('POST', `${P}/transporter/bills/list`, {
    query: generatedDate ? { generated_date: generatedDate } : {},
    body: { generator_gstin: generatorGstin },
  });
const transporterUpdateTransporter = (ewbNo, body) =>
  ewayRequest('PUT', `${P}/transporter/bill/${enc(ewbNo)}/transporter`, { body });
const transporterUpdateVehicle = (ewbNo, body) =>
  ewayRequest('PUT', `${P}/transporter/bill/${enc(ewbNo)}/vehicle`, { body });
const transporterExtendValidity = (ewbNo, body) =>
  ewayRequest('POST', `${P}/transporter/bill/${enc(ewbNo)}/extend`, { body });
const transporterInitMultiVehicle = (ewbNo, body) =>
  ewayRequest('POST', `${P}/transporter/bill/${enc(ewbNo)}/multi-vehicle`, { body });
const transporterAddMultiVehicle = (ewbNo, body) =>
  ewayRequest('POST', `${P}/transporter/bill/${enc(ewbNo)}/multi-vehicle/vehicle`, { body });
const transporterChangeMultiVehicle = (ewbNo, body) =>
  ewayRequest('PUT', `${P}/transporter/bill/${enc(ewbNo)}/multi-vehicle/vehicle`, { body });
const transporterConsolidate = (body) =>
  ewayRequest('POST', `${P}/transporter/consolidated-bill`, { body });
const transporterGetConsolidated = (consolidatedEwbNo) =>
  ewayRequest('GET', `${P}/transporter/consolidated-bill/${enc(consolidatedEwbNo)}`, {});
const transporterRegenerateConsolidated = (consolidatedEwbNo, body) =>
  ewayRequest('POST', `${P}/transporter/consolidated-bill/${enc(consolidatedEwbNo)}/regenerate`, {
    body,
  });

module.exports = {
  authenticate,
  request: ewayRequest,
  // common
  getByEwbNo,
  getErrorList,
  getHsnDetails,
  searchGstin,
  searchTransporter,
  // consignor
  generate,
  cancel,
  getByDate,
  getByDocument,
  extendValidity,
  updateTransporter,
  updateVehicle,
  initMultiVehicle,
  addMultiVehicle,
  changeMultiVehicle,
  consolidate,
  getConsolidated,
  regenerateConsolidated,
  // consignee
  consigneeGetByDate,
  reject,
  // transporter
  transporterGetByDateAndState,
  transporterListByGenerator,
  transporterUpdateTransporter,
  transporterUpdateVehicle,
  transporterExtendValidity,
  transporterInitMultiVehicle,
  transporterAddMultiVehicle,
  transporterChangeMultiVehicle,
  transporterConsolidate,
  transporterGetConsolidated,
  transporterRegenerateConsolidated,
};
