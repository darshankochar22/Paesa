const { db } = require("../db/index");

const seedDefaultLedgers = async (company_id, groups) => {
  const cashGroup = groups.find(
    (g) => g.name === "Cash-in-hand" && g.company_id === company_id,
  );
  const plGroup = groups.find(
    (g) => g.name === "Capital Account" && g.company_id === company_id,
  );

  const defaults = [
    {
      group_id: cashGroup ? cashGroup.group_id : null,
      name: "Cash",
      ledger_type: "Cash",
      nature: "Assets",
    },
    {
      group_id: plGroup ? plGroup.group_id : null,
      name: "Profit & Loss A/c",
      ledger_type: "General",
      nature: "Liabilities",
    },
  ];

  for (const l of defaults) {
    await db.execute({
      sql: `INSERT INTO ledgers (
              company_id, group_id, name, alias, ledger_type, nature,
              opening_balance, closing_balance, is_bill_wise, maintain_inventory_values,
              mailing_name, address1, address2, city, state, country, pincode,
              phone, email, gstin, pan, registration_type,
              bank_name, account_number, ifsc_code, is_active, is_predefined
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        company_id, l.group_id, l.name, null, l.ledger_type, l.nature,
        0, 0, 0, 0,
        null, null, null, null, null, null, null,
        null, null, null, null, "Unregistered",
        null, null, null, 1, 1,
      ],
    });
  }
};

module.exports = {
  seedDefaultLedgers,

  create: async (data) => {
    try {
      const exists = await db.execute({
        sql: `SELECT * FROM ledgers WHERE company_id = ? AND LOWER(name) = LOWER(?) AND is_active = 1`,
        args: [data.company_id, data.name],
      });
      if (exists.rows.length > 0) return { success: false, error: "Ledger already exists" };

      const result = await db.execute({
        sql: `INSERT INTO ledgers (
                company_id, group_id, name, alias, ledger_type, nature,
                opening_balance, closing_balance, is_bill_wise, maintain_inventory_values,
                mailing_name, address1, address2, city, state, country, pincode,
                phone, email, gstin, pan, registration_type,
                bank_name, account_number, ifsc_code, is_active, is_predefined
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          data.company_id, data.group_id || null, data.name, data.alias || null,
          data.ledger_type || "General", data.nature || null,
          data.opening_balance || 0, data.closing_balance || 0,
          data.is_bill_wise ? 1 : 0, data.maintain_inventory_values ? 1 : 0,
          data.mailing_name || null, data.address1 || null, data.address2 || null,
          data.city || null, data.state || null, data.country || null, data.pincode || null,
          data.phone || null, data.email || null, data.gstin || null, data.pan || null,
          data.registration_type || "Unregistered",
          data.bank_name || null, data.account_number || null, data.ifsc_code || null,
          1, 0,
        ],
      });

      const ledger_id = Number(result.lastInsertRowid);

      if (data.bank_details) {
        await db.execute({
          sql: `INSERT INTO ledger_bank_details (
                  ledger_id, account_holder_name, account_number, ifsc_code,
                  swift_code, bank_name, branch_name, bank_configuration,
                  cheque_book_start_no, cheque_book_end_no, enable_cheque_printing,
                  cheque_printing_configuration, od_limit
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            ledger_id,
            data.bank_details.account_holder_name || null,
            data.bank_details.account_number || null,
            data.bank_details.ifsc_code || null,
            data.bank_details.swift_code || null,
            data.bank_details.bank_name || null,
            data.bank_details.branch_name || null,
            data.bank_details.bank_configuration || null,
            data.bank_details.cheque_book_start_no || null,
            data.bank_details.cheque_book_end_no || null,
            data.bank_details.enable_cheque_printing ? 1 : 0,
            data.bank_details.cheque_printing_configuration || null,
            data.bank_details.od_limit || 0,
          ],
        });
      }

      if (data.statutory_details) {
        await db.execute({
          sql: `INSERT INTO ledger_statutory_details (
                  ledger_id, gst_applicability, hsn_sac_code, hsn_sac_description,
                  gst_rate, cgst_rate, sgst_rate, igst_rate,
                  type_of_duty_tax, percentage_of_calculation, statutory_details
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            ledger_id,
            data.statutory_details.gst_applicability || "Not Applicable",
            data.statutory_details.hsn_sac_code || null,
            data.statutory_details.hsn_sac_description || null,
            data.statutory_details.gst_rate || 0,
            data.statutory_details.cgst_rate || 0,
            data.statutory_details.sgst_rate || 0,
            data.statutory_details.igst_rate || 0,
            data.statutory_details.type_of_duty_tax || null,
            data.statutory_details.percentage_of_calculation || 0,
            data.statutory_details.statutory_details || null,
          ],
        });
      }

      const ledger = await db.execute({
        sql: `SELECT * FROM ledgers WHERE ledger_id = ?`,
        args: [ledger_id],
      });
      return { success: true, ledger: ledger.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const result = await db.execute({
        sql: `SELECT * FROM ledgers WHERE company_id = ? AND is_active = 1`,
        args: [company_id],
      });
      return { success: true, ledgers: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const result = await db.execute({
        sql: `SELECT * FROM ledgers WHERE ledger_id = ?`,
        args: [id],
      });
      if (result.rows.length === 0) return { success: false, error: "Ledger not found" };

      const bank = await db.execute({
        sql: `SELECT * FROM ledger_bank_details WHERE ledger_id = ?`,
        args: [id],
      });
      const statutory = await db.execute({
        sql: `SELECT * FROM ledger_statutory_details WHERE ledger_id = ?`,
        args: [id],
      });

      return {
        success: true,
        ledger: {
          ...result.rows[0],
          bank_details: bank.rows[0] || null,
          statutory_details: statutory.rows[0] || null,
        },
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getByGroup: async (company_id, group_id) => {
    try {
      const result = await db.execute({
        sql: `SELECT * FROM ledgers WHERE company_id = ? AND group_id = ? AND is_active = 1`,
        args: [company_id, group_id],
      });
      return { success: true, ledgers: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const existing = await db.execute({
        sql: `SELECT * FROM ledgers WHERE ledger_id = ?`,
        args: [data.ledger_id],
      });
      if (existing.rows.length === 0) return { success: false, error: "Ledger not found" };
      const ledger = existing.rows[0];
      if (ledger.is_predefined) return { success: false, error: "Cannot edit predefined ledgers" };

      await db.execute({
        sql: `UPDATE ledgers SET
                group_id = ?, name = ?, alias = ?, ledger_type = ?, nature = ?,
                opening_balance = ?, closing_balance = ?, is_bill_wise = ?,
                maintain_inventory_values = ?, mailing_name = ?, address1 = ?,
                address2 = ?, city = ?, state = ?, country = ?, pincode = ?,
                phone = ?, email = ?, gstin = ?, pan = ?, registration_type = ?,
                bank_name = ?, account_number = ?, ifsc_code = ?, updated_at = datetime('now')
              WHERE ledger_id = ?`,
        args: [
          data.group_id ?? ledger.group_id,
          data.name ?? ledger.name,
          data.alias ?? ledger.alias,
          data.ledger_type ?? ledger.ledger_type,
          data.nature ?? ledger.nature,
          data.opening_balance ?? ledger.opening_balance,
          data.closing_balance ?? ledger.closing_balance,
          data.is_bill_wise ? 1 : 0,
          data.maintain_inventory_values ? 1 : 0,
          data.mailing_name ?? ledger.mailing_name,
          data.address1 ?? ledger.address1,
          data.address2 ?? ledger.address2,
          data.city ?? ledger.city,
          data.state ?? ledger.state,
          data.country ?? ledger.country,
          data.pincode ?? ledger.pincode,
          data.phone ?? ledger.phone,
          data.email ?? ledger.email,
          data.gstin ?? ledger.gstin,
          data.pan ?? ledger.pan,
          data.registration_type ?? ledger.registration_type,
          data.bank_name ?? ledger.bank_name,
          data.account_number ?? ledger.account_number,
          data.ifsc_code ?? ledger.ifsc_code,
          data.ledger_id,
        ],
      });

      if (data.bank_details) {
        await db.execute({
          sql: `DELETE FROM ledger_bank_details WHERE ledger_id = ?`,
          args: [data.ledger_id],
        });
        await db.execute({
          sql: `INSERT INTO ledger_bank_details (
                  ledger_id, account_holder_name, account_number, ifsc_code,
                  swift_code, bank_name, branch_name, bank_configuration,
                  cheque_book_start_no, cheque_book_end_no, enable_cheque_printing,
                  cheque_printing_configuration, od_limit
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            data.ledger_id,
            data.bank_details.account_holder_name || null,
            data.bank_details.account_number || null,
            data.bank_details.ifsc_code || null,
            data.bank_details.swift_code || null,
            data.bank_details.bank_name || null,
            data.bank_details.branch_name || null,
            data.bank_details.bank_configuration || null,
            data.bank_details.cheque_book_start_no || null,
            data.bank_details.cheque_book_end_no || null,
            data.bank_details.enable_cheque_printing ? 1 : 0,
            data.bank_details.cheque_printing_configuration || null,
            data.bank_details.od_limit || 0,
          ],
        });
      }

      if (data.statutory_details) {
        await db.execute({
          sql: `DELETE FROM ledger_statutory_details WHERE ledger_id = ?`,
          args: [data.ledger_id],
        });
        await db.execute({
          sql: `INSERT INTO ledger_statutory_details (
                  ledger_id, gst_applicability, hsn_sac_code, hsn_sac_description,
                  gst_rate, cgst_rate, sgst_rate, igst_rate,
                  type_of_duty_tax, percentage_of_calculation, statutory_details
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            data.ledger_id,
            data.statutory_details.gst_applicability || "Not Applicable",
            data.statutory_details.hsn_sac_code || null,
            data.statutory_details.hsn_sac_description || null,
            data.statutory_details.gst_rate || 0,
            data.statutory_details.cgst_rate || 0,
            data.statutory_details.sgst_rate || 0,
            data.statutory_details.igst_rate || 0,
            data.statutory_details.type_of_duty_tax || null,
            data.statutory_details.percentage_of_calculation || 0,
            data.statutory_details.statutory_details || null,
          ],
        });
      }

      const updated = await db.execute({
        sql: `SELECT * FROM ledgers WHERE ledger_id = ?`,
        args: [data.ledger_id],
      });
      return { success: true, ledger: updated.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await db.execute({
        sql: `SELECT * FROM ledgers WHERE ledger_id = ?`,
        args: [id],
      });
      if (existing.rows.length === 0) return { success: false, error: "Ledger not found" };
      if (existing.rows[0].is_predefined) return { success: false, error: "Cannot delete predefined ledgers" };

      await db.execute({
        sql: `UPDATE ledgers SET is_active = 0 WHERE ledger_id = ?`,
        args: [id],
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};