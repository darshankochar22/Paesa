const { db } = require('../db/index');
const { sql } = require('drizzle-orm');
const { ledgers, groups, voucherBillReferences, vouchers, voucherEntries, financialYears } = require('../db/schema');

const dayDiff = (fromDate, toDate) => {
  if (!fromDate) return 0;
  const a = new Date(fromDate);
  const b = new Date(toDate);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
};

const getDatesRange = (startStr, endStr) => {
  const dates = [];
  let curr = new Date(startStr);
  const end = new Date(endStr);
  curr.setHours(12, 0, 0, 0);
  end.setHours(12, 0, 0, 0);
  
  while (curr <= end) {
    dates.push(curr.toISOString().slice(0, 10));
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
};

const calculateInterest = (amount, rate, days, style) => {
  if (!rate || !days || days <= 0) return 0;
  const amt = Math.abs(amount);
  if (style === '30-Day Month') {
    return amt * (rate / 100) * (days / 30);
  } else if (style === 'Calendar Month') {
    return amt * (rate / 100) * (days / 30.4167);
  } else if (style === 'Calendar Year') {
    return amt * (rate / 100) * (days / 365.25);
  } else { // 365-Day Year
    return amt * (rate / 100) * (days / 365);
  }
};

const getLedgerIdsInGroupRecursive = async (company_id, group_name) => {
  const rows = await db.all(sql`
    WITH RECURSIVE sub_groups AS (
      SELECT group_id FROM ${groups} WHERE name = ${group_name} AND company_id = ${company_id}
      UNION ALL
      SELECT g.group_id FROM ${groups} g
      INNER JOIN sub_groups sg ON g.parent_group_id = sg.group_id
      WHERE g.company_id = ${company_id}
    )
    SELECT l.ledger_id, l.name, l.interest_rate, l.interest_style, l.interest_balances, l.activate_interest, l.is_bill_wise
    FROM ${ledgers} l
    WHERE l.group_id IN (SELECT group_id FROM sub_groups) AND l.company_id = ${company_id}
  `);
  return rows;
};

const isCreditorLedger = async (company_id, ledger_id) => {
  const rows = await db.all(sql`
    WITH RECURSIVE sub_groups AS (
      SELECT group_id FROM ${groups} WHERE name = 'Sundry Creditors' AND company_id = ${company_id}
      UNION ALL
      SELECT g.group_id FROM ${groups} g
      INNER JOIN sub_groups sg ON g.parent_group_id = sg.group_id
      WHERE g.company_id = ${company_id}
    )
    SELECT l.ledger_id
    FROM ${ledgers} l
    WHERE l.ledger_id = ${ledger_id} AND l.group_id IN (SELECT group_id FROM sub_groups)
  `);
  return rows.length > 0;
};

const buildInterestOutstanding = async (company_id, fy_id, group_name, toDate) => {
  const ledgersInGroup = await getLedgerIdsInGroupRecursive(company_id, group_name);
  if (ledgersInGroup.length === 0) {
    return { rows: [], total_principal: 0, total_interest: 0 };
  }
  
  const activeInterestLedgers = ledgersInGroup.filter(l => Number(l.activate_interest) === 1 || Number(l.interest_rate) > 0);
  if (activeInterestLedgers.length === 0) {
    return { rows: [], total_principal: 0, total_interest: 0 };
  }
  
  const ledgerIds = activeInterestLedgers.map(l => l.ledger_id);
  
  const billRows = await db.all(sql`
    SELECT
      l.ledger_id              AS ledger_id,
      l.name                   AS party_name,
      l.interest_rate,
      l.interest_style,
      l.interest_balances,
      l.activate_interest,
      vbr.bill_name            AS bill_name,
      COALESCE(MAX(CASE WHEN vbr.bill_type IN ('New Ref', 'Advance') THEN v.date ELSE NULL END), MAX(v.date)) AS bill_date,
      MAX(CASE WHEN vbr.bill_type IN ('New Ref', 'Advance') THEN vbr.due_date ELSE NULL END) AS due_date,
      MAX(CASE WHEN vbr.bill_type IN ('New Ref', 'Advance') THEN vbr.credit_period ELSE NULL END) AS credit_period,
      SUM(CASE WHEN vbr.bill_type IN ('New Ref', 'Advance') THEN vbr.amount ELSE -vbr.amount END) AS total_amount
    FROM ${voucherBillReferences} vbr
    JOIN ${vouchers} v ON v.voucher_id = vbr.voucher_id
    JOIN ${ledgers} l  ON l.ledger_id = vbr.ledger_id
    WHERE v.company_id = ${company_id}
      AND v.fy_id = ${fy_id}
      AND v.is_cancelled = 0
      AND COALESCE(v.is_optional, 0) = 0
      AND COALESCE(v.is_post_dated, 0) = 0
      AND vbr.bill_type IN ('New Ref', 'Advance', 'Agst Ref')
      AND vbr.ledger_id IN (${sql.join(ledgerIds, sql`, `)})
      AND v.date <= ${toDate}
    GROUP BY l.ledger_id, l.name, vbr.bill_name
    HAVING ABS(total_amount) > 0.01
    ORDER BY l.name ASC, MAX(v.date) DESC
  `);
  
  const resultRows = [];
  let totalPrincipal = 0;
  let totalInterest = 0;
  
  for (const row of billRows) {
    const balance = Number(row.total_amount) || 0;
    const startPoint = row.due_date || row.bill_date;
    const days = startPoint ? Math.max(0, dayDiff(startPoint, toDate)) : 0;
    
    const rate = Number(row.interest_rate) || 0;
    const style = row.interest_style || '365-Day Year';
    const balStyle = row.interest_balances || 'All Balances';
    
    const isCreditorGroup = (group_name === 'Sundry Creditors');
    const isDebit = isCreditorGroup ? (balance < 0) : (balance > 0);
    const matchBal = (balStyle === 'All Balances') ||
                     (balStyle === 'Debit Balances Only' && isDebit) ||
                     (balStyle === 'Credit Balances Only' && !isDebit);
                     
    let interestAmount = 0;
    if (rate > 0 && days > 0 && matchBal) {
      interestAmount = calculateInterest(balance, rate, days, style);
    }
    
    totalPrincipal += balance;
    totalInterest += interestAmount;
    
    resultRows.push({
      ledger_id: row.ledger_id,
      party_ledger: row.party_name,
      bill_ref: row.bill_name,
      bill_due_date: startPoint,
      total_pending: balance,
      interest_rate: rate,
      interest_style: style,
      days,
      interest_amount: interestAmount,
      "0_30": days <= 30 ? balance : 0,
      "31_60": (days > 30 && days <= 60) ? balance : 0,
      "60": days > 60 ? balance : 0,
    });
  }
  
  return { rows: resultRows, total_principal: totalPrincipal, total_interest: totalInterest };
};

module.exports = {
  interestReceivable: async (company_id, fy_id, params = {}) => {
    try {
      const fyRows = await db.all(sql`SELECT end_date FROM ${financialYears} WHERE fy_id = ${fy_id}`);
      const defaultToDate = fyRows?.[0]?.end_date || new Date().toISOString().slice(0, 10);
      const toDate = params.to_date || params.as_on_date || defaultToDate;
      
      const { rows, total_principal, total_interest } = await buildInterestOutstanding(company_id, fy_id, 'Sundry Debtors', toDate);
      return { success: true, rows, total_principal, total_interest, to_date: toDate };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  interestPayable: async (company_id, fy_id, params = {}) => {
    try {
      const fyRows = await db.all(sql`SELECT end_date FROM ${financialYears} WHERE fy_id = ${fy_id}`);
      const defaultToDate = fyRows?.[0]?.end_date || new Date().toISOString().slice(0, 10);
      const toDate = params.to_date || params.as_on_date || defaultToDate;
      
      const { rows, total_principal, total_interest } = await buildInterestOutstanding(company_id, fy_id, 'Sundry Creditors', toDate);
      return { success: true, rows, total_principal, total_interest, to_date: toDate };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  ledgerInterest: async (company_id, fy_id, params = {}) => {
    try {
      let ledgerId = null;
      if (typeof params === 'object' && params !== null) {
        ledgerId = Number(params.ledger_id || params.ledgerId);
      } else if (params) {
        ledgerId = Number(params);
      }
      if (!ledgerId) {
        const allLedgers = await db.all(sql`
          SELECT ledger_id, name, interest_rate, interest_style, interest_balances, activate_interest
          FROM ${ledgers}
          WHERE company_id = ${company_id} AND is_active = 1
          ORDER BY name ASC
        `);
        return { success: true, picker_mode: true, ledgers: allLedgers };
      }

      const ledgerRows = await db.all(sql`SELECT * FROM ${ledgers} WHERE ledger_id = ${ledgerId} AND company_id = ${company_id}`);
      if (ledgerRows.length === 0) return { success: false, error: 'Ledger not found' };
      const ledger = ledgerRows[0];

      const fyRows = await db.all(sql`SELECT start_date, end_date FROM ${financialYears} WHERE fy_id = ${fy_id}`);
      const fyStart = fyRows?.[0]?.start_date || '2026-04-01';
      const fyEnd = fyRows?.[0]?.end_date || '2027-03-31';

      const fromDate = params.from_date || fyStart;
      const toDate = params.to_date || params.as_on_date || fyEnd;

      const rawOpening = Number(ledger.opening_balance) || 0;
      const effectiveOpening = rawOpening < 0
        ? rawOpening
        : (ledger.opening_balance_type === 'Cr' ? -rawOpening : rawOpening);

      const priorEntries = await db.all(sql`
        SELECT e.type, e.amount
        FROM ${voucherEntries} e
        INNER JOIN ${vouchers} v ON v.voucher_id = e.voucher_id
        WHERE e.ledger_id = ${ledgerId}
          AND v.company_id = ${company_id}
          AND v.fy_id = ${fy_id}
          AND v.is_cancelled = 0
          AND COALESCE(v.is_optional, 0) = 0
          AND COALESCE(v.is_post_dated, 0) = 0
          AND v.date < ${fromDate}
      `);
      let priorSum = 0;
      for (const entry of priorEntries) {
        priorSum += entry.type === 'Dr' ? entry.amount : -entry.amount;
      }
      const openingBalance = effectiveOpening + priorSum;

      const entries = await db.all(sql`
        SELECT e.amount, e.type, v.date, v.voucher_type, v.voucher_number, v.narration
        FROM ${voucherEntries} e
        INNER JOIN ${vouchers} v ON v.voucher_id = e.voucher_id
        WHERE e.ledger_id = ${ledgerId}
          AND v.company_id = ${company_id}
          AND v.fy_id = ${fy_id}
          AND v.is_cancelled = 0
          AND COALESCE(v.is_optional, 0) = 0
          AND COALESCE(v.is_post_dated, 0) = 0
          AND v.date >= ${fromDate}
          AND v.date <= ${toDate}
        ORDER BY v.date ASC, e.entry_id ASC
      `);

      const daysList = getDatesRange(fromDate, toDate);
      let runningBal = openingBalance;

      const entriesByDate = {};
      for (const entry of entries) {
        if (!entriesByDate[entry.date]) {
          entriesByDate[entry.date] = [];
        }
        entriesByDate[entry.date].push(entry);
      }

      const dailyData = [];
      for (const day of daysList) {
        const dayEntries = entriesByDate[day] || [];
        let dayTxSum = 0;
        for (const entry of dayEntries) {
          dayTxSum += entry.type === 'Dr' ? entry.amount : -entry.amount;
        }
        runningBal += dayTxSum;

        const rate = Number(ledger.interest_rate) || 0;
        const style = ledger.interest_style || '365-Day Year';
        const balStyle = ledger.interest_balances || 'All Balances';

        const isDebit = runningBal > 0;
        const matchBal = (balStyle === 'All Balances') ||
                         (balStyle === 'Debit Balances Only' && isDebit) ||
                         (balStyle === 'Credit Balances Only' && !isDebit);

        let interest = 0;
        if (rate > 0 && matchBal && Math.abs(runningBal) > 0.01) {
          const amt = Math.abs(runningBal);
          let denominator = 365;
          if (style === '30-Day Month') denominator = 30;
          else if (style === 'Calendar Month') denominator = 30.4167;
          else if (style === 'Calendar Year') denominator = 365.25;

          interest = amt * (rate / 100) * (1 / denominator);
        }

        dailyData.push({
          date: day,
          balance: runningBal,
          interest,
          rate,
          style,
          entries: dayEntries,
        });
      }

      const intervals = [];
      if (dailyData.length > 0) {
        let startDay = dailyData[0];
        let prevDay = dailyData[0];
        let intervalInterest = startDay.interest;

        for (let i = 1; i < dailyData.length; i++) {
          const day = dailyData[i];
          const sameBal = Math.abs(day.balance - startDay.balance) < 0.01;
          const sameRate = day.rate === startDay.rate;
          const noNewEntries = day.entries.length === 0;

          if (sameBal && sameRate && noNewEntries) {
            prevDay = day;
            intervalInterest += day.interest;
          } else {
            const daysCount = dayDiff(startDay.date, prevDay.date) + 1;
            intervals.push({
              startDate: startDay.date,
              endDate: prevDay.date,
              balance: startDay.balance,
              rate: startDay.rate,
              style: startDay.style,
              days: daysCount,
              interest: intervalInterest,
              entries: startDay.entries,
            });
            startDay = day;
            prevDay = day;
            intervalInterest = day.interest;
          }
        }

        const daysCount = dayDiff(startDay.date, prevDay.date) + 1;
        intervals.push({
          startDate: startDay.date,
          endDate: prevDay.date,
          balance: startDay.balance,
          rate: startDay.rate,
          style: startDay.style,
          days: daysCount,
          interest: intervalInterest,
          entries: startDay.entries,
        });
      }

      const rows = intervals.map(inter => ({
        date_particulars: `${inter.startDate} to ${inter.endDate}`,
        vch_type: inter.style,
        vch_no: `${inter.days} days`,
        debit: inter.balance >= 0 ? inter.balance : 0,
        credit: inter.balance < 0 ? Math.abs(inter.balance) : 0,
        balance: inter.balance,
        start_date: inter.startDate,
        end_date: inter.endDate,
        rate: inter.rate,
        interest: inter.interest,
        days: inter.days,
      }));

      const totalInterest = intervals.reduce((s, inter) => s + inter.interest, 0);

      return {
        success: true,
        ledger,
        fromDate,
        toDate,
        opening_balance: openingBalance,
        rows,
        total_interest: totalInterest,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  billWiseInterest: async (company_id, fy_id, params = {}) => {
    try {
      let ledgerId = null;
      if (typeof params === 'object' && params !== null) {
        ledgerId = Number(params.ledger_id || params.ledgerId);
      } else if (params) {
        ledgerId = Number(params);
      }
      if (!ledgerId) {
        const allLedgers = await db.all(sql`
          SELECT ledger_id, name, interest_rate, interest_style, interest_balances, activate_interest
          FROM ${ledgers}
          WHERE company_id = ${company_id} AND is_active = 1
          ORDER BY name ASC
        `);
        return { success: true, picker_mode: true, ledgers: allLedgers };
      }

      const ledgerRows = await db.all(sql`SELECT * FROM ${ledgers} WHERE ledger_id = ${ledgerId} AND company_id = ${company_id}`);
      if (ledgerRows.length === 0) return { success: false, error: 'Ledger not found' };
      const ledger = ledgerRows[0];

      const fyRows = await db.all(sql`SELECT start_date, end_date FROM ${financialYears} WHERE fy_id = ${fy_id}`);
      const defaultToDate = fyRows?.[0]?.end_date || new Date().toISOString().slice(0, 10);
      const toDate = params.to_date || params.as_on_date || defaultToDate;

      const billRows = await db.all(sql`
        SELECT
          vbr.bill_name            AS bill_name,
          COALESCE(MAX(CASE WHEN vbr.bill_type IN ('New Ref', 'Advance') THEN v.date ELSE NULL END), MAX(v.date)) AS bill_date,
          MAX(CASE WHEN vbr.bill_type IN ('New Ref', 'Advance') THEN vbr.due_date ELSE NULL END) AS due_date,
          MAX(CASE WHEN vbr.bill_type IN ('New Ref', 'Advance') THEN vbr.credit_period ELSE NULL END) AS credit_period,
          SUM(CASE WHEN vbr.bill_type IN ('New Ref', 'Advance') THEN vbr.amount ELSE -vbr.amount END) AS total_amount
        FROM ${voucherBillReferences} vbr
        JOIN ${vouchers} v ON v.voucher_id = vbr.voucher_id
        WHERE v.company_id = ${company_id}
          AND v.fy_id = ${fy_id}
          AND v.is_cancelled = 0
          AND COALESCE(v.is_optional, 0) = 0
          AND COALESCE(v.is_post_dated, 0) = 0
          AND vbr.bill_type IN ('New Ref', 'Advance', 'Agst Ref')
          AND vbr.ledger_id = ${ledgerId}
          AND v.date <= ${toDate}
        GROUP BY vbr.bill_name
        HAVING ABS(total_amount) > 0.01
        ORDER BY MAX(v.date) DESC
      `);

      const isCreditor = await isCreditorLedger(company_id, ledgerId);
      const resultRows = [];
      let totalPrincipal = 0;
      let totalInterest = 0;

      for (const row of billRows) {
        const balance = Number(row.total_amount) || 0;
        const startPoint = row.due_date || row.bill_date;
        const days = startPoint ? Math.max(0, dayDiff(startPoint, toDate)) : 0;

        const rate = Number(ledger.interest_rate) || 0;
        const style = ledger.interest_style || '365-Day Year';
        const balStyle = ledger.interest_balances || 'All Balances';

        const isDebit = isCreditor ? (balance < 0) : (balance > 0);
        const matchBal = (balStyle === 'All Balances') ||
                         (balStyle === 'Debit Balances Only' && isDebit) ||
                         (balStyle === 'Credit Balances Only' && !isDebit);

        let interestAmount = 0;
        if (rate > 0 && days > 0 && matchBal) {
          interestAmount = calculateInterest(balance, rate, days, style);
        }

        totalPrincipal += balance;
        totalInterest += interestAmount;

        resultRows.push({
          party_ledger: ledger.name,
          bill_ref: row.bill_name,
          bill_due_date: startPoint,
          total_pending: balance,
          interest_rate: rate,
          interest_style: style,
          days,
          interest_amount: interestAmount,
          "0_30": days <= 30 ? balance : 0,
          "31_60": (days > 30 && days <= 60) ? balance : 0,
          "60": days > 60 ? balance : 0,
        });
      }

      return {
        success: true,
        ledger,
        rows: resultRows,
        total_principal: totalPrincipal,
        total_interest: totalInterest,
        to_date: toDate,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
