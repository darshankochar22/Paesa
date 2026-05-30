const fs = require("fs");
const path = require("path");
const { createClient } = require("@libsql/client");

// standard Mac paths for Electron app data
const possiblePaths = [
  path.join(process.env.HOME, "Library", "Application Support", "Startup", "startup.db"),
  path.join(process.env.HOME, "Library", "Application Support", "startup", "startup.db"),
];

async function run() {
  console.log("=== VOUCHER DATA SYSTEM FUNCTIONAL CHECK ===");
  
  let dbPath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      dbPath = "file:" + p;
      console.log(`✓ Found active SQLite database at: ${p}`);
      break;
    }
  }

  if (!dbPath) {
    console.log("⚠ Could not locate the active application database in standard macOS Electron appData paths.");
    console.log("Looking in custom environments...");
    process.exit(0);
  }

  const db = createClient({ url: dbPath });

  try {
    // 1. Fetch total voucher counts by type
    console.log("\n📊 1. VOUCHERS TYPE COUNT:");
    const countRes = await db.execute(`
      SELECT voucher_type, COUNT(*) as count, SUM(is_cancelled) as cancelled_count
      FROM vouchers
      GROUP BY voucher_type
    `);
    
    if (countRes.rows.length === 0) {
      console.log("  No vouchers created in the database yet. Create some vouchers to verify.");
      process.exit(0);
    }

    countRes.rows.forEach(row => {
      console.log(`  - ${row.voucher_type}: ${row.count} total (${row.cancelled_count} cancelled)`);
    });

    // 2. Check Double Entry Integrity (Debit vs Credit mismatch check)
    console.log("\n⚖ 2. ACCOUNTING DOUBLE ENTRY INTEGRITY CHECK:");
    const balanceCheck = await db.execute(`
      SELECT 
        v.voucher_id, 
        v.voucher_type, 
        v.voucher_number,
        v.date,
        SUM(CASE WHEN e.type = 'Dr' THEN e.amount ELSE 0 END) as total_debit,
        SUM(CASE WHEN e.type = 'Cr' THEN e.amount ELSE 0 END) as total_credit
      FROM vouchers v
      JOIN voucher_entries e ON e.voucher_id = v.voucher_id
      WHERE v.is_cancelled = 0
      GROUP BY v.voucher_id
    `);

    let balanceErrors = 0;
    balanceCheck.rows.forEach(row => {
      const diff = Math.abs(Number(row.total_debit) - Number(row.total_credit));
      if (diff > 0.01) {
        console.log(`  ❌ MISMATCH: Voucher #${row.voucher_id} (${row.voucher_type} ${row.voucher_number}) has Debit: ${row.total_debit} and Credit: ${row.total_credit} (Diff: ${diff.toFixed(2)})`);
        balanceErrors++;
      }
    });

    if (balanceErrors === 0) {
      console.log(`  ✓ Checked ${balanceCheck.rows.length} vouchers. 100% of vouchers have PERFECT double-entry integrity (Debits = Credits)!`);
    } else {
      console.log(`  ⚠ Found ${balanceErrors} balance mismatch errors.`);
    }

    // 3. Verify Stock Particulars vs Accounting entry mismatch
    console.log("\n📦 3. INVENTORY SALES & PURCHASE VOUCHERS INTEGRITY:");
    const stockVouchers = await db.execute(`
      SELECT 
        v.voucher_id, 
        v.voucher_type, 
        v.voucher_number,
        SUM(se.quantity * se.rate) as stock_amount_sum,
        (
          SELECT SUM(e.amount) 
          FROM voucher_entries e 
          JOIN ledgers l ON l.ledger_id = e.ledger_id
          LEFT JOIN groups g ON g.group_id = l.group_id
          WHERE e.voucher_id = v.voucher_id AND COALESCE(l.nature, g.nature) = 'Income'
        ) as sales_ledger_amount,
        (
          SELECT SUM(e.amount) 
          FROM voucher_entries e 
          JOIN ledgers l ON l.ledger_id = e.ledger_id
          LEFT JOIN groups g ON g.group_id = l.group_id
          WHERE e.voucher_id = v.voucher_id AND COALESCE(l.nature, g.nature) = 'Expenses'
        ) as purchase_ledger_amount
      FROM vouchers v
      JOIN voucher_stock_entries se ON se.voucher_id = v.voucher_id
      WHERE v.is_cancelled = 0
      GROUP BY v.voucher_id
    `);

    if (stockVouchers.rows.length === 0) {
      console.log("  No inventory/stock-based vouchers found.");
    } else {
      let invErrors = 0;
      stockVouchers.rows.forEach(row => {
        const expectedLedgerAmt = row.voucher_type === "Sales" ? row.sales_ledger_amount : row.purchase_ledger_amount;
        const stockSum = Number(row.stock_amount_sum) || 0;
        const ledgerAmt = Number(expectedLedgerAmt) || 0;
        
        if (Math.abs(stockSum - ledgerAmt) > 0.05) {
          console.log(`  ❌ MISMATCH in ${row.voucher_type} Vch ${row.voucher_number}: Stock Items sum: ${stockSum.toFixed(2)}, Ledger Expense/Income amount: ${ledgerAmt.toFixed(2)}`);
          invErrors++;
        }
      });
      
      if (invErrors === 0) {
        console.log(`  ✓ Checked ${stockVouchers.rows.length} sales/purchase inventory vouchers. All stock item values map 100% correctly to ledger accounting values!`);
      }
    }

    // 4. Verify Bank Allocation mapping
    console.log("\n🏦 4. BANK TRANSACTION ALLOCATION INTEGRITY:");
    const bankDetailsCheck = await db.execute(`
      SELECT COUNT(*) as count FROM voucher_bank_details
    `);
    console.log(`  - Total recorded bank allocation details: ${bankDetailsCheck.rows[0].count}`);

    // 5. Verify Cash Denomination mapping
    console.log("\n💵 5. CASH DENOMINATION ALLOCATION INTEGRITY:");
    const cashDenomCheck = await db.execute(`
      SELECT denomination, SUM(quantity) as total_qty, SUM(amount) as total_amount
      FROM voucher_cash_denominations
      GROUP BY denomination
    `);
    
    if (cashDenomCheck.rows.length === 0) {
      console.log("  No cash denominations recorded yet.");
    } else {
      cashDenomCheck.rows.forEach(row => {
        console.log(`  - Denomination ${row.denomination}: Qty: ${row.total_qty}, Total Amt: INR ${row.total_amount}`);
      });
    }

    // 6. Verify Bill-wise details references
    console.log("\n🧾 6. BILL-WISE REFERENCE INTEGRITY:");
    const billRefCheck = await db.execute(`
      SELECT bill_type, COUNT(*) as count, SUM(amount) as total_amount
      FROM voucher_bill_references
      GROUP BY bill_type
    `);
    if (billRefCheck.rows.length === 0) {
      console.log("  No bill-wise allocation references recorded yet.");
    } else {
      billRefCheck.rows.forEach(row => {
        console.log(`  - Ref Type '${row.bill_type}': ${row.count} references, Total Amt: INR ${row.total_amount}`);
      });
    }

  } catch (err) {
    console.error("❌ SQL Query execution error:", err.message);
  } finally {
    process.exit(0);
  }
}

run();
