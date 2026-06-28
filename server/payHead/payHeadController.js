const payHeadService = require('../payHead/payHeadService');

module.exports = {
  create: async (event, data) => payHeadService.create(data),
  getAll: async (event, company_id) => payHeadService.getAll(company_id),
  getTotalOpeningBalance: async (event, company_id) => payHeadService.getTotalOpeningBalance(company_id),
  getById: async (event, id) => payHeadService.getById(id),
  update: async (event, data) => payHeadService.update(data),
  delete: async (event, id) => payHeadService.delete(id),
  getSlabs: async (event, pay_head_id) => payHeadService.getSlabs(pay_head_id),
  createSlab: async (event, data) => payHeadService.createSlab(data),
  deleteSlab: async (event, id) => payHeadService.deleteSlab(id),
  getFormulas: async (event, pay_head_id) => payHeadService.getFormulas(pay_head_id),
  createFormula: async (event, data) => payHeadService.createFormula(data),
  deleteFormula: async (event, id) => payHeadService.deleteFormula(id),
  getGratuitySlabs: async (event, pay_head_id) => payHeadService.getGratuitySlabs(pay_head_id),
  createGratuitySlab: async (event, data) => payHeadService.createGratuitySlab(data),
  deleteGratuitySlab: async (event, id) => payHeadService.deleteGratuitySlab(id),
};