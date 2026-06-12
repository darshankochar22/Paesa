const tcsNatureOfGoodsService = require('./tcsNatureOfGoodsService');

module.exports = {
  create: async (event, data) => {
    return await tcsNatureOfGoodsService.create(data);
  },
  getAll: async (event, company_id) => {
    return await tcsNatureOfGoodsService.getAll(company_id);
  },
  getById: async (event, id) => {
    return await tcsNatureOfGoodsService.getById(id);
  },
  update: async (event, data) => {
    return await tcsNatureOfGoodsService.update(data);
  },
  delete: async (event, id) => {
    return await tcsNatureOfGoodsService.delete(id);
  },
};
