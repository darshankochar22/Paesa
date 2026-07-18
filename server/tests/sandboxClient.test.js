'use strict';

// The Sandbox client's export surface is a contract: gstFilingService / gstPortalService /
// returnActivities destructure these symbols, and the compliance UI reaches them over IPC.
// This locks the full shape so a refactor of server/integrations/sandbox/* cannot silently
// drop an endpoint group.

const sbx = require('../integrations/sandboxClient');

const fn = (path) => {
  let cur = sbx;
  for (const k of path.split('.')) cur = cur && cur[k];
  return typeof cur;
};

describe('sandboxClient export surface', () => {
  it('keeps the legacy top-level surface consumed by gstFilingService/returnActivities', () => {
    for (const p of [
      'getStatus',
      'isConfigured',
      'request',
      'searchGstin',
      'searchGstinByPan',
      'trackReturns',
      'getFiledReturns',
      'platform.authenticate',
      '_internal.httpReq',
      '_internal.platformAuth',
    ])
      expect({ [p]: fn(p) }).toEqual({ [p]: 'function' });
  });

  it('exposes the complete Public API group', () => {
    for (const p of ['verifyGstin', 'getReturnPreference'])
      expect({ [p]: fn(p) }).toEqual({ [p]: 'function' });
  });

  it('exposes the complete Taxpayer group (auth, returns, ledgers, IMS, notices)', () => {
    for (const p of [
      'gst.otpRequest',
      'gst.verifyOtp',
      'gst.refreshSession',
      'gst.requestEvcOtp',
      'gst.logout',
      'gst.session',
      'gst.getAato',
      'gst.getFilingPreference',
      'gst.saveFilingPreference',
      'gst.getReturnStatus',
      'gst.trackReturns',
      'gst.getGstr1',
      'gst.getGstr1Section',
      'gst.getGstr1Summary',
      'gst.saveGstr1',
      'gst.resetGstr1',
      'gst.fileGstr1',
      'gst.getGstr1aSection',
      'gst.getGstr1aDeclaration',
      'gst.getGstr2a',
      'gst.getGstr2aSection',
      'gst.getGstr2aDocument',
      'gst.getGstr2b',
      'gst.regenerateGstr2b',
      'gst.gstr2bRegenerationStatus',
      'gst.getGstr3b',
      'gst.saveGstr3b',
      'gst.validateGstr3b',
      'gst.getGstr3bAutoLiability',
      'gst.offsetGstr3bLiability',
      'gst.fileGstr3b',
      'gst.proceedToFile',
      'gst.newProceedToFile',
      'gst.getGstr4AnnualSummary',
      'gst.saveGstr4Annual',
      'gst.fileGstr4Annual',
      'gst.getGstr9',
      'gst.saveGstr9',
      'gst.fileGstr9',
      'gst.getGstr9Table8a',
      'gst.getGstr9AutoCalculated',
      'gst.getCashLedger',
      'gst.getItcLedger',
      'gst.getReturnLiabilityLedger',
      'gst.getCashItcBalance',
      'gst.imsGetInvoices',
      'gst.imsGetInvoiceCount',
      'gst.imsSaveInvoiceStatus',
      'gst.imsResetInvoiceStatus',
      'gst.imsCheckInvoiceStatus',
      'gst.imsGetSalesInvoices',
      'gst.imsGetAddedBackLiabilities',
      'gst.listNotices',
      'gst.getNoticeDetails',
      'gst.getEInvoiceByIrn',
      'gst.getEInvoiceHsnSummary',
      'gst.submitSalesEInvoicesJob',
      'gst.pollSalesEInvoicesJob',
      'gst.submitPurchaseEInvoicesJob',
      'gst.pollPurchaseEInvoicesJob',
    ])
      expect({ [p]: fn(p) }).toEqual({ [p]: 'function' });
  });

  it('exposes the complete e-Invoice group', () => {
    for (const p of [
      'einv.authenticate',
      'einv.generate',
      'einv.cancel',
      'einv.getByIrn',
      'einv.getByDocument',
      'einv.generateEwbByIrn',
      'einv.getEwbByIrn',
      'einv.generatePdf',
      'einv.searchGstin',
    ])
      expect({ [p]: fn(p) }).toEqual({ [p]: 'function' });
  });

  it('exposes the complete e-Way Bill group (common + consignor + consignee + transporter)', () => {
    for (const p of [
      'eway.authenticate',
      'eway.getByEwbNo',
      'eway.getErrorList',
      'eway.getHsnDetails',
      'eway.searchGstin',
      'eway.searchTransporter',
      'eway.generate',
      'eway.cancel',
      'eway.getByDate',
      'eway.getByDocument',
      'eway.extendValidity',
      'eway.updateTransporter',
      'eway.updateVehicle',
      'eway.initMultiVehicle',
      'eway.addMultiVehicle',
      'eway.changeMultiVehicle',
      'eway.consolidate',
      'eway.getConsolidated',
      'eway.regenerateConsolidated',
      'eway.consigneeGetByDate',
      'eway.reject',
      'eway.transporterGetByDateAndState',
      'eway.transporterListByGenerator',
      'eway.transporterUpdateTransporter',
      'eway.transporterUpdateVehicle',
      'eway.transporterExtendValidity',
      'eway.transporterInitMultiVehicle',
      'eway.transporterAddMultiVehicle',
      'eway.transporterChangeMultiVehicle',
      'eway.transporterConsolidate',
      'eway.transporterGetConsolidated',
      'eway.transporterRegenerateConsolidated',
    ])
      expect({ [p]: fn(p) }).toEqual({ [p]: 'function' });
  });

  it('resolves calls to a clean {ok:false} when Sandbox is not configured (never throws)', async () => {
    const saved = {};
    for (const k of ['SANDBOX_API_KEY', 'SANDBOX_API_SECRET']) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
    try {
      const r = await sbx.searchGstin('22BQNPJ1145D1ZB');
      expect(r.ok).toBe(false);
      expect(String(r.error)).toMatch(/not configured/i);
    } finally {
      for (const [k, v] of Object.entries(saved)) if (v !== undefined) process.env[k] = v;
    }
  });
});
