const bcrypt = require('bcrypt');
const db = require('../db/index');
const groupService = require('./groupService');
const ledgerService = require('./ledgerService');
const unitService = require('./unitService');
const stockGroupService = require('./stockGroupService');
const godownService = require('./godownService');
const currencyService = require('./currencyService');
const voucherTypeService = require('./voucherTypeService');
const gstClassificationService = require('./gstClassificationService');

module.exports = {
    create: async (data) => {
        try {
            let hashedPassword = null;
            if (data.password) {
                hashedPassword = await bcrypt.hash(data.password, 10);
            }

            const stmt = db.prepare(`
                INSERT INTO companies (
                    name, mailing_name, address1, address2, state, country,
                    pincode, telephone, mobile, fax, email, website,
                    base_currency_symbol, formal_name,
                    financial_year_beginning_from, books_beginning_from,
                    password, access_control, edit_log
                ) VALUES (
                    @name, @mailing_name, @address1, @address2, @state, @country,
                    @pincode, @telephone, @mobile, @fax, @email, @website,
                    @base_currency_symbol, @formal_name,
                    @financial_year_beginning_from, @books_beginning_from,
                    @password, @access_control, @edit_log
                )
            `);

            const result = stmt.run({
                name: data.name,
                mailing_name: data.mailing_name || null,
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
                base_currency_symbol: data.base_currency_symbol || null,
                formal_name: data.formal_name || null,
                financial_year_beginning_from: data.financial_year_beginning_from || null,
                books_beginning_from: data.books_beginning_from || null,
                password: hashedPassword,
                access_control: null,
                edit_log: null,
            });

            const company_id = result.lastInsertRowid;

            groupService.seedDefaultGroups(company_id);
            const allGroups = (await groupService.getAll(company_id)).groups;
            ledgerService.seedDefaultLedgers(company_id, allGroups);
            unitService.seedDefaultUnits(company_id);
            stockGroupService.seedDefaultStockGroups(company_id);
            godownService.seedDefaultGodowns(company_id);
            currencyService.seedDefaultCurrency(company_id);
            voucherTypeService.seedDefaultVoucherTypes(company_id);
            gstClassificationService.seedDefaultGSTClassifications(company_id);

            const company = db.prepare(`SELECT * FROM companies WHERE company_id = ?`).get(company_id);
            const { password, ...safe } = company;
            return { success: true, company: safe };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    getAll: async () => {
        try {
            const companies = db.prepare(`SELECT * FROM companies`).all();
            const safe = companies.map(({ password, ...rest }) => rest);
            return { success: true, companies: safe };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    getById: async (id) => {
        try {
            const company = db.prepare(`SELECT * FROM companies WHERE company_id = ?`).get(id);
            if (!company) return { success: false, error: 'Company not found' };
            const { password, ...safe } = company;
            return { success: true, company: safe };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    update: async (data) => {
        try {
            const company = db.prepare(`SELECT * FROM companies WHERE company_id = ?`).get(data.company_id);
            if (!company) return { success: false, error: 'Company not found' };

            const newPassword = data.password
                ? await bcrypt.hash(data.password, 10)
                : company.password;

            db.prepare(`
                UPDATE companies SET
                    name = @name,
                    mailing_name = @mailing_name,
                    address1 = @address1,
                    address2 = @address2,
                    state = @state,
                    country = @country,
                    pincode = @pincode,
                    telephone = @telephone,
                    mobile = @mobile,
                    fax = @fax,
                    email = @email,
                    website = @website,
                    base_currency_symbol = @base_currency_symbol,
                    formal_name = @formal_name,
                    financial_year_beginning_from = @financial_year_beginning_from,
                    books_beginning_from = @books_beginning_from,
                    password = @password
                WHERE company_id = @company_id
            `).run({
                ...data,
                password: newPassword,
            });

            const updated = db.prepare(`SELECT * FROM companies WHERE company_id = ?`).get(data.company_id);
            const { password, ...safe } = updated;
            return { success: true, company: safe };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    delete: async (id) => {
        try {
            const company = db.prepare(`SELECT * FROM companies WHERE company_id = ?`).get(id);
            if (!company) return { success: false, error: 'Company not found' };

            db.prepare(`DELETE FROM companies WHERE company_id = ?`).run(id);
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    verifyPassword: async (id, password) => {
        try {
            const company = db.prepare(`SELECT * FROM companies WHERE company_id = ?`).get(id);
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