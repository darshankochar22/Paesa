const { db } = require('../db/index');

const get = async (company_id) => {
  try {
    const result = await db.execute({
      sql: `SELECT * FROM company_tds_details WHERE company_id = ? LIMIT 1`,
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
        tanRegNumber: record.tan_reg_number || '',
        tan: record.tan || '',
        deductorType: record.deductor_type || 'Company',
        deductorBranch: record.deductor_branch || '',
        setAlterPersonResponsible: record.set_alter_person_responsible === 1,
        personResponsibleName: record.person_responsible_name || '',
        personResponsibleDesignation: record.person_responsible_designation || '',
        personResponsiblePan: record.person_responsible_pan || '',
        personResponsiblePhone: record.person_responsible_phone || '',
        personResponsibleEmail: record.person_responsible_email || '',
        ignoreItExemption: record.ignore_it_exemption === 1,
        activateTdsForItems: record.activate_tds_for_items === 1,
      },
    };
  } catch (err) {
    console.error('Error fetching company TDS details:', err);
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
      sql: `SELECT company_id FROM company_tds_details WHERE company_id = ? LIMIT 1`,
      args: [company_id],
    });

    if (existing.rows && existing.rows.length > 0) {
      // UPDATE
      await db.execute({
        sql: `UPDATE company_tds_details SET
                tan_reg_number = ?,
                tan = ?,
                deductor_type = ?,
                deductor_branch = ?,
                set_alter_person_responsible = ?,
                person_responsible_name = ?,
                person_responsible_designation = ?,
                person_responsible_pan = ?,
                person_responsible_phone = ?,
                person_responsible_email = ?,
                ignore_it_exemption = ?,
                activate_tds_for_items = ?,
                updated_at = datetime('now')
              WHERE company_id = ?`,
        args: [
          data.tanRegNumber || null,
          data.tan || null,
          data.deductorType || 'Company',
          data.deductorBranch || null,
          data.setAlterPersonResponsible ? 1 : 0,
          data.personResponsibleName || null,
          data.personResponsibleDesignation || null,
          data.personResponsiblePan || null,
          data.personResponsiblePhone || null,
          data.personResponsibleEmail || null,
          data.ignoreItExemption ? 1 : 0,
          data.activateTdsForItems ? 1 : 0,
          company_id,
        ],
      });
    } else {
      // INSERT
      await db.execute({
        sql: `INSERT INTO company_tds_details (
                company_id,
                tan_reg_number,
                tan,
                deductor_type,
                deductor_branch,
                set_alter_person_responsible,
                person_responsible_name,
                person_responsible_designation,
                person_responsible_pan,
                person_responsible_phone,
                person_responsible_email,
                ignore_it_exemption,
                activate_tds_for_items
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          company_id,
          data.tanRegNumber || null,
          data.tan || null,
          data.deductorType || 'Company',
          data.deductorBranch || null,
          data.setAlterPersonResponsible ? 1 : 0,
          data.personResponsibleName || null,
          data.personResponsibleDesignation || null,
          data.personResponsiblePan || null,
          data.personResponsiblePhone || null,
          data.personResponsibleEmail || null,
          data.ignoreItExemption ? 1 : 0,
          data.activateTdsForItems ? 1 : 0,
        ],
      });
    }

    return { success: true };
  } catch (err) {
    console.error('Error saving company TDS details:', err);
    return { success: false, error: err.message };
  }
};

module.exports = {
  get,
  save,
};
