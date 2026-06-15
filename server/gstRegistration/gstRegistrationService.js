const { db } = require('../db/index');

const validateGSTIN = (gstin) => {
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(gstin);
};

module.exports = {
  create: async (data) => {
    try {
      if (data.gstin && !validateGSTIN(data.gstin)) {
        return { success: false, error: 'Invalid GSTIN format' };
      }

      const exists = await db.execute(
        `SELECT * FROM gst_registrations WHERE company_id = ? AND gstin = ? AND is_active = 1`,
        [data.company_id, data.gstin]
      );
      if (exists.rows.length > 0) return { success: false, error: 'GSTIN already registered' };

      const result = await db.execute(
        `INSERT INTO gst_registrations (
          company_id, registration_type, registration_status,
          assessee_of_other_territory, periodicity_of_gstr1,
          gstin, gst_username, mode_of_filing, e_invoice_details,
          e_invoice_application, e_way_bill_applicable, e_way_bill_applicable_from,
          applicable_for_intrastat, legal_name, trade_name, state_id,
          registration_date, effective_from, address_type, goods_dispatched_from,
          e_invoice_applicable_from, e_invoice_bill_from_place, composition_tax_rate,
          composition_tax_calc_basis, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          data.company_id,
          data.registration_type || 'Regular',
          data.registration_status || 'Active',
          data.assessee_of_other_territory ? 1 : 0,
          data.periodicity_of_gstr1 || 'Monthly',
          data.gstin || null,
          data.gst_username || null,
          data.mode_of_filing || 'Online',
          data.e_invoice_details || null,
          data.e_invoice_application ? 1 : 0,
          data.e_way_bill_applicable ? 1 : 0,
          data.e_way_bill_applicable_from || null,
          data.applicable_for_intrastat ? 1 : 0,
          data.legal_name || null,
          data.trade_name || null,
          data.state_id || null,
          data.registration_date || null,
          data.effective_from || null,
          data.address_type || 'Primary',
          data.goods_dispatched_from || 'Primary',
          data.e_invoice_applicable_from || null,
          data.e_invoice_bill_from_place || null,
          data.composition_tax_rate || null,
          data.composition_tax_calc_basis || null,
        ]
      );

      const gstRegistration = await db.execute(
        `SELECT * FROM gst_registrations WHERE gst_id = ?`,
        [result.lastInsertRowid]
      );
      return { success: true, gstRegistration: gstRegistration.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM gst_registrations WHERE company_id = ?`,
        [company_id]
      );
      return { success: true, gstRegistrations: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM gst_registrations WHERE gst_id = ?`,
        [id]
      );
      if (result.rows.length === 0) return { success: false, error: 'GST Registration not found' };
      return { success: true, gstRegistration: result.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM gst_registrations WHERE gst_id = ?`,
        [data.gst_id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'GST Registration not found' };

      if (data.gstin && !validateGSTIN(data.gstin)) {
        return { success: false, error: 'Invalid GSTIN format' };
      }

      const current = existing.rows[0];
      await db.execute(
        `UPDATE gst_registrations SET
          registration_type = ?, registration_status = ?,
          assessee_of_other_territory = ?, periodicity_of_gstr1 = ?,
          gstin = ?, gst_username = ?, mode_of_filing = ?,
          e_invoice_details = ?, e_invoice_application = ?,
          e_way_bill_applicable = ?, e_way_bill_applicable_from = ?,
          applicable_for_intrastat = ?, legal_name = ?, trade_name = ?,
          state_id = ?, registration_date = ?, effective_from = ?,
          address_type = ?, goods_dispatched_from = ?, e_invoice_applicable_from = ?,
          e_invoice_bill_from_place = ?, composition_tax_rate = ?, composition_tax_calc_basis = ?,
          updated_at = datetime('now')
         WHERE gst_id = ?`,
        [
          data.registration_type ?? current.registration_type,
          data.registration_status ?? current.registration_status,
          data.assessee_of_other_territory ? 1 : 0,
          data.periodicity_of_gstr1 ?? current.periodicity_of_gstr1,
          data.gstin ?? current.gstin,
          data.gst_username ?? current.gst_username,
          data.mode_of_filing ?? current.mode_of_filing,
          data.e_invoice_details ?? current.e_invoice_details,
          data.e_invoice_application ? 1 : 0,
          data.e_way_bill_applicable ? 1 : 0,
          data.e_way_bill_applicable_from ?? current.e_way_bill_applicable_from,
          data.applicable_for_intrastat ? 1 : 0,
          data.legal_name ?? current.legal_name,
          data.trade_name ?? current.trade_name,
          data.state_id ?? current.state_id,
          data.registration_date ?? current.registration_date,
          data.effective_from ?? current.effective_from,
          data.address_type ?? current.address_type,
          data.goods_dispatched_from ?? current.goods_dispatched_from,
          data.e_invoice_applicable_from ?? current.e_invoice_applicable_from,
          data.e_invoice_bill_from_place ?? current.e_invoice_bill_from_place,
          data.composition_tax_rate ?? current.composition_tax_rate,
          data.composition_tax_calc_basis ?? current.composition_tax_calc_basis,
          data.gst_id,
        ]
      );

      const updated = await db.execute(
        `SELECT * FROM gst_registrations WHERE gst_id = ?`,
        [data.gst_id]
      );
      return { success: true, gstRegistration: updated.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM gst_registrations WHERE gst_id = ?`,
        [id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'GST Registration not found' };

      await db.execute(
        `UPDATE gst_registrations SET is_active = 0 WHERE gst_id = ?`,
        [id]
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};