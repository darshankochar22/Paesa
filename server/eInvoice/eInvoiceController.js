const eInvoiceService = require('./eInvoiceService');

module.exports = {
  authenticate: async (event, { company_id }) => {
    const creds = await eInvoiceService.getCredentials(company_id);
    if (!creds.success) return creds;
    return await eInvoiceService.authenticate(creds.credentials);
  },

  getGSTINDetails: async (event, { gstin, company_id }) => {
    const creds = await eInvoiceService.getCredentials(company_id);
    if (!creds.success) return creds;
    return await eInvoiceService.getGSTINDetails(gstin, creds.credentials);
  },

  generateIRN: async (event, { company_id, voucher_id, invoice_payload }) => {
    const creds = await eInvoiceService.getCredentials(company_id);
    if (!creds.success) return creds;
    return await eInvoiceService.generateIRN(company_id, voucher_id, invoice_payload, creds.credentials);
  },

  getIRNDetails: async (event, { irn, company_id }) => {
    const creds = await eInvoiceService.getCredentials(company_id);
    if (!creds.success) return creds;
    return await eInvoiceService.getIRNDetails(irn, creds.credentials);
  },

  cancelIRN: async (event, { irn, cancel_reason, cancel_remarks, company_id }) => {
    const creds = await eInvoiceService.getCredentials(company_id);
    if (!creds.success) return creds;
    return await eInvoiceService.cancelIRN(irn, cancel_reason, cancel_remarks, creds.credentials);
  },

  saveCredentials: async (event, data) => {
    return await eInvoiceService.saveCredentials(data);
  },

  getCredentials: async (event, { company_id }) => {
    return await eInvoiceService.getCredentials(company_id);
  },

  getRecords: async (event, { company_id }) => {
    return await eInvoiceService.getRecords(company_id);
  },

  getRecordByIRN: async (event, { irn }) => {
    return await eInvoiceService.getRecordByIRN(irn);
  },
};