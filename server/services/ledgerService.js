
let ledgers = [];
let ledgerBankDetails = [];
let ledgerStatutoryDetails = [];

const seedDefaultLedgers = (company_id, groups) => {
    const cashGroup = groups.find(g => g.name === 'Cash-in-hand' && g.company_id === company_id );
    const plGroup = groups.find(g => g.name === 'Capital Account' && g.company_id === company_id );

    const defaults = [
        {
            group_id: cashGroup ? cashGroup.id : null,
            name: 'Cash',
            ledger_type: 'Cash',
            nature: 'Assets',
            is_predefined: true,
        },
        {
            group_id: plGroup ? plGroupid: null,
            name: 'Profit & Loss A/c',
            ledger_type: 'General',
            nature: 'Liabilities',
            is_predefined: true,
        },
    ];

    defaults.forEach((l,i) =>{
        ledgers.push({
            id: Date.now() + i,
            company_id,
            group_id: l.group_id,
            name: l.name,
            alias: null,
            ledger_type: l.ledger_type,
            nature: l.nature,
            opening_balance : 0,
            closing_balance: 0,
            is_bill_wise: false,
            maintain_inventory_values: false,
            mailing_name: null,
            address1: null,
            address2: null,
            city: null,
            state: null,
            country: null,
            state: null,
            country: null,
            pincode: null,
            phone: null,
            email:null,
            gstin: null,
            pan: null,
            registration_type: null,
            bank_name: null,
            account_number: null,
            ifsc_code: null,
            is_active: true,
            is_predefined: l.is_predefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });
    });
};

module.exports = {
    seedDefaultLedgers,

    create: async (data) => {
        try {
            const exists = ledgers.find(
                l => l.company_id === data.company_id &&
                l.name.toLowerCase() === data.name.toLowerCase()
            );

            if(exists) return { success: false, error: 'Ledger already exists' };

            const ledger = {
                id: Date.now(),
                company_id: data.company_id,
                group_id: data.group_id,
                name: data.name,
                alias: data.alias || null,
                ledger_type: data.ledger_type || 'General',
                nature: data.nature,
                opening_balance: data.opening_balance || 0,
                closing_balance: data.closing_balance || 0,
                is_bill_wise: data.is_bill_wise || false,
                maintain_inventory_values: data.maintain_inventory_values || false,
                mailing_name: data.mailing_name || null,
                address1: data.address1 || null,
                address2: data.address2 || null,
                city: data.city || null,
                state: data.state || null,
                country: data.country || null,
                pincode: data.pincode || null,
                phone: data.phone || null,
                email : data.email || null,
                gstin: data.gstin || null,
                pan: data.pan || null,
                registration_type: data.registration_type || 'Unregistered',
                bank_name: data.bank_name || null,
                account_number: data.account_number || null,
                ifsc_code: data.ifsc_code || null,
                is_active: true,
                is_predefined: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            if(data.bank_details){
                ledgerBankDetails.push({
                    id: Date.now() +1,
                    ledger_id: ledger.id,
                    account_holder_name: data.bank_details.account_holder_name || null,
                    account_number: data.bank_details.account_number || null,
                    ifsc_code: data.bank_details.ifsc_code || null,
                    swift_code: data.bank_details.swift_code || null,
                    bank_name: data.bank_details.bank_name || null,
                    branch_name: data.bank_details.branch_name || null,
                    bank_configuration: data.bank_details.bank_configuration || null,
                    cheque_book_start_no: data.bank_details.cheque_book_start_no || null,
                    cheque_book_end_no: data.bank_details.cheque_book_end_no || null,
                    enable_cheque_printing: data.bank_details.enable_cheque_printing || false,
                    cheque_printing_configuration: data.bank_details.cheque_printing_configuration || null,
                    od_limit: data.bank_details.od_limit || 0, 
                });
            }

            if(data.statutory_details){
                ledgerStatutoryDetails.push({
                    id: Date.now() + 2,
                    ledger_id: ledger.id,
                    gst_applicability: data.statutory_details.gst_applicability || 'Not Applicable',
                    hsn_sac_code: data.statutory_details.hsn_sac_code || null,
                    hsn_sac_description: data.statutory_details.hsn_sac_description || null,
                    gst_rate: data.statutory_details.gst_rate || 0,
                    cgst_rate: data.statutory_details.cgst_rate || 0,
                    sgst_rate: data.statutory_details.sgst_rate || 0,
                    igst_rate: data.statutory_details.igst_rate || 0,
                    type_of_duty_tax: data.statutory_details.type_of_duty_tax || null,
                    percentage_of_calculation: data.statutory_details.percentage_of_calculation || 0,
                    statutory_details: data.statutory_details.statutory_details || null,
                });
            }               
            
            return { success: true, ledger };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },


    getAll: async (company_id) => {
        try {
            const result = ledgers.filter(l => l.company_id === company_id && l.is_active);
            return { success: true, ledgers: result };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    getById: async (id) => {
        try {
            const ledger = ledgers.find(l => l.id === id);
            if (!ledger) return { success: false, error: 'Ledger not found' };

            const bankDetails = ledgerBankDetails.find(b => b.ledger_id === id ) || null;
            const statutory = ledgerStatutoryDetails.find(s => s.ledger_id === id) || null;

            return { success: true, ledger: {...ledger, bank_details: bankDetails, statutory_details: statutory } };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    getByGroup: async (company_id, group_id) => {
        try {
            const result = ledgers.filter(
                l => l.company_id === company_id && l.group_id === group_id && l.is_active
            );

            return { success: true, ledger: result };
        } catch (err) {
            return { success: false, error: er.message };
        }
    },

    update: async (data) => {
        try{
            const index = ledgers.findIndex(l => l.id === data.id);
            if(index === -1) return { success: false, error: 'Ledger not found'};
            if(ledgers[index].is_predefined ) return { success: false, error: 'Cannot edit predefined ledgers' };

            ledgers[index] = {
                ...ledgers[index],
                ...data,
                updated_at: new Date().toISOString(),
            };

            if(data.bank_details){
                const bIndex = ledgerBankDetails.findIndex(b => b.ledger_id === data.id);
                if(bIndex !== -1){
                    ledgerBankDetails[bIndex] = { ...ledgerBankDetails[bIndex], ...data.bank_details };
                } else{
                    ledgerBankDetails.push({ id: Date.now(), ledger_id: data.id, ...data.bank_details });
                }
            } 

            if(data.statutory_details){
                const sIndex = ledgerStatutoryDetails.findIndex(s => s.ledger_id === data.id);
                if(sIndex !== -1 ){
                    ledgerStatutoryDetails[sIndex] = { ...ledgerStatutoryDetails[sIndex], ...data.statutory_details };
                } else{
                    ledgerStatutoryDetails.push({ id: Date.now(), ledger_id: data.id, ...data.statutory_details });
                }
            }

            return { success: true, ledger: ledgers[index] };
        } catch (err){
            return { success: false, error: err.message };
        }
    },

    delete: async (id) =>{
        try{
            const ledger = ledgers.find(l => l.id === id);
            if(!ledger) return { success: false, error: 'Ledger not found' };
            if(ledger.is_predefined) return { success: false, error: 'Cannot delete predefined ledgers' };

            ledgers = ledgers.map(l => l.id === id ? { ...l, is_active: false } : l);
            return { success : true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },
};

