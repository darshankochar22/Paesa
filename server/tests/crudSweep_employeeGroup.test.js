// CRUD sweep for the employeeGroup module — exercises the controller exactly the
// way the real UI does (EmployeeGroupCreate.tsx / EmployeeGroupAlter.tsx).
//
// Frontend payload shapes (verified against the pages):
//   create:  { company_id, name, alias?, parent_group_id? }
//            alias  => undefined when empty (form sends `form.alias.trim() || undefined`)
//            parent_group_id => undefined when falsy; in practice the Create page
//            defaults it to the seeded "Primary" group's id.
//   update:  { employee_group_id, name, alias?, parent_group_id? }
//            alias/parent_group_id => undefined when empty.
//   delete:  employee_group_id (plain number) -> soft delete (is_active = 0).
//
// The service rejects edits/deletes of predefined groups and blocks deleting a
// group that still has sub-groups or employees. getById/getAll return snake_case
// rows; the create/update result is `{ success, group }`.

const { setupTestDB, createTestCompany } = require('./helpers');
const employeeGroupController = require('../employeeGroup/employeeGroupController');
const employeeGroupService = require('../employeeGroup/employeeGroupService');

describe('employeeGroup CRUD sweep (UI-faithful)', () => {
  let companyId;
  let primaryGroupId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany('EmployeeGroup CRUD Co.');
    companyId = company.company_id ?? company.id;
    expect(companyId).toBeTruthy();

    // The real app seeds the default groups on company creation. createTestCompany
    // goes through companyService.create which does this, but seed defensively so
    // the test is robust even if that ordering changes.
    const before = await employeeGroupController.getAll(null, companyId);
    if (!before.employeeGroups.some((g) => g.name === 'Primary')) {
      await employeeGroupService.seedDefaultEmployeeGroups(companyId);
    }

    // Resolve the seeded "Primary" parent — the Create page uses this as the
    // default parent_group_id in its payload.
    const all = await employeeGroupController.getAll(null, companyId);
    const primary = all.employeeGroups.find((g) => g.name === 'Primary');
    expect(primary).toBeTruthy();
    primaryGroupId = primary.employee_group_id;
    expect(primaryGroupId).toBeTruthy();
  });

  test('seeded default groups exist and are predefined', async () => {
    const all = await employeeGroupController.getAll(null, companyId);
    expect(all.success).toBe(true);
    for (const name of ['Primary', 'Management', 'Staff', 'Workers']) {
      const g = all.employeeGroups.find((x) => x.name === name);
      expect(g).toBeTruthy();
      expect(g.is_predefined).toBe(1);
    }
  });

  test('create persists submitted fields (name, alias, parent_group_id)', async () => {
    // Payload exactly as EmployeeGroupCreate.tsx builds it (parent defaults to Primary).
    const payload = {
      company_id: companyId,
      name: 'Senior Management',
      alias: 'SMGMT',
      parent_group_id: primaryGroupId,
    };

    const res = await employeeGroupController.create(null, payload);
    expect(res.success).toBe(true);
    expect(res.group).toBeTruthy();
    const id = res.group.employee_group_id;
    expect(id).toBeTruthy();

    // Read back via getById — assert the submitted fields actually persisted.
    const got = await employeeGroupController.getById(null, id);
    expect(got.success).toBe(true);
    expect(got.group.name).toBe('Senior Management');
    expect(got.group.alias).toBe('SMGMT');                  // alias must not be dropped
    expect(got.group.parent_group_id).toBe(primaryGroupId); // FK persisted
    expect(got.group.company_id).toBe(companyId);
    expect(got.group.is_active).toBe(1);
    expect(got.group.is_predefined).toBe(0);                // user-created, not predefined

    // And via getAll (the shape the UI lists).
    const all = await employeeGroupController.getAll(null, companyId);
    expect(all.success).toBe(true);
    const found = all.employeeGroups.find((g) => g.employee_group_id === id);
    expect(found).toBeTruthy();
    expect(found.name).toBe('Senior Management');
    expect(found.alias).toBe('SMGMT');
  });

  test('create with empty alias (undefined) stores NULL, not the string "undefined"', async () => {
    const res = await employeeGroupController.create(null, {
      company_id: companyId,
      name: 'No Alias Group',
      alias: undefined,
      parent_group_id: undefined,
    });
    expect(res.success).toBe(true);
    const got = await employeeGroupController.getById(null, res.group.employee_group_id);
    expect(got.success).toBe(true);
    expect(got.group.alias).toBeNull();
    expect(got.group.parent_group_id).toBeNull();
  });

  test('duplicate name (case-insensitive) is rejected', async () => {
    const dup = await employeeGroupController.create(null, {
      company_id: companyId,
      name: 'senior management', // already exists as 'Senior Management'
      alias: undefined,
      parent_group_id: primaryGroupId,
    });
    expect(dup.success).toBe(false);
    expect(dup.error).toMatch(/already exists/i);
  });

  test('getTree nests children under their parent', async () => {
    // Create a child under our 'Senior Management' group.
    const all = await employeeGroupController.getAll(null, companyId);
    const sm = all.employeeGroups.find((g) => g.name === 'Senior Management');
    expect(sm).toBeTruthy();

    const child = await employeeGroupController.create(null, {
      company_id: companyId,
      name: 'Directors',
      alias: undefined,
      parent_group_id: sm.employee_group_id,
    });
    expect(child.success).toBe(true);

    const tree = await employeeGroupController.getTree(null, companyId);
    expect(tree.success).toBe(true);
    // Roots are groups with no parent (e.g. seeded Primary). 'Senior Management'
    // was created under Primary, so it sits nested under the Primary root node.
    const primaryNode = tree.tree.find((n) => n.name === 'Primary');
    expect(primaryNode).toBeTruthy();
    expect(Array.isArray(primaryNode.children)).toBe(true);
    const smNode = primaryNode.children.find((c) => c.name === 'Senior Management');
    expect(smNode).toBeTruthy();
    expect(Array.isArray(smNode.children)).toBe(true);
    expect(smNode.children.some((c) => c.name === 'Directors')).toBe(true);
  });

  test('update changes name + alias and persists (not a delete in disguise)', async () => {
    const created = await employeeGroupController.create(null, {
      company_id: companyId,
      name: 'Contractors',
      alias: 'CTR',
      parent_group_id: primaryGroupId,
    });
    expect(created.success).toBe(true);
    const id = created.group.employee_group_id;

    // EmployeeGroupAlter.tsx payload shape.
    const upd = await employeeGroupController.update(null, {
      employee_group_id: id,
      name: 'External Contractors',
      alias: 'EXTCTR',
      parent_group_id: primaryGroupId,
    });
    expect(upd.success).toBe(true);
    expect(upd.group.name).toBe('External Contractors');

    const got = await employeeGroupController.getById(null, id);
    expect(got.success).toBe(true);
    expect(got.group.name).toBe('External Contractors'); // change persisted
    expect(got.group.alias).toBe('EXTCTR');
    expect(got.group.employee_group_id).toBe(id);        // not deleted/recreated
    expect(got.group.is_active).toBe(1);
  });

  test('update is blocked for predefined groups', async () => {
    const upd = await employeeGroupController.update(null, {
      employee_group_id: primaryGroupId,
      name: 'Primary Renamed',
      alias: undefined,
      parent_group_id: undefined,
    });
    expect(upd.success).toBe(false);
    expect(upd.error).toMatch(/predefined/i);
  });

  test('delete soft-deletes (is_active=0) and hides from getAll', async () => {
    const created = await employeeGroupController.create(null, {
      company_id: companyId,
      name: 'TempGroup',
      alias: undefined,
      parent_group_id: primaryGroupId,
    });
    const id = created.group.employee_group_id;

    // EmployeeGroupAlter.tsx passes the raw employee_group_id number.
    const del = await employeeGroupController.delete(null, id);
    expect(del.success).toBe(true);

    const all = await employeeGroupController.getAll(null, companyId);
    expect(all.employeeGroups.some((g) => g.employee_group_id === id)).toBe(false);

    const got = await employeeGroupController.getById(null, id);
    // Row still exists but soft-deleted.
    expect(got.success).toBe(true);
    expect(got.group.is_active).toBe(0);
  });

  test('delete is blocked for predefined groups', async () => {
    const del = await employeeGroupController.delete(null, primaryGroupId);
    expect(del.success).toBe(false);
    expect(del.error).toMatch(/predefined/i);
  });

  test('delete is blocked when sub-groups exist', async () => {
    const parent = await employeeGroupController.create(null, {
      company_id: companyId,
      name: 'HasKids',
      alias: undefined,
      parent_group_id: primaryGroupId,
    });
    await employeeGroupController.create(null, {
      company_id: companyId,
      name: 'Kid',
      alias: undefined,
      parent_group_id: parent.group.employee_group_id,
    });

    const del = await employeeGroupController.delete(null, parent.group.employee_group_id);
    expect(del.success).toBe(false);
    expect(del.error).toMatch(/sub-group/i);
  });
});
