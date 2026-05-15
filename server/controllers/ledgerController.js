const ledgerService = require('../service/ledgerService');

module.exports = {
    create: async (event, data) => {
        return await ledgerService.create(data);
    },

    getAll: async (event, company_id) => {
        return await ledgerService.getAll(company_id);
    },

    getById: async (event, id) => {
        return await ledgerService.getById(id);
    },

    update: async (event, data) => {
        return await ledgerService.update(data);
    },

    delete: async (event, id) => {
        return await ledgerService.delete(id);
    },

    getByGroup: async (event, {company_id, group_id } ) => {
        return await ledgerService.getByGroup(company_id, group_id);
    },
};