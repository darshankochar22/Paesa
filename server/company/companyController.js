const companyService = require('../company/companyService');

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

    setDefaultGstRegistration: async (event, { company_id, gst_registration_id }) => {
        return await companyService.setDefaultGstRegistration(company_id, gst_registration_id);
    },

    getDefaultGstRegistration: async (event, company_id) => {
        return await companyService.getDefaultGstRegistration(company_id);
    },
};