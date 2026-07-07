// Update Party MSME Details — master-data screen under Statutory Reports → MSME Reports.
//
// Lists party ledgers under a chosen group and lets you tag each with its MSME
// registration (Type of Enterprise / UDYAM Reg No. / Activity Type). Providing MSME
// details enables "Maintain balances bill-by-bill" on the party and prefills State /
// Country from the Company master when blank — mirroring TallyPrime's behaviour.

const { db } = require('../db/index');
const { sql, eq } = require('drizzle-orm');
const { ledgers, groups, companies, vouchers } = require('../db/schema');

const ENTERPRISE_TYPES = ['Not Applicable', 'Micro', 'Small', 'Medium'];
const ACTIVITY_TYPES = ['Unknown', 'Manufacturing', 'Services', 'Traders'];

// Party ledgers in scope: every active ledger under the selected group (recursively
// through its sub-groups). A ledger_id narrows to a single party. group_id null falls
// back to the predefined "Sundry Creditors" group (the MSME payables side).
const getPartyMsmeList = async (company_id, { group_id = null, ledger_id = null } = {}) => {
  try {
    let gid = group_id;
    if (!gid) {
      const g = await db.all(
        sql`SELECT group_id FROM ${groups} WHERE company_id = ${company_id} AND name = 'Sundry Creditors' LIMIT 1`,
      );
      gid = g[0]?.group_id ?? null;
    }
    if (!gid) return { success: true, party_ledgers: [], group_id: null };

    const conds = [sql`l.company_id = ${company_id}`, sql`l.is_active = 1`];
    if (ledger_id) conds.push(sql`l.ledger_id = ${ledger_id}`);

    const rows = await db.all(sql`
      WITH RECURSIVE sub_groups AS (
        SELECT group_id FROM ${groups} WHERE group_id = ${gid} AND company_id = ${company_id}
        UNION ALL
        SELECT g.group_id FROM ${groups} g
        INNER JOIN sub_groups sg ON g.parent_group_id = sg.group_id
        WHERE g.company_id = ${company_id}
      )
      SELECT
        l.ledger_id                AS ledger_id,
        l.name                     AS name,
        l.is_bill_wise             AS is_bill_wise,
        l.default_credit_period    AS default_credit_period,
        l.state                    AS state,
        l.country                  AS country,
        l.msme_type_of_enterprise  AS type_of_enterprise,
        l.msme_udyam_reg_no        AS udyam_reg_no,
        l.msme_activity_type       AS activity_type,
        l.msme_effective_date      AS effective_date
      FROM ${ledgers} l
      WHERE ${sql.join(conds, sql` AND `)}
        AND l.group_id IN (SELECT group_id FROM sub_groups)
      ORDER BY l.name ASC
    `);

    // Date of Last Entry — latest non-cancelled voucher date (an Effective Date quick-pick).
    const le = await db.all(
      sql`SELECT MAX(date) AS d FROM ${vouchers} WHERE company_id = ${company_id} AND is_cancelled = 0`,
    );

    return { success: true, party_ledgers: rows, group_id: gid, last_entry_date: le[0]?.d || null };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// Persist MSME registration for one party ledger. Providing a real enterprise type
// (Micro/Small/Medium) switches on bill-wise tracking; "Not Applicable" clears the
// registration back to defaults. State/Country are backfilled from the Company master.
const updateMsmeDetails = async ({ ledger_id, type_of_enterprise, udyam_reg_no, activity_type, effective_date }) => {
  try {
    if (!ledger_id) return { success: false, error: 'ledger_id is required' };
    const type = ENTERPRISE_TYPES.includes(type_of_enterprise) ? type_of_enterprise : 'Not Applicable';
    const isRegistered = type !== 'Not Applicable';
    const activity = isRegistered && ACTIVITY_TYPES.includes(activity_type) ? activity_type : 'Unknown';
    const udyam = isRegistered ? (udyam_reg_no || null) : null;
    // Effective date is recorded for every update, including switching to "Not Applicable".
    const effectiveDate = effective_date || null;

    const found = await db.all(
      sql`SELECT ledger_id, company_id, state, country, is_bill_wise FROM ${ledgers} WHERE ledger_id = ${ledger_id} LIMIT 1`,
    );
    const led = found[0];
    if (!led) return { success: false, error: 'Ledger not found' };

    // Backfill State / Country from the Company master when the party has none.
    let state = led.state;
    let country = led.country;
    if (!state || !country) {
      const comp = (await db.all(
        sql`SELECT state, country FROM ${companies} WHERE company_id = ${led.company_id} LIMIT 1`,
      ))[0];
      if (!state) state = comp?.state || null;
      if (!country) country = comp?.country || null;
    }

    // MSME registration enables bill-by-bill; never turn an already-billwise party off.
    const billWise = isRegistered ? 1 : led.is_bill_wise;

    await db
      .update(ledgers)
      .set({
        msmeTypeOfEnterprise: type,
        msmeUdyamRegNo: udyam,
        msmeActivityType: activity,
        msmeEffectiveDate: effectiveDate,
        isBillWise: billWise,
        state,
        country,
        updatedAt: sql`(datetime('now'))`,
      })
      .where(eq(ledgers.ledgerId, ledger_id));

    return {
      success: true,
      ledger: {
        ledger_id,
        type_of_enterprise: type,
        udyam_reg_no: udyam,
        activity_type: activity,
        effective_date: effectiveDate,
        is_bill_wise: billWise,
        state,
        country,
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = { getPartyMsmeList, updateMsmeDetails, ENTERPRISE_TYPES, ACTIVITY_TYPES };
