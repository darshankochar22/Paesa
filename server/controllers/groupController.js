const groupService = require('../services/groupService');

module.exports = {
    create: async (event, data) => {
        return await groupService.create(data);
    },

    getAll: async (event, company_id) => {
        return await groupService.getAll(company_id);
    },

    getById: async (event, id) => {
        return await groupService.getById(id); 
    },

    update: async (event, data) => {
        return await groupService.update(data);
    },

    delete: async (event, id) => {
        return await groupService.delete(id);
    },

    getTree: async (event, company_id) => {
        return await groupService.getTree(company_id);
    },
};