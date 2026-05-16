const voucherService = require('./voucherService');
const ledgerService  = require('./ledgerService');

let reconciliations = []; 

module.exports = {
  getUnreconciled: async (company_id, fy_id, ledger_id) => {
    try {
      const { ledger } = await ledgerService.getById(ledger_id);
      if (!ledger) return { success: false, error: 'Ledger not found' };
      if (ledger.ledger_type !== 'Bank') return { success: false, error: 'Not a bank ledger' };

      const { vouchers } = await voucherService.getAll(company_id, fy_id);
      const unreconciled = [];

      for (const v of vouchers) {
        const full = await voucherService.getById(v.id);
        if (!full.success) continue;

        const bankEntries = full.voucher.entries.filter(e => e.ledger_id === ledger_id);
        bankEntries.forEach(e => {
          const isReconciled = reconciliations.some(r => r.entry_id === e.id);
          if (!isReconciled) {
            unreconciled.push({
              entry_id: e.id,
              voucher_id: v.id,
              voucher_number: v.voucher_number,
              voucher_type: v.voucher_type,
              date: v.date,
              narration: v.narration,
              type: e.type,
              amount: e.amount,
            });
          }
        });
      }

      unreconciled.sort((a, b) => new Date(a.date) - new Date(b.date));
      return { success: true, transactions: unreconciled };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  reconcile: async (data) => {
    try {
      const already = reconciliations.find(r => r.entry_id === data.entry_id);
      if (already) return { success: false, error: 'Already reconciled' };

      reconciliations.push({
        id: Date.now(),
        entry_id: data.entry_id,
        voucher_id: data.voucher_id,
        ledger_id: data.ledger_id,
        reconciled_date: data.reconciled_date || new Date().toISOString().split('T')[0],
        bank_date: data.bank_date || null,      
        bank_reference: data.bank_reference || null, 
        reconciled_at: new Date().toISOString(),
      });

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  unreconcile: async (entry_id) => {
    try {
      const exists = reconciliations.find(r => r.entry_id === entry_id);
      if (!exists) return { success: false, error: 'Reconciliation not found' };

      reconciliations = reconciliations.filter(r => r.entry_id !== entry_id);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getStatement: async (company_id, fy_id, ledger_id, from_date, to_date) => {
    try {
      const { ledger } = await ledgerService.getById(ledger_id);
      if (!ledger) return { success: false, error: 'Ledger not found' };

      const { vouchers } = await voucherService.getAll(company_id, fy_id);
      const rows = [];

      for (const v of vouchers) {
        if (from_date && v.date < from_date) continue;
        if (to_date   && v.date > to_date)   continue;

        const full = await voucherService.getById(v.id);
        if (!full.success) continue;

        const bankEntries = full.voucher.entries.filter(e => e.ledger_id === ledger_id);
        bankEntries.forEach(e => {
          const rec = reconciliations.find(r => r.entry_id === e.id);
          rows.push({
            entry_id: e.id,
            voucher_id: v.id,
            voucher_number: v.voucher_number,
            voucher_type: v.voucher_type,
            date: v.date,
            narration: v.narration,
            type: e.type,
            amount: e.amount,
            is_reconciled: !!rec,
            reconciled_date: rec ? rec.reconciled_date : null,
            bank_date: rec ? rec.bank_date : null,
            bank_reference: rec ? rec.bank_reference : null,
          });
        });
      }

      rows.sort((a, b) => new Date(a.date) - new Date(b.date));

      let balance = ledger.opening_balance || 0;
      const rowsWithBalance = rows.map(r => {
        balance += r.type === 'Dr' ? r.amount : -r.amount;
        return { ...r, balance };
      });

      return { success: true, ledger_name: ledger.name, rows: rowsWithBalance };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getSummary: async (company_id, fy_id, ledger_id) => {
    try {
      const { ledger } = await ledgerService.getById(ledger_id);
      if (!ledger) return { success: false, error: 'Ledger not found' };

      const { vouchers } = await voucherService.getAll(company_id, fy_id);

      let bookBalance      = ledger.opening_balance || 0;
      let reconciledAmount = 0;
      let unreconciledAmount = 0;

      for (const v of vouchers) {
        const full = await voucherService.getById(v.id);
        if (!full.success) continue;

        const bankEntries = full.voucher.entries.filter(e => e.ledger_id === ledger_id);
        bankEntries.forEach(e => {
          const amount = e.type === 'Dr' ? e.amount : -e.amount;
          bookBalance += amount;

          const isReconciled = reconciliations.some(r => r.entry_id === e.id);
          if (isReconciled) reconciledAmount  += Math.abs(amount);
          else              unreconciledAmount += Math.abs(amount);
        });
      }

      return {
        success: true,
        ledger_name: ledger.name,
        book_balance: bookBalance,
        reconciled_amount: reconciledAmount,
        unreconciled_amount: unreconciledAmount,
        total_reconciled_count: reconciliations.filter(r => r.ledger_id === ledger_id).length,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};