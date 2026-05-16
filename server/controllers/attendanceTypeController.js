const attendanceTypeService = require('../services/attendanceTypeService');

module.exports = {
  create: async (event, data) => {
    return await attendanceTypeService.create(data);
  },
  getAll: async (event, company_id) => {
    return await attendanceTypeService.getAll(company_id);
  },
  getById: async (event, id) => {
    return await attendanceTypeService.getById(id);
  },
  update: async (event, data) => {
    return await attendanceTypeService.update(data);
  },
  delete: async (event, id) => {
    return await attendanceTypeService.delete(id);
  },
};