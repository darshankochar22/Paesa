const s = require('./gstFilingService');
const p = require('./gstPortalService');

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

  // ---- GST portal read/download surface (gstPortalService) ----
  portalRequest: (e, payload) => p.portalRequest(payload),
  getSection: (e, { type, section, query }) => p.getSection(type, section, query),
  getSummary: (e, { type, query }) => p.getSummary(type, query),
  retTrack: (e, { query }) => p.retTrack(query),
  publicSearch: (e, { query }) => p.publicSearch(query),
  publicRetTrack: (e, { query }) => p.publicRetTrack(query),
  getPreferences: (e, { query }) => p.getPreferences(query),
  urdDetails: (e, { query }) => p.urdDetails(query),
  urdValidate: (e, { query }) => p.urdValidate(query),
  refreshToken: () => p.refreshToken(),
  requestEvcFor: (e, { form_type }) => p.requestEvcFor(form_type),
};
