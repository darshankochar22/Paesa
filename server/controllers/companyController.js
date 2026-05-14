const companyService = require('../service/companyService');

module.exports = {
    create: async (event, data) => {
        return await companyService.create(data);
    },

    getAll: async (event) => {
        return await companyService.getAll();
    },
    
    getById: async (event, id) => {
        return await companyService.getById(id);
    },

    update: async (event, data) => {
        return await companyService.update(data);
    },

    delete: async (event, id) => {
        return await companyService.delete(id);
    },

    verifyPassword: async (event, { id, password }) => {
    return await companyService.verifyPassword(id, password);
    },
};