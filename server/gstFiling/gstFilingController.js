const s = require('./gstFilingService');

module.exports = {
  getStatus: (e, { company_id }) => s.getStatus(company_id),
  prepare: (e, payload) => s.prepare(payload.company_id, payload),
  saveToPortal: (e, payload) => s.saveToPortal(payload.company_id, payload),
  fileReturn: (e, payload) => s.fileReturn(payload.company_id, payload),
  getFilings: (e, { company_id }) => s.getFilings(company_id),
  markAsFiled: (e, payload) => s.markAsFiled(payload.company_id, payload),
  updateArn: (e, payload) => s.updateArn(payload.company_id, payload),
  getFilingInfo: (e, payload) => s.getFilingInfo(payload.company_id, payload),
  requestOtp: (e, { company_id }) => s.requestOtp(company_id),
  authenticate: (e, payload) => s.authenticate(payload.company_id, payload),
  requestEvc: (e, { company_id }) => s.requestEvc(company_id),
  getReturnStatus: (e, payload) => s.getReturnStatus(payload.company_id, payload),
};
