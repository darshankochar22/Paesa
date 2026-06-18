// CRUD sweep for the "financialYear" module — exercises the controller exactly
// the way the real UI (client/src/pages/master/FinancialYears.tsx, driven via
// CompanyContext.switchFY) calls it through IPC.
//
// The frontend create payload (FinancialYears.tsx handleCreate) sends ONLY:
//   { company_id, start_date }
// where start_date is an "YYYY-04-01" string picked from the FY_YEARS dropdown.
// It deliberately does NOT send end_date / is_active / is_closed — the service
// derives end_date (start + 1 year - 1 day) and forces is_active=0, is_closed=0.
// We replay that exact shape and assert the derived + persisted fields.
//
// setActive: the UI's "Set Active" / Enter action goes through
//   CompanyContext.switchFY -> window.api.fy.setActive(fy_id, company_id)
// and the controller takes a single { fy_id, company_id } object. It must flip
// the active flag onto the chosen FY and clear it from all others in the company.
//
// delete: FinancialYears.tsx handleDelete -> window.api.fy.delete(fy_id). It is a
// hard delete that must refuse to remove an active or closed FY.

const { setupTestDB, createTestCompany } = require("./helpers");
const financialYearController = require("../financialYear/financialYearController");

describe("FinancialYear CRUD sweep (UI-faithful)", () => {
  let companyId;
  let seededFY; // the FY auto-seeded by createTestCompany (2026-04-01)

  beforeAll(async () => {
    await setupTestDB();
    // createTestCompany seeds financial_year_beginning_from = 2026-04-01, which
    // (via seedDefaultFY) creates one ACTIVE financial year for the company.
    const company = await createTestCompany("FinancialYear CRUD Sweep Co");
    companyId = company.company_id;

    const res = await financialYearController.getAll(null, companyId);
    expect(res.success).toBe(true);
    expect(Array.isArray(res.financialYears)).toBe(true);
    seededFY = res.financialYears.find((f) => f.start_date === "2026-04-01");
    expect(seededFY).toBeDefined();
    // The seeded default FY is the active one.
    expect(seededFY.is_active).toBe(1);
  });

  it("create persists exactly what the FinancialYears form submits (and derives end_date)", async () => {
    // Exact shape produced by FinancialYears.tsx handleCreate — only these keys.
    const payload = {
      company_id: companyId,
      start_date: "2027-04-01",
    };

    const res = await financialYearController.create(null, payload);
    expect(res.success).toBe(true);
    expect(res.fy).toBeDefined();
    const id = res.fy.fy_id;
    expect(id).toBeDefined();

    // Read back through getById (what CompanyContext / the UI list relies on).
    const got = await financialYearController.getById(null, id);
    expect(got.success).toBe(true);
    const fy = got.fy;

    expect(fy.company_id).toBe(companyId);
    expect(fy.start_date).toBe("2027-04-01");
    // Service must derive end_date = start + 1 year - 1 day. The UI never sends it.
    expect(fy.end_date).toBe("2028-03-31");
    // A newly created FY is INACTIVE and OPEN (the seeded one stays active).
    expect(fy.is_active).toBe(0);
    expect(fy.is_closed).toBe(0);
    expect(fy.closing_date).toBeNull();
  });

  it("create shows up in getAll for the company alongside the seeded FY", async () => {
    const list = await financialYearController.getAll(null, companyId);
    expect(list.success).toBe(true);
    const starts = list.financialYears.map((f) => f.start_date);
    expect(starts).toContain("2026-04-01");
    expect(starts).toContain("2027-04-01");
  });

  it("rejects a duplicate start_date for the same company", async () => {
    const res = await financialYearController.create(null, {
      company_id: companyId,
      start_date: "2027-04-01",
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/already exists/i);
  });

  it("setActive moves the active flag (UI passes a {fy_id, company_id} object)", async () => {
    const list = await financialYearController.getAll(null, companyId);
    const target = list.financialYears.find((f) => f.start_date === "2027-04-01");
    expect(target).toBeDefined();
    expect(target.is_active).toBe(0);

    // Controller signature: setActive(event, { fy_id, company_id }).
    const res = await financialYearController.setActive(null, {
      fy_id: target.fy_id,
      company_id: companyId,
    });
    expect(res.success).toBe(true);

    // The chosen FY is now active...
    const nowActive = await financialYearController.getById(null, target.fy_id);
    expect(nowActive.success).toBe(true);
    expect(nowActive.fy.is_active).toBe(1);

    // ...and the previously-active seeded FY is now inactive (exclusive flag).
    const prev = await financialYearController.getById(null, seededFY.fy_id);
    expect(prev.success).toBe(true);
    expect(prev.fy.is_active).toBe(0);
  });

  it("refuses to delete the currently active financial year", async () => {
    const list = await financialYearController.getAll(null, companyId);
    const active = list.financialYears.find((f) => f.is_active === 1);
    expect(active).toBeDefined();

    const res = await financialYearController.delete(null, active.fy_id);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/active/i);

    // Still present after the refused delete.
    const still = await financialYearController.getById(null, active.fy_id);
    expect(still.success).toBe(true);
  });

  it("delete removes a non-active, non-closed financial year (hard delete)", async () => {
    // Make the seeded (2026) FY active again so the 2027 one becomes deletable.
    await financialYearController.setActive(null, {
      fy_id: seededFY.fy_id,
      company_id: companyId,
    });

    const list = await financialYearController.getAll(null, companyId);
    const toDelete = list.financialYears.find((f) => f.start_date === "2027-04-01");
    expect(toDelete).toBeDefined();
    expect(toDelete.is_active).toBe(0);
    expect(toDelete.is_closed).toBe(0);

    const res = await financialYearController.delete(null, toDelete.fy_id);
    expect(res.success).toBe(true);

    // Gone from getAll...
    const after = await financialYearController.getAll(null, companyId);
    const ids = after.financialYears.map((f) => f.fy_id);
    expect(ids).not.toContain(toDelete.fy_id);

    // ...and getById no longer finds it (hard delete).
    const gone = await financialYearController.getById(null, toDelete.fy_id);
    expect(gone.success).toBe(false);
  });
});
