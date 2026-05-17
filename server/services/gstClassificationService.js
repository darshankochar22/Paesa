const { db } = require('../db/index');

const seedDefaultGSTClassifications = async (company_id) => {
  const defaults = [
    { name: 'GST 0%',    gst_rate: 0,  cgst_rate: 0,   sgst_rate: 0,   igst_rate: 0,  cess_rate: 0, nature_of_transaction: 'Taxable'  },
    { name: 'GST 5%',    gst_rate: 5,  cgst_rate: 2.5, sgst_rate: 2.5, igst_rate: 5,  cess_rate: 0, nature_of_transaction: 'Taxable'  },
    { name: 'GST 12%',   gst_rate: 12, cgst_rate: 6,   sgst_rate: 6,   igst_rate: 12, cess_rate: 0, nature_of_transaction: 'Taxable'  },
    { name: 'GST 18%',   gst_rate: 18, cgst_rate: 9,   sgst_rate: 9,   igst_rate: 18, cess_rate: 0, nature_of_transaction: 'Taxable'  },
    { name: 'GST 28%',   gst_rate: 28, cgst_rate: 14,  sgst_rate: 14,  igst_rate: 28, cess_rate: 0, nature_of_transaction: 'Taxable'  },
    { name: 'Exempt',    gst_rate: 0,  cgst_rate: 0,   sgst_rate: 0,   igst_rate: 0,  cess_rate: 0, nature_of_transaction: 'Exempt'   },
    { name: 'Nil Rated', gst_rate: 0,  cgst_rate: 0,   sgst_rate: 0,   igst_rate: 0,  cess_rate: 0, nature_of_transaction: 'Nil Rated'},
    { name: 'Non GST',   gst_rate: 0,  cgst_rate: 0,   sgst_rate: 0,   igst_rate: 0,  cess_rate: 0, nature_of_transaction: 'Non GST'  },
  ];

  for (const g of defaults) {
    await db.execute(
      `INSERT INTO gst_classifications (
        company_id, name, nature_of_transaction, hsn_sac_code,
        gst_rate, cgst_rate, sgst_rate, igst_rate, cess_rate,
        valuation_type, description, is_predefined, is_active
      ) VALUES (?, ?, ?, null, ?, ?, ?, ?, ?, 'Based on Value', null, 1, 1)`,
      [company_id, g.name, g.nature_of_transaction, g.gst_rate, g.cgst_rate, g.sgst_rate, g.igst_rate, g.cess_rate]
    );
  }
};

module.exports = {
  seedDefaultGSTClassifications,

  create: async (data) => {
    try {
      const exists = await db.execute(
        `SELECT * FROM gst_classifications WHERE company_id = ? AND LOWER(name) = LOWER(?) AND is_active = 1`,
        [data.company_id, data.name]
      );
      if (exists.rows.length > 0) return { success: false, error: 'GST Classification already exists' };

      const result = await db.execute(
        `INSERT INTO gst_classifications (
          company_id, name, nature_of_transaction, hsn_sac_code,
          gst_rate, cgst_rate, sgst_rate, igst_rate, cess_rate,
          valuation_type, description, is_predefined, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`,
        [
          data.company_id,
          data.name,
          data.nature_of_transaction || 'Taxable',
          data.hsn_sac_code || null,
          data.gst_rate || 0,
          data.cgst_rate || 0,
          data.sgst_rate || 0,
          data.igst_rate || 0,
          data.cess_rate || 0,
          data.valuation_type || 'Based on Value',
          data.description || null,
        ]
      );

      const classification = await db.execute(
        `SELECT * FROM gst_classifications WHERE gc_id = ?`,
        [result.lastInsertRowid]
      );
      return { success: true, classification: classification.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM gst_classifications WHERE company_id = ? AND is_active = 1`,
        [company_id]
      );
      return { success: true, gstClassifications: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM gst_classifications WHERE gc_id = ?`,
        [id]
      );
      if (result.rows.length === 0) return { success: false, error: 'GST Classification not found' };
      return { success: true, classification: result.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM gst_classifications WHERE gc_id = ?`,
        [data.gc_id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'GST Classification not found' };
      if (existing.rows[0].is_predefined) return { success: false, error: 'Cannot edit predefined GST classifications' };

      const current = existing.rows[0];
      await db.execute(
        `UPDATE gst_classifications SET
          name = ?, nature_of_transaction = ?, hsn_sac_code = ?,
          gst_rate = ?, cgst_rate = ?, sgst_rate = ?, igst_rate = ?,
          cess_rate = ?, valuation_type = ?, description = ?,
          updated_at = datetime('now')
         WHERE gc_id = ?`,
        [
          data.name ?? current.name,
          data.nature_of_transaction ?? current.nature_of_transaction,
          data.hsn_sac_code ?? current.hsn_sac_code,
          data.gst_rate ?? current.gst_rate,
          data.cgst_rate ?? current.cgst_rate,
          data.sgst_rate ?? current.sgst_rate,
          data.igst_rate ?? current.igst_rate,
          data.cess_rate ?? current.cess_rate,
          data.valuation_type ?? current.valuation_type,
          data.description ?? current.description,
          data.gc_id,
        ]
      );

      const updated = await db.execute(
        `SELECT * FROM gst_classifications WHERE gc_id = ?`,
        [data.gc_id]
      );
      return { success: true, classification: updated.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM gst_classifications WHERE gc_id = ?`,
        [id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'GST Classification not found' };
      if (existing.rows[0].is_predefined) return { success: false, error: 'Cannot delete predefined GST classifications' };

      await db.execute(
        `UPDATE gst_classifications SET is_active = 0 WHERE gc_id = ?`,
        [id]
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};