// GST Utilities + Other Reports — Rate Setup grids/trees, Validate & Create
// Party GSTIN, GST opening advances, Marked Vouchers, Advance report, Reverse
// Charge. Split from gstReports.test.js; shared fixture in ./gstReportsSeed.

const { seedGstReportsCompany, ledgerId } = require('./gstReportsSeed');
const { db } = require('./helpers');
const reconciliationService = require('../gst/reconciliationService');

describe('GST utilities and other reports', () => {
  let companyId, fyId, partyId, salesId, creditorId, purchaseId, noGstCustomerId, noGstSupplierId;

  beforeAll(async () => {
    ({
      companyId,
      fyId,
      partyId,
      salesId,
      creditorId,
      purchaseId,
      noGstCustomerId,
      noGstSupplierId,
    } = await seedGstReportsCompany());
  });

  it('GST Rate Setup buckets each master by its GST rate status', async () => {
    await db.execute(
      `INSERT INTO stock_items (company_id, name, gst_applicable, taxability_type, gst_rate, hsn_sac, is_active)
       VALUES (?, 'RS Taxable Item', 'Applicable', 'Taxable', 18, '9401', 1),
              (?, 'RS Exempt Item', 'Applicable', 'Exempt', 0, '1234', 1),
              (?, 'RS Blank Item', 'Applicable', NULL, 0, NULL, 1),
              (?, 'RS NA Item', 'Not Applicable', NULL, 0, NULL, 1)`,
      [companyId, companyId, companyId, companyId],
    );

    const res = await reconciliationService.getGstRateSetup(companyId, 'stock_item');
    expect(res.success).toBe(true);
    const byName = Object.fromEntries(res.masters.map((m) => [m.name, m]));
    expect(byName['RS Taxable Item'].status).toBe('GST Rate-18%');
    expect(byName['RS Taxable Item'].hsn).toBe('9401');
    expect(byName['RS Exempt Item'].status).toBe('Exempt');
    // An Applicable item with no rate is "Not Provided"; one explicitly Not Applicable is NA.
    // (New items default to Applicable, so Not Applicable is a deliberate choice.)
    expect(byName['RS Blank Item'].status).toBe('GST Rate Details Not Provided');
    expect(byName['RS NA Item'].status).toBe('GST Not Applicable');

    // Ledgers resolve their GST status from ledger_statutory_details (CGST Payable was
    // tagged type_of_duty_tax='GST' in the challan test — its statutory row exists).
    const led = await reconciliationService.getGstRateSetup(companyId, 'ledger');
    expect(led.success).toBe(true);
    expect(led.masters.length).toBeGreaterThan(0);

    // Unknown master type is a clean error, not a throw.
    const bad = await reconciliationService.getGstRateSetup(companyId, 'nonsense');
    expect(bad.success).toBe(false);
  });

  it('GST Rate Setup tree drills Primary → group → ledgers and hides empty groups', async () => {
    // A two-level group tree with one ledger at the leaf, plus an empty top-level group.
    await db.execute(
      `INSERT INTO groups (company_id, name, parent_group_id, is_primary, is_active)
       VALUES (?, 'RT Parent', NULL, 1, 1), (?, 'RT Empty Top', NULL, 1, 1)`,
      [companyId, companyId],
    );
    const parent = await db.execute(
      `SELECT group_id FROM groups WHERE company_id = ? AND name = 'RT Parent'`,
      [companyId],
    );
    const parentId = parent.rows[0].group_id;
    await db.execute(
      `INSERT INTO groups (company_id, name, parent_group_id, is_active) VALUES (?, 'RT Child', ?, 1)`,
      [companyId, parentId],
    );
    const child = await db.execute(
      `SELECT group_id FROM groups WHERE company_id = ? AND name = 'RT Child'`,
      [companyId],
    );
    const childId = child.rows[0].group_id;
    await db.execute(
      `INSERT INTO ledgers (company_id, group_id, name, is_active) VALUES
         (?, ?, 'RT Leaf Ledger', 1),
         (?, ?, 'RT App No Rate', 1),
         (?, ?, 'RT Unconfigured', 1),
         (?, ?, 'RT Explicit NA', 1)`,
      [companyId, childId, companyId, childId, companyId, childId, companyId, childId],
    );
    const led = (name) =>
      db
        .execute(`SELECT ledger_id FROM ledgers WHERE company_id = ? AND name = ?`, [
          companyId,
          name,
        ])
        .then((r) => r.rows[0].ledger_id);
    // Rate specified here → real rate bucket.
    await db.execute(
      `INSERT INTO ledger_statutory_details (ledger_id, gst_applicability, taxability_type, gst_rate, gst_rate_source, hsn_sac_code)
       VALUES (?, 'Applicable', 'Taxable', 12, 'Specify Details Here', '9403')`,
      [await led('RT Leaf Ledger')],
    );
    // Applicable but rate INHERITED (As per Company/Group) → not provided, despite the
    // placeholder taxability_type='Taxable'.
    await db.execute(
      `INSERT INTO ledger_statutory_details (ledger_id, gst_applicability, taxability_type, gst_rate, gst_rate_source)
       VALUES (?, 'Applicable', 'Taxable', 0, 'As per Company/Group')`,
      [await led('RT App No Rate')],
    );
    // 'RT Unconfigured' has NO statutory row → GST applies but rate not entered.
    // 'RT Explicit NA' is explicitly marked Not Applicable.
    await db.execute(
      `INSERT INTO ledger_statutory_details (ledger_id, gst_applicability) VALUES (?, 'Not Applicable')`,
      [await led('RT Explicit NA')],
    );

    // Root (Primary): shows RT Parent (has a ledger descendant), hides RT Empty Top.
    const root = await reconciliationService.getGstRateSetupTree(companyId, null);
    expect(root.success).toBe(true);
    expect(root.ledgers).toHaveLength(0);
    const rootNames = root.groups.map((g) => g.name);
    expect(rootNames).toContain('RT Parent');
    expect(rootNames).not.toContain('RT Empty Top');
    expect(root.groups.every((g) => g.kind === 'group')).toBe(true);

    // Drill into RT Parent → its sub-group RT Child, still no direct ledgers.
    const lvl1 = await reconciliationService.getGstRateSetupTree(companyId, parentId);
    expect(lvl1.success).toBe(true);
    expect(lvl1.group.name).toBe('RT Parent');
    expect(lvl1.groups.map((g) => g.name)).toContain('RT Child');
    expect(lvl1.ledgers).toHaveLength(0);

    // Drill into RT Child → the leaf ledger with its resolved rate status.
    const lvl2 = await reconciliationService.getGstRateSetupTree(companyId, childId);
    expect(lvl2.success).toBe(true);
    const byName = Object.fromEntries(lvl2.ledgers.map((l) => [l.name, l]));
    expect(byName['RT Leaf Ledger'].kind).toBe('ledger');
    expect(byName['RT Leaf Ledger'].status).toBe('GST Rate-12%');
    expect(byName['RT Leaf Ledger'].hsn).toBe('9403');
    // Applicable-but-inherited-rate and unconfigured ledgers are both "not provided";
    // only an explicit Not Applicable ledger falls in that bucket.
    expect(byName['RT App No Rate'].status).toBe('GST Rate Details Not Provided');
    expect(byName['RT Unconfigured'].status).toBe('GST Rate Details Not Provided');
    expect(byName['RT Explicit NA'].status).toBe('GST Not Applicable');
  });

  it('GST Rate Setup stock tree drills Primary → stock group → items, excluding the Primary group', async () => {
    // A Primary stock group (must be excluded) + a real top-level group with a child.
    await db.execute(
      `INSERT INTO stock_groups (company_id, name, parent_group_id, is_primary, is_active)
       VALUES (?, 'ST Primary', NULL, 1, 1), (?, 'ST Parent', NULL, 0, 1)`,
      [companyId, companyId],
    );
    const parent = await db.execute(
      `SELECT sg_id FROM stock_groups WHERE company_id = ? AND name = 'ST Parent'`,
      [companyId],
    );
    const parentId = parent.rows[0].sg_id;
    await db.execute(
      `INSERT INTO stock_groups (company_id, name, parent_group_id, is_primary, is_active) VALUES (?, 'ST Child', ?, 0, 1)`,
      [companyId, parentId],
    );
    const child = await db.execute(
      `SELECT sg_id FROM stock_groups WHERE company_id = ? AND name = 'ST Child'`,
      [companyId],
    );
    const childId = child.rows[0].sg_id;
    // One item directly under Primary (group_id NULL), one inside ST Child.
    await db.execute(
      `INSERT INTO stock_items (company_id, name, group_id, gst_applicable, taxability_type, gst_rate, hsn_sac, is_active) VALUES
         (?, 'ST Root Item', NULL, 'Applicable', 'Taxable', 5, '1905', 1),
         (?, 'ST Child Item', ?, 'Applicable', 'Taxable', 18, '9403', 1)`,
      [companyId, companyId, childId],
    );

    // Root: top-level group ST Parent shows (ST Primary excluded); ST Root Item is a leaf.
    const root = await reconciliationService.getGstRateSetupStockTree(companyId, null);
    expect(root.success).toBe(true);
    const rootGroups = root.groups.map((g) => g.name);
    expect(rootGroups).toContain('ST Parent');
    expect(rootGroups).not.toContain('ST Primary');
    expect(root.groups.every((g) => g.kind === 'stock_group')).toBe(true);
    const rootItem = root.ledgers.find((l) => l.name === 'ST Root Item');
    expect(rootItem).toBeTruthy();
    expect(rootItem.kind).toBe('stock_item');
    expect(rootItem.status).toBe('GST Rate-5%');

    // Drill ST Parent → sub-group ST Child, no direct items.
    const lvl1 = await reconciliationService.getGstRateSetupStockTree(companyId, parentId);
    expect(lvl1.group.name).toBe('ST Parent');
    expect(lvl1.groups.map((g) => g.name)).toContain('ST Child');
    expect(lvl1.ledgers).toHaveLength(0);

    // Drill ST Child → its item.
    const lvl2 = await reconciliationService.getGstRateSetupStockTree(companyId, childId);
    const childItem = lvl2.ledgers.find((l) => l.name === 'ST Child Item');
    expect(childItem).toBeTruthy();
    expect(childItem.status).toBe('GST Rate-18%');
    expect(childItem.hsn).toBe('9403');
  });

  it('Validate Party GSTIN/UIN flags registered parties with missing/malformed GSTIN', async () => {
    await db.execute(
      `INSERT INTO groups (company_id, name, is_active) VALUES (?, 'VP Parties', 1)`,
      [companyId],
    );
    const grp = await db.execute(
      `SELECT group_id FROM groups WHERE company_id = ? AND name = 'VP Parties'`,
      [companyId],
    );
    const groupId = grp.rows[0].group_id;

    await db.execute(
      `INSERT INTO ledgers (company_id, group_id, name, state, country, registration_type, gstin, pan, is_active)
       VALUES (?, ?, 'VP Valid Co', 'Maharashtra', 'India', 'Regular', '27ABCDE1234F1Z5', 'ABCDE1234F', 1),
              (?, ?, 'VP Missing Co', 'Chhattisgarh', 'India', 'Regular', NULL, NULL, 1),
              (?, ?, 'VP Bad Co', 'Karnataka', 'India', 'Regular', 'NOTAGSTIN', NULL, 1),
              (?, ?, 'VP Unreg Co', 'Delhi', 'India', 'Unregistered', NULL, NULL, 1)`,
      [companyId, groupId, companyId, groupId, companyId, groupId, companyId, groupId],
    );

    const res = await reconciliationService.validatePartyGstin(companyId, {
      group_name: 'VP Parties',
    });
    expect(res.success).toBe(true);
    const byName = Object.fromEntries(res.parties.map((p) => [p.name, p]));
    expect(byName['VP Valid Co'].valid).toBe(true);
    expect(byName['VP Valid Co'].status).toBe('Valid');
    expect(byName['VP Missing Co'].valid).toBe(false);
    expect(byName['VP Missing Co'].status).toMatch(/not specified/i);
    expect(byName['VP Bad Co'].valid).toBe(false);
    expect(byName['VP Bad Co'].status).toMatch(/invalid/i);
    // An unregistered party without a GSTIN is not an exception.
    expect(byName['VP Unreg Co'].valid).toBe(true);
  });

  it('Validate Party GSTIN/UIN → Update Details saves values as entered (no silent PAN derivation)', async () => {
    await db.execute(
      `INSERT INTO groups (company_id, name, is_active) VALUES (?, 'VP Update', 1)`,
      [companyId],
    );
    const grp = await db.execute(
      `SELECT group_id FROM groups WHERE company_id = ? AND name = 'VP Update'`,
      [companyId],
    );
    const groupId = grp.rows[0].group_id;

    await db.execute(
      `INSERT INTO ledgers (company_id, group_id, name, registration_type, is_active)
       VALUES (?, ?, 'VP Fix Me', 'Regular', 1)`,
      [companyId, groupId],
    );
    const led = await db.execute(
      `SELECT ledger_id FROM ledgers WHERE company_id = ? AND name = 'VP Fix Me'`,
      [companyId],
    );
    const ledgerId = led.rows[0].ledger_id;

    // Save the GSTIN without a PAN — PAN must stay blank, never auto-filled from the GSTIN.
    const upd = await reconciliationService.updatePartyGstDetails({
      ledger_id: ledgerId,
      registration_type: 'Regular',
      gstin: '22AAACJ1681G1ZZ',
      state: 'Chhattisgarh',
    });
    expect(upd.success).toBe(true);
    expect(upd.ledger.gstin).toBe('22AAACJ1681G1ZZ');
    expect(upd.ledger.state).toBe('Chhattisgarh');
    expect(upd.ledger.pan).toBe(''); // left blank — not derived from the GSTIN

    // Re-validate reflects the saved GSTIN with no PAN.
    const res = await reconciliationService.validatePartyGstin(companyId, {
      group_name: 'VP Update',
    });
    const row = res.parties.find((p) => p.name === 'VP Fix Me');
    expect(row.gstin).toBe('22AAACJ1681G1ZZ');
    expect(row.pan).toBe('');

    // An explicitly entered PAN is persisted as-is.
    const upd2 = await reconciliationService.updatePartyGstDetails({
      ledger_id: ledgerId,
      registration_type: 'Regular',
      gstin: '22AAACJ1681G1ZZ',
      pan: 'AAACJ1681G',
    });
    expect(upd2.success).toBe(true);
    expect(upd2.ledger.pan).toBe('AAACJ1681G');

    // A malformed PAN (e.g. "7") is rejected with the PAN-format message.
    const badPan = await reconciliationService.updatePartyGstDetails({
      ledger_id: ledgerId,
      registration_type: 'Regular',
      pan: '7',
    });
    expect(badPan.success).toBe(false);
    expect(badPan.error).toMatch(/PAN/i);

    // A malformed GSTIN is rejected without touching the ledger.
    const bad = await reconciliationService.updatePartyGstDetails({
      ledger_id: ledgerId,
      gstin: 'NOTAGSTIN',
    });
    expect(bad.success).toBe(false);
    expect(bad.error).toMatch(/invalid/i);
  });

  it('Create Party Using GSTIN derives State/PAN and creates a party ledger per GSTIN', async () => {
    await db.execute(
      `INSERT INTO groups (company_id, name, is_active) VALUES (?, 'CP Debtors', 1)`,
      [companyId],
    );

    const res = await reconciliationService.createPartiesFromGstin(companyId, {
      group_name: 'CP Debtors',
      gstins: ['22AAACI1681G1ZZ', 'not-a-gstin'],
    });
    expect(res.success).toBe(true);
    const byGstin = Object.fromEntries(res.results.map((r) => [r.gstin, r]));
    expect(byGstin['22AAACI1681G1ZZ'].success).toBe(true);
    expect(byGstin['22AAACI1681G1ZZ'].state).toBe('Chhattisgarh'); // state code 22
    expect(byGstin['NOT-A-GSTIN'].success).toBe(false); // uppercased, malformed

    // The ledger was actually created with State/PAN/registration derived from the GSTIN.
    const led = await db.execute(
      `SELECT name, state, gstin, pan, registration_type FROM ledgers WHERE company_id = ? AND gstin = '22AAACI1681G1ZZ'`,
      [companyId],
    );
    expect(led.rows).toHaveLength(1);
    expect(led.rows[0].state).toBe('Chhattisgarh');
    expect(led.rows[0].pan).toBe('AAACI1681G'); // chars 3-12
    expect(led.rows[0].registration_type).toBe('Regular');
  });

  it('GST Advances - Opening Balance stores, lists and deletes an unadjusted advance', async () => {
    const create = await reconciliationService.createGstOpeningAdvance(companyId, {
      registration_name: 'Maharashtra Registration',
      party_ledger_id: partyId,
      party_name: 'GST Customer',
      type_of_advance: 'Receipt',
      place_of_supply: 'Maharashtra',
      reverse_charge: false,
      date: '2026-04-01',
      taxability: 'Taxable',
      gst_rate: 18,
      advance_amount: 11800,
      taxable_amount: 10000,
      cgst: 900,
      sgst: 900,
    });
    expect(create.success).toBe(true);

    const list = await reconciliationService.getGstOpeningAdvances(companyId);
    expect(list.success).toBe(true);
    const adv = list.advances.find(
      (a) => a.party_name === 'GST Customer' && a.type_of_advance === 'Receipt',
    );
    expect(adv).toBeTruthy();
    expect(adv.advance_amount).toBe(11800);
    expect(adv.taxable_amount).toBe(10000);
    expect(adv.cgst).toBe(900);
    expect(adv.sgst).toBe(900);

    const del = await reconciliationService.deleteGstOpeningAdvance(adv.advance_id, companyId);
    expect(del.success).toBe(true);
    const after = await reconciliationService.getGstOpeningAdvances(companyId);
    expect(after.advances.find((a) => a.advance_id === adv.advance_id)).toBeFalsy();
  });

  it('Other Reports: Marked Vouchers register, Advance report and Reverse Charge', async () => {
    // Marked Vouchers = full voucher register; a sale shows the party's Debit amount.
    const mv = await reconciliationService.getMarkedVouchers(companyId, fyId);
    expect(mv.success).toBe(true);
    expect(mv.vouchers.length).toBeGreaterThan(0);
    const sale = mv.vouchers.find((v) => v.voucher_type === 'Sales');
    expect(sale).toBeTruthy();
    expect(sale.debit).toBeGreaterThan(0);

    // Advance report Opening Balance comes from the GST Advances - Opening Balance utility.
    await reconciliationService.createGstOpeningAdvance(companyId, {
      party_name: 'Adv Party',
      type_of_advance: 'Receipt',
      taxability: 'Taxable',
      gst_rate: 18,
      advance_amount: 1180,
      taxable_amount: 1000,
      cgst: 90,
      sgst: 90,
    });
    const rcpt = await reconciliationService.getGstAdvancesReport(companyId, fyId, 'Receipt');
    expect(rcpt.success).toBe(true);
    const row = rcpt.parties.find((p) => p.party_name === 'Adv Party');
    expect(row).toBeTruthy();
    expect(row.opening.taxable).toBe(1000);
    expect(row.opening.tax).toBe(180);
    // A Receipt advance does not appear under Advance Paid.
    const paid = await reconciliationService.getGstAdvancesReport(companyId, fyId, 'Payment');
    expect(paid.parties.find((p) => p.party_name === 'Adv Party')).toBeFalsy();

    // Reverse Charge Supplies is honestly empty (no RCM voucher tracking).
    const rcm = await reconciliationService.getReverseChargeSupplies(companyId, fyId);
    expect(rcm.success).toBe(true);
    expect(rcm.rows).toEqual([]);
  });
});
