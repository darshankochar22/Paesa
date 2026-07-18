'use strict';

// Sandbox GST Compliance — e-Invoice APIs (NIC e-Invoice API-user session).
// Paths verified against the official OpenAPI spec. Notable corrections vs the old
// inferred stubs: cancel is POST /invoice/{irn}/cancel (was /cancel), get-by-IRN takes the
// IRN as a PATH segment (was ?irn=), GSTIN search is POST /gstin/search (was GET /gstin).

const { getSandboxConfig } = require('../gspConfig');
const { einvAuth, einvRequest } = require('./core');

const P = '/gst/compliance/e-invoice';

const authenticate = (force = false) => {
  const c = getSandboxConfig();
  return c ? einvAuth(c, force) : Promise.resolve({ ok: false, error: 'not configured' });
};

// Generate IRN. body = full NIC e-Invoice schema payload.
const generate = (invoice) => einvRequest('POST', `${P}/tax-payer/invoice`, { body: invoice });

// Cancel IRN. body = { Irn, CnlRsn (1 Duplicate | 2 Data entry mistake | 3 Order cancelled |
// 4 Others), CnlRem }.
const cancel = (irn, body) =>
  einvRequest('POST', `${P}/tax-payer/invoice/${encodeURIComponent(irn)}/cancel`, { body });

const getByIrn = (irn) =>
  einvRequest('GET', `${P}/tax-payer/invoice/${encodeURIComponent(irn)}`, {});

// Lookup by document identity when the IRN isn't at hand. document_date is DD/MM/YYYY.
const getByDocument = (documentType, documentNumber, documentDate) =>
  einvRequest('GET', `${P}/tax-payer/invoice`, {
    query: {
      document_type: documentType,
      document_number: documentNumber,
      document_date: documentDate,
    },
  });

// e-Way Bill rides on an existing IRN: POST generates Part-A(+B), GET reads it back.
const generateEwbByIrn = (irn, body) =>
  einvRequest('POST', `${P}/tax-payer/invoice/${encodeURIComponent(irn)}/e-way-bill`, { body });
const getEwbByIrn = (irn) =>
  einvRequest('GET', `${P}/tax-payer/invoice/${encodeURIComponent(irn)}/e-way-bill`, {});

// Signed-JWT PDF rendering of a generated e-Invoice.
// body = { "@entity": "in.co.sandbox.gst.compliance.e-invoice.pdf.request", irn,
//          signed_qr_code, signed_invoice } (the JWTs returned by generate()).
const generatePdf = (body) => einvRequest('POST', `${P}/pdf/generate`, { body });

// IRP-database GSTIN details (distinct from the public GST-network search).
const searchGstin = (gstin) =>
  einvRequest('POST', `${P}/tax-payer/gstin/search`, { body: { gstin } });

module.exports = {
  authenticate,
  request: einvRequest,
  generate,
  cancel,
  getByIrn,
  getByDocument,
  generateEwbByIrn,
  getEwbByIrn,
  generatePdf,
  searchGstin,
};
