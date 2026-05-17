const bcrypt = require('bcryptjs');
const { db } = require('../db/index');
const groupService = require('./groupService');
const ledgerService = require('./ledgerService');
const unitService = require('./unitService');
const stockGroupService = require('./stockGroupService');
const godownService = require('./godownService');
const currencyService = require('./currencyService');
const voucherTypeService = require('./voucherTypeService');
const gstClassificationService = require('./gstClassificationService');
const employeeGroupService = require('./employeeGroupService');
const payrollUnitService = require('./payrollUnitService');
const tallyFeaturesService = require('./tallyFeaturesService');
const companyCreationSuccessService = require('./companyCreationSuccessService');
const companyFeatureValuesService = require('./companyFeatureValuesService');
const attendanceTypeService = require('./attendanceTypeService');
const payHeadService = require('./payHeadService');

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

      await groupService.seedDefaultGroups(company_id);
      const allGroups = (await groupService.getAll(company_id)).groups;
      await ledgerService.seedDefaultLedgers(company_id, allGroups);
      await unitService.seedDefaultUnits(company_id);
      await stockGroupService.seedDefaultStockGroups(company_id);
      await godownService.seedDefaultGodowns(company_id);
      await currencyService.seedDefaultCurrency(company_id);
      await voucherTypeService.seedDefaultVoucherTypes(company_id);
      await gstClassificationService.seedDefaultGSTClassifications(company_id);
      await employeeGroupService.seedDefaultEmployeeGroups(company_id);
      await payrollUnitService.seedDefaultPayrollUnits(company_id);
      await tallyFeaturesService.seedDefaultFeatures(company_id);
      await companyCreationSuccessService.seedCompanyCreationSuccess(company_id);
      await companyFeatureValuesService.seedCompanyFeatureValues(company_id);
      await attendanceTypeService.seedDefaultAttendanceTypes(company_id);
      await payHeadService.seedDefaultPayHeads(company_id);

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