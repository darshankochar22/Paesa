// ESI statutory reports (#218 Form 3 = Return of Declaration Forms). Verifies the
// declaration return lists active employees carrying an ESI number whose date of
// appointment falls in the period, with the establishment header populated.

const { setupTestDB, createTestCompany } = require('./helpers');
const employeeService = require('../employee/employeeService');
const esiSvc = require('../payroll/esiReportService');

describe('ESI reports (#218)', () => {
  let companyId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany('ESI Report Co');
    companyId = company.company_id;

    await employeeService.create({
      company_id: companyId,
      name: 'Insured Emp',
      date_of_joining: '2026-05-01',
      father_name: 'Papa Insured',
      esi_number: 'ESI/9988',
      esi_dispensary_name: 'City Dispensary',
    });
    // An employee WITHOUT an ESI number must not appear on the declaration return.
    await employeeService.create({
      company_id: companyId,
      name: 'No ESI Emp',
      date_of_joining: '2026-05-02',
    });
  });

  it('Form 3 lists insured persons appointed in the period', async () => {
    const res = await esiSvc.getESIForm3(companyId, { from: '2026-04-01', to: '2027-03-31' });
    expect(res.success).toBe(true);
    const row = res.payload.employees.find((e) => e.name === 'Insured Emp');
    expect(row).toBeTruthy();
    expect(row.insurance_number).toBe('ESI/9988');
    expect(row.father_or_husband).toBe('Papa Insured');
    expect(row.dispensary).toBe('City Dispensary');
    // Non-insured employee excluded.
    expect(res.payload.employees.find((e) => e.name === 'No ESI Emp')).toBeFalsy();
    // Establishment header present.
    expect(res.payload.establishment.name).toBeTruthy();
  });

  it('excludes appointments outside the requested period', async () => {
    const res = await esiSvc.getESIForm3(companyId, { from: '2020-01-01', to: '2020-12-31' });
    expect(res.success).toBe(true);
    expect(res.payload.employees.length).toBe(0);
  });

  it('Monthly Statement lists ESI members with contribution columns (#219)', async () => {
    const res = await esiSvc.getESIMonthlyStatement(companyId);
    expect(res.success).toBe(true);
    const row = res.payload.rows.find((r) => r.name === 'Insured Emp');
    expect(row).toBeTruthy();
    expect(row.esi_number).toBe('ESI/9988');
    expect(row).toHaveProperty('ee');
    expect(row).toHaveProperty('er');
    expect(res.payload.totals).toBeDefined();
    // A non-ESI employee (no number, no ESI pay head) is not a member.
    expect(res.payload.rows.find((r) => r.name === 'No ESI Emp')).toBeFalsy();
  });
});
