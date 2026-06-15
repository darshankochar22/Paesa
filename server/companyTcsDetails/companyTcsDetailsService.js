const { db } = require('../db/index');
const { sql, eq } = require('drizzle-orm');
const { companyTcsDetails } = require('../db/schema');

const get = async (company_id) => {
  try {
    const rows = await db.all(
      sql`SELECT * FROM ${companyTcsDetails}
          WHERE ${companyTcsDetails.companyId} = ${company_id}
          LIMIT 1`
    );

    if (!rows || rows.length === 0) {
      return { success: true, exists: false, data: null };
    }

    const r = rows[0];
    return {
      success: true,
      exists: true,
      data: {
        tanRegNumber:                  r.tan_reg_number || '',
        tan:                           r.tan || '',
        collectorType:                 r.collector_type || 'Company',
        collectorBranch:               r.collector_branch || '',
        setAlterPersonResponsible:     r.set_alter_person_responsible === 1,
        personResponsibleName:         r.person_responsible_name || '',
        personResponsibleSonDaughterOf: r.person_responsible_son_daughter_of || '',
        personResponsibleDesignation:  r.person_responsible_designation || '',
        personResponsiblePan:          r.person_responsible_pan || '',
        personResponsibleFlatNo:       r.person_responsible_flat_no || '',
        personResponsiblePremises:     r.person_responsible_premises || '',
        personResponsibleRoad:         r.person_responsible_road || '',
        personResponsibleArea:         r.person_responsible_area || '',
        personResponsibleCity:         r.person_responsible_city || '',
        personResponsibleState:        r.person_responsible_state || '',
        personResponsiblePincode:      r.person_responsible_pincode || '',
        personResponsiblePhone:        r.person_responsible_phone || '',
        personResponsibleStdCode:      r.person_responsible_std_code || '',
        personResponsibleTelephone:    r.person_responsible_telephone || '',
        personResponsibleEmail:        r.person_responsible_email || '',
        ignoreItExemption:             r.ignore_it_exemption === 1,
      },
    };
  } catch (err) {
    console.error('Error fetching company TCS details:', err);
    return { success: false, error: err.message };
  }
};

const save = async (data) => {
  try {
    const company_id = data.company_id;
    if (!company_id) {
      return { success: false, error: 'Company ID is required' };
    }

    const existing = await db.all(
      sql`SELECT ${companyTcsDetails.companyId} FROM ${companyTcsDetails}
          WHERE ${companyTcsDetails.companyId} = ${company_id}
          LIMIT 1`
    );

    const values = {
      tanRegNumber:                   data.tanRegNumber || null,
      tan:                            data.tan || null,
      collectorType:                  data.collectorType || 'Company',
      collectorBranch:                data.collectorBranch || null,
      setAlterPersonResponsible:      data.setAlterPersonResponsible ? 1 : 0,
      personResponsibleName:          data.personResponsibleName || null,
      personResponsibleSonDaughterOf: data.personResponsibleSonDaughterOf || null,
      personResponsibleDesignation:   data.personResponsibleDesignation || null,
      personResponsiblePan:           data.personResponsiblePan || null,
      personResponsibleFlatNo:        data.personResponsibleFlatNo || null,
      personResponsiblePremises:      data.personResponsiblePremises || null,
      personResponsibleRoad:          data.personResponsibleRoad || null,
      personResponsibleArea:          data.personResponsibleArea || null,
      personResponsibleCity:          data.personResponsibleCity || null,
      personResponsibleState:         data.personResponsibleState || null,
      personResponsiblePincode:       data.personResponsiblePincode || null,
      personResponsiblePhone:         data.personResponsiblePhone || null,
      personResponsibleStdCode:       data.personResponsibleStdCode || null,
      personResponsibleTelephone:     data.personResponsibleTelephone || null,
      personResponsibleEmail:         data.personResponsibleEmail || null,
      ignoreItExemption:              data.ignoreItExemption ? 1 : 0,
    };

    if (existing && existing.length > 0) {
      await db
        .update(companyTcsDetails)
        .set({
          ...values,
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(companyTcsDetails.companyId, company_id));
    } else {
      await db
        .insert(companyTcsDetails)
        .values({
          companyId: company_id,
          ...values,
        });
    }

    return { success: true };
  } catch (err) {
    console.error('Error saving company TCS details:', err);
    return { success: false, error: err.message };
  }
};

module.exports = { get, save };
