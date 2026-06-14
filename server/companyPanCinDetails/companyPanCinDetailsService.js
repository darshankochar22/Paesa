const { db } = require('../db/index');

const get = async (company_id) => {
  try {
    const result = await db.execute({
      sql: `SELECT * FROM company_pan_cin_details WHERE company_id = ? LIMIT 1`,
      args: [company_id],
    });

    if (!result.rows || result.rows.length === 0) {
      return { success: true, exists: false, data: null };
    }

    const record = result.rows[0];
    return {
      success: true,
      exists: true,
      data: {
        pan: record.pan || '',
        cin: record.cin || '',
      },
    };
  } catch (err) {
    console.error('Error fetching company PAN/CIN details:', err);
    return { success: false, error: err.message };
  }
};

const save = async (data) => {
  try {
    const company_id = data.company_id;
    if (!company_id) {
      return { success: false, error: 'Company ID is required' };
    }

    // Check if record exists
    const existing = await db.execute({
      sql: `SELECT company_id FROM company_pan_cin_details WHERE company_id = ? LIMIT 1`,
      args: [company_id],
    });

    if (existing.rows && existing.rows.length > 0) {
      // UPDATE
      await db.execute({
        sql: `UPDATE company_pan_cin_details SET
                pan = ?,
                cin = ?,
                updated_at = datetime('now')
              WHERE company_id = ?`,
        args: [
          data.pan || null,
          data.cin || null,
          company_id,
        ],
      });
    } else {
      // INSERT
      await db.execute({
        sql: `INSERT INTO company_pan_cin_details (
                company_id,
                pan,
                cin
              ) VALUES (?, ?, ?)`,
        args: [
          company_id,
          data.pan || null,
          data.cin || null,
        ],
      });
    }

    return { success: true };
  } catch (err) {
    console.error('Error saving company PAN/CIN details:', err);
    return { success: false, error: err.message };
  }
};

module.exports = {
  get,
  save,
};
