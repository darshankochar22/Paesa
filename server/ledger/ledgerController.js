const ledgerService = require('../ledger/ledgerService');
const auditTrailService = require('../auditTrail/auditTrailService');

const ENTITY_TYPE = 'ledger';

module.exports = {
    create: async (event, data) => {
        const result = await ledgerService.create(data);
        if (result && result.success && result.ledger) {
            try {
                await auditTrailService.record({
                    company_id: result.ledger.company_id,
                    entity_type: ENTITY_TYPE,
                    entity_id: result.ledger.ledger_id,
                    action: 'create',
                    before: null,
                    after: result.ledger,
                });
            } catch (auditErr) {
                console.error('Error recording ledger create audit:', auditErr);
            }
        }
        return result;
    },

    getAll: async (event, company_id) => {
        return await ledgerService.getAll(company_id);
    },

    getById: async (event, id) => {
        return await ledgerService.getById(id);
    },

    update: async (event, data) => {
        let before = null;
        try {
            const snap = await ledgerService.getById(data.ledger_id);
            if (snap && snap.success) before = snap.ledger;
        } catch (snapErr) {
            console.error('Error fetching ledger update snapshot:', snapErr);
        }
        const result = await ledgerService.update(data);
        if (result && result.success && result.ledger) {
            try {
                await auditTrailService.record({
                    company_id: result.ledger.company_id,
                    entity_type: ENTITY_TYPE,
                    entity_id: result.ledger.ledger_id,
                    action: 'update',
                    before,
                    after: result.ledger,
                });
            } catch (auditErr) {
                console.error('Error recording ledger update audit:', auditErr);
            }
        }
        return result;
    },

    delete: async (event, id) => {
        let before = null;
        try {
            const snap = await ledgerService.getById(id);
            if (snap && snap.success) before = snap.ledger;
        } catch (snapErr) {
            console.error('Error fetching ledger delete snapshot:', snapErr);
        }
        const result = await ledgerService.delete(id);
        if (result && result.success && before) {
            try {
                await auditTrailService.record({
                    company_id: before.company_id,
                    entity_type: ENTITY_TYPE,
                    entity_id: before.ledger_id,
                    action: 'delete',
                    before,
                    after: null,
                });
            } catch (auditErr) {
                console.error('Error recording ledger delete audit:', auditErr);
            }
        }
        return result;
    },

    getByGroup: async (event, {company_id, group_id } ) => {
        return await ledgerService.getByGroup(company_id, group_id);
    },
};
