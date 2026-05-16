const salaryStructureService = require('../services/salaryStructureService');

module.exports = {
  create: async (event, data) => {
    return await salaryStructureService.create(data);
  },
  getAll: async (event, company_id) => {
    return await salaryStructureService.getAll(company_id);
  },
  getById: async (event, id) => {
    return await salaryStructureService.getById(id);
  },
  getByEmployee: async (event, { company_id, employee_id }) => {
    return await salaryStructureService.getByEmployee(company_id, employee_id);
  },
  update: async (event, data) => {
    return await salaryStructureService.update(data);
  },
  delete: async (event, id) => {
    return await salaryStructureService.delete(id);
  },
  createBulk: async (event, { company_id, employee_id, effective_from, entries }) => {
  return await salaryStructureService.createBulk(company_id, employee_id, effective_from, entries);
  },
};