const unitService = require('../unit/unitService');

module.exports = {
    create: async (event, data) => {
        return await unitService.create(data);
    },

    getAll: async (event, company_id) => {
        return await unitService.getAll(company_id);
    },

    getSimpleUnits: async (event, company_id) => {
        return await unitService.getSimpleUnits(company_id);
    },

    getById: async (event, id) => {
        return await unitService.getById(id);
    },

    update: async (event, data) => {
        return await unitService.update(data);
    },

    delete: async (event, id) => {
        return await unitService.delete(id);
    },
};