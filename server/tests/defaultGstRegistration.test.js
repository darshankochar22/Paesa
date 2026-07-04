// Bug 5: the company's "current default GST registration" persists as the single source
// of truth for prefilling NEW vouchers. This test mirrors the reported scenario:
// pick Chhattisgarh → (screen closes / reopens = a fresh read) → the default is
// Chhattisgarh, never the first record (Arunachal Pradesh).

const { setupTestDB, createTestCompany, db } = require("./helpers");
const companyController = require("../company/companyController");
const gstRegistrationController = require("../gstRegistration/gstRegistrationController");

// Mirror of client/src/pages/transactions/utils/defaultRegistration.ts — the new-voucher
// seeding rule: pick strictly by the persisted default id, NO first-record fallback.
const pickDefaultRegistrationFrom = (defaultId, registrations) =>
  defaultId == null ? null : (registrations || []).find((r) => Number(r.gst_id) === Number(defaultId)) || null;

const createReg = async (companyId, state, gstin) => {
  const res = await gstRegistrationController.create(null, {
    company_id: companyId, registration_type: "Regular", registration_status: "Active", state_id: state, gstin,
  });
  if (!res.success) throw new Error(`reg create failed: ${res.error}`);
  return res.gstRegistration.gst_id;
};

describe("Company default GST registration (bug 5)", () => {
  let companyId, arunachalReg, chhattisgarhReg;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("Default GST Reg Co");
    companyId = company.company_id;
    // Arunachal FIRST — so a "first record" fallback would wrongly surface it.
    arunachalReg = await createReg(companyId, "Arunachal Pradesh", "12ABCDE1234F1Z5");
    chhattisgarhReg = await createReg(companyId, "Chhattisgarh", "22ABCDE1234F1Z5");
  });

  it("has no default until one is chosen (no first-record fallback)", async () => {
    const res = await companyController.getDefaultGstRegistration(null, companyId);
    expect(res.success).toBe(true);
    expect(res.current_default_gst_registration_id ?? null).toBeNull();
  });

  it("persists the chosen registration immediately and reads it back on a fresh open", async () => {
    // User picks Chhattisgarh (the immediate write done on selection).
    const setRes = await companyController.setDefaultGstRegistration(null, {
      company_id: companyId, gst_registration_id: chhattisgarhReg,
    });
    expect(setRes.success).toBe(true);

    // "Close the screen entirely, open a brand-new voucher" == a fresh read of the field.
    const getRes = await companyController.getDefaultGstRegistration(null, companyId);
    expect(Number(getRes.current_default_gst_registration_id)).toBe(Number(chhattisgarhReg));

    // getById (used by other consumers) also reflects it.
    const byId = await companyController.getById(null, companyId);
    expect(Number(byId.company.current_default_gst_registration_id)).toBe(Number(chhattisgarhReg));

    // The new-voucher seeding logic picks Chhattisgarh, NOT the first record (Arunachal).
    const regsRes = await gstRegistrationController.getAll(null, companyId);
    const chosen = pickDefaultRegistrationFrom(getRes.current_default_gst_registration_id, regsRes.gstRegistrations);
    expect(chosen.state_id).toBe("Chhattisgarh");
    expect(Number(chosen.gst_id)).not.toBe(Number(arunachalReg));
  });

  it("can be cleared back to no-default", async () => {
    await companyController.setDefaultGstRegistration(null, { company_id: companyId, gst_registration_id: null });
    const getRes = await companyController.getDefaultGstRegistration(null, companyId);
    expect(getRes.current_default_gst_registration_id ?? null).toBeNull();
  });
});
