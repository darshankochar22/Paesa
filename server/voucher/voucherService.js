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


const nullify = (v) => (v === undefined ? null : v);

const generateVoucherNumber = async (company_id, fy_id, voucher_type) => {
  const prefix = (prefixMap[voucher_type] || 'VCH') + '-';
  const result = await db.execute({
    sql: `SELECT COALESCE(MAX(CAST(REPLACE(voucher_number, ?, '') AS INTEGER)), 0) + 1 as next_num
          FROM vouchers WHERE company_id = ? AND fy_id = ? AND voucher_type = ?`,
    args: [prefix, company_id, fy_id, voucher_type],
  });
  const next = Number(result.rows[0].next_num);
  return `${prefixMap[voucher_type] || 'VCH'}-${String(next).padStart(5, '0')}`;
};

const getNextVoucherNumber = async (company_id, fy_id, voucher_type) => {
  const prefix = (prefixMap[voucher_type] || 'VCH') + '-';
  const result = await db.execute({
    sql: `SELECT COALESCE(MAX(CAST(REPLACE(voucher_number, ?, '') AS INTEGER)), 0) + 1 as next_num
          FROM vouchers WHERE company_id = ? AND fy_id = ? AND voucher_type = ?`,
    args: [prefix, company_id, fy_id, voucher_type],
  });
  const nextNum = Number(result.rows[0].next_num);
  const fullNumber = `${prefixMap[voucher_type] || 'VCH'}-${String(nextNum).padStart(5, '0')}`;
  return { success: true, nextNumber: nextNum, voucher_number: fullNumber };
};

const getLedgerBalance = async (ledger_id, company_id, fy_id) => {
  const result = await db.execute({
    sql: `SELECT
           l.opening_balance,
           l.nature,
           COALESCE(SUM(CASE WHEN e.type = 'Dr' AND v.voucher_id IS NOT NULL THEN e.amount ELSE 0 END), 0) as total_dr,
           COALESCE(SUM(CASE WHEN e.type = 'Cr' AND v.voucher_id IS NOT NULL THEN e.amount ELSE 0 END), 0) as total_cr
         FROM ledgers l
         LEFT JOIN voucher_entries e ON e.ledger_id = l.ledger_id
         LEFT JOIN vouchers v ON v.voucher_id = e.voucher_id AND v.fy_id = ? AND v.is_cancelled = 0
         WHERE l.ledger_id = ? AND l.company_id = ?
         GROUP BY l.ledger_id`,
    args: [fy_id, ledger_id, company_id],
  });
  const row = result.rows[0];
  if (!row) return { success: false, error: 'Ledger not found' };

  const isDrNature = row.nature !== 'Liabilities' && row.nature !== 'Income';
  const openingBal = Number(row.opening_balance) || 0;
  const totalDr = Number(row.total_dr) || 0;
  const totalCr = Number(row.total_cr) || 0;

  const balance = isDrNature
    ? openingBal + totalDr - totalCr
    : openingBal + totalCr - totalDr;

  let label;
  if (balance > 0.01) label = `${balance.toFixed(2)} Dr`;
  else if (balance < -0.01) label = `${Math.abs(balance).toFixed(2)} Cr`;
  else label = '0.00';
  return { success: true, balance: label, rawBalance: balance };
};

const searchLedgers = async (company_id, searchTerm) => {
  const likeTerm = `%${searchTerm || ''}%`;
  const result = await db.execute({
    sql: `SELECT * FROM ledgers WHERE company_id = ? AND is_active = 1
          AND (LOWER(name) LIKE LOWER(?) OR LOWER(COALESCE(alias, '')) LIKE LOWER(?))
          ORDER BY name LIMIT 50`,
    args: [company_id, likeTerm, likeTerm],
  });
  return { success: true, ledgers: result.rows };
};

const recalculateLedgerBalances = async (voucher_id, company_id, fy_id) => {
  try {
    const affected = await db.execute({
      sql: `SELECT DISTINCT ledger_id FROM voucher_entries WHERE voucher_id = ? AND ledger_id IS NOT NULL`,
      args: [voucher_id],
    });
    for (const row of affected.rows) {
      try {
        const balRes = await getLedgerBalance(row.ledger_id, company_id, fy_id);
        if (balRes.success && balRes.rawBalance != null) {
          await db.execute({
            sql: `UPDATE ledgers SET closing_balance = ? WHERE ledger_id = ?`,
            args: [balRes.rawBalance, row.ledger_id],
          });
        }
      } catch (_e) { /* ignore individual errors */ }
    }
  } catch (_e) { /* ignore */ }
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
      if (data.is_accounting_voucher && (data.voucher_type === 'Sales' || data.voucher_type === 'Purchase' || data.voucher_type === 'Credit Note' || data.voucher_type === 'Debit Note')) {
        try {
          const gstTaxEngine = require('../gst/gstTaxEngine');
          if (data.is_accounting_voucher && data.entries) {
                 if (!validateDoubleEntry(data.entries)) {
                 return { success: false, error: 'Debit and Credit amounts must be equal' };
                }
          }

        if (['Sales', 'Purchase', 'Credit Note', 'Debit Note'].includes(data.voucher_type)) {
          const computed = await gstTaxEngine.computeVoucherTaxLines(db, data);
          data.entries = computed.entries;
          data.stock_entries = computed.stock_entries;
          data.computedGST = computed;
       }
        } catch (gstErr) {
          console.error("GST calculation failed:", gstErr);
        }
      }

      if (data.is_accounting_voucher && data.entries) {
        if (!validateDoubleEntry(data.entries)) {
          return { success: false, error: 'Debit and Credit amounts must be equal' };
        }
      }

      const voucher_number = data.voucher_number ||
        await generateVoucherNumber(data.company_id, data.fy_id, data.voucher_type);

      // Use a transaction so partial failures roll back cleanly
      await db.execute({ sql: 'BEGIN TRANSACTION', args: [] });

      try {
        const result = await db.execute({
          sql: `INSERT INTO vouchers (
                  company_id, fy_id, voucher_type, voucher_number, date, status,
                  supplier_invoice_no, supplier_invoice_date,
                  reference_number, reference_date, narration,
                  party_ledger_id, party_name, place_of_supply,
                  is_invoice, is_accounting_voucher, is_inventory_voucher,
                  is_order_voucher, is_cancelled, is_optional, is_post_dated
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
          args: [
            data.company_id,
            data.fy_id,
            data.voucher_type,
            voucher_number,
            data.date,
            nullify(data.status) || 'Regular',
            nullify(data.supplier_invoice_no) || null,
            nullify(data.supplier_invoice_date) || null,
            nullify(data.reference_number) || null,
            nullify(data.reference_date) || null,
            nullify(data.narration) || null,
            nullify(data.party_ledger_id) || null,
            nullify(data.party_name) || null,
            nullify(data.place_of_supply) || null,
            data.is_invoice ? 1 : 0,
            data.is_accounting_voucher != null ? (data.is_accounting_voucher ? 1 : 0) : 1,
            data.is_inventory_voucher ? 1 : 0,
            data.is_order_voucher ? 1 : 0,
            data.is_optional ? 1 : 0,
            data.is_post_dated ? 1 : 0,
          ],
        });

        const voucher_id = Number(result.lastInsertRowid);

        if (data.entries && data.entries.length > 0) {
          for (const entry of data.entries) {
            const entryResult = await db.execute({
              sql: `INSERT INTO voucher_entries (voucher_id, ledger_id, ledger_name, type, amount, amount_forex, currency, narration)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              args: [
                voucher_id,
                nullify(entry.ledger_id),
                nullify(entry.ledger_name) || null,
                entry.type,
                entry.amount,
                nullify(entry.amount_forex) || entry.amount,
                nullify(entry.currency) || 'INR',
                nullify(entry.narration) || null,
              ],
            });

            const entry_id = Number(entryResult.lastInsertRowid);

            if (entry.cost_centres && entry.cost_centres.length > 0) {
              for (const cc of entry.cost_centres) {
                await db.execute({
                  sql: `INSERT INTO voucher_cost_centres (voucher_id, entry_id, cost_centre_id, amount)
                        VALUES (?, ?, ?, ?)`,
                  args: [voucher_id, entry_id, cc.cost_centre_id, cc.amount],
                });
              }
            }
          }
        }

        if (data.stock_entries && data.stock_entries.length > 0) {
          for (const item of data.stock_entries) {
            const stockResult = await db.execute({
              sql: `INSERT INTO voucher_stock_entries (
                      voucher_id, stock_item_id, item_name, godown_id, unit_id,
                      quantity, rate, amount, additional_amount, discount_amount,
                      hsn_code, gst_rate, cgst_amount, sgst_amount, igst_amount
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              args: [
                voucher_id,
                nullify(item.stock_item_id),
                nullify(item.item_name) || null,
                nullify(item.godown_id) || null,
                nullify(item.unit_id) || null,
                item.quantity,
                item.rate,
                item.quantity * item.rate,
                nullify(item.additional_amount) || 0,
                nullify(item.discount_amount) || 0,
                nullify(item.hsn_code) || null,
                nullify(item.gst_rate) || 0,
                nullify(item.cgst_amount) || 0,
                nullify(item.sgst_amount) || 0,
                nullify(item.igst_amount) || 0,
              ],
            });

            if (item.batch && item.batch.batch_number) {
              await db.execute({
                sql: `INSERT INTO voucher_batches (voucher_id, stock_entry_id, batch_number, expiry_date, quantity, rate)
                      VALUES (?, ?, ?, ?, ?, ?)`,
                args: [
                  voucher_id,
                  Number(stockResult.lastInsertRowid),
                  item.batch.batch_number,
                  nullify(item.batch.expiry_date) || null,
                  item.batch.quantity || item.quantity,
                  item.batch.rate || item.rate,
                ],
              });
            }
          }
        }

        if (data.bill_references && data.bill_references.length > 0) {
          for (const bill of data.bill_references) {
            await db.execute({
              sql: `INSERT INTO voucher_bill_references (voucher_id, ledger_id, bill_name, bill_type, amount, credit_period)
                    VALUES (?, ?, ?, ?, ?, ?)`,
              args: [voucher_id, bill.ledger_id, bill.bill_name, bill.bill_type, bill.amount, nullify(bill.credit_period) || null],
            });
          }
        }

        if (data.bank_details) {
          await db.execute({
            sql: `INSERT INTO voucher_bank_details (voucher_id, ledger_id, transaction_type, cheque_range, instrument_number, instrument_date, bank_name, branch, amount)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              voucher_id,
              nullify(data.bank_details.ledger_id),
              nullify(data.bank_details.transaction_type) || 'Cheque',
              nullify(data.bank_details.cheque_range) || null,
              nullify(data.bank_details.instrument_number) || null,
              nullify(data.bank_details.instrument_date) || null,
              nullify(data.bank_details.bank_name) || null,
              nullify(data.bank_details.branch) || null,
              nullify(data.bank_details.amount) || 0,
            ],
          });
        }

        if (data.cash_denominations) {
          const cd = data.cash_denominations;
          const ledgerId = cd.ledger_id || (cd.entries && cd.entries[0]?.ledger_id) || null;
          if (cd.entries && cd.entries.length > 0) {
            for (const entry of cd.entries) {
              await db.execute({
                sql: `INSERT INTO voucher_cash_denominations (voucher_id, ledger_id, denomination, quantity, amount)
                      VALUES (?, ?, ?, ?, ?)`,
                args: [
                  voucher_id,
                  ledgerId,
                  String(entry.denomination),
                  entry.quantity || 0,
                  entry.amount || 0,
                ],
              });
            }
          }
          if (cd.others && cd.others > 0) {
            await db.execute({
              sql: `INSERT INTO voucher_cash_denominations (voucher_id, ledger_id, denomination, quantity, amount)
                    VALUES (?, ?, ?, ?, ?)`,
              args: [voucher_id, ledgerId, 'Others', 0, cd.others],
            });
          }
        }

        if (data.computedGST) {
          const gstTaxEngine = require('../gst/gstTaxEngine');
          await gstTaxEngine.saveVoucherTaxLines(db, voucher_id, data.computedGST);
        }

        await db.execute({ sql: 'COMMIT', args: [] });

        // Update closing_balance for all ledgers involved in this voucher
        await recalculateLedgerBalances(voucher_id, data.company_id, data.fy_id);

        const voucher = await db.execute({
          sql: `SELECT * FROM vouchers WHERE voucher_id = ?`,
          args: [voucher_id],
        });
        return { success: true, voucher: voucher.rows[0] };

      } catch (innerErr) {
        await db.execute({ sql: 'ROLLBACK', args: [] });
        throw innerErr;
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id, fy_id) => {
    try {
      const result = await db.execute({
        sql: `SELECT * FROM vouchers WHERE company_id = ? AND fy_id = ? AND is_cancelled = 0 ORDER BY date DESC, voucher_id DESC`,
        args: [company_id, fy_id],
      });
      return { success: true, vouchers: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const result = await db.execute({
        sql: `SELECT * FROM vouchers WHERE voucher_id = ?`,
        args: [id],
      });
      if (result.rows.length === 0) return { success: false, error: 'Voucher not found' };
      const voucher = result.rows[0];

      const entries = await db.execute({
        sql: `SELECT * FROM voucher_entries WHERE voucher_id = ?`,
        args: [id],
      });
      const stockItems = await db.execute({
        sql: `SELECT * FROM voucher_stock_entries WHERE voucher_id = ?`,
        args: [id],
      });
      const bills = await db.execute({
        sql: `SELECT * FROM voucher_bill_references WHERE voucher_id = ?`,
        args: [id],
      });
      const bank = await db.execute({
        sql: `SELECT * FROM voucher_bank_details WHERE voucher_id = ?`,
        args: [id],
      });
      const costCentres = await db.execute({
        sql: `SELECT * FROM voucher_cost_centres WHERE voucher_id = ?`,
        args: [id],
      });
      const cashDenoms = await db.execute({
        sql: `SELECT * FROM voucher_cash_denominations WHERE voucher_id = ?`,
        args: [id],
      });

      const stockWithBatches = await Promise.all(
        stockItems.rows.map(async (s) => {
          const batches = await db.execute({
            sql: `SELECT * FROM voucher_batches WHERE stock_entry_id = ?`,
            args: [s.stock_entry_id],
          });
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
          cash_denominations: cashDenoms.rows,
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

      const result = await db.execute({ sql: query, args: params });
      return { success: true, vouchers: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getByType: async (company_id, fy_id, voucher_type) => {
    try {
      const result = await db.execute({
        sql: `SELECT * FROM vouchers WHERE company_id = ? AND fy_id = ? AND voucher_type = ? AND is_cancelled = 0 ORDER BY date DESC, voucher_id DESC`,
        args: [company_id, fy_id, voucher_type],
      });
      return { success: true, vouchers: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getByLedger: async (company_id, fy_id, ledger_id) => {
    try {
      const result = await db.execute({
        sql: `SELECT DISTINCT v.* FROM vouchers v
              INNER JOIN voucher_entries e ON e.voucher_id = v.voucher_id
              WHERE v.company_id = ? AND v.fy_id = ? AND e.ledger_id = ? AND v.is_cancelled = 0
              ORDER BY v.date DESC`,
        args: [company_id, fy_id, ledger_id],
      });
      return { success: true, vouchers: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const existing = await db.execute({
        sql: `SELECT * FROM vouchers WHERE voucher_id = ?`,
        args: [data.voucher_id],
      });
      if (existing.rows.length === 0) return { success: false, error: 'Voucher not found' };
      if (existing.rows[0].is_cancelled) return { success: false, error: 'Cannot edit cancelled voucher' };

      if (data.entries && !validateDoubleEntry(data.entries)) {
        return { success: false, error: 'Debit and Credit amounts must be equal' };
      }

      const current = existing.rows[0];
      await db.execute({
        sql: `UPDATE vouchers SET
                date = ?, reference_number = ?, reference_date = ?, narration = ?,
                party_ledger_id = ?, party_name = ?, place_of_supply = ?,
                updated_at = datetime('now')
              WHERE voucher_id = ?`,
        args: [
          data.date ?? current.date,
          nullify(data.reference_number) ?? nullify(current.reference_number),
          nullify(data.reference_date) ?? nullify(current.reference_date),
          nullify(data.narration) ?? nullify(current.narration),
          nullify(data.party_ledger_id) ?? nullify(current.party_ledger_id),
          nullify(data.party_name) ?? nullify(current.party_name),
          nullify(data.place_of_supply) ?? nullify(current.place_of_supply),
          data.voucher_id,
        ],
      });

      if (data.entries) {
        await db.execute({
          sql: `DELETE FROM voucher_entries WHERE voucher_id = ?`,
          args: [data.voucher_id],
        });
        for (const entry of data.entries) {
          await db.execute({
            sql: `INSERT INTO voucher_entries (voucher_id, ledger_id, ledger_name, type, amount, amount_forex, currency, narration)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              data.voucher_id,
              nullify(entry.ledger_id),
              nullify(entry.ledger_name) || null,
              entry.type,
              entry.amount,
              nullify(entry.amount_forex) || entry.amount,
              nullify(entry.currency) || 'INR',
              nullify(entry.narration) || null,
            ],
          });
        }
      }

      const updated = await db.execute({
        sql: `SELECT * FROM vouchers WHERE voucher_id = ?`,
        args: [data.voucher_id],
      });
      return { success: true, voucher: updated.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  cancel: async (id) => {
    try {
      const existing = await db.execute({
        sql: `SELECT * FROM vouchers WHERE voucher_id = ?`,
        args: [id],
      });
      if (existing.rows.length === 0) return { success: false, error: 'Voucher not found' };

      const voucher = existing.rows[0];
      await db.execute({
        sql: `UPDATE vouchers SET is_cancelled = 1, updated_at = datetime('now') WHERE voucher_id = ?`,
        args: [id],
      });
      await recalculateLedgerBalances(id, voucher.company_id, voucher.fy_id);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await db.execute({
        sql: `SELECT * FROM vouchers WHERE voucher_id = ?`,
        args: [id],
      });
      if (existing.rows.length === 0) return { success: false, error: 'Voucher not found' };

      const voucher = existing.rows[0];
      // Fetch affected ledger IDs before cascade delete removes entries
      const affected = await db.execute({
        sql: `SELECT DISTINCT ledger_id FROM voucher_entries WHERE voucher_id = ? AND ledger_id IS NOT NULL`,
        args: [id],
      });
      await db.execute({ sql: `DELETE FROM vouchers WHERE voucher_id = ?`, args: [id] });

      // Recalculate balances for all affected ledgers
      for (const row of affected.rows) {
        try {
          const balRes = await getLedgerBalance(row.ledger_id, voucher.company_id, voucher.fy_id);
          if (balRes.success && balRes.rawBalance != null) {
            await db.execute({
              sql: `UPDATE ledgers SET closing_balance = ? WHERE ledger_id = ?`,
              args: [balRes.rawBalance, row.ledger_id],
            });
          }
        } catch (_e) { /* ignore individual errors */ }
      }
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

  getOutstandingBills: async (ledger_id) => {
    try {
      const result = await db.execute({
        sql: `SELECT 
                bill_name,
                SUM(CASE WHEN bill_type = 'New Ref' THEN amount WHEN bill_type = 'Agst Ref' THEN -amount ELSE 0 END) as outstanding_amount,
                COALESCE(MIN(credit_period), '') as credit_period
              FROM voucher_bill_references
              WHERE ledger_id = ?
              GROUP BY bill_name
              HAVING outstanding_amount > 0.01`,
        args: [ledger_id],
      });
      return { success: true, bills: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};