const bcrypt = require('bcryptjs');
const { db } = require('../db/index');
const groupService = require('../group/groupService');
const ledgerService = require('../ledger/ledgerService');
const unitService = require('../unit/unitService');
const stockGroupService = require('../stockGroup/stockGroupService');
const godownService = require('../godown/godownService');
const currencyService = require('../currency/currencyService');
const voucherTypeService = require('../voucherType/voucherTypeService');
const gstClassificationService = require('../gstClassification/gstClassificationService');
const employeeGroupService = require('../employeeGroup/employeeGroupService');
const payrollUnitService = require('../payrollUnit/payrollUnitService');
const tallyFeaturesService = require('../tallyFeatures/tallyFeaturesService');
const companyCreationSuccessService = require('../companyCreationSuccess/companyCreationSuccessService');
const companyFeatureValuesService = require('../companyFeatureValues/companyFeatureValuesService');
const attendanceTypeService = require('../attendanceType/attendanceTypeService');
const payHeadService = require('../payHead/payHeadService');

module.exports = {
  create: async (data) => {
    try {
      let hashedPassword = null;
      if (data.password) {
        hashedPassword = await bcrypt.hash(data.password, 10);
      }

      const result = await db.execute(
        `INSERT INTO companies (
          name, mailing_name, address1, address2, state, country,
          pincode, telephone, mobile, fax, email, website,
          base_currency_symbol, formal_name,
          financial_year_beginning_from, books_beginning_from,
          password, access_control, edit_log
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, null, null)`,
        [
          data.name,
          data.mailing_name || null,
          data.address1 || null,
          data.address2 || null,
          data.state || null,
          data.country || null,
          data.pincode || null,
          data.telephone || null,
          data.mobile || null,
          data.fax || null,
          data.email || null,
          data.website || null,
          data.base_currency_symbol || null,
          data.formal_name || null,
          data.financial_year_beginning_from || null,
          data.books_beginning_from || null,
          hashedPassword,
        ]
      );

      const company_id = Number(result.lastInsertRowid);

      try { await groupService.seedDefaultGroups(company_id); console.log('groups ok'); } catch(e) { console.error('groups failed:', e.message); }
      try { const allGroups = (await groupService.getAll(company_id)).groups; await ledgerService.seedDefaultLedgers(company_id, allGroups); console.log('ledgers ok'); } catch(e) { console.error('ledgers failed:', e.message); }
      try { await unitService.seedDefaultUnits(company_id); console.log('units ok'); } catch(e) { console.error('units failed:', e.message); }
      try { await stockGroupService.seedDefaultStockGroups(company_id); console.log('stockGroups ok'); } catch(e) { console.error('stockGroups failed:', e.message); }
      try { await godownService.seedDefaultGodowns(company_id); console.log('godowns ok'); } catch(e) { console.error('godowns failed:', e.message); }
      try { await currencyService.seedDefaultCurrency(company_id); console.log('currency ok'); } catch(e) { console.error('currency failed:', e.message); }
      try { await voucherTypeService.seedDefaultVoucherTypes(company_id); console.log('voucherTypes ok'); } catch(e) { console.error('voucherTypes failed:', e.message); }
      try { await gstClassificationService.seedDefaultGSTClassifications(company_id); console.log('gst ok'); } catch(e) { console.error('gst failed:', e.message); }
      try { await employeeGroupService.seedDefaultEmployeeGroups(company_id); console.log('employeeGroups ok'); } catch(e) { console.error('employeeGroups failed:', e.message); }
      try { await payrollUnitService.seedDefaultPayrollUnits(company_id); console.log('payrollUnits ok'); } catch(e) { console.error('payrollUnits failed:', e.message); }
      try { await tallyFeaturesService.seedDefaultFeatures(company_id); console.log('tallyFeatures ok'); } catch(e) { console.error('tallyFeatures failed:', e.message); }
      try { await companyCreationSuccessService.seedCompanyCreationSuccess(company_id); console.log('companyCreationSuccess ok'); } catch(e) { console.error('companyCreationSuccess failed:', e.message); }
      try { await companyFeatureValuesService.seedCompanyFeatureValues(company_id); console.log('companyFeatureValues ok'); } catch(e) { console.error('companyFeatureValues failed:', e.message); }
      try { await attendanceTypeService.seedDefaultAttendanceTypes(company_id); console.log('attendanceTypes ok'); } catch(e) { console.error('attendanceTypes failed:', e.message); }
      try { await payHeadService.seedDefaultPayHeads(company_id); console.log('payHeads ok'); } catch(e) { console.error('payHeads failed:', e.message); }

      const company = await db.execute(
        `SELECT * FROM companies WHERE company_id = ?`,
        [company_id]
      );
      const { password, ...safe } = company.rows[0];
      return { success: true, company: safe };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async () => {
    try {
      const result = await db.execute(`SELECT * FROM companies`);
      const safe = result.rows.map(({ password, ...rest }) => rest);
      return { success: true, companies: safe };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM companies WHERE company_id = ?`,
        [id]
      );
      if (result.rows.length === 0) return { success: false, error: 'Company not found' };
      const { password, ...safe } = result.rows[0];
      return { success: true, company: safe };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM companies WHERE company_id = ?`,
        [data.company_id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'Company not found' };

      const current = existing.rows[0];
      const newPassword = data.password
        ? await bcrypt.hash(data.password, 10)
        : current.password;

      await db.execute(
        `UPDATE companies SET
          name = ?, mailing_name = ?, address1 = ?, address2 = ?,
          state = ?, country = ?, pincode = ?, telephone = ?,
          mobile = ?, fax = ?, email = ?, website = ?,
          base_currency_symbol = ?, formal_name = ?,
          financial_year_beginning_from = ?, books_beginning_from = ?,
          password = ?
         WHERE company_id = ?`,
        [
          data.name ?? current.name,
          data.mailing_name ?? current.mailing_name,
          data.address1 ?? current.address1,
          data.address2 ?? current.address2,
          data.state ?? current.state,
          data.country ?? current.country,
          data.pincode ?? current.pincode,
          data.telephone ?? current.telephone,
          data.mobile ?? current.mobile,
          data.fax ?? current.fax,
          data.email ?? current.email,
          data.website ?? current.website,
          data.base_currency_symbol ?? current.base_currency_symbol,
          data.formal_name ?? current.formal_name,
          data.financial_year_beginning_from ?? current.financial_year_beginning_from,
          data.books_beginning_from ?? current.books_beginning_from,
          newPassword,
          data.company_id,
        ]
      );

      const updated = await db.execute(
        `SELECT * FROM companies WHERE company_id = ?`,
        [data.company_id]
      );
      const { password, ...safe } = updated.rows[0];
      return { success: true, company: safe };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM companies WHERE company_id = ?`,
        [id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'Company not found' };

      await db.execute(`DELETE FROM companies WHERE company_id = ?`, [id]);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  verifyPassword: async (id, password) => {
    try {
      const result = await db.execute(
        `SELECT * FROM companies WHERE company_id = ?`,
        [id]
      );
      if (result.rows.length === 0) return { success: false, error: 'Company not found' };
      if (!result.rows[0].password) return { success: true };

      const match = await bcrypt.compare(password, result.rows[0].password);
      if (!match) return { success: false, error: 'Wrong password' };

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};