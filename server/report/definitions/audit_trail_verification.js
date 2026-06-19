const auditTrailService = require('../../auditTrail/auditTrailService');

module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    const verification = await auditTrailService.verifyChain(company_id);
    const logs = await auditTrailService.getAll(company_id);

    const edits = logs.filter(l => l.action === 'UPDATE' || l.action === 'DELETE' || l.action === 'CANCEL');

    return {
      success: true,
      intact: verification.intact,
      brokenAt: verification.brokenAt || null,
      total_logs: logs.length,
      total_edits: edits.length,
      logs_summary: logs.slice(0, 100).map(l => ({
        log_id: l.log_id,
        entity_type: l.entity_type,
        entity_id: l.entity_id,
        action: l.action,
        user: l.user,
        created_at: l.created_at
      }))
    };
  }
};
