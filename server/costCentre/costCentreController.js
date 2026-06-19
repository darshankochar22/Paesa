const costCentreService = require('../costCentre/costCentreService');
const auditTrailService = require('../auditTrail/auditTrailService');

const ENTITY_TYPE = 'cost_centre';

module.exports = {
    create: async (event, data) => {
        const result = await costCentreService.create(data);
        if (result && result.success && result.costCentre) {
            try {
                await auditTrailService.record({
                    company_id: result.costCentre.company_id,
                    entity_type: ENTITY_TYPE,
                    entity_id: result.costCentre.cc_id,
                    action: 'create',
                    before: null,
                    after: result.costCentre,
                });
            } catch (err) {
                console.error('Error recording cost centre create audit:', err);
            }
        }
        return result;
    },

    getAll: async (event, company_id) => {
        return await costCentreService.getAll(company_id);
    },

    getById: async (event, id) => {
        return await costCentreService.getById(id);
    },

    update: async (event, data) => {
        let before = null;
        try {
            const snap = await costCentreService.getById(data.cc_id);
            if (snap && snap.success) before = snap.costCentre;
        } catch (err) {
            console.error('Error fetching cost centre update snapshot:', err);
        }
        const result = await costCentreService.update(data);
        if (result && result.success && result.costCentre) {
            try {
                await auditTrailService.record({
                    company_id: result.costCentre.company_id,
                    entity_type: ENTITY_TYPE,
                    entity_id: result.costCentre.cc_id,
                    action: 'update',
                    before,
                    after: result.costCentre,
                });
            } catch (err) {
                console.error('Error recording cost centre update audit:', err);
            }
        }
        return result;
    },

    delete: async (event, id) => {
        let before = null;
        try {
            const snap = await costCentreService.getById(id);
            if (snap && snap.success) before = snap.costCentre;
        } catch (err) {
            console.error('Error fetching cost centre delete snapshot:', err);
        }
        const result = await costCentreService.delete(id);
        if (result && result.success && before) {
            try {
                await auditTrailService.record({
                    company_id: before.company_id,
                    entity_type: ENTITY_TYPE,
                    entity_id: before.cc_id,
                    action: 'delete',
                    before,
                    after: null,
                });
            } catch (err) {
                console.error('Error recording cost centre delete audit:', err);
            }
        }
        return result;
    },

    getTree: async (event, company_id) => {
        return await costCentreService.getTree(company_id);
    },
};