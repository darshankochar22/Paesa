const bcrypt = require('bcrypt');
const groupService = require('./groupService');
const ledgerService = require('./ledgerService'); 

let companies = [];

module.exports = {
    create: async (data) => {
        try {
            let hashedPassword = null;
            if(data.password) {
                hashedPassword = await bcrypt.hash(data.password, 10);
            }

            const company = {
                company_id: Date.now(),
                name: data.name,
                mailing_name: data.mailing_name,
                address1: data.address1,
                address2: data.address2,
                state: data.state,
                country: data.country,
                pincode: data.pincode,
                telephone: data.telephone,
                mobile: data.mobile,
                fax: data.fax,
                email: data.email,
                website: data.website,
                base_currency_symbol: data.base_currency_symbol,
                formal_name: data.formal_name,
                financial_year_beginning_from: data.financial_year_beginning_from,
                books_beginning_from: data.books_beginning_from,
                password: hashedPassword,
                access_control: null,
                edit_log: null,
                created_at: new Date().toISOString(),
            };

            companies.push(company);
            groupService.seedDefaultGroups(company.company_id);
            
            const allGroups = (await groupService.getAll(company.company_id)).groups;
            ledgerService.seedDefaultLedgers(company.company_id, allGroups); 
            return { success: true, company };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    getAll: async () => {
        try {
            const safe = companies.map(({ password, ...rest}) => rest);
            return { success: true, companies: safe };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    getById: async (id) => {
        try {
            const company = companies.find( c => c.company_id == id );
            if(!company) return { success: false, error: "Company not found" };

            const { password, ...safe } = company;
            return { success: true, company: safe };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    update: async (data) => {
        try {
            const index = companies.findIndex(c => c.company_id === data.company_id);
            if(index === -1) return { success: false, error: "Company" };

            if(data.password){
                data.password = await bcrypt.hash(data.password, 10);
            }
            else{
                data.password = companies[index].password;
            }

            companies[index] = { ...companies[index], ...data };
            return { success: true, company: companies[index] };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    delete: async(id) => {
        try {
            companies = companies.filter(c => c.company_id !== id);
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    verifyPassword: async (id, password) => {
        try {
            const company = companies.find(c => c.company_id === id);
            if(!company) return { success: false, error: "Company not found" };
            if(!company.password) return { success: true };

            const match = await bcrypt.compare(password, company.password);
            if(!match) return { success: false, error: "Wrong password" };

            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },
};