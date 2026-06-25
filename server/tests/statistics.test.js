const { setupTestDB, createTestCompany } = require("./helpers");
const reportController = require("../report/reportController");
const { db } = require("../db/index");
const { sql } = require("drizzle-orm");
const { vouchers, financialYears } = require("../db/schema");

describe("Statistics Service Tests", () => {
  let companyId;
  let fyId;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany("Statistics Test Co");
    companyId = company.company_id;

    // Get the created financial year ID
    const fyRows = await db.all(
      sql`SELECT fy_id FROM ${financialYears} WHERE company_id = ${companyId} LIMIT 1`
    );
    fyId = fyRows[0]?.fy_id || 1;
  });

  it("should aggregate stats correctly for an active company", async () => {
    // 1. Fetch initial statistics
    const res = await reportController.statistics(null, { company_id: companyId, fy_id: fyId });
    expect(res.success).toBe(true);
    expect(res.accounts).toBeDefined();
    expect(res.accounts.groups).toBeGreaterThan(0);
    expect(res.accounts.ledgers).toBeGreaterThan(0);
    expect(res.accounts.voucherTypes).toBeGreaterThan(0);
    expect(res.vouchers).toBeDefined();

    // 2. Insert some mock vouchers and verify count updates
    // Let's insert a couple of vouchers
    await db.all(sql`
      INSERT INTO vouchers (company_id, fy_id, voucher_type, date, is_cancelled)
      VALUES (${companyId}, ${fyId}, 'Sales', '2026-06-26', 0),
             (${companyId}, ${fyId}, 'Sales', '2026-06-26', 0),
             (${companyId}, ${fyId}, 'Payment', '2026-06-26', 0)
    `);

    const updatedRes = await reportController.statistics(null, { company_id: companyId, fy_id: fyId });
    expect(updatedRes.success).toBe(true);

    // Sales voucher type should have count of 2
    const salesStat = updatedRes.vouchers.find(v => v.vch_type === 'Sales');
    expect(salesStat).toBeDefined();
    expect(salesStat.count).toBe(2);

    // Payment voucher type should have count of 1
    const paymentStat = updatedRes.vouchers.find(v => v.vch_type === 'Payment');
    expect(paymentStat).toBeDefined();
    expect(paymentStat.count).toBe(1);

    // Voucher types must be sorted alphabetically
    const names = updatedRes.vouchers.map(v => v.vch_type);
    const sortedNames = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sortedNames);
  });
});
