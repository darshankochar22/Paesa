const voucherService = require('../voucher/voucherService');
const auditTrailService = require('../auditTrail/auditTrailService');

const ENTITY_TYPE = 'voucher';

module.exports = {
  create: async (event, data) => {
    const result = await voucherService.create(data);
    if (result && result.success && result.voucher) {
      try {
        await auditTrailService.record({
          company_id: result.voucher.company_id,
          entity_type: ENTITY_TYPE,
          entity_id: result.voucher.voucher_id,
          action: 'create',
          before: null,
          after: result.voucher,
        });
      } catch (auditErr) {
        console.error('Error recording voucher create audit:', auditErr);
      }
    }
    return result;
  },
  getAll: async (event, { company_id, fy_id }) => {
    return await voucherService.getAll(company_id, fy_id);
  },
  getById: async (event, id) => {
    return await voucherService.getById(id);
  },
  update: async (event, data) => {
    let before = null;
    try {
      const snap = await voucherService.getById(data.voucher_id);
      if (snap && snap.success) before = snap.voucher;
    } catch (snapErr) {
      console.error('Error fetching voucher update snapshot:', snapErr);
    }
    const result = await voucherService.update(data);
    if (result && result.success && result.voucher) {
      try {
        await auditTrailService.record({
          company_id: result.voucher.company_id,
          entity_type: ENTITY_TYPE,
          entity_id: result.voucher.voucher_id,
          action: 'update',
          before,
          after: result.voucher,
        });
      } catch (auditErr) {
        console.error('Error recording voucher update audit:', auditErr);
      }
    }
    return result;
  },
  delete: async (event, id) => {
    let before = null;
    try {
      const snap = await voucherService.getById(id);
      if (snap && snap.success) before = snap.voucher;
    } catch (snapErr) {
      console.error('Error fetching voucher delete snapshot:', snapErr);
    }
    const result = await voucherService.delete(id);
    if (result && result.success && before) {
      try {
        await auditTrailService.record({
          company_id: before.company_id,
          entity_type: ENTITY_TYPE,
          entity_id: before.voucher_id,
          action: 'delete',
          before,
          after: null,
        });
      } catch (auditErr) {
        console.error('Error recording voucher delete audit:', auditErr);
      }
    }
    return result;
  },
  cancel: async (event, id) => {
    let before = null;
    try {
      const snap = await voucherService.getById(id);
      if (snap && snap.success) before = snap.voucher;
    } catch (snapErr) {
      console.error('Error fetching voucher cancel snapshot:', snapErr);
    }
    const result = await voucherService.cancel(id);
    if (result && result.success && before) {
      let after = null;
      try {
        const snapAfter = await voucherService.getById(id);
        if (snapAfter && snapAfter.success) after = snapAfter.voucher;
      } catch (snapErr) {
        console.error('Error fetching voucher cancel after-snapshot:', snapErr);
      }
      try {
        await auditTrailService.record({
          company_id: before.company_id,
          entity_type: ENTITY_TYPE,
          entity_id: before.voucher_id,
          action: 'cancel',
          before,
          after,
        });
      } catch (auditErr) {
        console.error('Error recording voucher cancel audit:', auditErr);
      }
    }
    return result;
  },
  getDaybook: async (event, { company_id, fy_id, from_date, to_date }) => {
    return await voucherService.getDaybook(company_id, fy_id, from_date, to_date);
  },
  getByType: async (event, { company_id, fy_id, voucher_type }) => {
    return await voucherService.getByType(company_id, fy_id, voucher_type);
  },
  getByLedger: async (event, { company_id, fy_id, ledger_id }) => {
    return await voucherService.getByLedger(company_id, fy_id, ledger_id);
  },
  getNextNumber: async (event, { company_id, fy_id, voucher_type }) => {
    return await voucherService.getNextNumber(company_id, fy_id, voucher_type);
  },
  getLedgerBalance: async (event, { ledger_id, company_id, fy_id }) => {
    return await voucherService.getLedgerBalance(ledger_id, company_id, fy_id);
  },
  searchLedgers: async (event, { company_id, searchTerm }) => {
    return await voucherService.searchLedgers(company_id, searchTerm);
  },
  getPendingBills: async (event, { ledger_id, company_id, fy_id }) => {
    return await voucherService.getPendingBills(ledger_id, company_id, fy_id);
  },
};
