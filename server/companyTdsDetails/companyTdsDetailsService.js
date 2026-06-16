const { db } = require('../db/index');
const { sql, eq } = require('drizzle-orm');
const { companyTdsDetails } = require('../db/schema');

const get = async (company_id) => {
  try {
    const rows = await db.all(
      sql`SELECT * FROM ${companyTdsDetails}
          WHERE ${companyTdsDetails.companyId} = ${company_id}
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
    const existing = await db.all(
      sql`SELECT ${companyTdsDetails.companyId} FROM ${companyTdsDetails}
          WHERE ${companyTdsDetails.companyId} = ${company_id}
          LIMIT 1`
    );

    if (existing && existing.length > 0) {
      // UPDATE
      await db
        .update(companyTdsDetails)
        .set({
          tanRegNumber: data.tanRegNumber || null,
          tan: data.tan || null,
          deductorType: data.deductorType || 'Company',
          deductorBranch: data.deductorBranch || null,
          setAlterPersonResponsible: data.setAlterPersonResponsible ? 1 : 0,
          personResponsibleName: data.personResponsibleName || null,
          personResponsibleDesignation: data.personResponsibleDesignation || null,
          personResponsiblePan: data.personResponsiblePan || null,
          personResponsiblePhone: data.personResponsiblePhone || null,
          personResponsibleEmail: data.personResponsibleEmail || null,
          ignoreItExemption: data.ignoreItExemption ? 1 : 0,
          activateTdsForItems: data.activateTdsForItems ? 1 : 0,
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(companyTdsDetails.companyId, company_id));
    } else {
      // INSERT
      await db.insert(companyTdsDetails).values({
        companyId: company_id,
        tanRegNumber: data.tanRegNumber || null,
        tan: data.tan || null,
        deductorType: data.deductorType || 'Company',
        deductorBranch: data.deductorBranch || null,
        setAlterPersonResponsible: data.setAlterPersonResponsible ? 1 : 0,
        personResponsibleName: data.personResponsibleName || null,
        personResponsibleDesignation: data.personResponsibleDesignation || null,
        personResponsiblePan: data.personResponsiblePan || null,
        personResponsiblePhone: data.personResponsiblePhone || null,
        personResponsibleEmail: data.personResponsibleEmail || null,
        ignoreItExemption: data.ignoreItExemption ? 1 : 0,
        activateTdsForItems: data.activateTdsForItems ? 1 : 0,
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
