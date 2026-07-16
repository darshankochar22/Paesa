module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    try {
      const { db } = require('../../db');
      const group_id = Number(params.group_id);
      if (!group_id) return { success: false, error: 'group_id is required' };

      const from_date = params.from_date || null;
      const to_date = params.to_date || null;

      const groupRow = await db.run(
        `SELECT name FROM groups WHERE group_id = ${group_id} AND company_id = ${company_id}`,
      );
      const groupName = groupRow?.rows?.[0]?.[0] || '';

      const ledgerRows = await db.run(
        `WITH RECURSIVE sub_groups AS (
          SELECT group_id FROM groups WHERE group_id = ${group_id} AND company_id = ${company_id}
          UNION ALL
          SELECT g.group_id FROM groups g INNER JOIN sub_groups sg ON g.parent_group_id = sg.group_id WHERE g.company_id = ${company_id}
        )
        SELECT l.ledger_id FROM ledgers l
        WHERE l.group_id IN (SELECT group_id FROM sub_groups) AND l.company_id = ${company_id}`,
      );

      const ledgerIdList = (ledgerRows?.rows || []).map((r) => r[0]).filter(Boolean);
      if (!ledgerIdList.length) return { success: true, group_name: groupName, rows: [] };

      const placeholders = ledgerIdList.join(',');
      const dateFilter = [
        from_date ? `AND v.date >= '${from_date}'` : '',
        to_date ? `AND v.date <= '${to_date}'` : '',
      ].join(' ');

      const result = await db.run(
        `SELECT
          v.voucher_id,
          v.voucher_type,
          v.voucher_number,
          v.date,
          v.party_name,
          v.narration,
          (
            SELECT l2.name
            FROM voucher_entries ve3
            JOIN ledgers l2 ON l2.ledger_id = ve3.ledger_id
            WHERE ve3.voucher_id = v.voucher_id
              AND ve3.ledger_id NOT IN (${placeholders})
            ORDER BY ve3.amount DESC
            LIMIT 1
          ) AS main_other,
          COALESCE((SELECT SUM(ve.amount) FROM voucher_entries ve WHERE ve.voucher_id = v.voucher_id AND ve.type = 'Dr' AND ve.ledger_id IN (${placeholders})), 0) AS group_dr,
          COALESCE((SELECT SUM(ve.amount) FROM voucher_entries ve WHERE ve.voucher_id = v.voucher_id AND ve.type = 'Cr' AND ve.ledger_id IN (${placeholders})), 0) AS group_cr
        FROM vouchers v
        WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id}
          AND EXISTS (
            SELECT 1 FROM voucher_entries ve2
            WHERE ve2.voucher_id = v.voucher_id AND ve2.ledger_id IN (${placeholders})
          )
          ${dateFilter}
        ORDER BY v.date DESC, v.voucher_id DESC`,
      );

      // Tally's Group Vouchers report shows, per voucher:
      //  - Particulars = the principal opposing (party) ledger, not every
      //    counter-ledger. Use the largest-value entry outside the group.
      //  - Debit/Credit = only the net movement of the ledgers IN this group
      //    (e.g. the Sales ledger's own 6,760 Cr), not the whole voucher total.
      //    Net onto a single side so a balanced voucher isn't shown twice.
      const cols = [
        'voucher_id',
        'voucher_type',
        'voucher_number',
        'date',
        'party_name',
        'narration',
        'main_other',
        'group_dr',
        'group_cr',
      ];
      const rows = (result?.rows || []).map((r) => {
        const obj = {};
        cols.forEach((c, i) => (obj[c] = r[i]));
        const net = (Number(obj.group_dr) || 0) - (Number(obj.group_cr) || 0);
        return {
          voucher_id: obj.voucher_id,
          voucher_type: obj.voucher_type,
          voucher_number: obj.voucher_number,
          date: obj.date,
          party_name: obj.party_name,
          narration: obj.narration,
          particulars: obj.main_other || obj.party_name || obj.narration || '',
          debit: net > 0 ? net : 0,
          credit: net < 0 ? -net : 0,
        };
      });

      // Group balance footer (Tally: Opening Balance / Current Total / Closing).
      // Opening = signed sum of member-ledger opening balances (Dr +, Cr −);
      // Current Total = net movement of the shown vouchers; Closing = the two summed.
      const obRows = await db.run(
        `WITH RECURSIVE sub_groups AS (
          SELECT group_id FROM groups WHERE group_id = ${group_id} AND company_id = ${company_id}
          UNION ALL
          SELECT g.group_id FROM groups g INNER JOIN sub_groups sg ON g.parent_group_id = sg.group_id WHERE g.company_id = ${company_id}
        )
        SELECT COALESCE(SUM(CASE WHEN l.opening_balance_type = 'Cr' THEN -l.opening_balance ELSE l.opening_balance END), 0)
        FROM ledgers l
        WHERE l.group_id IN (SELECT group_id FROM sub_groups) AND l.company_id = ${company_id}`,
      );
      const openingBalance = Number(obRows?.rows?.[0]?.[0]) || 0;
      const totalDebit = rows.reduce((s, r) => s + (Number(r.debit) || 0), 0);
      const totalCredit = rows.reduce((s, r) => s + (Number(r.credit) || 0), 0);
      const closingBalance = openingBalance + totalDebit - totalCredit;

      return {
        success: true,
        group_name: groupName,
        rows,
        opening_balance: openingBalance,
        total_debit: totalDebit,
        total_credit: totalCredit,
        closing_balance: closingBalance,
      };
    } catch (err) {
      console.error('group-vouchers error:', err);
      return { success: false, error: err.message };
    }
  },
};
