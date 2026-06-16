const auditTrailService = require('../auditTrail/auditTrailService');

module.exports = {
  getAll: async (event, { company_id, limit } = {}) => {
    return await auditTrailService.getAll(company_id, { limit });
  },
  getByEntity: async (event, { company_id, entity_type, entity_id } = {}) => {
    return await auditTrailService.getByEntity(company_id, entity_type, entity_id);
  },
  verifyChain: async (event, { company_id } = {}) => {
    return await auditTrailService.verifyChain(company_id);
  },
};
