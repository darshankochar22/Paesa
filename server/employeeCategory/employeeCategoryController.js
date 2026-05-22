const employeeCategoryService = require('./employeeCategoryService');

module.exports = {
  create: async (event, data) => {
    return await employeeCategoryService.create(data);
  },
  getAll: async (event, company_id) => {
    return await employeeCategoryService.getAll(company_id);
  },
  getById: async (event, id) => {
    return await employeeCategoryService.getById(id);
  },
  update: async (event, data) => {
    return await employeeCategoryService.update(data);
  },
  delete: async (event, id) => {
    return await employeeCategoryService.delete(id);
  },
};
