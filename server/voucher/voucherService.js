const { db } = require('../db/index');

const prefixMap = {
  Payment:              'PMT',
  Receipt:              'RCT',
  Journal:              'JNL',
  Contra:               'CTR',
  Sales:                'SAL',
  Purchase:             'PUR',
  'Debit Note':         'DBT',
  'Credit Note':        'CDT',
  'Stock Journal':      'STJ',
  'Delivery Note':      'DLN',
  'Receipt Note':       'RCN',
  'Rejection In':       'RIN',
  'Rejection Out':      'ROU',
  'Material In':        'MIN',
  'Material Out':       'MOUT',
  'Manufacturing Journal': 'MJN',
  'Physical Stock':     'PST',
  Payroll:              'PRL',
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

const getPendingBills = async (ledger_id, company_id, fy_id) => {
  try {
    // Get all existing bill references for this ledger in this company/fy
    // We consider bills created as 'New Ref' or 'Advance' as potential pending bills
    const result = await db.execute({
      sql: `
        SELECT 
          vbr.bill_name,
          MAX(v.date) as bill_date,
          MAX(vbr.due_date) as due_date,
          MAX(vbr.credit_period) as credit_period,
          SUM(vbr.amount) as total_amount
        FROM voucher_bill_references vbr
        JOIN vouchers v ON v.voucher_id = vbr.voucher_id
        WHERE vbr.ledger_id = ? AND v.company_id = ? AND v.fy_id = ? AND v.is_cancelled = 0
          AND vbr.bill_type IN ('New Ref', 'Advance')
        GROUP BY vbr.bill_name
        HAVING total_amount > 0.01
        ORDER BY MAX(v.date) DESC
      `,
      args: [ledger_id, company_id, fy_id],
    });

    const ledgerRes = await db.execute({
      sql: `SELECT default_credit_period, check_credit_days FROM ledgers WHERE ledger_id = ?`,
      args: [ledger_id],
    });
    const defaultCreditPeriod = ledgerRes.rows[0]?.default_credit_period || 0;
    const checkCreditDays = ledgerRes.rows[0]?.check_credit_days || 0;

    const pendingBills = result.rows.map((row) => ({
      bill_name: row.bill_name,
      bill_date: row.bill_date,
      due_date: row.due_date,
      credit_period: row.credit_period,
      balance: Number(row.total_amount) || 0,
      final_balance: Number(row.total_amount) || 0,
    }));

    return { success: true, pendingBills, defaultCreditPeriod, checkCreditDays };
  } catch (err) {
    return { success: false, error: err.message };
  }
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

const getOrCreatePayHeadLedger = async (company_id, payHeadName) => {
  const existing = await db.execute({
    sql: `SELECT ledger_id FROM ledgers WHERE company_id = ? AND LOWER(name) = LOWER(?) AND is_active = 1`,
    args: [company_id, payHeadName],
  });
  if (existing.rows.length > 0) {
    return Number(existing.rows[0].ledger_id);
  }

  const group = await db.execute({
    sql: `SELECT group_id FROM groups WHERE company_id = ? AND LOWER(name) = 'indirect expenses'`,
    args: [company_id],
  });
  const groupId = group.rows.length > 0 ? Number(group.rows[0].group_id) : null;

  const result = await db.execute({
    sql: `INSERT INTO ledgers (
            company_id, group_id, name, alias, ledger_type, nature,
            opening_balance, closing_balance, is_bill_wise, maintain_inventory_values,
            mailing_name, address1, address2, city, state, country, pincode,
            phone, email, gstin, pan, registration_type,
            default_credit_period, check_credit_days,
            allow_cost_centres, invoice_rounding, rounding_method, rounding_limit,
            is_active, is_predefined
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      company_id,
      groupId,
      payHeadName,
      null,
      "General",
      "Expenses",
      0, 0, 0, 0,
      null, null, null, null, null, null, null,
      null, null, null, null, "Unregistered",
      null, 0,
      0, 0, null, 0,
      1, 0
    ],
  });
  return Number(result.lastInsertRowid);
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
      if (data.voucher_type === 'Payroll') {
        const entries = [];
        let totalNetDrCr = 0;
        
        if (data.payroll_entries && data.payroll_entries.length > 0) {
          for (const entry of data.payroll_entries) {
            const phResult = await db.execute({
              sql: `SELECT name, pay_head_type FROM pay_heads WHERE pay_head_id = ?`,
              args: [entry.pay_head_id],
            });
            if (phResult.rows.length > 0) {
              const ph = phResult.rows[0];
              const ledgerId = await getOrCreatePayHeadLedger(data.company_id, ph.name);
              const isDeduction = ph.pay_head_type && (
                ph.pay_head_type.toLowerCase().includes('deduction') ||
                ph.pay_head_type.toLowerCase().includes('pf') ||
                ph.pay_head_type.toLowerCase().includes('esi')
              );
              
              const amount = Number(entry.amount) || 0;
              if (amount > 0) {
                if (isDeduction) {
                  entries.push({
                    ledger_id: ledgerId,
                    ledger_name: ph.name,
                    type: 'Cr',
                    amount: amount,
                  });
                  totalNetDrCr -= amount;
                } else {
                  entries.push({
                    ledger_id: ledgerId,
                    ledger_name: ph.name,
                    type: 'Dr',
                    amount: amount,
                  });
                  totalNetDrCr += amount;
                }
              }
            }
          }
        }
        
        if (totalNetDrCr !== 0 && data.party_ledger_id) {
          const bankLedgerId = Number(data.party_ledger_id);
          const bankLedger = await db.execute({
            sql: `SELECT name FROM ledgers WHERE ledger_id = ?`,
            args: [bankLedgerId],
          });
          const bankName = bankLedger.rows.length > 0 ? bankLedger.rows[0].name : 'Cash/Bank Account';
          
          if (totalNetDrCr > 0) {
            entries.push({
              ledger_id: bankLedgerId,
              ledger_name: bankName,
              type: 'Cr',
              amount: totalNetDrCr,
            });
          } else {
            entries.push({
              ledger_id: bankLedgerId,
              ledger_name: bankName,
              type: 'Dr',
              amount: Math.abs(totalNetDrCr),
            });
          }
        }
        data.entries = entries;
        data.is_accounting_voucher = 1;
      }

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

      if (data.is_accounting_voucher && data.entries && data.entries.length > 0) {
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
                      hsn_code, gst_rate, cgst_amount, sgst_amount, igst_amount,
                      is_source
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
                item.is_source ? 1 : 0,
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

        if (data.payroll_entries && data.payroll_entries.length > 0) {
          for (const entry of data.payroll_entries) {
            await db.execute({
              sql: `INSERT INTO voucher_payroll_entries (voucher_id, employee_id, pay_head_id, amount)
                    VALUES (?, ?, ?, ?)`,
              args: [
                voucher_id,
                nullify(entry.employee_id),
                nullify(entry.pay_head_id),
                Number(entry.amount) || 0,
              ],
            });
          }
        }

        if (data.bill_references && data.bill_references.length > 0) {
          for (const bill of data.bill_references) {
            await db.execute({
              sql: `INSERT INTO voucher_bill_references (voucher_id, ledger_id, bill_name, bill_type, amount, credit_period, due_date)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
              args: [voucher_id, bill.ledger_id, bill.bill_name, bill.bill_type, bill.amount, nullify(bill.credit_period) || null, nullify(bill.due_date) || null],
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

        if (data.receipt_details) {
          const rd = data.receipt_details;
          await db.execute({
            sql: `INSERT INTO voucher_receipt_details (voucher_id, receipt_note_no, receipt_doc_no, dispatched_through, destination, carrier_name, bill_of_lading_no, bill_of_lading_date, motor_vehicle_no)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              voucher_id,
              nullify(rd.receipt_note_no) || null,
              nullify(rd.receipt_doc_no) || null,
              nullify(rd.dispatched_through) || null,
              nullify(rd.destination) || null,
              nullify(rd.carrier_name) || null,
              nullify(rd.bill_of_lading_no) || null,
              nullify(rd.bill_of_lading_date) || null,
              nullify(rd.motor_vehicle_no) || null,
            ],
          });
        }

        if (data.party_details) {
          const pd = data.party_details;
          await db.execute({
            sql: `INSERT INTO voucher_party_details (voucher_id, supplier_name, mailing_name, address, state, country)
                  VALUES (?, ?, ?, ?, ?, ?)`,
            args: [
              voucher_id,
              nullify(pd.supplier_name) || null,
              nullify(pd.mailing_name) || null,
              nullify(pd.address) || null,
              nullify(pd.state) || null,
              nullify(pd.country) || null,
            ],
          });
        }

        if (data.dispatch_details) {
          const dd = data.dispatch_details;
          await db.execute({
            sql: `INSERT INTO voucher_dispatch_details (voucher_id, delivery_note_nos, dispatch_doc_no, dispatched_through, destination, carrier_name, bill_of_lading_no, bill_of_lading_date, motor_vehicle_no)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              voucher_id,
              nullify(dd.delivery_note_nos) || null,
              nullify(dd.dispatch_doc_no) || null,
              nullify(dd.dispatched_through) || null,
              nullify(dd.destination) || null,
              nullify(dd.carrier_name) || null,
              nullify(dd.bill_of_lading_no) || null,
              nullify(dd.bill_of_lading_date) || null,
              nullify(dd.motor_vehicle_no) || null,
            ],
          });
        }

        if (data.credit_note_details) {
          const cn = data.credit_note_details;
          await db.execute({
            sql: `INSERT INTO voucher_credit_note_details (voucher_id, tracking_no, dispatch_doc_no, dispatched_through, destination, carrier_name, bill_of_lading_no, bill_of_lading_date, motor_vehicle_no, original_invoice_no, original_invoice_date)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              voucher_id,
              nullify(cn.tracking_no) || null,
              nullify(cn.dispatch_doc_no) || null,
              nullify(cn.dispatched_through) || null,
              nullify(cn.destination) || null,
              nullify(cn.carrier_name) || null,
              nullify(cn.bill_of_lading_no) || null,
              nullify(cn.bill_of_lading_date) || null,
              nullify(cn.motor_vehicle_no) || null,
              nullify(cn.original_invoice_no) || null,
              nullify(cn.original_invoice_date) || null,
            ],
          });
        }

        if (data.debit_note_details) {
          const dn = data.debit_note_details;
          await db.execute({
            sql: `INSERT INTO voucher_debit_note_details (voucher_id, tracking_no, dispatch_doc_no, dispatched_through, destination, carrier_name, bill_of_lading_no, bill_of_lading_date, motor_vehicle_no, original_invoice_no, original_invoice_date)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              voucher_id,
              nullify(dn.tracking_no) || null,
              nullify(dn.dispatch_doc_no) || null,
              nullify(dn.dispatched_through) || null,
              nullify(dn.destination) || null,
              nullify(dn.carrier_name) || null,
              nullify(dn.bill_of_lading_no) || null,
              nullify(dn.bill_of_lading_date) || null,
              nullify(dn.motor_vehicle_no) || null,
              nullify(dn.original_invoice_no) || null,
              nullify(dn.original_invoice_date) || null,
            ],
          });
        }

        if (data.computedGST) {
          const gstTaxEngine = require('../gst/gstTaxEngine');
          await gstTaxEngine.saveVoucherTaxLines(db, voucher_id, data.computedGST);
        }

        await db.execute({ sql: 'COMMIT', args: [] });

// ── E-Invoice auto-trigger ────────────────────────────────────────────────────
if (data.voucher_type === 'Sales' && data.is_invoice) {
  try {
    const eInvoiceService = require('../eInvoice/eInvoiceService');

    // Credentials check
    const credsRes = await eInvoiceService.getCredentials(data.company_id);
    if (credsRes.success) {

      // Party GSTIN check
      const partyLedger = data.party_ledger_id
        ? await db.execute({
            sql: `SELECT * FROM ledgers WHERE ledger_id = ?`,
            args: [data.party_ledger_id],
          })
        : null;

      const partyGSTIN = partyLedger?.rows?.[0]?.gstin || null;

      // Total invoice value check (> 50,000)
      const totalValue = data.entries
        ? data.entries
            .filter(e => e.type === 'Cr')
            .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
        : 0;

      if (partyGSTIN && totalValue >= 50000) {

        // Build NIC payload
        const companyRes = await db.execute({
          sql: `SELECT * FROM companies WHERE company_id = ?`,
          args: [data.company_id],
        });
        const company = companyRes.rows[0];

        const invoiceDate = new Date(data.date);
        const formattedDate = `${String(invoiceDate.getDate()).padStart(2,'0')}/${String(invoiceDate.getMonth()+1).padStart(2,'0')}/${invoiceDate.getFullYear()}`;

        // Seller state code from GSTIN (first 2 digits)
        const sellerStateCode = credsRes.credentials.gstin?.substring(0, 2) || '27';
        const buyerStateCode  = partyGSTIN?.substring(0, 2) || '27';

        // IGST if interstate, else CGST+SGST
        const isInterstate = sellerStateCode !== buyerStateCode;

        const itemList = (data.stock_entries || []).map((item, idx) => {
          const assessable = item.quantity * item.rate;
          const gstRate    = item.gst_rate || 0;
          const igstAmt    = isInterstate ? (assessable * gstRate / 100) : 0;
          const cgstAmt    = !isInterstate ? (assessable * gstRate / 2 / 100) : 0;
          const sgstAmt    = !isInterstate ? (assessable * gstRate / 2 / 100) : 0;

          return {
            SlNo:       String(idx + 1),
            PrdDesc:    item.item_name || 'Item',
            IsServc:    'N',
            HsnCd:      item.hsn_code || '',
            Qty:        item.quantity,
            Unit:       'NOS',
            UnitPrice:  item.rate,
            TotAmt:     assessable,
            Discount:   item.discount_amount || 0,
            AssAmt:     assessable - (item.discount_amount || 0),
            GstRt:      gstRate,
            IgstAmt:    igstAmt,
            CgstAmt:    cgstAmt,
            SgstAmt:    sgstAmt,
            CesRt:      0,
            CesAmt:     0,
            TotItemVal: assessable + igstAmt + cgstAmt + sgstAmt,
          };
        });

        const totalAssessable = itemList.reduce((s, i) => s + i.AssAmt, 0);
        const totalIGST       = itemList.reduce((s, i) => s + i.IgstAmt, 0);
        const totalCGST       = itemList.reduce((s, i) => s + i.CgstAmt, 0);
        const totalSGST       = itemList.reduce((s, i) => s + i.SgstAmt, 0);

        const nicPayload = {
          Version: '1.1',
          TranDtls: {
            TaxSch:     'GST',
            SupTyp:     'B2B',
            RegRev:     'N',
            IgstOnIntra: 'N',
          },
          DocDtls: {
            Typ: 'INV',
            No:  voucher_number,
            Dt:  formattedDate,
          },
          SellerDtls: {
            Gstin: credsRes.credentials.gstin,
            LglNm: company?.name || '',
            Addr1: company?.address || 'N/A',
            Loc:   company?.city   || 'N/A',
            Pin:   Number(company?.pincode) || 100001,
            Stcd:  sellerStateCode,
          },
          BuyerDtls: {
            Gstin: partyGSTIN,
            LglNm: partyLedger.rows[0].name,
            Pos:   data.place_of_supply || buyerStateCode,
            Addr1: partyLedger.rows[0].address1 || 'N/A',
            Loc:   partyLedger.rows[0].city    || 'N/A',
            Pin:   Number(partyLedger.rows[0].pincode) || 100001,
            Stcd:  buyerStateCode,
          },
          ItemList: itemList,
          ValDtls: {
            AssVal:    totalAssessable,
            IgstVal:   totalIGST,
            CgstVal:   totalCGST,
            SgstVal:   totalSGST,
            CesVal:    0,
            TotInvVal: totalValue,
          },
        };

        // Fire and forget — don't block voucher save
        eInvoiceService.generateIRN(
          data.company_id,
          voucher_id,
          nicPayload,
          credsRes.credentials
        ).then((irnRes) => {
          if (irnRes.success) {
            console.log(`[eInvoice] IRN generated: ${irnRes.data.Irn}`);
          } else {
            console.warn(`[eInvoice] IRN failed: ${irnRes.error}`);
          }
        }).catch((e) => {
          console.warn('[eInvoice] IRN error:', e.message);
        });
      }
    }
  } catch (eInvErr) {
    // Never block voucher save because of e-invoice failure
    console.warn('[eInvoice] Auto-trigger error:', eInvErr.message);
  }
}

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

      const receiptDetails = await db.execute({
        sql: `SELECT * FROM voucher_receipt_details WHERE voucher_id = ?`,
        args: [id],
      });
      const partyDetails = await db.execute({
        sql: `SELECT * FROM voucher_party_details WHERE voucher_id = ?`,
        args: [id],
      });
      const dispatchDetails = await db.execute({
        sql: `SELECT * FROM voucher_dispatch_details WHERE voucher_id = ?`,
        args: [id],
      });
      const creditNoteDetails = await db.execute({
        sql: `SELECT * FROM voucher_credit_note_details WHERE voucher_id = ?`,
        args: [id],
      });
      const debitNoteDetails = await db.execute({
        sql: `SELECT * FROM voucher_debit_note_details WHERE voucher_id = ?`,
        args: [id],
      });
      const payrollEntries = await db.execute({
        sql: `SELECT pe.*, emp.name as employee_name, emp.employee_number, ph.name as pay_head_name
              FROM voucher_payroll_entries pe
              LEFT JOIN employees emp ON emp.employee_id = pe.employee_id
              LEFT JOIN pay_heads ph ON ph.pay_head_id = pe.pay_head_id
              WHERE pe.voucher_id = ?`,
        args: [id],
      });

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
          receipt_details: receiptDetails.rows[0] || null,
          party_details: partyDetails.rows[0] || null,
          dispatch_details: dispatchDetails.rows[0] || null,
          credit_note_details: creditNoteDetails.rows[0] || null,
          debit_note_details: debitNoteDetails.rows[0] || null,
          payroll_entries: payrollEntries.rows,
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

      const current = existing.rows[0];
      const voucherType = data.voucher_type || current.voucher_type;

      if (voucherType === 'Payroll') {
        const entries = [];
        let totalNetDrCr = 0;
        
        let pEntries = data.payroll_entries;
        if (pEntries === undefined) {
          const existingPEntries = await db.execute({
            sql: `SELECT * FROM voucher_payroll_entries WHERE voucher_id = ?`,
            args: [data.voucher_id],
          });
          pEntries = existingPEntries.rows;
        }
        
        if (pEntries && pEntries.length > 0) {
          const companyId = data.company_id || current.company_id;
          for (const entry of pEntries) {
            const phResult = await db.execute({
              sql: `SELECT name, pay_head_type FROM pay_heads WHERE pay_head_id = ?`,
              args: [entry.pay_head_id],
            });
            if (phResult.rows.length > 0) {
              const ph = phResult.rows[0];
              const ledgerId = await getOrCreatePayHeadLedger(companyId, ph.name);
              const isDeduction = ph.pay_head_type && (
                ph.pay_head_type.toLowerCase().includes('deduction') ||
                ph.pay_head_type.toLowerCase().includes('pf') ||
                ph.pay_head_type.toLowerCase().includes('esi')
              );
              
              const amount = Number(entry.amount) || 0;
              if (amount > 0) {
                if (isDeduction) {
                  entries.push({
                    ledger_id: ledgerId,
                    ledger_name: ph.name,
                    type: 'Cr',
                    amount: amount,
                  });
                  totalNetDrCr -= amount;
                } else {
                  entries.push({
                    ledger_id: ledgerId,
                    ledger_name: ph.name,
                    type: 'Dr',
                    amount: amount,
                  });
                  totalNetDrCr += amount;
                }
              }
            }
          }
        }
        
        const bankLedgerId = data.party_ledger_id !== undefined ? data.party_ledger_id : current.party_ledger_id;
        if (totalNetDrCr !== 0 && bankLedgerId) {
          const bankLedger = await db.execute({
            sql: `SELECT name FROM ledgers WHERE ledger_id = ?`,
            args: [bankLedgerId],
          });
          const bankName = bankLedger.rows.length > 0 ? bankLedger.rows[0].name : 'Cash/Bank Account';
          
          if (totalNetDrCr > 0) {
            entries.push({
              ledger_id: bankLedgerId,
              ledger_name: bankName,
              type: 'Cr',
              amount: totalNetDrCr,
            });
          } else {
            entries.push({
              ledger_id: bankLedgerId,
              ledger_name: bankName,
              type: 'Dr',
              amount: Math.abs(totalNetDrCr),
            });
          }
        }
        data.entries = entries;
      }

      if (data.entries && data.entries.length > 0 && !validateDoubleEntry(data.entries)) {
        return { success: false, error: 'Debit and Credit amounts must be equal' };
      }

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

      if (data.bill_references !== undefined) {
        await db.execute({
          sql: `DELETE FROM voucher_bill_references WHERE voucher_id = ?`,
          args: [data.voucher_id],
        });
        if (data.bill_references && data.bill_references.length > 0) {
          for (const bill of data.bill_references) {
            await db.execute({
              sql: `INSERT INTO voucher_bill_references (voucher_id, ledger_id, bill_name, bill_type, amount, credit_period, due_date)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
              args: [data.voucher_id, bill.ledger_id, bill.bill_name, bill.bill_type, bill.amount, nullify(bill.credit_period) || null, nullify(bill.due_date) || null],
            });
          }
        }
      }

      if (data.receipt_details !== undefined) {
        await db.execute({
          sql: `DELETE FROM voucher_receipt_details WHERE voucher_id = ?`,
          args: [data.voucher_id],
        });
        if (data.receipt_details) {
          const rd = data.receipt_details;
          await db.execute({
            sql: `INSERT INTO voucher_receipt_details (voucher_id, receipt_note_no, receipt_doc_no, dispatched_through, destination, carrier_name, bill_of_lading_no, bill_of_lading_date, motor_vehicle_no)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              data.voucher_id,
              nullify(rd.receipt_note_no) || null,
              nullify(rd.receipt_doc_no) || null,
              nullify(rd.dispatched_through) || null,
              nullify(rd.destination) || null,
              nullify(rd.carrier_name) || null,
              nullify(rd.bill_of_lading_no) || null,
              nullify(rd.bill_of_lading_date) || null,
              nullify(rd.motor_vehicle_no) || null,
            ],
          });
        }
      }

      if (data.party_details !== undefined) {
        await db.execute({
          sql: `DELETE FROM voucher_party_details WHERE voucher_id = ?`,
          args: [data.voucher_id],
        });
        if (data.party_details) {
          const pd = data.party_details;
          await db.execute({
            sql: `INSERT INTO voucher_party_details (voucher_id, supplier_name, mailing_name, address, state, country)
                  VALUES (?, ?, ?, ?, ?, ?)`,
            args: [
              data.voucher_id,
              nullify(pd.supplier_name) || null,
              nullify(pd.mailing_name) || null,
              nullify(pd.address) || null,
              nullify(pd.state) || null,
              nullify(pd.country) || null,
            ],
          });
        }
      }

      if (data.dispatch_details !== undefined) {
        await db.execute({
          sql: `DELETE FROM voucher_dispatch_details WHERE voucher_id = ?`,
          args: [data.voucher_id],
        });
        if (data.dispatch_details) {
          const dd = data.dispatch_details;
          await db.execute({
            sql: `INSERT INTO voucher_dispatch_details (voucher_id, delivery_note_nos, dispatch_doc_no, dispatched_through, destination, carrier_name, bill_of_lading_no, bill_of_lading_date, motor_vehicle_no)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              data.voucher_id,
              nullify(dd.delivery_note_nos) || null,
              nullify(dd.dispatch_doc_no) || null,
              nullify(dd.dispatched_through) || null,
              nullify(dd.destination) || null,
              nullify(dd.carrier_name) || null,
              nullify(dd.bill_of_lading_no) || null,
              nullify(dd.bill_of_lading_date) || null,
              nullify(dd.motor_vehicle_no) || null,
            ],
          });
        }
      }

      if (data.payroll_entries !== undefined) {
        await db.execute({
          sql: `DELETE FROM voucher_payroll_entries WHERE voucher_id = ?`,
          args: [data.voucher_id],
        });
        if (data.payroll_entries && data.payroll_entries.length > 0) {
          for (const entry of data.payroll_entries) {
            await db.execute({
              sql: `INSERT INTO voucher_payroll_entries (voucher_id, employee_id, pay_head_id, amount)
                    VALUES (?, ?, ?, ?)`,
              args: [
                data.voucher_id,
                nullify(entry.employee_id),
                nullify(entry.pay_head_id),
                Number(entry.amount) || 0,
              ],
            });
          }
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

  getPendingBills: async (ledger_id, company_id, fy_id) => {
    return await getPendingBills(ledger_id, company_id, fy_id);
  },
};