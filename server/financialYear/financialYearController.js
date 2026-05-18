const financialYearService = require("./financialYearService");

module.exports = {
    create: async (event, data) => {
        return await financialYearService.create(data);
    },

    getAll: async (event, company_id) => {
        return await financialYearService.getAll(company_id);
    },

    getById: async (event, id) => {
        return await financialYearService.getById(id);
    },

    setActive: async (event, { fy_id, company_id } ) => {
        return await financialYearService.setActive(fy_id, company_id);
    },

    delete: async (event, id) => {
        return await financialYearService.delete(id);
    },
};