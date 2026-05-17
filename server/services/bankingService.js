const { db } = require('../db/index');

module.exports = {
  getUnreconciled: async (company_id, fy_id, ledger_id) => {
    try {
      const ledger = await db.execute(
        `SELECT * FROM ledgers WHERE ledger_id = ?`,
        [ledger_id]
      );
      if (ledger.rows.length === 0) return { success: false, error: 'Ledger not found' };
      if (ledger.rows[0].ledger_type !== 'Bank') return { success: false, error: 'Not a bank ledger' };

      const result = await db.execute(
        `SELECT v.voucher_id, v.voucher_number, v.voucher_type, v.date, v.narration,
                e.entry_id, e.type, e.amount
         FROM voucher_entries e
         INNER JOIN vouchers v ON v.voucher_id = e.voucher_id
         LEFT JOIN reconciliations r ON r.entry_id = e.entry_id
         WHERE v.company_id = ? AND v.fy_id = ? AND e.ledger_id = ?
           AND v.is_cancelled = 0 AND r.reconciliation_id IS NULL
         ORDER BY v.date ASC`,
        [company_id, fy_id, ledger_id]
      );

      return { success: true, transactions: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  reconcile: async (data) => {
    try {
      const already = await db.execute(
        `SELECT * FROM reconciliations WHERE entry_id = ?`,
        [data.entry_id]
      );
      if (already.rows.length > 0) return { success: false, error: 'Already reconciled' };

      await db.execute(
        `INSERT INTO reconciliations (entry_id, voucher_id, ledger_id, reconciled_date, bank_date, bank_reference)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          data.entry_id,
          data.voucher_id,
          data.ledger_id,
          data.reconciled_date || new Date().toISOString().split('T')[0],
          data.bank_date || null,
          data.bank_reference || null,
        ]
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  unreconcile: async (entry_id) => {
    try {
      const exists = await db.execute(
        `SELECT * FROM reconciliations WHERE entry_id = ?`,
        [entry_id]
      );
      if (exists.rows.length === 0) return { success: false, error: 'Reconciliation not found' };

      await db.execute(
        `DELETE FROM reconciliations WHERE entry_id = ?`,
        [entry_id]
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getStatement: async (company_id, fy_id, ledger_id, from_date, to_date) => {
    try {
      const ledger = await db.execute(
        `SELECT * FROM ledgers WHERE ledger_id = ?`,
        [ledger_id]
      );
      if (ledger.rows.length === 0) return { success: false, error: 'Ledger not found' };

      let query = `
        SELECT v.voucher_id, v.voucher_number, v.voucher_type, v.date, v.narration,
               e.entry_id, e.type, e.amount,
               r.reconciliation_id, r.reconciled_date, r.bank_date, r.bank_reference
        FROM voucher_entries e
        INNER JOIN vouchers v ON v.voucher_id = e.voucher_id
        LEFT JOIN reconciliations r ON r.entry_id = e.entry_id
        WHERE v.company_id = ? AND v.fy_id = ? AND e.ledger_id = ? AND v.is_cancelled = 0
      `;
      const params = [company_id, fy_id, ledger_id];

      if (from_date) { query += ` AND v.date >= ?`; params.push(from_date); }
      if (to_date)   { query += ` AND v.date <= ?`; params.push(to_date); }
      query += ` ORDER BY v.date ASC`;

      const result = await db.execute(query, params);

      let balance = ledger.rows[0].opening_balance || 0;
      const rows = result.rows.map(r => {
        balance += r.type === 'Dr' ? r.amount : -r.amount;
        return {
          ...r,
          is_reconciled: !!r.reconciliation_id,
          balance,
        };
      });

      return { success: true, ledger_name: ledger.rows[0].name, rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getSummary: async (company_id, fy_id, ledger_id) => {
    try {
      const ledger = await db.execute(
        `SELECT * FROM ledgers WHERE ledger_id = ?`,
        [ledger_id]
      );
      if (ledger.rows.length === 0) return { success: false, error: 'Ledger not found' };

      const entries = await db.execute(
        `SELECT e.entry_id, e.type, e.amount, r.reconciliation_id
         FROM voucher_entries e
         INNER JOIN vouchers v ON v.voucher_id = e.voucher_id
         LEFT JOIN reconciliations r ON r.entry_id = e.entry_id
         WHERE v.company_id = ? AND v.fy_id = ? AND e.ledger_id = ? AND v.is_cancelled = 0`,
        [company_id, fy_id, ledger_id]
      );

      let bookBalance = ledger.rows[0].opening_balance || 0;
      let reconciledAmount = 0;
      let unreconciledAmount = 0;

      entries.rows.forEach(e => {
        const amount = e.type === 'Dr' ? e.amount : -e.amount;
        bookBalance += amount;
        if (e.reconciliation_id) reconciledAmount += Math.abs(amount);
        else unreconciledAmount += Math.abs(amount);
      });

      const reconciledCount = await db.execute(
        `SELECT COUNT(*) as count FROM reconciliations WHERE ledger_id = ?`,
        [ledger_id]
      );

      return {
        success: true,
        ledger_name: ledger.rows[0].name,
        book_balance: bookBalance,
        reconciled_amount: reconciledAmount,
        unreconciled_amount: unreconciledAmount,
        total_reconciled_count: Number(reconciledCount.rows[0].count),
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};