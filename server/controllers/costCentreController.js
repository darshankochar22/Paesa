const costCentreService = require('../services/costCentreService');

module.exports = {
    create: async (event, data) => {
        return await costCentreService.create(data);
    },

    getAll: async (event, company_id) => {
        return await costCentreService.getAll(company_id);
    },

    getById: async (event, id) => {
        return await costCentreService.getById(id);
    },

    update: async (event, data) => {
        return await costCentreService.delete(id);
    },

    delete: async (event, id) => {
        return await costCentreService.delete(id);
    },

    getTree: async (event, company_id) => {
        return await costCentreService.getTree(company_id);
    },
};