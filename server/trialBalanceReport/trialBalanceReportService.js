const { db } = require('../db/index');
const { sql, eq } = require('drizzle-orm');
const {
  trialBalanceReports,
  trialBalanceRows,
  ledgers,
  groups,
  voucherEntries,
  vouchers,
} = require('../db/schema');

// ── helpers ────────────────────────────────────────────────────────────────

const getActiveFY = async (company_id) => {
  const rows = await db.all(
    sql`SELECT fy_id FROM financial_years
        WHERE company_id = ${company_id} AND is_active = 1
        LIMIT 1`
  );
  return rows.length ? rows[0].fy_id : null;
};

/**
 * Build a flat list of trial-balance rows from live ledger, group and voucher data.
 * Output mirrors Tally-style trial balance with group headers, indented ledgers,
 * opening / current-period / closing debit & credit columns, and a grand-total row.
 */
const computeTrialBalanceRows = async (company_id, fy_id) => {
  // 1. Groups (ordered by display_order so the tree renders deterministically)
  const allGroups = await db.all(
    sql`SELECT group_id, name, nature, parent_group_id, display_order
        FROM ${groups}
        WHERE company_id = ${company_id} AND is_active = 1
        ORDER BY display_order ASC`
  );

  // 2. Ledgers
  const allLedgers = await db.all(
    sql`SELECT ledger_id, name, opening_balance, opening_balance_type, group_id
        FROM ${ledgers}
        WHERE company_id = ${company_id} AND is_active = 1`
  );

  // 3. Voucher entries for the FY
  const entries = await db.all(
    sql`SELECT e.ledger_id, e.type, e.amount
        FROM ${voucherEntries} e
        INNER JOIN ${vouchers} v ON v.voucher_id = e.voucher_id
        WHERE v.company_id = ${company_id}
          AND v.fy_id = ${fy_id}
          AND v.is_cancelled = 0
          AND COALESCE(v.is_optional, 0) = 0
          AND COALESCE(v.is_post_dated, 0) = 0`
  );

  // 4. Per-ledger figures
  const ledgerMap = {};
  for (const l of allLedgers) {
    const rawOpening = Number(l.opening_balance) || 0;
    // Legacy negative = Cr; new positive uses opening_balance_type
    const opening = rawOpening < 0
      ? rawOpening
      : (l.opening_balance_type === 'Cr' ? -rawOpening : rawOpening);
    let periodDr = 0;
    let periodCr = 0;

    for (const e of entries) {
      if (e.ledger_id === l.ledger_id) {
        if (e.type === 'Dr') periodDr += Number(e.amount);
        else periodCr += Number(e.amount);
      }
    }

    const closing = opening + periodDr - periodCr;

    ledgerMap[l.ledger_id] = {
      ledger_id: l.ledger_id,
      ledger_name: l.name,
      group_id: l.group_id,
      openingDr: opening > 0 ? opening : 0,
      openingCr: opening < 0 ? Math.abs(opening) : 0,
      periodDr,
      periodCr,
      closingDr: closing > 0 ? closing : 0,
      closingCr: closing < 0 ? Math.abs(closing) : 0,
    };
  }

  // 5. Group → descendant lookup (children + grandchildren …)
  const childrenMap = {};
  for (const g of allGroups) {
    if (!childrenMap[g.group_id]) childrenMap[g.group_id] = [];
    if (g.parent_group_id) {
      if (!childrenMap[g.parent_group_id]) childrenMap[g.parent_group_id] = [];
      childrenMap[g.parent_group_id].push(g.group_id);
    }
  }

  const getDescendants = (group_id) => {
    const result = new Set();
    const queue = [group_id];
    while (queue.length) {
      const cur = queue.shift();
      for (const c of childrenMap[cur] || []) {
        if (!result.has(c)) {
          result.add(c);
          queue.push(c);
        }
      }
    }
    return result;
  };

  // 6. Roll up ledger figures into every group that contains them
  const groupRollup = {};
  for (const g of allGroups) {
    const relevant = new Set([g.group_id, ...getDescendants(g.group_id)]);
    let oDr = 0, oCr = 0, pDr = 0, pCr = 0, cDr = 0, cCr = 0;
    for (const l of Object.values(ledgerMap)) {
      if (relevant.has(l.group_id)) {
        oDr += l.openingDr; oCr += l.openingCr;
        pDr += l.periodDr;  pCr += l.periodCr;
        cDr += l.closingDr; cCr += l.closingCr;
      }
    }
    groupRollup[g.group_id] = { oDr, oCr, pDr, pCr, cDr, cCr };
  }

  // 7. Build flat rows in display order with parentRowId for nesting
  const rows = [];
  let order = 1;

  // Map to remember the database row-id we assign to each group so child rows
  // can point to it via parentRowId.  We use negative temporary ids while
  // building the list; they are replaced by real db row ids after insert.
  const groupRowId = {};

  const addGroup = (g, depth = 0) => {
    const r = groupRollup[g.group_id];
    // skip empty groups unless they have children that might be non-empty
    // (keeping them makes tree stable, so we keep all top-level + non-zero)
    const hasNonZero = r.oDr || r.oCr || r.pDr || r.pCr || r.cDr || r.cCr;
    const children = allGroups.filter(c => c.parent_group_id === g.group_id);

    // Always emit primary groups; emit secondary groups only if they have
    // activity or contain active ledgers.
    if (!g.parent_group_id || hasNonZero || children.length) {
      groupRowId[g.group_id] = -order; // temp negative id
      rows.push({
        rowType: 'Group',
        particulars: g.name,
        groupId: g.group_id,
        ledgerId: null,
        displayOrder: order++,
        openingDebit: r.oDr,
        openingCredit: r.oCr,
        periodDebit: r.pDr,
        periodCredit: r.pCr,
        closingDebit: r.cDr,
        closingCredit: r.cCr,
        isDrillable: 1,
        isGrandTotal: 0,
        parentRowId: g.parent_group_id ? groupRowId[g.parent_group_id] || null : null,
      });
    }

    // Child groups first (by display_order)
    children
      .sort((a, b) => a.display_order - b.display_order)
      .forEach(cg => addGroup(cg, depth + 1));

    // Direct ledgers under this group
    const directLedgers = Object.values(ledgerMap)
      .filter(l => l.group_id === g.group_id)
      .filter(l => l.openingDr || l.openingCr || l.periodDr || l.periodCr || l.closingDr || l.closingCr)
      .sort((a, b) => a.ledger_name.localeCompare(b.ledger_name));

    for (const l of directLedgers) {
      rows.push({
        rowType: 'Ledger',
        particulars: l.ledger_name,
        groupId: g.group_id,
        ledgerId: l.ledger_id,
        displayOrder: order++,
        openingDebit: l.openingDr,
        openingCredit: l.openingCr,
        periodDebit: l.periodDr,
        periodCredit: l.periodCr,
        closingDebit: l.closingDr,
        closingCredit: l.closingCr,
        isDrillable: 1,
        isGrandTotal: 0,
        parentRowId: groupRowId[g.group_id] || null,
      });
    }
  };

  allGroups
    .filter(g => g.parent_group_id === null)
    .sort((a, b) => a.display_order - b.display_order)
    .forEach(g => addGroup(g));

  // Grand total
  const total = Object.values(ledgerMap).reduce(
    (s, l) => ({
      oDr: s.oDr + l.openingDr,
      oCr: s.oCr + l.openingCr,
      pDr: s.pDr + l.periodDr,
      pCr: s.pCr + l.periodCr,
      cDr: s.cDr + l.closingDr,
      cCr: s.cCr + l.closingCr,
    }),
    { oDr: 0, oCr: 0, pDr: 0, pCr: 0, cDr: 0, cCr: 0 }
  );

  rows.push({
    rowType: 'Total',
    particulars: 'Grand Total',
    groupId: null,
    ledgerId: null,
    displayOrder: order++,
    openingDebit: total.oDr,
    openingCredit: total.oCr,
    periodDebit: total.pDr,
    periodCredit: total.pCr,
    closingDebit: total.cDr,
    closingCredit: total.cCr,
    isDrillable: 0,
    isGrandTotal: 1,
    parentRowId: null,
  });

  return {
    rows,
    grandTotalDr: total.cDr,
    grandTotalCr: total.cCr,
  };
};

// ── service exports ────────────────────────────────────────────────────────

module.exports = {
  create: async (data) => {
    try {
      const fy_id = data.fy_id || (await getActiveFY(data.company_id));
      if (!fy_id) {
        return { success: false, error: 'No financial year provided and no active FY found' };
      }

      const inserted = await db
        .insert(trialBalanceReports)
        .values({
          companyId: data.company_id,
          companyName: data.company_name || null,
          reportDate: data.report_date || new Date().toISOString().split('T')[0],
          periodStart: data.period_start || null,
          periodEnd: data.period_end || null,
          showClosingBalance: data.show_closing_balance ?? 1,
          showDebitCredit: data.show_debit_credit ?? 1,
          showGroups: data.show_groups ?? 1,
          showGrandTotal: data.show_grand_total ?? 1,
          detailedMode: data.detailed_mode ? 1 : 0,
        })
        .returning({ id: trialBalanceReports.reportId });

      const report_id = Number(inserted[0].id);

      // ── compute from real data instead of storing pre-cooked rows ──
      const { rows: computedRows } = await computeTrialBalanceRows(
        data.company_id,
        fy_id
      );

      for (let i = 0; i < computedRows.length; i++) {
        const r = computedRows[i];
        await db.insert(trialBalanceRows).values({
          reportId: report_id,
          parentRowId: r.parentRowId && r.parentRowId < 0 ? null : r.parentRowId,
          rowType: r.rowType,
          particulars: r.particulars,
          groupId: r.groupId,
          ledgerId: r.ledgerId,
          displayOrder: r.displayOrder,
          openingDebit: r.openingDebit,
          openingCredit: r.openingCredit,
          periodDebit: r.periodDebit,
          periodCredit: r.periodCredit,
          closingDebit: r.closingDebit,
          closingCredit: r.closingCredit,
          isDrillable: r.isDrillable,
          isGrandTotal: r.isGrandTotal,
          notes: r.notes || null,
        });
      }

      const report = await db.all(
        sql`SELECT * FROM ${trialBalanceReports}
            WHERE ${trialBalanceReports.reportId} = ${report_id}`
      );
      return { success: true, report: report[0] };
    } catch (err) {
      console.error('[trialBalanceReportService] create error:', err);
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const reports = await db.all(
        sql`SELECT * FROM ${trialBalanceReports}
            WHERE ${trialBalanceReports.companyId} = ${company_id}
            ORDER BY ${trialBalanceReports.createdAt} DESC`
      );
      return { success: true, reports };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const report = await db.all(
        sql`SELECT * FROM ${trialBalanceReports}
            WHERE ${trialBalanceReports.reportId} = ${id}`
      );
      if (report.length === 0) return { success: false, error: 'Report not found' };

      const rows = await db.all(
        sql`SELECT * FROM ${trialBalanceRows}
            WHERE ${trialBalanceRows.reportId} = ${id}
            ORDER BY ${trialBalanceRows.displayOrder} ASC`
      );

      return { success: true, report: { ...report[0], rows } };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await db.all(
        sql`SELECT * FROM ${trialBalanceReports}
            WHERE ${trialBalanceReports.reportId} = ${id}`
      );
      if (existing.length === 0) return { success: false, error: 'Report not found' };

      await db.delete(trialBalanceReports).where(eq(trialBalanceReports.reportId, id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
