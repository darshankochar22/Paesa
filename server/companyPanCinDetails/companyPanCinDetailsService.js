const { db } = require('../db/index');
const { sql, eq } = require('drizzle-orm');
const { companyPanCinDetails } = require('../db/schema');

const get = async (company_id) => {
  try {
    const rows = await db.all(
      sql`SELECT * FROM ${companyPanCinDetails}
          WHERE ${companyPanCinDetails.companyId} = ${company_id}
          LIMIT 1`
    );

    if (!rows || rows.length === 0) {
      return { success: true, exists: false, data: null };
    }

    const record = rows[0];
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
    const existing = await db.all(
      sql`SELECT ${companyPanCinDetails.companyId} FROM ${companyPanCinDetails}
          WHERE ${companyPanCinDetails.companyId} = ${company_id}
          LIMIT 1`
    );

    if (existing && existing.length > 0) {
      // UPDATE
      await db
        .update(companyPanCinDetails)
        .set({
          pan: data.pan || null,
          cin: data.cin || null,
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(companyPanCinDetails.companyId, company_id));
    } else {
      // INSERT
      await db
        .insert(companyPanCinDetails)
        .values({
          companyId: company_id,
          pan: data.pan || null,
          cin: data.cin || null,
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
