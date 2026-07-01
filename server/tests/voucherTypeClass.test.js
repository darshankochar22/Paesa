// Voucher Type — "Name of Class" sub-screen. The Voucher Type Create/Alter screen lets
// a user define named Classes per voucher type (each optionally "Use Class for GST
// Details" with CGST/SGST/IGST ledger mappings). This test asserts those rows round-trip
// through create → getConfig → updateConfig, same as the #143 numbering-details rows.

const { setupTestDB, createTestCompany, db } = require("./helpers");
const voucherTypeService = require("../voucherType/voucherTypeService");

describe("Voucher Type Name of Class", () => {
  let companyId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("VT Class Co");
    companyId = company.company_id;
  });

  it("persists voucher_classes rows on create and reads them back", async () => {
    const created = await voucherTypeService.create({
      company_id: companyId,
      name: "Custom Sales Class Test",
      category: "Sales",
      voucher_classes: [
        { id: "vc-1", name: "GST Sales", use_for_gst_details: "Yes", cgst_ledger_id: 11, sgst_ledger_id: 12, igst_ledger_id: 13 },
        { id: "vc-2", name: "Export Sales", use_for_gst_details: "No", cgst_ledger_id: null, sgst_ledger_id: null, igst_ledger_id: null },
      ],
    });
    expect(created.success).toBe(true);
    const vtId = created.voucherType.vt_id;

    const cfg = await voucherTypeService.getConfig(vtId);
    expect(cfg.success).toBe(true);
    expect(cfg.config.voucher_classes).toEqual([
      { id: "vc-1", name: "GST Sales", use_for_gst_details: "Yes", cgst_ledger_id: 11, sgst_ledger_id: 12, igst_ledger_id: 13 },
      { id: "vc-2", name: "Export Sales", use_for_gst_details: "No", cgst_ledger_id: null, sgst_ledger_id: null, igst_ledger_id: null },
    ]);

    // getById (used by the Alter screen's initial load) also surfaces it.
    const byId = await voucherTypeService.getById(vtId);
    expect(byId.success).toBe(true);
    expect(byId.voucherType.voucher_classes).toEqual(cfg.config.voucher_classes);
  });

  it("updateConfig replaces the class list", async () => {
    const created = await voucherTypeService.create({
      company_id: companyId,
      name: "Custom Purchase Class Test",
      category: "Purchase",
    });
    const vtId = created.voucherType.vt_id;

    const upd = await voucherTypeService.updateConfig({
      voucher_type_id: vtId,
      voucher_classes: [
        { id: "vc-3", name: "GST Purchase", use_for_gst_details: "Yes", cgst_ledger_id: 21, sgst_ledger_id: 22, igst_ledger_id: null },
      ],
    });
    expect(upd.success).toBe(true);
    expect(upd.config.voucher_classes).toEqual([
      { id: "vc-3", name: "GST Purchase", use_for_gst_details: "Yes", cgst_ledger_id: 21, sgst_ledger_id: 22, igst_ledger_id: null },
    ]);

    const cfg = await voucherTypeService.getConfig(vtId);
    expect(cfg.config.voucher_classes).toEqual(upd.config.voucher_classes);
  });

  it("defaults voucher_classes to an empty array when not provided", async () => {
    const created = await voucherTypeService.create({
      company_id: companyId,
      name: "Plain Class Test Journal",
      category: "Journal",
    });
    const cfg = await voucherTypeService.getConfig(created.voucherType.vt_id);
    expect(cfg.config.voucher_classes).toEqual([]);
  });
});
