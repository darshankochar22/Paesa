// CRUD sweep for the costCentre module — exercises the controller exactly the
// way the real UI does (cost-centreCreate.tsx / cost-centreAlter.tsx).
//
// Frontend payload shapes (verified against the pages):
//   create:  { company_id, name, alias?, parent_id? }   (alias/parent_id => undefined when empty)
//   update:  { cc_id, company_id, name, alias?, parent_id }  (parent_id => null when cleared)
//   delete:  cc_id (plain number)  -> soft delete (is_active = 0)
//
// The service derives `category` from parent_id ('Primary' when no parent,
// 'Secondary' when nested) and persists snake_case rows.

const { setupTestDB, createTestCompany } = require('./helpers');
const costCentreController = require('../costCentre/costCentreController');

describe('costCentre CRUD sweep (UI-faithful)', () => {
  let company;
  let companyId;

  beforeAll(async () => {
    await setupTestDB();
    company = await createTestCompany('CostCentre CRUD Co.');
    companyId = company.company_id ?? company.id;
    expect(companyId).toBeTruthy();
  });

  test('create (primary) persists submitted fields + derives category', async () => {
    // Payload exactly as cost-centreCreate.tsx builds it (no parent => Primary).
    const payload = {
      company_id: companyId,
      name: 'Marketing',
      alias: 'MKT',
      parent_id: undefined,
    };

    const res = await costCentreController.create(null, payload);
    expect(res.success).toBe(true);
    expect(res.costCentre).toBeTruthy();
    const id = res.costCentre.cc_id;
    expect(id).toBeTruthy();

    // Read back via getById — assert the submitted fields actually persisted.
    const got = await costCentreController.getById(null, id);
    expect(got.success).toBe(true);
    expect(got.costCentre.name).toBe('Marketing');
    expect(got.costCentre.alias).toBe('MKT');         // alias must not be dropped
    expect(got.costCentre.parent_id).toBeNull();
    expect(got.costCentre.category).toBe('Primary');  // derived
    expect(got.costCentre.is_active).toBe(1);
    expect(got.costCentre.company_id).toBe(companyId);

    // And via getAll (the shape the UI lists).
    const all = await costCentreController.getAll(null, companyId);
    expect(all.success).toBe(true);
    const found = all.costCentres.find((c) => c.cc_id === id);
    expect(found).toBeTruthy();
    expect(found.name).toBe('Marketing');
    expect(found.alias).toBe('MKT');
  });

  test('create (secondary) with parent_id derives category=Secondary', async () => {
    const parent = await costCentreController.create(null, {
      company_id: companyId,
      name: 'Operations',
      alias: undefined,
      parent_id: undefined,
    });
    expect(parent.success).toBe(true);
    const parentId = parent.costCentre.cc_id;

    const child = await costCentreController.create(null, {
      company_id: companyId,
      name: 'Logistics',
      alias: 'LOG',
      parent_id: Number(parentId),
    });
    expect(child.success).toBe(true);

    const got = await costCentreController.getById(null, child.costCentre.cc_id);
    expect(got.success).toBe(true);
    expect(got.costCentre.parent_id).toBe(parentId);  // FK persisted
    expect(got.costCentre.category).toBe('Secondary'); // derived from parent
  });

  test('duplicate name (case-insensitive) is rejected', async () => {
    const dup = await costCentreController.create(null, {
      company_id: companyId,
      name: 'marketing', // already exists as 'Marketing'
      alias: undefined,
      parent_id: undefined,
    });
    expect(dup.success).toBe(false);
    expect(dup.error).toMatch(/already exists/i);
  });

  test('getTree nests children under their parent', async () => {
    const tree = await costCentreController.getTree(null, companyId);
    expect(tree.success).toBe(true);
    const ops = tree.tree.find((n) => n.name === 'Operations');
    expect(ops).toBeTruthy();
    expect(Array.isArray(ops.children)).toBe(true);
    expect(ops.children.some((c) => c.name === 'Logistics')).toBe(true);
    // A primary node sits at root level.
    expect(tree.tree.some((n) => n.name === 'Marketing')).toBe(true);
  });

  test('update changes name + alias and persists (not a delete in disguise)', async () => {
    const created = await costCentreController.create(null, {
      company_id: companyId,
      name: 'Research',
      alias: 'RND',
      parent_id: undefined,
    });
    expect(created.success).toBe(true);
    const id = created.costCentre.cc_id;

    // cost-centreAlter.tsx payload shape (parent_id => null when no parent).
    const upd = await costCentreController.update(null, {
      cc_id: id,
      company_id: companyId,
      name: 'Research & Dev',
      alias: 'R&D',
      parent_id: null,
    });
    expect(upd.success).toBe(true);

    const got = await costCentreController.getById(null, id);
    expect(got.success).toBe(true);
    expect(got.costCentre.name).toBe('Research & Dev'); // change persisted
    expect(got.costCentre.alias).toBe('R&D');
    expect(got.costCentre.cc_id).toBe(id);              // not deleted/recreated
    expect(got.costCentre.is_active).toBe(1);
  });

  test('update can re-parent a centre (parent_id set) and flips category', async () => {
    const parent = await costCentreController.create(null, {
      company_id: companyId,
      name: 'Finance',
      parent_id: undefined,
    });
    const child = await costCentreController.create(null, {
      company_id: companyId,
      name: 'Payroll',
      parent_id: undefined,
    });
    expect(parent.success && child.success).toBe(true);

    const upd = await costCentreController.update(null, {
      cc_id: child.costCentre.cc_id,
      company_id: companyId,
      name: 'Payroll',
      alias: undefined,
      parent_id: Number(parent.costCentre.cc_id),
    });
    expect(upd.success).toBe(true);

    const got = await costCentreController.getById(null, child.costCentre.cc_id);
    expect(got.costCentre.parent_id).toBe(parent.costCentre.cc_id);
    expect(got.costCentre.category).toBe('Secondary');
  });

  test('delete soft-deletes (is_active=0) and hides from getAll', async () => {
    const created = await costCentreController.create(null, {
      company_id: companyId,
      name: 'TempCentre',
      parent_id: undefined,
    });
    const id = created.costCentre.cc_id;

    // cost-centreAlter.tsx passes the raw cc_id number.
    const del = await costCentreController.delete(null, id);
    expect(del.success).toBe(true);

    const all = await costCentreController.getAll(null, companyId);
    expect(all.costCentres.some((c) => c.cc_id === id)).toBe(false);

    const got = await costCentreController.getById(null, id);
    // Row still exists but soft-deleted.
    expect(got.success).toBe(true);
    expect(got.costCentre.is_active).toBe(0);
  });

  test('delete is blocked when sub-centres exist', async () => {
    const parent = await costCentreController.create(null, {
      company_id: companyId,
      name: 'HasKids',
      parent_id: undefined,
    });
    await costCentreController.create(null, {
      company_id: companyId,
      name: 'Kid',
      parent_id: Number(parent.costCentre.cc_id),
    });

    const del = await costCentreController.delete(null, parent.costCentre.cc_id);
    expect(del.success).toBe(false);
    expect(del.error).toMatch(/sub-centre/i);
  });
});
