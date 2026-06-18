// CRUD sweep for the godown module — exercises the controller exactly the way
// the real UI does (GodownCreate.tsx / GodownAlter.tsx).
//
// Frontend payload shapes (verified against the pages):
//   create (GodownCreate.tsx):
//     {
//       company_id,
//       name,                         // trimmed
//       alias?,                        // undefined when empty
//       parent_godown_id?,             // Number(...) or undefined
//       allow_storage_of_materials,    // Number(0|1)
//       address?, city?, state?, pincode?  // undefined when empty
//     }
//   update (GodownAlter.tsx):
//     {
//       godown_id, company_id,
//       name,                         // trimmed
//       alias|null,                    // null when cleared
//       parent_godown_id|null,         // Number(...) or null
//       allow_storage_of_materials,    // Number(0|1)
//       address|null, city|null, state|null, pincode|null
//     }
//   delete (GodownAlter.tsx): godown_id (plain number) -> soft delete (is_active=0)
//
// The service derives is_primary (0 when nested, 1 when no parent), seeds a
// predefined 'Main Location' per company, and persists snake_case rows.

const { setupTestDB, createTestCompany } = require('./helpers');
const godownController = require('../godown/godownController');

describe('godown CRUD sweep (UI-faithful)', () => {
  let company;
  let companyId;

  beforeAll(async () => {
    await setupTestDB();
    company = await createTestCompany('Godown CRUD Co.');
    companyId = company.company_id ?? company.id;
    expect(companyId).toBeTruthy();
  });

  test('company seeding creates the predefined Main Location godown', async () => {
    const all = await godownController.getAll(null, companyId);
    expect(all.success).toBe(true);
    const main = all.godowns.find((g) => g.name === 'Main Location');
    expect(main).toBeTruthy();
    expect(main.is_predefined).toBe(1);
    expect(main.is_main_location).toBe(1);
    expect(main.is_primary).toBe(1);
  });

  test('create (primary) persists every submitted field', async () => {
    // Payload exactly as GodownCreate.tsx builds it (no parent => primary).
    const payload = {
      company_id: companyId,
      name: 'Mumbai Warehouse',
      alias: 'MUM-WH',
      parent_godown_id: undefined,
      allow_storage_of_materials: 1,
      address: '12 Dockyard Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
    };

    const res = await godownController.create(null, payload);
    expect(res.success).toBe(true);
    expect(res.godown).toBeTruthy();
    const id = res.godown.godown_id;
    expect(id).toBeTruthy();

    // Read back via getById — assert the submitted fields actually persisted.
    const got = await godownController.getById(null, id);
    expect(got.success).toBe(true);
    const g = got.godown;
    expect(g.name).toBe('Mumbai Warehouse');
    expect(g.alias).toBe('MUM-WH');          // alias must not be dropped
    expect(g.address).toBe('12 Dockyard Road');
    expect(g.city).toBe('Mumbai');
    expect(g.state).toBe('Maharashtra');
    expect(g.pincode).toBe('400001');
    expect(g.allow_storage_of_materials).toBe(1);
    expect(g.parent_godown_id).toBeNull();
    expect(g.is_primary).toBe(1);             // derived: no parent => primary
    expect(g.is_predefined).toBe(0);
    expect(g.is_active).toBe(1);
    expect(g.company_id).toBe(companyId);

    // And via getAll (the shape the UI lists).
    const all = await godownController.getAll(null, companyId);
    expect(all.success).toBe(true);
    const found = all.godowns.find((x) => x.godown_id === id);
    expect(found).toBeTruthy();
    expect(found.name).toBe('Mumbai Warehouse');
    expect(found.alias).toBe('MUM-WH');
  });

  test('create with allow_storage_of_materials=0 persists the zero (not coerced to 1)', async () => {
    const res = await godownController.create(null, {
      company_id: companyId,
      name: 'No-Storage Transit',
      alias: undefined,
      parent_godown_id: undefined,
      allow_storage_of_materials: 0,   // Number(0) from the <select>
      address: undefined,
      city: undefined,
      state: undefined,
      pincode: undefined,
    });
    expect(res.success).toBe(true);

    const got = await godownController.getById(null, res.godown.godown_id);
    expect(got.success).toBe(true);
    // ?? guards undefined but must NOT clobber an explicit 0.
    expect(got.godown.allow_storage_of_materials).toBe(0);
    expect(got.godown.alias).toBeNull();
  });

  test('create (nested) with parent_godown_id derives is_primary=0', async () => {
    const parent = await godownController.create(null, {
      company_id: companyId,
      name: 'Pune Hub',
      allow_storage_of_materials: 1,
    });
    expect(parent.success).toBe(true);
    const parentId = parent.godown.godown_id;

    const child = await godownController.create(null, {
      company_id: companyId,
      name: 'Pune Bay A',
      alias: 'PB-A',
      parent_godown_id: Number(parentId),
      allow_storage_of_materials: 1,
    });
    expect(child.success).toBe(true);

    const got = await godownController.getById(null, child.godown.godown_id);
    expect(got.success).toBe(true);
    expect(got.godown.parent_godown_id).toBe(parentId);  // FK persisted
    expect(got.godown.is_primary).toBe(0);               // derived: nested
  });

  test('duplicate name (case-insensitive) is rejected', async () => {
    const dup = await godownController.create(null, {
      company_id: companyId,
      name: 'mumbai warehouse', // already exists as 'Mumbai Warehouse'
      allow_storage_of_materials: 1,
    });
    expect(dup.success).toBe(false);
    expect(dup.error).toMatch(/already exists/i);
  });

  test('getTree nests children under their parent', async () => {
    const tree = await godownController.getTree(null, companyId);
    expect(tree.success).toBe(true);
    const pune = tree.tree.find((n) => n.name === 'Pune Hub');
    expect(pune).toBeTruthy();
    expect(Array.isArray(pune.children)).toBe(true);
    expect(pune.children.some((c) => c.name === 'Pune Bay A')).toBe(true);
    // A primary node sits at root level.
    expect(tree.tree.some((n) => n.name === 'Mumbai Warehouse')).toBe(true);
  });

  test('update changes fields and persists (not a delete in disguise)', async () => {
    const created = await godownController.create(null, {
      company_id: companyId,
      name: 'Delhi Depot',
      alias: 'DEL',
      allow_storage_of_materials: 1,
      address: 'Old Addr',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
    });
    expect(created.success).toBe(true);
    const id = created.godown.godown_id;

    // GodownAlter.tsx payload shape (nulls when cleared, Number for allow flag).
    const upd = await godownController.update(null, {
      godown_id: id,
      company_id: companyId,
      name: 'Delhi Central Depot',
      alias: 'DEL-C',
      parent_godown_id: null,
      allow_storage_of_materials: 0,   // user flipped storage to "No"
      address: 'New Addr 42',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110002',
    });
    expect(upd.success).toBe(true);

    const got = await godownController.getById(null, id);
    expect(got.success).toBe(true);
    const g = got.godown;
    expect(g.godown_id).toBe(id);                 // not deleted/recreated
    expect(g.name).toBe('Delhi Central Depot');   // change persisted
    expect(g.alias).toBe('DEL-C');
    expect(g.address).toBe('New Addr 42');
    expect(g.city).toBe('New Delhi');
    expect(g.pincode).toBe('110002');
    expect(g.allow_storage_of_materials).toBe(0); // 0 must persist on update
    expect(g.is_active).toBe(1);
  });

  test('update can re-parent a godown (parent_godown_id set)', async () => {
    const parent = await godownController.create(null, {
      company_id: companyId,
      name: 'Chennai Hub',
      allow_storage_of_materials: 1,
    });
    const child = await godownController.create(null, {
      company_id: companyId,
      name: 'Chennai Floor 1',
      allow_storage_of_materials: 1,
    });
    expect(parent.success && child.success).toBe(true);

    const upd = await godownController.update(null, {
      godown_id: child.godown.godown_id,
      company_id: companyId,
      name: 'Chennai Floor 1',
      alias: null,
      parent_godown_id: Number(parent.godown.godown_id),
      allow_storage_of_materials: 1,
      address: null,
      city: null,
      state: null,
      pincode: null,
    });
    expect(upd.success).toBe(true);

    const got = await godownController.getById(null, child.godown.godown_id);
    expect(got.godown.parent_godown_id).toBe(parent.godown.godown_id);
  });

  test('predefined Main Location cannot be edited or deleted', async () => {
    const all = await godownController.getAll(null, companyId);
    const main = all.godowns.find((g) => g.name === 'Main Location');
    expect(main).toBeTruthy();

    const upd = await godownController.update(null, {
      godown_id: main.godown_id,
      company_id: companyId,
      name: 'Renamed Main',
      alias: null,
      parent_godown_id: null,
      allow_storage_of_materials: 1,
      address: null, city: null, state: null, pincode: null,
    });
    expect(upd.success).toBe(false);

    const del = await godownController.delete(null, main.godown_id);
    expect(del.success).toBe(false);
  });

  test('delete soft-deletes (is_active=0) and hides from getAll', async () => {
    const created = await godownController.create(null, {
      company_id: companyId,
      name: 'TempGodown',
      allow_storage_of_materials: 1,
    });
    const id = created.godown.godown_id;

    // GodownAlter.tsx passes the raw godown_id number.
    const del = await godownController.delete(null, id);
    expect(del.success).toBe(true);

    const all = await godownController.getAll(null, companyId);
    expect(all.godowns.some((g) => g.godown_id === id)).toBe(false);

    const got = await godownController.getById(null, id);
    // Row still exists but soft-deleted.
    expect(got.success).toBe(true);
    expect(got.godown.is_active).toBe(0);
  });

  test('delete is blocked when sub-godowns exist', async () => {
    const parent = await godownController.create(null, {
      company_id: companyId,
      name: 'HasKids Hub',
      allow_storage_of_materials: 1,
    });
    await godownController.create(null, {
      company_id: companyId,
      name: 'Kid Bay',
      parent_godown_id: Number(parent.godown.godown_id),
      allow_storage_of_materials: 1,
    });

    const del = await godownController.delete(null, parent.godown.godown_id);
    expect(del.success).toBe(false);
    expect(del.error).toMatch(/sub-godown/i);
  });
});
