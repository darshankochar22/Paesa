const bcrypt = require('bcryptjs');
const { db } = require('../db/index');
const { sql, eq } = require('drizzle-orm');
const { companies } = require('../db/schema');
const groupService = require('../group/groupService');
const ledgerService = require('../ledger/ledgerService');
const unitService = require('../unit/unitService');
const stockGroupService = require('../stockGroup/stockGroupService');
const godownService = require('../godown/godownService');
const currencyService = require('../currency/currencyService');
const voucherTypeService = require('../voucherType/voucherTypeService');
const gstClassificationService = require('../gstClassification/gstClassificationService');
const employeeCategoryService = require('../employeeCategory/employeeCategoryService');
const employeeGroupService = require('../employeeGroup/employeeGroupService');
const payrollUnitService = require('../payrollUnit/payrollUnitService');
const tallyFeaturesService = require('../tallyFeatures/tallyFeaturesService');
const companyCreationSuccessService = require('../companyCreationSuccess/companyCreationSuccessService');
const companyFeatureValuesService = require('../companyFeatureValues/companyFeatureValuesService');
const attendanceTypeService = require('../attendanceType/attendanceTypeService');
const payHeadService = require('../payHead/payHeadService');
const financialYearService = require('../financialYear/financialYearService');

// Fetch a single company row in the legacy snake_case shape (or undefined).
const findRow = async (whereSql) => {
  const rows = await db.all(sql`SELECT * FROM ${companies} WHERE ${whereSql}`);
  return rows[0];
};

module.exports = {
  create: async (data) => {
    try {
      let hashedPassword = null;
      if (data.password) {
        hashedPassword = await bcrypt.hash(data.password, 10);
      }

      const inserted = await db
        .insert(companies)
        .values({
          name: data.name,
          mailingName: data.mailing_name || null,
          address1: data.address1 || null,
          address2: data.address2 || null,
          state: data.state || null,
          country: data.country || null,
          pincode: data.pincode || null,
          telephone: data.telephone || null,
          mobile: data.mobile || null,
          fax: data.fax || null,
          email: data.email || null,
          website: data.website || null,
          baseCurrencySymbol: data.base_currency_symbol || null,
          formalName: data.formal_name || null,
          financialYearBeginningFrom: data.financial_year_beginning_from || null,
          booksBeginningFrom: data.books_beginning_from || null,
          password: hashedPassword,
          accessControl: null,
          editLog: null,
        })
        .returning({ id: companies.companyId });

      const company_id = Number(inserted[0].id);

      try { await groupService.seedDefaultGroups(company_id); console.log('groups ok'); } catch(e) { console.error('groups failed:', e.message); }
      try { const allGroups = (await groupService.getAll(company_id)).groups; await ledgerService.seedDefaultLedgers(company_id, allGroups); console.log('ledgers ok'); } catch(e) { console.error('ledgers failed:', e.message); }
      try { await unitService.seedDefaultUnits(company_id); console.log('units ok'); } catch(e) { console.error('units failed:', e.message); }
      try { await stockGroupService.seedDefaultStockGroups(company_id); console.log('stockGroups ok'); } catch(e) { console.error('stockGroups failed:', e.message); }
      try { await godownService.seedDefaultGodowns(company_id); console.log('godowns ok'); } catch(e) { console.error('godowns failed:', e.message); }
      try { await currencyService.seedDefaultCurrency(company_id); console.log('currency ok'); } catch(e) { console.error('currency failed:', e.message); }
      try { await voucherTypeService.seedDefaultVoucherTypes(company_id); console.log('voucherTypes ok'); } catch(e) { console.error('voucherTypes failed:', e.message); }
      try { await employeeCategoryService.seedDefaultEmployeeCategory(company_id); console.log('employeeCategories ok'); } catch(e) { console.error('employeeCategories failed:', e.message); }
      try { await employeeGroupService.seedDefaultEmployeeGroups(company_id); console.log('employeeGroups ok'); } catch(e) { console.error('employeeGroups failed:', e.message); }
      try { await payrollUnitService.seedDefaultPayrollUnits(company_id); console.log('payrollUnits ok'); } catch(e) { console.error('payrollUnits failed:', e.message); }
      try { await tallyFeaturesService.seedDefaultFeatures(company_id); console.log('tallyFeatures ok'); } catch(e) { console.error('tallyFeatures failed:', e.message); }
      try { await companyCreationSuccessService.seedCompanyCreationSuccess(company_id); console.log('companyCreationSuccess ok'); } catch(e) { console.error('companyCreationSuccess failed:', e.message); }
      try { await companyFeatureValuesService.seedCompanyFeatureValues(company_id); console.log('companyFeatureValues ok'); } catch(e) { console.error('companyFeatureValues failed:', e.message); }
      try { await attendanceTypeService.seedDefaultAttendanceTypes(company_id); console.log('attendanceTypes ok'); } catch(e) { console.error('attendanceTypes failed:', e.message); }
      try { await payHeadService.seedDefaultPayHeads(company_id); console.log('payHeads ok'); } catch(e) { console.error('payHeads failed:', e.message); }
      try { await financialYearService.seedDefaultFY(company_id, data.financial_year_beginning_from); console.log('fy ok'); } catch(e) {  console.error('fy failed:', e.message); }

      const company = await findRow(sql`${companies.companyId} = ${company_id}`);
      const { password, ...safe } = company;
      return { success: true, company: safe };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async () => {
    try {
      const rows = await db.all(sql`SELECT * FROM ${companies}`);
      const safe = rows.map(({ password, ...rest }) => rest);
      return { success: true, companies: safe };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const company = await findRow(sql`${companies.companyId} = ${id}`);
      if (!company) return { success: false, error: 'Company not found' };
      const { password, ...safe } = company;
      return { success: true, company: safe };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const current = await findRow(sql`${companies.companyId} = ${data.company_id}`);
      if (!current) return { success: false, error: 'Company not found' };

      const newPassword = data.password
        ? await bcrypt.hash(data.password, 10)
        : current.password;

      await db
        .update(companies)
        .set({
          name: data.name ?? current.name,
          mailingName: data.mailing_name ?? current.mailing_name,
          address1: data.address1 ?? current.address1,
          address2: data.address2 ?? current.address2,
          state: data.state ?? current.state,
          country: data.country ?? current.country,
          pincode: data.pincode ?? current.pincode,
          telephone: data.telephone ?? current.telephone,
          mobile: data.mobile ?? current.mobile,
          fax: data.fax ?? current.fax,
          email: data.email ?? current.email,
          website: data.website ?? current.website,
          baseCurrencySymbol: data.base_currency_symbol ?? current.base_currency_symbol,
          formalName: data.formal_name ?? current.formal_name,
          financialYearBeginningFrom:
            data.financial_year_beginning_from ?? current.financial_year_beginning_from,
          booksBeginningFrom: data.books_beginning_from ?? current.books_beginning_from,
          password: newPassword,
        })
        .where(eq(companies.companyId, data.company_id));

      const updated = await findRow(sql`${companies.companyId} = ${data.company_id}`);
      const { password, ...safe } = updated;
      return { success: true, company: safe };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await findRow(sql`${companies.companyId} = ${id}`);
      if (!existing) return { success: false, error: 'Company not found' };

      await db.delete(companies).where(eq(companies.companyId, id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  verifyPassword: async (id, password) => {
    try {
      const company = await findRow(sql`${companies.companyId} = ${id}`);
      if (!company) return { success: false, error: 'Company not found' };
      if (!company.password) return { success: true };

      const match = await bcrypt.compare(password, company.password);
      if (!match) return { success: false, error: 'Wrong password' };

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
