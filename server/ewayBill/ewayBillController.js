const s = require('./ewayBillService');

module.exports = {
  getStatus: (e, { company_id }) => s.getStatus(company_id),
  generateFromVoucher: (e, { company_id, voucher_id, transport }) =>
    s.generateFromVoucher(company_id, voucher_id, transport),
  generateByIrn: (e, { company_id, voucher_id, irn, transport }) =>
    s.generateByIrn(company_id, voucher_id, irn, transport),
  cancel: (e, { ewb_no, cancel_reason, cancel_remarks }) =>
    s.cancel(ewb_no, cancel_reason, cancel_remarks),
  get: (e, { ewb_no }) => s.get(ewb_no),
  getByIrn: (e, { irn }) => s.getByIrn(irn),
  getRecords: (e, { company_id }) => s.getRecords(company_id),

  // full e-Way Bill product surface (writes take a NIC-shaped `body`)
  generate: (e, { body }) => s.generate(body),
  updatePartB: (e, { body }) => s.updatePartB(body),
  generateConsolidated: (e, { body }) => s.generateConsolidated(body),
  reject: (e, { body }) => s.reject(body),
  updateTransporter: (e, { body }) => s.updateTransporter(body),
  extendValidity: (e, { body }) => s.extendValidity(body),
  regenerateConsolidated: (e, { body }) => s.regenerateConsolidated(body),
  initMultiVehicle: (e, { body }) => s.initMultiVehicle(body),
  addMultiVehicle: (e, { body }) => s.addMultiVehicle(body),
  closeEwb: (e, { body }) => s.closeEwb(body),
  forTransporterByDate: (e, { date }) => s.forTransporterByDate(date),
  forTransporterByState: (e, { state_code, date }) => s.forTransporterByState(state_code, date),
  forTransporterByGstin: (e, { gen_gstin, date }) => s.forTransporterByGstin(gen_gstin, date),
  reportByTransporterAssignedDate: (e, { date, state_code }) =>
    s.reportByTransporterAssignedDate(date, state_code),
  byDate: (e, { date }) => s.byDate(date),
  rejectedByOthers: (e, { date }) => s.rejectedByOthers(date),
  ofOtherParty: (e, { date }) => s.ofOtherParty(date),
  getConsolidated: (e, { trip_sheet_no }) => s.getConsolidated(trip_sheet_no),
  byConsigner: (e, { doc_type, doc_no }) => s.byConsigner(doc_type, doc_no),
  getErrorList: () => s.getErrorList(),
  getGstinDetails: (e, { gstin }) => s.getGstinDetails(gstin),
  getTransporterDetails: (e, { trn_no }) => s.getTransporterDetails(trn_no),
  getHsnDetails: (e, { hsncode }) => s.getHsnDetails(hsncode),
  ewayRequest: (e, payload) => s.ewayRequest(payload),
};
