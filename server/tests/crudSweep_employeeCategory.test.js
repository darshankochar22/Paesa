// CRUD sweep for the employeeCategory module — exercises the controller exactly
// the way the real UI does (EmployeeCategoryCreate.tsx / EmployeeCategoryAlter.tsx).
//
// Frontend payload shapes (verified against the pages):
//   create: { company_id, name, alias?, allocate_revenue (0|1), allocate_non_revenue (0|1) }
//           alias => undefined when the field is empty.
//   update: { employee_category_id, company_id, name, alias?, allocate_revenue (0|1),
//             allocate_non_revenue (0|1) }   alias => undefined when cleared.
//   delete: employee_category_id (plain number) -> soft delete (is_active = 0).
//
// Gotchas covered:
//   - allocate_revenue / allocate_non_revenue must persist exactly as submitted
//     (catch "ignored field" bugs where the service hard-codes them).
//   - createTestCompany seeds a predefined "Primary Employee Category"; predefined
//     rows must be blocked from update + delete.
//   - alias=undefined must store NULL, not throw.

const { setupTestDB, createTestCompany } = require('./helpers');
const employeeCategoryController = require('../employeeCategory/employeeCategoryController');

describe('employeeCategory CRUD sweep (UI-faithful)', () => {
  let company;
  let companyId;

  beforeAll(async () => {
    await setupTestDB();
    company = await createTestCompany('EmployeeCategory CRUD Co.');
    companyId = company.company_id ?? company.id;
    expect(companyId).toBeTruthy();
  });

  test('create persists every submitted field (name, alias, allocate flags)', async () => {
    // Payload exactly as EmployeeCategoryCreate.tsx builds it.
    const payload = {
      company_id: companyId,
      name: 'Skilled Workers',
      alias: 'SKW',
      allocate_revenue: 1,
      allocate_non_revenue: 1,
    };

    const res = await employeeCategoryController.create(null, payload);
    expect(res.success).toBe(true);
    expect(res.category).toBeTruthy();
    const id = res.category.employee_category_id;
    expect(id).toBeTruthy();

    // Read back via getById — assert the submitted fields actually persisted.
    const got = await employeeCategoryController.getById(null, id);
    expect(got.success).toBe(true);
    expect(got.category.name).toBe('Skilled Workers');
    expect(got.category.alias).toBe('SKW');
    expect(got.category.allocate_revenue).toBe(1);       // must not be dropped/overridden
    expect(got.category.allocate_non_revenue).toBe(1);   // must not be dropped/overridden
    expect(got.category.is_active).toBe(1);
    expect(got.category.is_predefined).toBe(0);
    expect(got.category.company_id).toBe(companyId);

    // And via getAll (the shape EmployeeCategoryAlter.tsx lists).
    const all = await employeeCategoryController.getAll(null, companyId);
    expect(all.success).toBe(true);
    const found = all.employeeCategories.find((c) => c.employee_category_id === id);
    expect(found).toBeTruthy();
    expect(found.name).toBe('Skilled Workers');
    expect(found.alias).toBe('SKW');
  });

  test('create with empty alias (undefined) stores NULL and keeps flags off', async () => {
    // EmployeeCategoryCreate.tsx sends alias: undefined when the field is blank,
    // and 0/0 for the allocate selects defaulting to "No".
    const res = await employeeCategoryController.create(null, {
      company_id: companyId,
      name: 'Unskilled Workers',
      alias: undefined,
      allocate_revenue: 0,
      allocate_non_revenue: 0,
    });
    expect(res.success).toBe(true);

    const got = await employeeCategoryController.getById(null, res.category.employee_category_id);
    expect(got.success).toBe(true);
    expect(got.category.alias).toBeNull();
    expect(got.category.allocate_revenue).toBe(0);
    expect(got.category.allocate_non_revenue).toBe(0);
  });

  test('duplicate name (case-insensitive) is rejected', async () => {
    const dup = await employeeCategoryController.create(null, {
      company_id: companyId,
      name: 'skilled workers', // already exists as 'Skilled Workers'
      alias: undefined,
      allocate_revenue: 0,
      allocate_non_revenue: 0,
    });
    expect(dup.success).toBe(false);
    expect(dup.error).toMatch(/already exists/i);
  });

  test('getAll includes the seeded predefined Primary category', async () => {
    const all = await employeeCategoryController.getAll(null, companyId);
    expect(all.success).toBe(true);
    const primary = all.employeeCategories.find(
      (c) => c.name === 'Primary Employee Category'
    );
    expect(primary).toBeTruthy();
    expect(primary.is_predefined).toBe(1);
  });

  test('update changes name/alias/flags and persists (not a delete in disguise)', async () => {
    const created = await employeeCategoryController.create(null, {
      company_id: companyId,
      name: 'Contract Staff',
      alias: 'CON',
      allocate_revenue: 0,
      allocate_non_revenue: 0,
    });
    expect(created.success).toBe(true);
    const id = created.category.employee_category_id;

    // EmployeeCategoryAlter.tsx payload shape.
    const upd = await employeeCategoryController.update(null, {
      employee_category_id: id,
      company_id: companyId,
      name: 'Contract Staff (Temp)',
      alias: 'CST',
      allocate_revenue: 1,
      allocate_non_revenue: 1,
    });
    expect(upd.success).toBe(true);

    const got = await employeeCategoryController.getById(null, id);
    expect(got.success).toBe(true);
    expect(got.category.name).toBe('Contract Staff (Temp)'); // change persisted
    expect(got.category.alias).toBe('CST');
    expect(got.category.allocate_revenue).toBe(1);           // flag flip persisted
    expect(got.category.allocate_non_revenue).toBe(1);
    expect(got.category.employee_category_id).toBe(id);      // not deleted/recreated
    expect(got.category.is_active).toBe(1);
  });

  test('update can turn allocate flags back off', async () => {
    const created = await employeeCategoryController.create(null, {
      company_id: companyId,
      name: 'Seasonal',
      alias: undefined,
      allocate_revenue: 1,
      allocate_non_revenue: 1,
    });
    const id = created.category.employee_category_id;

    const upd = await employeeCategoryController.update(null, {
      employee_category_id: id,
      company_id: companyId,
      name: 'Seasonal',
      alias: undefined,
      allocate_revenue: 0,
      allocate_non_revenue: 0,
    });
    expect(upd.success).toBe(true);

    const got = await employeeCategoryController.getById(null, id);
    expect(got.category.allocate_revenue).toBe(0);
    expect(got.category.allocate_non_revenue).toBe(0);
  });

  test('update is blocked for predefined categories', async () => {
    const all = await employeeCategoryController.getAll(null, companyId);
    const primary = all.employeeCategories.find(
      (c) => c.name === 'Primary Employee Category'
    );
    expect(primary).toBeTruthy();

    const upd = await employeeCategoryController.update(null, {
      employee_category_id: primary.employee_category_id,
      company_id: companyId,
      name: 'Hacked Primary',
      alias: undefined,
      allocate_revenue: 1,
      allocate_non_revenue: 1,
    });
    expect(upd.success).toBe(false);
    expect(upd.error).toMatch(/predefined/i);
  });

  test('delete soft-deletes (is_active=0) and hides from getAll', async () => {
    const created = await employeeCategoryController.create(null, {
      company_id: companyId,
      name: 'TempCategory',
      alias: undefined,
      allocate_revenue: 0,
      allocate_non_revenue: 0,
    });
    const id = created.category.employee_category_id;

    // EmployeeCategoryAlter.tsx passes the raw employee_category_id number.
    const del = await employeeCategoryController.delete(null, id);
    expect(del.success).toBe(true);

    const all = await employeeCategoryController.getAll(null, companyId);
    expect(all.employeeCategories.some((c) => c.employee_category_id === id)).toBe(false);

    const got = await employeeCategoryController.getById(null, id);
    // Row still exists but soft-deleted.
    expect(got.success).toBe(true);
    expect(got.category.is_active).toBe(0);
  });

  test('delete is blocked for predefined categories', async () => {
    const all = await employeeCategoryController.getAll(null, companyId);
    const primary = all.employeeCategories.find(
      (c) => c.name === 'Primary Employee Category'
    );
    const del = await employeeCategoryController.delete(null, primary.employee_category_id);
    expect(del.success).toBe(false);
    expect(del.error).toMatch(/predefined/i);
  });
});
