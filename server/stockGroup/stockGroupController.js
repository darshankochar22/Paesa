const stockGroupService = require('../stockGroup/stockGroupService');

module.exports = {
    create: async (event, data) => {
        return await stockGroupService.create(data);
    },

    getAll: async (event, company_id) => {
        return await stockGroupService.getAll(company_id);
    },

    getById: async (event, id) => {
        return await stockGroupService.getById(id);
    },

    update: async (event, id) => {
        return await stockGroupService.update(data);
    },

    delete: async (event ,id) => {
        return await stockGroupService.delete(id);
    },

    getTree: async (event, company_id) => {
        return await stockGroupService.getTree(company_id);
    },
};