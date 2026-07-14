// F11 "Set/Alter Details" momentary sub-flags for TDS / TCS / Payroll Statutory
// (mirror of Set/Alter GST Details). The service must persist and read them back;
// the momentary "revert to No" is client-side (CompanyFeatures forces 0 on save),
// so here we only assert the service wiring round-trips the three new columns.

const { setupTestDB, createTestCompany } = require('./helpers');
const tallyFeaturesService = require('../tallyFeatures/tallyFeaturesService');

describe('Set/Alter TDS/TCS/Payroll details flags', () => {
  let companyId;

  beforeAll(async () => {
    await setupTestDB();
    const c = await createTestCompany('Set/Alter Co');
    companyId = c.company_id;
  });

  it('defaults the three Set/Alter flags to 0', async () => {
    const res = await tallyFeaturesService.get(companyId);
    expect(res.success).toBe(true);
    expect(Number(res.features.set_alter_tds_details)).toBe(0);
    expect(Number(res.features.set_alter_tcs_details)).toBe(0);
    expect(Number(res.features.set_alter_payroll_statutory_details)).toBe(0);
  });

  it('persists and reads back all three flags', async () => {
    const upd = await tallyFeaturesService.update({
      company_id: companyId,
      set_alter_tds_details: 1,
      set_alter_tcs_details: 1,
      set_alter_payroll_statutory_details: 1,
    });
    expect(upd.success).toBe(true);

    const res = await tallyFeaturesService.get(companyId);
    expect(Number(res.features.set_alter_tds_details)).toBe(1);
    expect(Number(res.features.set_alter_tcs_details)).toBe(1);
    expect(Number(res.features.set_alter_payroll_statutory_details)).toBe(1);
  });

  it('reset clears them back to 0', async () => {
    await tallyFeaturesService.reset(companyId);
    const res = await tallyFeaturesService.get(companyId);
    expect(Number(res.features.set_alter_tds_details)).toBe(0);
    expect(Number(res.features.set_alter_tcs_details)).toBe(0);
    expect(Number(res.features.set_alter_payroll_statutory_details)).toBe(0);
  });
});
