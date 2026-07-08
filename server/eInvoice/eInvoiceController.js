const eInvoiceService = require('./eInvoiceService');
const auditTrailService = require('../auditTrail/auditTrailService');

const ENTITY_TYPE = 'e_invoice';

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
    const result = await eInvoiceService.generateIRN(
      company_id,
      voucher_id,
      invoice_payload,
      creds.credentials,
    );
    if (result && result.success && result.data) {
      try {
        const record = await eInvoiceService.getRecordByIRN(result.data.Irn);
        await auditTrailService.record({
          company_id: company_id,
          entity_type: ENTITY_TYPE,
          entity_id: result.data.Irn,
          action: 'create',
          before: null,
          after: record.success ? record.record : result.data,
        });
      } catch (err) {
        console.error('Error recording e-invoice create audit:', err);
      }
    }
    return result;
  },

  getIRNDetails: async (event, { irn, company_id }) => {
    const creds = await eInvoiceService.getCredentials(company_id);
    if (!creds.success) return creds;
    return await eInvoiceService.getIRNDetails(irn, creds.credentials);
  },

  cancelIRN: async (event, { irn, cancel_reason, cancel_remarks, company_id }) => {
    const creds = await eInvoiceService.getCredentials(company_id);
    if (!creds.success) return creds;

    let before = null;
    try {
      const snap = await eInvoiceService.getRecordByIRN(irn);
      if (snap && snap.success) before = snap.record;
    } catch (err) {
      console.error('Error fetching e-invoice snapshot before cancel:', err);
    }

    const result = await eInvoiceService.cancelIRN(
      irn,
      cancel_reason,
      cancel_remarks,
      creds.credentials,
    );
    if (result && result.success) {
      try {
        const afterSnap = await eInvoiceService.getRecordByIRN(irn);
        const after = afterSnap && afterSnap.success ? afterSnap.record : null;
        await auditTrailService.record({
          company_id: company_id,
          entity_type: ENTITY_TYPE,
          entity_id: irn,
          action: 'cancel',
          before,
          after,
        });
      } catch (err) {
        console.error('Error recording e-invoice cancel audit:', err);
      }
    }
    return result;
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

  getByVoucher: async (event, { voucher_id }) => {
    return await eInvoiceService.getByVoucher(voucher_id);
  },

  // ---- developer-side (.env) path via the shared NIC client ----
  getStatus: async (event, { company_id }) => {
    return await eInvoiceService.getStatus(company_id);
  },

  generateFromVoucher: async (event, { company_id, voucher_id }) => {
    const result = await eInvoiceService.generateFromVoucher(company_id, voucher_id);
    if (result && result.success && result.data?.Irn) {
      try {
        const record = await eInvoiceService.getRecordByIRN(result.data.Irn);
        await auditTrailService.record({
          company_id,
          entity_type: ENTITY_TYPE,
          entity_id: result.data.Irn,
          action: 'create',
          before: null,
          after: record.success ? record.record : result.data,
        });
      } catch (err) {
        console.error('Error recording e-invoice create audit:', err);
      }
    }
    return result;
  },
};
