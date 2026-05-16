const db = require("../db/index");

const seedDefaultLedgers = (company_id, groups) => {
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

  const stmt = db.execute(`
    INSERT INTO ledgers (
      company_id, group_id, name, alias, ledger_type, nature,
      opening_balance, closing_balance, is_bill_wise, maintain_inventory_values,
      mailing_name, address1, address2, city, state, country, pincode,
      phone, email, gstin, pan, registration_type,
      bank_name, account_number, ifsc_code, is_active, is_predefined
    ) VALUES (
      @company_id, @group_id, @name, @alias, @ledger_type, @nature,
      @opening_balance, @closing_balance, @is_bill_wise, @maintain_inventory_values,
      @mailing_name, @address1, @address2, @city, @state, @country, @pincode,
      @phone, @email, @gstin, @pan, @registration_type,
      @bank_name, @account_number, @ifsc_code, @is_active, @is_predefined
    )
  `);

  defaults.forEach((l) => {
    stmt.run({
      company_id: company_id,
      group_id: l.group_id,
      name: l.name,
      alias: null,
      ledger_type: l.ledger_type,
      nature: l.nature,
      opening_balance: 0,
      closing_balance: 0,
      is_bill_wise: 0,
      maintain_inventory_values: 0,
      mailing_name: null,
      address1: null,
      address2: null,
      city: null,
      state: null,
      country: null,
      pincode: null,
      phone: null,
      email: null,
      gstin: null,
      pan: null,
      registration_type: "Unregistered",
      bank_name: null,
      account_number: null,
      ifsc_code: null,
      is_active: 1,
      is_predefined: 1,
    });
  });
};

module.exports = {
  seedDefaultLedgers,

  create: async (data) => {
    try {
      const exists = db
        .execute(
          `
        SELECT * FROM ledgers
        WHERE company_id = ? AND LOWER(name) = LOWER(?) AND is_active = 1
      `,
        )
        .get(data.company_id, data.name);
      if (exists) return { success: false, error: "Ledger already exists" };

      const result = db
        .execute(
          `
        INSERT INTO ledgers (
          company_id, group_id, name, alias, ledger_type, nature,
          opening_balance, closing_balance, is_bill_wise, maintain_inventory_values,
          mailing_name, address1, address2, city, state, country, pincode,
          phone, email, gstin, pan, registration_type,
          bank_name, account_number, ifsc_code, is_active, is_predefined
        ) VALUES (
          @company_id, @group_id, @name, @alias, @ledger_type, @nature,
          @opening_balance, @closing_balance, @is_bill_wise, @maintain_inventory_values,
          @mailing_name, @address1, @address2, @city, @state, @country, @pincode,
          @phone, @email, @gstin, @pan, @registration_type,
          @bank_name, @account_number, @ifsc_code, @is_active, @is_predefined
        )
      `,
        )
        .run({
          company_id: data.company_id,
          group_id: data.group_id || null,
          name: data.name,
          alias: data.alias || null,
          ledger_type: data.ledger_type || "General",
          nature: data.nature || null,
          opening_balance: data.opening_balance || 0,
          closing_balance: data.closing_balance || 0,
          is_bill_wise: data.is_bill_wise ? 1 : 0,
          maintain_inventory_values: data.maintain_inventory_values ? 1 : 0,
          mailing_name: data.mailing_name || null,
          address1: data.address1 || null,
          address2: data.address2 || null,
          city: data.city || null,
          state: data.state || null,
          country: data.country || null,
          pincode: data.pincode || null,
          phone: data.phone || null,
          email: data.email || null,
          gstin: data.gstin || null,
          pan: data.pan || null,
          registration_type: data.registration_type || "Unregistered",
          bank_name: data.bank_name || null,
          account_number: data.account_number || null,
          ifsc_code: data.ifsc_code || null,
          is_active: 1,
          is_predefined: 0,
        });

      const ledger_id = result.lastInsertRowid;

      if (data.bank_details) {
        db.execute(
          `
          INSERT INTO ledger_bank_details (
            ledger_id, account_holder_name, account_number, ifsc_code,
            swift_code, bank_name, branch_name, bank_configuration,
            cheque_book_start_no, cheque_book_end_no, enable_cheque_printing,
            cheque_printing_configuration, od_limit
          ) VALUES (
            @ledger_id, @account_holder_name, @account_number, @ifsc_code,
            @swift_code, @bank_name, @branch_name, @bank_configuration,
            @cheque_book_start_no, @cheque_book_end_no, @enable_cheque_printing,
            @cheque_printing_configuration, @od_limit
          )
        `,
        ).run({
          ledger_id,
          account_holder_name: data.bank_details.account_holder_name || null,
          account_number: data.bank_details.account_number || null,
          ifsc_code: data.bank_details.ifsc_code || null,
          swift_code: data.bank_details.swift_code || null,
          bank_name: data.bank_details.bank_name || null,
          branch_name: data.bank_details.branch_name || null,
          bank_configuration: data.bank_details.bank_configuration || null,
          cheque_book_start_no: data.bank_details.cheque_book_start_no || null,
          cheque_book_end_no: data.bank_details.cheque_book_end_no || null,
          enable_cheque_printing: data.bank_details.enable_cheque_printing
            ? 1
            : 0,
          cheque_printing_configuration:
            data.bank_details.cheque_printing_configuration || null,
          od_limit: data.bank_details.od_limit || 0,
        });
      }

      if (data.statutory_details) {
        db.execute(
          `
          INSERT INTO ledger_statutory_details (
            ledger_id, gst_applicability, hsn_sac_code, hsn_sac_description,
            gst_rate, cgst_rate, sgst_rate, igst_rate,
            type_of_duty_tax, percentage_of_calculation, statutory_details
          ) VALUES (
            @ledger_id, @gst_applicability, @hsn_sac_code, @hsn_sac_description,
            @gst_rate, @cgst_rate, @sgst_rate, @igst_rate,
            @type_of_duty_tax, @percentage_of_calculation, @statutory_details
          )
        `,
        ).run({
          ledger_id,
          gst_applicability:
            data.statutory_details.gst_applicability || "Not Applicable",
          hsn_sac_code: data.statutory_details.hsn_sac_code || null,
          hsn_sac_description:
            data.statutory_details.hsn_sac_description || null,
          gst_rate: data.statutory_details.gst_rate || 0,
          cgst_rate: data.statutory_details.cgst_rate || 0,
          sgst_rate: data.statutory_details.sgst_rate || 0,
          igst_rate: data.statutory_details.igst_rate || 0,
          type_of_duty_tax: data.statutory_details.type_of_duty_tax || null,
          percentage_of_calculation:
            data.statutory_details.percentage_of_calculation || 0,
          statutory_details: data.statutory_details.statutory_details || null,
        });
      }

      const ledger = db
        .execute(`SELECT * FROM ledgers WHERE ledger_id = ?`)
        .get(ledger_id);
      return { success: true, ledger };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const ledgers = db
        .execute(
          `
        SELECT * FROM ledgers WHERE company_id = ? AND is_active = 1
      `,
        )
        .all(company_id);
      return { success: true, ledgers };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const ledger = db
        .execute(`SELECT * FROM ledgers WHERE ledger_id = ?`)
        .get(id);
      if (!ledger) return { success: false, error: "Ledger not found" };

      const bank_details =
        db
          .execute(`SELECT * FROM ledger_bank_details WHERE ledger_id = ?`)
          .get(id) || null;
      const statutory_details =
        db
          .execute(`SELECT * FROM ledger_statutory_details WHERE ledger_id = ?`)
          .get(id) || null;

      return {
        success: true,
        ledger: { ...ledger, bank_details, statutory_details },
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getByGroup: async (company_id, group_id) => {
    try {
      const ledgers = db
        .execute(
          `
        SELECT * FROM ledgers WHERE company_id = ? AND group_id = ? AND is_active = 1
      `,
        )
        .all(company_id, group_id);
      return { success: true, ledgers };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const ledger = db
        .execute(`SELECT * FROM ledgers WHERE ledger_id = ?`)
        .get(data.ledger_id);
      if (!ledger) return { success: false, error: "Ledger not found" };
      if (ledger.is_predefined)
        return { success: false, error: "Cannot edit predefined ledgers" };

      db.execute(
        `
        UPDATE ledgers SET
          group_id = @group_id, name = @name, alias = @alias,
          ledger_type = @ledger_type, nature = @nature,
          opening_balance = @opening_balance, closing_balance = @closing_balance,
          is_bill_wise = @is_bill_wise, maintain_inventory_values = @maintain_inventory_values,
          mailing_name = @mailing_name, address1 = @address1, address2 = @address2,
          city = @city, state = @state, country = @country, pincode = @pincode,
          phone = @phone, email = @email, gstin = @gstin, pan = @pan,
          registration_type = @registration_type, bank_name = @bank_name,
          account_number = @account_number, ifsc_code = @ifsc_code,
          updated_at = datetime('now')
        WHERE ledger_id = @ledger_id
      `,
      ).run({
        ledger_id: data.ledger_id,
        group_id: data.group_id ?? ledger.group_id,
        name: data.name ?? ledger.name,
        alias: data.alias ?? ledger.alias,
        ledger_type: data.ledger_type ?? ledger.ledger_type,
        nature: data.nature ?? ledger.nature,
        opening_balance: data.opening_balance ?? ledger.opening_balance,
        closing_balance: data.closing_balance ?? ledger.closing_balance,
        is_bill_wise: data.is_bill_wise ? 1 : 0,
        maintain_inventory_values: data.maintain_inventory_values ? 1 : 0,
        mailing_name: data.mailing_name ?? ledger.mailing_name,
        address1: data.address1 ?? ledger.address1,
        address2: data.address2 ?? ledger.address2,
        city: data.city ?? ledger.city,
        state: data.state ?? ledger.state,
        country: data.country ?? ledger.country,
        pincode: data.pincode ?? ledger.pincode,
        phone: data.phone ?? ledger.phone,
        email: data.email ?? ledger.email,
        gstin: data.gstin ?? ledger.gstin,
        pan: data.pan ?? ledger.pan,
        registration_type: data.registration_type ?? ledger.registration_type,
        bank_name: data.bank_name ?? ledger.bank_name,
        account_number: data.account_number ?? ledger.account_number,
        ifsc_code: data.ifsc_code ?? ledger.ifsc_code,
      });

      if (data.bank_details) {
        const existing = db
          .execute(`SELECT * FROM ledger_bank_details WHERE ledger_id = ?`)
          .get(data.ledger_id);
        if (existing) {
          db.execute(
            `
            UPDATE ledger_bank_details SET
              account_holder_name = @account_holder_name, account_number = @account_number,
              ifsc_code = @ifsc_code, swift_code = @swift_code, bank_name = @bank_name,
              branch_name = @branch_name, od_limit = @od_limit
            WHERE ledger_id = @ledger_id
          `,
          ).run({ ledger_id: data.ledger_id, ...data.bank_details });
        } else {
          db.execute(
            `
            INSERT INTO ledger_bank_details (ledger_id, account_holder_name, account_number, ifsc_code, swift_code, bank_name, branch_name, od_limit)
            VALUES (@ledger_id, @account_holder_name, @account_number, @ifsc_code, @swift_code, @bank_name, @branch_name, @od_limit)
          `,
          ).run({ ledger_id: data.ledger_id, ...data.bank_details });
        }
      }

      if (data.statutory_details) {
        const existing = db
          .execute(`SELECT * FROM ledger_statutory_details WHERE ledger_id = ?`)
          .get(data.ledger_id);
        if (existing) {
          db.execute(
            `
            UPDATE ledger_statutory_details SET
              gst_applicability = @gst_applicability, hsn_sac_code = @hsn_sac_code,
              gst_rate = @gst_rate, cgst_rate = @cgst_rate,
              sgst_rate = @sgst_rate, igst_rate = @igst_rate
            WHERE ledger_id = @ledger_id
          `,
          ).run({ ledger_id: data.ledger_id, ...data.statutory_details });
        } else {
          db.execute(
            `
            INSERT INTO ledger_statutory_details (ledger_id, gst_applicability, hsn_sac_code, gst_rate, cgst_rate, sgst_rate, igst_rate)
            VALUES (@ledger_id, @gst_applicability, @hsn_sac_code, @gst_rate, @cgst_rate, @sgst_rate, @igst_rate)
          `,
          ).run({ ledger_id: data.ledger_id, ...data.statutory_details });
        }
      }

      const updated = db
        .execute(`SELECT * FROM ledgers WHERE ledger_id = ?`)
        .get(data.ledger_id);
      return { success: true, ledger: updated };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const ledger = db
        .execute(`SELECT * FROM ledgers WHERE ledger_id = ?`)
        .get(id);
      if (!ledger) return { success: false, error: "Ledger not found" };
      if (ledger.is_predefined)
        return { success: false, error: "Cannot delete predefined ledgers" };

      db.execute(`UPDATE ledgers SET is_active = 0 WHERE ledger_id = ?`).run(
        id,
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
