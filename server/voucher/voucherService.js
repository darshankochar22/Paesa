const { db } = require('../db/index');

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

const generateVoucherNumber = async (company_id, fy_id, voucher_type) => {
  const prefix = (prefixMap[voucher_type] || 'VCH') + '-';
  const result = await db.execute(
    `SELECT COALESCE(MAX(CAST(REPLACE(voucher_number, ?, '') AS INTEGER)), 0) + 1 as next_num
     FROM vouchers WHERE company_id = ? AND fy_id = ? AND voucher_type = ?`,
    [prefix, company_id, fy_id, voucher_type]
  );
  const next = Number(result.rows[0].next_num);
  return `${prefixMap[voucher_type] || 'VCH'}-${String(next).padStart(5, '0')}`;
};

const getNextVoucherNumber = async (company_id, fy_id, voucher_type) => {
  const prefix = (prefixMap[voucher_type] || 'VCH') + '-';
  const result = await db.execute(
    `SELECT COALESCE(MAX(CAST(REPLACE(voucher_number, ?, '') AS INTEGER)), 0) + 1 as next_num
     FROM vouchers WHERE company_id = ? AND fy_id = ? AND voucher_type = ?`,
    [prefix, company_id, fy_id, voucher_type]
  );
  const nextNum = Number(result.rows[0].next_num);
  const fullNumber = `${prefixMap[voucher_type] || 'VCH'}-${String(nextNum).padStart(5, '0')}`;
  return { success: true, nextNumber: nextNum, voucher_number: fullNumber };
};

const getLedgerBalance = async (ledger_id, company_id, fy_id) => {
  const result = await db.execute(
    `SELECT
       l.opening_balance,
       COALESCE(SUM(CASE WHEN e.type = 'Dr' THEN e.amount ELSE 0 END), 0) as total_dr,
       COALESCE(SUM(CASE WHEN e.type = 'Cr' THEN e.amount ELSE 0 END), 0) as total_cr
     FROM ledgers l
     LEFT JOIN voucher_entries e ON e.ledger_id = l.ledger_id
     LEFT JOIN vouchers v ON v.voucher_id = e.voucher_id AND v.fy_id = ? AND v.is_cancelled = 0
     WHERE l.ledger_id = ? AND l.company_id = ?
     GROUP BY l.ledger_id`,
    [fy_id, ledger_id, company_id]
  );
  const row = result.rows[0];
  if (!row) return { success: false, error: 'Ledger not found' };
  const balance = (row.opening_balance || 0) + (row.total_dr || 0) - (row.total_cr || 0);
  let label;
  if (balance > 0.01) label = `${balance.toFixed(2)} Dr`;
  else if (balance < -0.01) label = `${Math.abs(balance).toFixed(2)} Cr`;
  else label = '0.00';
  return { success: true, balance: label, rawBalance: balance };
};

const searchLedgers = async (company_id, searchTerm) => {
  const likeTerm = `%${searchTerm || ''}%`;
  const result = await db.execute(
    `SELECT * FROM ledgers WHERE company_id = ? AND is_active = 1
     AND (LOWER(name) LIKE LOWER(?) OR LOWER(COALESCE(alias, '')) LIKE LOWER(?))
     ORDER BY name LIMIT 50`,
    [company_id, likeTerm, likeTerm]
  );
  return { success: true, ledgers: result.rows };
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
        await generateVoucherNumber(data.company_id, data.fy_id, data.voucher_type);

      const result = await db.execute(
        `INSERT INTO vouchers (
          company_id, fy_id, voucher_type, voucher_number, date,
          reference_number, reference_date, narration,
          party_ledger_id, party_name, place_of_supply,
          is_invoice, is_accounting_voucher, is_inventory_voucher,
          is_order_voucher, is_cancelled, is_optional, is_post_dated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [
          data.company_id, data.fy_id, data.voucher_type, voucher_number, data.date,
          data.reference_number || null, data.reference_date || null, data.narration || null,
          data.party_ledger_id || null, data.party_name || null, data.place_of_supply || null,
          data.is_invoice ? 1 : 0, data.is_accounting_voucher ?? 1,
          data.is_inventory_voucher ? 1 : 0, data.is_order_voucher ? 1 : 0,
          data.is_optional ? 1 : 0, data.is_post_dated ? 1 : 0,
        ]
      );

      const voucher_id = result.lastInsertRowid;

      if (data.entries && data.entries.length > 0) {
        for (const entry of data.entries) {
          const entryResult = await db.execute(
            `INSERT INTO voucher_entries (voucher_id, ledger_id, ledger_name, type, amount, amount_forex, currency, narration)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              voucher_id, entry.ledger_id, entry.ledger_name || null,
              entry.type, entry.amount, entry.amount_forex || entry.amount,
              entry.currency || 'INR', entry.narration || null,
            ]
          );

          const entry_id = entryResult.lastInsertRowid;

          if (entry.cost_centres && entry.cost_centres.length > 0) {
            for (const cc of entry.cost_centres) {
              await db.execute(
                `INSERT INTO voucher_cost_centres (voucher_id, entry_id, cost_centre_id, amount)
                 VALUES (?, ?, ?, ?)`,
                [voucher_id, entry_id, cc.cost_centre_id, cc.amount]
              );
            }
          }
        }
      }

      if (data.stock_entries && data.stock_entries.length > 0) {
        for (const item of data.stock_entries) {
          const stockResult = await db.execute(
            `INSERT INTO voucher_stock_entries (
              voucher_id, stock_item_id, item_name, godown_id, unit_id,
              quantity, rate, amount, additional_amount, discount_amount,
              hsn_code, gst_rate, cgst_amount, sgst_amount, igst_amount
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              voucher_id, item.stock_item_id, item.item_name || null,
              item.godown_id || null, item.unit_id || null,
              item.quantity, item.rate, item.quantity * item.rate,
              item.additional_amount || 0, item.discount_amount || 0,
              item.hsn_code || null, item.gst_rate || 0,
              item.cgst_amount || 0, item.sgst_amount || 0, item.igst_amount || 0,
            ]
          );

          if (item.batch && item.batch.batch_number) {
            await db.execute(
              `INSERT INTO voucher_batches (voucher_id, stock_entry_id, batch_number, expiry_date, quantity, rate)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [
                voucher_id, stockResult.lastInsertRowid,
                item.batch.batch_number, item.batch.expiry_date || null,
                item.batch.quantity || item.quantity, item.batch.rate || item.rate,
              ]
            );
          }
        }
      }

      if (data.bill_references && data.bill_references.length > 0) {
        for (const bill of data.bill_references) {
          await db.execute(
            `INSERT INTO voucher_bill_references (voucher_id, ledger_id, bill_name, bill_type, amount, credit_period)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [voucher_id, bill.ledger_id, bill.bill_name, bill.bill_type, bill.amount, bill.credit_period || null]
          );
        }
      }

      if (data.bank_details) {
        await db.execute(
          `INSERT INTO voucher_bank_details (voucher_id, ledger_id, transaction_type, instrument_number, instrument_date, bank_name, branch, amount)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            voucher_id, data.bank_details.ledger_id,
            data.bank_details.transaction_type || 'Cheque',
            data.bank_details.instrument_number || null,
            data.bank_details.instrument_date || null,
            data.bank_details.bank_name || null,
            data.bank_details.branch || null,
            data.bank_details.amount || 0,
          ]
        );
      }

      const voucher = await db.execute(
        `SELECT * FROM vouchers WHERE voucher_id = ?`,
        [voucher_id]
      );
      return { success: true, voucher: voucher.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id, fy_id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM vouchers WHERE company_id = ? AND fy_id = ? AND is_cancelled = 0`,
        [company_id, fy_id]
      );
      return { success: true, vouchers: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM vouchers WHERE voucher_id = ?`, [id]
      );
      if (result.rows.length === 0) return { success: false, error: 'Voucher not found' };
      const voucher = result.rows[0];

      const entries = await db.execute(
        `SELECT * FROM voucher_entries WHERE voucher_id = ?`, [id]
      );
      const stockItems = await db.execute(
        `SELECT * FROM voucher_stock_entries WHERE voucher_id = ?`, [id]
      );
      const bills = await db.execute(
        `SELECT * FROM voucher_bill_references WHERE voucher_id = ?`, [id]
      );
      const bank = await db.execute(
        `SELECT * FROM voucher_bank_details WHERE voucher_id = ?`, [id]
      );
      const costCentres = await db.execute(
        `SELECT * FROM voucher_cost_centres WHERE voucher_id = ?`, [id]
      );

      const stockWithBatches = await Promise.all(
        stockItems.rows.map(async (s) => {
          const batches = await db.execute(
            `SELECT * FROM voucher_batches WHERE stock_entry_id = ?`, [s.stock_entry_id]
          );
          return { ...s, batches: batches.rows };
        })
      );

      return {
        success: true,
        voucher: {
          ...voucher,
          entries: entries.rows,
          stock_entries: stockWithBatches,
          bill_references: bills.rows,
          bank_details: bank.rows[0] || null,
          cost_centres: costCentres.rows,
        },
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getDaybook: async (company_id, fy_id, from_date, to_date) => {
    try {
      let query = `SELECT * FROM vouchers WHERE company_id = ? AND fy_id = ? AND is_cancelled = 0`;
      const params = [company_id, fy_id];

      if (from_date) { query += ` AND date >= ?`; params.push(from_date); }
      if (to_date)   { query += ` AND date <= ?`; params.push(to_date); }
      query += ` ORDER BY date ASC`;

      const result = await db.execute(query, params);
      return { success: true, vouchers: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getByType: async (company_id, fy_id, voucher_type) => {
    try {
      const result = await db.execute(
        `SELECT * FROM vouchers WHERE company_id = ? AND fy_id = ? AND voucher_type = ? AND is_cancelled = 0`,
        [company_id, fy_id, voucher_type]
      );
      return { success: true, vouchers: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getByLedger: async (company_id, fy_id, ledger_id) => {
    try {
      const result = await db.execute(
        `SELECT DISTINCT v.* FROM vouchers v
         INNER JOIN voucher_entries e ON e.voucher_id = v.voucher_id
         WHERE v.company_id = ? AND v.fy_id = ? AND e.ledger_id = ? AND v.is_cancelled = 0`,
        [company_id, fy_id, ledger_id]
      );
      return { success: true, vouchers: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM vouchers WHERE voucher_id = ?`, [data.voucher_id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'Voucher not found' };
      if (existing.rows[0].is_cancelled) return { success: false, error: 'Cannot edit cancelled voucher' };

      if (data.entries && !validateDoubleEntry(data.entries)) {
        return { success: false, error: 'Debit and Credit amounts must be equal' };
      }

      const current = existing.rows[0];
      await db.execute(
        `UPDATE vouchers SET
          date = ?, reference_number = ?, reference_date = ?, narration = ?,
          party_ledger_id = ?, party_name = ?, place_of_supply = ?,
          updated_at = datetime('now')
         WHERE voucher_id = ?`,
        [
          data.date ?? current.date,
          data.reference_number ?? current.reference_number,
          data.reference_date ?? current.reference_date,
          data.narration ?? current.narration,
          data.party_ledger_id ?? current.party_ledger_id,
          data.party_name ?? current.party_name,
          data.place_of_supply ?? current.place_of_supply,
          data.voucher_id,
        ]
      );

      if (data.entries) {
        await db.execute(`DELETE FROM voucher_entries WHERE voucher_id = ?`, [data.voucher_id]);
        for (const entry of data.entries) {
          await db.execute(
            `INSERT INTO voucher_entries (voucher_id, ledger_id, type, amount, amount_forex, currency, narration)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              data.voucher_id, entry.ledger_id, entry.type, entry.amount,
              entry.amount_forex || entry.amount, entry.currency || 'INR', entry.narration || null,
            ]
          );
        }
      }

      const updated = await db.execute(
        `SELECT * FROM vouchers WHERE voucher_id = ?`, [data.voucher_id]
      );
      return { success: true, voucher: updated.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  cancel: async (id) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM vouchers WHERE voucher_id = ?`, [id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'Voucher not found' };

      await db.execute(
        `UPDATE vouchers SET is_cancelled = 1, updated_at = datetime('now') WHERE voucher_id = ?`,
        [id]
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM vouchers WHERE voucher_id = ?`, [id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'Voucher not found' };

      await db.execute(`DELETE FROM vouchers WHERE voucher_id = ?`, [id]);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getNextNumber: async (company_id, fy_id, voucher_type) => {
    return await getNextVoucherNumber(company_id, fy_id, voucher_type);
  },

  getLedgerBalance: async (ledger_id, company_id, fy_id) => {
    return await getLedgerBalance(ledger_id, company_id, fy_id);
  },

  searchLedgers: async (company_id, searchTerm) => {
    return await searchLedgers(company_id, searchTerm);
  },
};