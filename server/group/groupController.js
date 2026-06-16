const groupService = require('../group/groupService');
const auditTrailService = require('../auditTrail/auditTrailService');

const ENTITY_TYPE = 'group';

module.exports = {
    create: async (event, data) => {
        const result = await groupService.create(data);
        if (result && result.success && result.group) {
            try {
                await auditTrailService.record({
                    company_id: result.group.company_id,
                    entity_type: ENTITY_TYPE,
                    entity_id: result.group.group_id,
                    action: 'create',
                    before: null,
                    after: result.group,
                });
            } catch (auditErr) {
                console.error('Error recording group create audit:', auditErr);
            }
        }
        return result;
    },

    getAll: async (event, company_id) => {
        return await groupService.getAll(company_id);
    },

    getById: async (event, id) => {
        return await groupService.getById(id);
    },

    update: async (event, data) => {
        let before = null;
        try {
            const snap = await groupService.getById(data.group_id);
            if (snap && snap.success) before = snap.group;
        } catch (snapErr) {
            console.error('Error fetching group update snapshot:', snapErr);
        }
        const result = await groupService.update(data);
        if (result && result.success && result.group) {
            try {
                await auditTrailService.record({
                    company_id: result.group.company_id,
                    entity_type: ENTITY_TYPE,
                    entity_id: result.group.group_id,
                    action: 'update',
                    before,
                    after: result.group,
                });
            } catch (auditErr) {
                console.error('Error recording group update audit:', auditErr);
            }
        }
        return result;
    },

    delete: async (event, id) => {
        let before = null;
        try {
            const snap = await groupService.getById(id);
            if (snap && snap.success) before = snap.group;
        } catch (snapErr) {
            console.error('Error fetching group delete snapshot:', snapErr);
        }
        const result = await groupService.delete(id);
        if (result && result.success && before) {
            try {
                await auditTrailService.record({
                    company_id: before.company_id,
                    entity_type: ENTITY_TYPE,
                    entity_id: before.group_id,
                    action: 'delete',
                    before,
                    after: null,
                });
            } catch (auditErr) {
                console.error('Error recording group delete audit:', auditErr);
            }
        }
        return result;
    },

    getTree: async (event, company_id) => {
        return await groupService.getTree(company_id);
    },
};
