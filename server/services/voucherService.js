let vouchers        = []; 
let voucherEntries  = []; 
let voucherStock    = [];
let voucherBatch    = [];  
let voucherBill     = []; 
let voucherBank     = []; 
let voucherCost     = [];  

const voucherCounters = {};

const generateVoucherNumber = (company_id, fy_id, voucher_type) => {
  const key = `${company_id}_${fy_id}_${voucher_type}`;
  if (!voucherCounters[key]) voucherCounters[key] = 1;
  else voucherCounters[key]++;

  const prefixMap = {
    Payment:         'PMT',
    Receipt:         'RCT',
    Journal:         'JNL',
    Contra:          'CTR',
    Sales:           'SAL',
    Purchase:        'PUR',
    'Debit Note':    'DBN',
    'Credit Note':   'CRN',
    'Stock Journal': 'STJ',
    'Delivery Note': 'DLN',
    'Receipt Note':  'RCN',
  };

  const prefix = prefixMap[voucher_type] || 'VCH';
  return `${prefix}-${String(voucherCounters[key]).padStart(5, '0')}`;
};

const validateDoubleEntry = (entries) => {
  const total = entries.reduce((sum, e) => {
    return e.type === 'Dr' ? sum + e.amount : sum - e.amount;
  }, 0);
  return Math.abs(total) < 0.01; 
};

module.exports = {
  create: async (data) => {
    try {
      if (data.is_accounting_voucher && data.entries) {
        if (!validateDoubleEntry(data.entries)) {
          return { success: false, error: 'Debit and Credit amounts must be equal' };
        }
      }

      const voucher_number = data.voucher_number ||
        generateVoucherNumber(data.company_id, data.fy_id, data.voucher_type);

      const voucher = {
        id: Date.now(),
        company_id: data.company_id,
        fy_id: data.fy_id,
        voucher_type: data.voucher_type,    
        voucher_number,
        date: data.date,
        reference_number: data.reference_number || null,
        reference_date: data.reference_date || null,
        narration: data.narration || null,
        party_ledger_id: data.party_ledger_id || null,  
        party_name: data.party_name || null,
        place_of_supply: data.place_of_supply || null,
        is_invoice: data.is_invoice || false,
        is_accounting_voucher: data.is_accounting_voucher ?? true,
        is_inventory_voucher: data.is_inventory_voucher || false,
        is_order_voucher: data.is_order_voucher || false,
        is_cancelled: false,
        is_optional: data.is_optional || false,
        is_post_dated: data.is_post_dated || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vouchers.push(voucher);

      if (data.entries && data.entries.length > 0) {
        data.entries.forEach((entry, i) => {
          const entryRecord = {
            id: Date.now() + i + 1,
            voucher_id: voucher.id,
            ledger_id: entry.ledger_id,
            ledger_name: entry.ledger_name || null,
            type: entry.type,                 
            amount: entry.amount,
            amount_forex: entry.amount_forex || entry.amount,
            currency: entry.currency || 'INR',
            narration: entry.narration || null,
          };
          voucherEntries.push(entryRecord);

          if (entry.cost_centres && entry.cost_centres.length > 0) {
            entry.cost_centres.forEach((cc, j) => {
              voucherCost.push({
                id: Date.now() + i + j + 100,
                voucher_id: voucher.id,
                entry_id: entryRecord.id,
                cost_centre_id: cc.cost_centre_id,
                amount: cc.amount,
              });
            });
          }
        });
      }

      if (data.stock_entries && data.stock_entries.length > 0) {
        data.stock_entries.forEach((item, i) => {
          const stockRecord = {
            id: Date.now() + i + 200,
            voucher_id: voucher.id,
            stock_item_id: item.stock_item_id,
            item_name: item.item_name || null,
            godown_id: item.godown_id || null,
            unit_id: item.unit_id || null,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.quantity * item.rate,
            additional_amount: item.additional_amount || 0,
            discount_amount: item.discount_amount || 0,
            hsn_code: item.hsn_code || null,
            gst_rate: item.gst_rate || 0,
            cgst_amount: item.cgst_amount || 0,
            sgst_amount: item.sgst_amount || 0,
            igst_amount: item.igst_amount || 0,
          };
          voucherStock.push(stockRecord);

          if (item.batch && item.batch.batch_number) {
            voucherBatch.push({
              id: Date.now() + i + 300,
              voucher_id: voucher.id,
              stock_entry_id: stockRecord.id,
              batch_number: item.batch.batch_number,
              expiry_date: item.batch.expiry_date || null,
              quantity: item.batch.quantity || item.quantity,
              rate: item.batch.rate || item.rate,
            });
          }
        });
      }

      if (data.bill_references && data.bill_references.length > 0) {
        data.bill_references.forEach((bill, i) => {
          voucherBill.push({
            id: Date.now() + i + 400,
            voucher_id: voucher.id,
            ledger_id: bill.ledger_id,
            bill_name: bill.bill_name,      
            bill_type: bill.bill_type,           
            amount: bill.amount,
            credit_period: bill.credit_period || null,
          });
        });
      }

      if (data.bank_details) {
        voucherBank.push({
          id: Date.now() + 500,
          voucher_id: voucher.id,
          ledger_id: data.bank_details.ledger_id,
          transaction_type: data.bank_details.transaction_type || 'Cheque',
          instrument_number: data.bank_details.instrument_number || null,
          instrument_date: data.bank_details.instrument_date || null,
          bank_name: data.bank_details.bank_name || null,
          branch: data.bank_details.branch || null,
          amount: data.bank_details.amount || 0,
        });
      }

      return { success: true, voucher };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id, fy_id) => {
    try {
      const result = vouchers.filter(
        v => v.company_id === company_id && v.fy_id === fy_id && !v.is_cancelled
      );
      return { success: true, vouchers: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const voucher = vouchers.find(v => v.id === id);
      if (!voucher) return { success: false, error: 'Voucher not found' };

      const entries     = voucherEntries.filter(e => e.voucher_id === id);
      const stockItems  = voucherStock.filter(s => s.voucher_id === id);
      const bills       = voucherBill.filter(b => b.voucher_id === id);
      const bank        = voucherBank.find(b => b.voucher_id === id) || null;
      const costCentres = voucherCost.filter(c => c.voucher_id === id);

      const stockWithBatches = stockItems.map(s => ({
        ...s,
        batches: voucherBatch.filter(b => b.stock_entry_id === s.id),
      }));

      return {
        success: true,
        voucher: {
          ...voucher,
          entries,
          stock_entries: stockWithBatches,
          bill_references: bills,
          bank_details: bank,
          cost_centres: costCentres,
        },
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getDaybook: async (company_id, fy_id, from_date, to_date) => {
    try {
      const result = vouchers.filter(v => {
        if (v.company_id !== company_id || v.fy_id !== fy_id) return false;
        if (v.is_cancelled) return false;
        if (from_date && v.date < from_date) return false;
        if (to_date && v.date > to_date) return false;
        return true;
      });

      result.sort((a, b) => new Date(a.date) - new Date(b.date));
      return { success: true, vouchers: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getByType: async (company_id, fy_id, voucher_type) => {
    try {
      const result = vouchers.filter(
        v => v.company_id === company_id &&
        v.fy_id === fy_id &&
        v.voucher_type === voucher_type &&
        !v.is_cancelled
      );
      return { success: true, vouchers: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getByLedger: async (company_id, fy_id, ledger_id) => {
    try {
      const ledgerEntries = voucherEntries.filter(e => e.ledger_id === ledger_id);
      const voucherIds = [...new Set(ledgerEntries.map(e => e.voucher_id))];
      const result = vouchers.filter(
        v => voucherIds.includes(v.id) &&
        v.company_id === company_id &&
        v.fy_id === fy_id &&
        !v.is_cancelled
      );
      return { success: true, vouchers: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const index = vouchers.findIndex(v => v.id === data.id);
      if (index === -1) return { success: false, error: 'Voucher not found' };
      if (vouchers[index].is_cancelled) return { success: false, error: 'Cannot edit cancelled voucher' };

      if (data.entries && !validateDoubleEntry(data.entries)) {
        return { success: false, error: 'Debit and Credit amounts must be equal' };
      }

      vouchers[index] = { ...vouchers[index], ...data, updated_at: new Date().toISOString() };

      if (data.entries) {
        voucherEntries = voucherEntries.filter(e => e.voucher_id !== data.id);
        data.entries.forEach((entry, i) => {
          voucherEntries.push({
            id: Date.now() + i,
            voucher_id: data.id,
            ledger_id: entry.ledger_id,
            type: entry.type,
            amount: entry.amount,
            amount_forex: entry.amount_forex || entry.amount,
            currency: entry.currency || 'INR',
            narration: entry.narration || null,
          });
        });
      }

      return { success: true, voucher: vouchers[index] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  cancel: async (id) => {
    try {
      const index = vouchers.findIndex(v => v.id === id);
      if (index === -1) return { success: false, error: 'Voucher not found' };

      vouchers[index] = {
        ...vouchers[index],
        is_cancelled: true,
        updated_at: new Date().toISOString(),
      };
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const voucher = vouchers.find(v => v.id === id);
      if (!voucher) return { success: false, error: 'Voucher not found' };

      vouchers       = vouchers.filter(v => v.id !== id);
      voucherEntries = voucherEntries.filter(e => e.voucher_id !== id);
      voucherStock   = voucherStock.filter(s => s.voucher_id !== id);
      voucherBatch   = voucherBatch.filter(b => b.voucher_id !== id);
      voucherBill    = voucherBill.filter(b => b.voucher_id !== id);
      voucherBank    = voucherBank.filter(b => b.voucher_id !== id);
      voucherCost    = voucherCost.filter(c => c.voucher_id !== id);

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};