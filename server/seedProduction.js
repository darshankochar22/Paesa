#!/usr/bin/env node
// Comprehensive seed script — populates the database with realistic Indian
// accounting data for all 586 reports.
//
// Usage:
//   1. Start the app first:  npm start
//   2. Then in another terminal:  node server/seedProduction.js
//
// Or seed a specific DB file:
//   STARTUP_DB_PATH=/tmp/test.db node server/seedProduction.js

const path = require('path');
const os = require('os');

// Determine DB path
let dbPath;
if (process.env.STARTUP_DB_PATH) {
  dbPath = process.env.STARTUP_DB_PATH;
} else {
  // Default Electron userData paths
  const appName = 'startup';
  const userDataDir = path.join(os.homedir(), 'Library', 'Application Support', appName);
  dbPath = path.join(userDataDir, 'startup.db');
}

process.env.STARTUP_DB_PATH = dbPath;
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

console.log(`Seeding database at: ${dbPath}`);

const { initDB, db } = require('./db/index');
const { sql } = require('drizzle-orm');
const s = require('./db/schema');

async function seed() {
  await initDB();
  console.log('Schema initialized.');

  // ── 1. Company ──────────────────────────────────────────────────────────────
  let company;
  const existing = await db.all(sql`SELECT company_id FROM companies LIMIT 1`);
  if (existing.length > 0) {
    company = { company_id: existing[0].company_id };
    console.log(`Using existing company: ${company.company_id}`);
  } else {
    await db.insert(s.companies).values({
      companyId: 1,
      name: 'Sharma & Sons Pvt Ltd',
      mailingName: 'Sharma & Sons',
      address1: '42 Mahatma Gandhi Road',
      address2: 'Andheri West',
      state: 'Maharashtra',
      country: 'India',
      pincode: '400053',
      telephone: '022-26345678',
      mobile: '9876543210',
      email: 'info@sharmas.com',
      website: 'www.sharmas.com',
      baseCurrencySymbol: '₹',
      formalName: 'INR',
      financialYearBeginningFrom: '2025-04-01',
      booksBeginningFrom: '2025-04-01',
    });
    company = { company_id: 1 };
    console.log('Created company: Sharma & Sons Pvt Ltd');
  }
  const cid = company.company_id;

  // ── 2. Financial Year ───────────────────────────────────────────────────────
  const fyExists = await db.all(sql`SELECT fy_id FROM financial_years WHERE company_id = ${cid} LIMIT 1`);
  let fyId;
  if (fyExists.length > 0) {
    fyId = fyExists[0].fy_id;
  } else {
    await db.insert(s.financialYears).values({
      fyId: 1, companyId: cid, startDate: '2025-04-01', endDate: '2026-03-31',
      isActive: 1, isClosed: 0,
    });
    fyId = 1;
  }
  console.log(`Using FY: ${fyId}`);

  // ── 3. Groups (Tally-standard primary groups) ───────────────────────────────
  const groups = [
    [1, 'Capital Account', null, 'Liabilities', 1],
    [2, 'Current Assets', null, 'Assets', 1],
    [3, 'Current Liabilities', null, 'Liabilities', 1],
    [4, 'Direct Expenses', null, 'Expenses', 0],
    [5, 'Direct Incomes', null, 'Income', 0],
    [6, 'Fixed Assets', null, 'Assets', 1],
    [7, 'Indirect Expenses', null, 'Expenses', 0],
    [8, 'Indirect Incomes', null, 'Income', 0],
    [9, 'Investments', null, 'Assets', 1],
    [10, 'Loans (Liability)', null, 'Liabilities', 1],
    [11, 'Suspense Account', null, 'Liabilities', 0],
    [12, 'Bank Accounts', 2, 'Assets', 1],
    [13, 'Cash-in-Hand', 2, 'Assets', 1],
    [14, 'Sundry Debtors', 2, 'Assets', 1],
    [15, 'Sundry Creditors', 3, 'Liabilities', 1],
    [16, 'Sales Accounts', 5, 'Income', 0],
    [17, 'Purchase Accounts', 4, 'Expenses', 0],
    [18, 'Duties & Taxes', 3, 'Liabilities', 1],
    [19, 'Provisions', 3, 'Liabilities', 0],
    [20, 'Salary & Wages', 7, 'Expenses', 0],
    [21, 'Branch / Divisions', null, 'Liabilities', 0],
    [22, 'Deposits (Asset)', 2, 'Assets', 1],
    [23, 'Loans & Advances (Asset)', 2, 'Assets', 1],
    [24, 'Stock-in-Hand', 2, 'Assets', 1],
  ];
  for (const [gid, name, parent, nature, pri] of groups) {
    await db.insert(s.groups).values({
      groupId: gid, companyId: cid, name, parentGroupId: parent,
      nature, isPrimary: pri, isActive: 1,
    }).onConflictDoNothing();
  }
  console.log('Created 24 groups.');

  // ── 4. Ledgers ──────────────────────────────────────────────────────────────
  const ledgers = [
    // Cash & Bank
    [1, 13, 'Cash', 250000, 'Cash'],
    [2, 12, 'HDFC Bank - Current A/c', 850000, 'Bank'],
    [3, 12, 'SBI Bank - Savings A/c', 450000, 'Bank'],
    [4, 12, 'ICICI Bank - OD A/c', -200000, 'Bank'],
    // Sundry Debtors (customers)
    [10, 14, 'Rajesh Traders', 45000, null],
    [11, 14, 'Priya Enterprises', 78000, null],
    [12, 14, 'Kumar & Co', 32000, null],
    [13, 14, 'Gupta Industries', 95000, null],
    [14, 14, 'Mehta Bros', 28000, null],
    [15, 14, 'Patel Trading Co', 62000, null],
    // Sundry Creditors (suppliers)
    [20, 15, 'Tata Steel Ltd', -120000, null],
    [21, 15, 'Reliance Industries', -85000, null],
    [22, 15, 'Adani Suppliers', -65000, null],
    [23, 15, 'JSW Materials', -45000, null],
    [24, 15, 'Hindalco Ltd', -38000, null],
    // Sales
    [30, 16, 'Sales - Domestic', 0, null],
    [31, 16, 'Sales - Export', 0, null],
    [32, 16, 'Sales - Inter-State', 0, null],
    // Purchase
    [40, 17, 'Purchase - Raw Material', 0, null],
    [41, 17, 'Purchase - Finished Goods', 0, null],
    [42, 17, 'Purchase - Packing Material', 0, null],
    // Fixed Assets
    [50, 6, 'Furniture & Fixtures', 350000, null],
    [51, 6, 'Computer Equipment', 280000, null],
    [52, 6, 'Plant & Machinery', 1200000, null],
    [53, 6, 'Office Equipment', 150000, null],
    [54, 6, 'Motor Vehicle', 800000, null],
    // Indirect Expenses
    [60, 7, 'Rent Expense', 0, null],
    [61, 7, 'Electricity & Water', 0, null],
    [62, 7, 'Telephone & Internet', 0, null],
    [63, 7, 'Traveling & Conveyance', 0, null],
    [64, 7, 'Printing & Stationery', 0, null],
    [65, 7, 'Insurance Expense', 0, null],
    [66, 7, 'Repair & Maintenance', 0, null],
    [67, 7, 'Advertisement & Publicity', 0, null],
    [68, 7, 'Professional Fees', 0, null],
    [69, 7, 'Bank Charges', 0, null],
    // Indirect Incomes
    [70, 8, 'Interest Received', 0, null],
    [71, 8, 'Discount Received', 0, null],
    [72, 8, 'Commission Income', 0, null],
    [73, 8, 'Other Income', 0, null],
    // Direct Expenses
    [80, 4, 'Freight Inward', 0, null],
    [81, 4, 'Wages', 0, null],
    [82, 4, 'Manufacturing Expenses', 0, null],
    // Capital & Loans
    [90, 1, 'Owner Capital', -2500000, null],
    [91, 1, 'Reserves & Surplus', -500000, null],
    [92, 10, 'HDFC Term Loan', -800000, null],
    [93, 10, 'SBI Working Capital Loan', -350000, null],
    // Duties & Taxes
    [100, 18, 'CGST Payable', 0, null],
    [101, 18, 'SGST Payable', 0, null],
    [102, 18, 'IGST Payable', 0, null],
    [103, 18, 'TDS Payable', 0, null],
    [104, 18, 'TCS Payable', 0, null],
    [105, 18, 'Professional Tax Payable', 0, null],
    // Salary
    [110, 20, 'Staff Salary', 0, null],
    [111, 20, 'Director Remuneration', 0, null],
    [112, 20, 'PF Employer Contribution', 0, null],
    [113, 20, 'ESI Employer Contribution', 0, null],
    // Stock-in-Hand
    [120, 24, 'Opening Stock - Raw Material', 180000, null],
    [121, 24, 'Opening Stock - Finished Goods', 250000, null],
    // Deposits & Advances
    [130, 22, 'Security Deposit - Office', 75000, null],
    [131, 23, 'Advance to Suppliers', 45000, null],
    [132, 23, 'TDS Receivable', 12000, null],
  ];

  for (const [lid, gid, name, ob, type] of ledgers) {
    await db.insert(s.ledgers).values({
      ledgerId: lid, companyId: cid, groupId: gid, name,
      openingBalance: ob, isActive: 1, ledgerType: type || 'General',
      gstin: (lid >= 10 && lid <= 15) ? `27AABCR${lid}234A1Z${lid}` : null,
      state: (lid >= 10 && lid <= 15) ? 'Maharashtra' : null,
      pan: lid <= 50 ? `AABCS${String(lid).padStart(4, '0')}A` : null,
    }).onConflictDoNothing();
  }
  console.log(`Created ${ledgers.length} ledgers.`);

  // ── 5. Cost Centres ─────────────────────────────────────────────────────────
  const costCentres = [
    [1, 'Production Department', 'Primary', null],
    [2, 'Sales Department', 'Primary', null],
    [3, 'Administration', 'Primary', null],
    [4, 'R&D', 'Primary', null],
    [5, 'Mumbai Branch', 'Secondary', 2],
    [6, 'Pune Branch', 'Secondary', 2],
    [7, 'Project Alpha', 'Secondary', 1],
    [8, 'Project Beta', 'Secondary', 1],
  ];
  for (const [ccId, name, cat, parent] of costCentres) {
    await db.insert(s.costCentres).values({
      ccId, companyId: cid, name, category: cat, parentId: parent, isActive: 1,
    }).onConflictDoNothing();
  }
  console.log('Created 8 cost centres.');

  // ── 6. Stock Groups & Items ─────────────────────────────────────────────────
  await db.insert(s.stockGroups).values({ sgId: 1, companyId: cid, name: 'Raw Materials', isActive: 1, gstRate: 18 }).onConflictDoNothing();
  await db.insert(s.stockGroups).values({ sgId: 2, companyId: cid, name: 'Finished Goods', isActive: 1, gstRate: 18 }).onConflictDoNothing();
  await db.insert(s.stockGroups).values({ sgId: 3, companyId: cid, name: 'Packing Materials', isActive: 1, gstRate: 12 }).onConflictDoNothing();
  await db.insert(s.stockGroups).values({ sgId: 4, companyId: cid, name: 'Consumables', isActive: 1, gstRate: 18 }).onConflictDoNothing();

  const stockItems = [
    [1, 1, 'Steel Rod 10mm', 500, 450, 225000, '7214', 18],
    [2, 1, 'Copper Wire 2mm', 800, 320, 256000, '7408', 18],
    [3, 1, 'Aluminum Sheet 1mm', 300, 680, 204000, '7606', 18],
    [4, 1, 'Brass Fitting 25mm', 1200, 85, 102000, '7412', 18],
    [5, 2, 'Widget Type A', 2000, 180, 360000, '8481', 18],
    [6, 2, 'Widget Type B', 1500, 250, 375000, '8482', 18],
    [7, 2, 'Assembly Unit X', 150, 2800, 420000, '8483', 18],
    [8, 2, 'Assembly Unit Y', 80, 4500, 360000, '8484', 18],
    [9, 3, 'Cardboard Box Large', 5000, 35, 175000, '4819', 12],
    [10, 3, 'Plastic Wrap Roll', 2000, 95, 190000, '3920', 12],
    [11, 4, 'Lubricant Oil 5L', 200, 450, 90000, '2710', 18],
    [12, 4, 'Cleaning Solvent', 100, 280, 28000, '3814', 18],
  ];
  for (const [sid, gid, name, qty, rate, value, hsn, gst] of stockItems) {
    await db.insert(s.stockItems).values({
      itemId: sid, companyId: cid, name, groupId: gid,
      openingQuantity: qty, openingRate: rate, openingValue: value,
      gstRate: gst, hsnCode: hsn, isActive: 1,
      reorderLevel: qty * 0.2, reorderQuantity: qty * 0.5,
    }).onConflictDoNothing();
  }
  console.log(`Created ${stockItems.length} stock items.`);

  // ── 7. Godowns ──────────────────────────────────────────────────────────────
  await db.insert(s.godowns).values({ godownId: 1, companyId: cid, name: 'Main Warehouse - Mumbai', city: 'Mumbai', state: 'Maharashtra', isPrimary: 1, isActive: 1 }).onConflictDoNothing();
  await db.insert(s.godowns).values({ godownId: 2, companyId: cid, name: 'Retail Store - Bandra', city: 'Mumbai', state: 'Maharashtra', isActive: 1 }).onConflictDoNothing();
  await db.insert(s.godowns).values({ godownId: 3, companyId: cid, name: 'Factory Floor - Pune', city: 'Pune', state: 'Maharashtra', isActive: 1 }).onConflictDoNothing();
  console.log('Created 3 godowns.');

  // ── 8. Vouchers (comprehensive set) ─────────────────────────────────────────
  let vid = 1;
  let eid = 1;
  const vouchers = [];

  // Sales vouchers (15) — spread across months
  for (let i = 0; i < 15; i++) {
    const month = 4 + (i % 12);
    const day = 5 + (i * 2) % 25;
    const customer = [10, 11, 12, 13, 14, 15][i % 6];
    const amount = 35000 + i * 12000 + Math.floor(Math.random() * 15000);
    const vId = vid++;
    vouchers.push(vId);
    await db.insert(s.vouchers).values({
      voucherId: vId, companyId: cid, fyId, voucherType: 'Sales',
      voucherNumber: `S/${String(1001 + i)}`,
      date: `2025-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      partyLedgerId: customer, partyName: ledgers.find(l => l[0] === customer)?.[2],
      isCancelled: 0, isOptional: 0, isPostDated: 0, narration: `Sale invoice #${1001 + i}`,
      isInvoice: 1, placeOfSupply: 'Maharashtra', supplierInvoiceNo: null,
    });
    // Dr: Customer, Cr: Sales Domestic
    const salesLedger = i < 10 ? 30 : (i < 13 ? 31 : 32);
    await db.insert(s.voucherEntries).values({ entryId: eid++, voucherId: vId, ledgerId: customer, type: 'Dr', amount });
    await db.insert(s.voucherEntries).values({ entryId: eid++, voucherId: vId, ledgerId: salesLedger, type: 'Cr', amount });
    // Stock entries for sales
    const itemId = (i % 4) + 5; // Finished goods
    const qty = 50 + i * 10;
    const rate = stockItems.find(si => si[0] === itemId)?.[4] || 200;
    await db.insert(s.voucherStockEntries).values({
      stockEntryId: eid, voucherId: vId, stockItemId: itemId, godownId: (i % 2) + 1,
      quantity: qty, rate, amount: qty * rate, hsnCode: stockItems.find(si => si[0] === itemId)?.[6],
      gstRate: 18, isSource: 1, cgstAmount: qty * rate * 0.09, sgstAmount: qty * rate * 0.09,
    });
    eid++;
  }

  // Purchase vouchers (12)
  for (let i = 0; i < 12; i++) {
    const month = 4 + (i % 12);
    const day = 8 + (i * 3) % 20;
    const supplier = [20, 21, 22, 23, 24][i % 5];
    const amount = 28000 + i * 9500 + Math.floor(Math.random() * 12000);
    const vId = vid++;
    vouchers.push(vId);
    await db.insert(s.vouchers).values({
      voucherId: vId, companyId: cid, fyId, voucherType: 'Purchase',
      voucherNumber: `P/${String(2001 + i)}`,
      date: `2025-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      partyLedgerId: supplier, partyName: ledgers.find(l => l[0] === supplier)?.[2],
      isCancelled: 0, isOptional: 0, isPostDated: 0, narration: `Purchase bill #${2001 + i}`,
      isInvoice: 1, placeOfSupply: 'Maharashtra', supplierInvoiceNo: `INV-${supplier}-${i}`,
    });
    const purchaseLedger = i < 8 ? 40 : (i < 10 ? 41 : 42);
    await db.insert(s.voucherEntries).values({ entryId: eid++, voucherId: vId, ledgerId: purchaseLedger, type: 'Dr', amount });
    await db.insert(s.voucherEntries).values({ entryId: eid++, voucherId: vId, ledgerId: supplier, type: 'Cr', amount });
    // Stock entries for purchase
    const itemId = (i % 4) + 1; // Raw materials
    const qty = 100 + i * 20;
    const rate = stockItems.find(si => si[0] === itemId)?.[4] || 300;
    await db.insert(s.voucherStockEntries).values({
      stockEntryId: eid, voucherId: vId, stockItemId: itemId, godownId: (i % 3) + 1,
      quantity: qty, rate, amount: qty * rate, hsnCode: stockItems.find(si => si[0] === itemId)?.[6],
      gstRate: 18, isSource: 0, cgstAmount: qty * rate * 0.09, sgstAmount: qty * rate * 0.09,
    });
    eid++;
  }

  // Receipt vouchers (10)
  for (let i = 0; i < 10; i++) {
    const month = 5 + i;
    const customer = [10, 11, 12, 13, 14, 15][i % 6];
    const amount = 25000 + i * 18000;
    const vId = vid++;
    vouchers.push(vId);
    await db.insert(s.vouchers).values({
      voucherId: vId, companyId: cid, fyId, voucherType: 'Receipt',
      voucherNumber: `R/${String(3001 + i)}`,
      date: `2025-${String(month).padStart(2, '0')}-15`,
      partyLedgerId: customer, partyName: ledgers.find(l => l[0] === customer)?.[2],
      isCancelled: 0, isOptional: 0, isPostDated: 0, narration: `Receipt from ${ledgers.find(l => l[0] === customer)?.[2]}`,
    });
    await db.insert(s.voucherEntries).values({ entryId: eid++, voucherId: vId, ledgerId: 2, type: 'Dr', amount }); // HDFC Bank
    await db.insert(s.voucherEntries).values({ entryId: eid++, voucherId: vId, ledgerId: customer, type: 'Cr', amount });
  }

  // Payment vouchers (15) — various expense types
  const paymentTargets = [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 110, 111, 80, 81, 82];
  for (let i = 0; i < 15; i++) {
    const month = 4 + (i % 12);
    const amount = 8000 + i * 5500 + Math.floor(Math.random() * 8000);
    const vId = vid++;
    vouchers.push(vId);
    await db.insert(s.vouchers).values({
      voucherId: vId, companyId: cid, fyId, voucherType: 'Payment',
      voucherNumber: `V/${String(4001 + i)}`,
      date: `2025-${String(month).padStart(2, '0')}-20`,
      partyLedgerId: paymentTargets[i], partyName: ledgers.find(l => l[0] === paymentTargets[i])?.[2],
      isCancelled: 0, isOptional: 0, isPostDated: 0, narration: `Payment for ${ledgers.find(l => l[0] === paymentTargets[i])?.[2]}`,
    });
    const bankLedger = i % 3 === 0 ? 1 : (i % 3 === 1 ? 2 : 3);
    await db.insert(s.voucherEntries).values({ entryId: eid++, voucherId: vId, ledgerId: paymentTargets[i], type: 'Dr', amount });
    await db.insert(s.voucherEntries).values({ entryId: eid++, voucherId: vId, ledgerId: bankLedger, type: 'Cr', amount });
  }

  // Journal vouchers (8) — depreciation, provisions, adjustments
  for (let i = 0; i < 8; i++) {
    const month = 4 + i * 1.5;
    const vId = vid++;
    vouchers.push(vId);
    await db.insert(s.vouchers).values({
      voucherId: vId, companyId: cid, fyId, voucherType: 'Journal',
      voucherNumber: `J/${String(5001 + i)}`,
      date: `2025-${String(Math.min(12, Math.floor(month))).padStart(2, '0')}-28`,
      isCancelled: 0, isOptional: 0, isPostDated: 0, narration: `Journal entry #${5001 + i}`,
    });
    const drLedger = [65, 66, 68, 69, 70, 71, 72, 73][i];
    const crLedger = [100, 101, 102, 103, 104, 105, 91, 90][i];
    const amount = 5000 + i * 3000;
    await db.insert(s.voucherEntries).values({ entryId: eid++, voucherId: vId, ledgerId: drLedger, type: 'Dr', amount });
    await db.insert(s.voucherEntries).values({ entryId: eid++, voucherId: vId, ledgerId: crLedger, type: 'Cr', amount });
  }

  // Contra vouchers (5) — cash/bank transfers
  for (let i = 0; i < 5; i++) {
    const month = 5 + i;
    const vId = vid++;
    vouchers.push(vId);
    const amount = 50000 + i * 25000;
    await db.insert(s.vouchers).values({
      voucherId: vId, companyId: cid, fyId, voucherType: 'Contra',
      voucherNumber: `C/${String(6001 + i)}`,
      date: `2025-${String(month).padStart(2, '0')}-10`,
      isCancelled: 0, isOptional: 0, isPostDated: 0, narration: `Cash/Bank transfer #${6001 + i}`,
    });
    // Cash deposit to bank
    await db.insert(s.voucherEntries).values({ entryId: eid++, voucherId: vId, ledgerId: 2, type: 'Dr', amount });
    await db.insert(s.voucherEntries).values({ entryId: eid++, voucherId: vId, ledgerId: 1, type: 'Cr', amount });
  }

  // Debit Note vouchers (4)
  for (let i = 0; i < 4; i++) {
    const supplier = [20, 21, 22, 23][i];
    const vId = vid++;
    vouchers.push(vId);
    const amount = 3000 + i * 2500;
    await db.insert(s.vouchers).values({
      voucherId: vId, companyId: cid, fyId, voucherType: 'Debit Note',
      voucherNumber: `DN/${String(7001 + i)}`,
      date: `2025-${String(7 + i).padStart(2, '0')}-12`,
      partyLedgerId: supplier, partyName: ledgers.find(l => l[0] === supplier)?.[2],
      isCancelled: 0, isOptional: 0, isPostDated: 0, narration: `Debit note to ${ledgers.find(l => l[0] === supplier)?.[2]}`,
    });
    await db.insert(s.voucherEntries).values({ entryId: eid++, voucherId: vId, ledgerId: supplier, type: 'Dr', amount });
    await db.insert(s.voucherEntries).values({ entryId: eid++, voucherId: vId, ledgerId: 40, type: 'Cr', amount });
  }

  // Credit Note vouchers (4)
  for (let i = 0; i < 4; i++) {
    const customer = [10, 11, 12, 13][i];
    const vId = vid++;
    vouchers.push(vId);
    const amount = 2500 + i * 2000;
    await db.insert(s.vouchers).values({
      voucherId: vId, companyId: cid, fyId, voucherType: 'Credit Note',
      voucherNumber: `CN/${String(8001 + i)}`,
      date: `2025-${String(8 + i).padStart(2, '0')}-18`,
      partyLedgerId: customer, partyName: ledgers.find(l => l[0] === customer)?.[2],
      isCancelled: 0, isOptional: 0, isPostDated: 0, narration: `Credit note to ${ledgers.find(l => l[0] === customer)?.[2]}`,
    });
    await db.insert(s.voucherEntries).values({ entryId: eid++, voucherId: vId, ledgerId: 30, type: 'Dr', amount });
    await db.insert(s.voucherEntries).values({ entryId: eid++, voucherId: vId, ledgerId: customer, type: 'Cr', amount });
  }

  console.log(`Created ${vouchers.length} vouchers with entries.`);

  // ── 9. Bill References ──────────────────────────────────────────────────────
  let bid = 1;
  for (let v = 1; v <= 27; v++) { // Sales + Purchase vouchers
    const lid = v <= 15 ? [10, 11, 12, 13, 14, 15][(v - 1) % 6] : [20, 21, 22, 23, 24][(v - 16) % 5];
    const bt = v <= 15 ? 'New Ref' : 'New Ref';
    const dp = `2025-${String(4 + Math.floor((v - 1) / 2)).padStart(2, '0')}`;
    await db.insert(s.voucherBillReferences).values({
      billId: bid++, voucherId: v, ledgerId: lid, billName: `BILL-${v}`,
      billType: bt, amount: 5000 + v * 8000, creditPeriod: '30 days',
      dueDate: `${dp}-${String(Math.min(28, 15 + v)).padStart(2, '0')}`,
    });
  }
  // Receipt bill adjustments
  for (let i = 0; i < 10; i++) {
    const customer = [10, 11, 12, 13, 14, 15][i % 6];
    await db.insert(s.voucherBillReferences).values({
      billId: bid++, voucherId: 28 + i, ledgerId: customer, billName: `BILL-${i + 1}`,
      billType: 'Agst Ref', amount: 25000 + i * 18000, creditPeriod: '30 days',
      dueDate: `2025-${String(5 + i).padStart(2, '0')}-15`,
    });
  }
  console.log(`Created ${bid - 1} bill references.`);

  // ── 10. Cost Centre Allocations ─────────────────────────────────────────────
  let ccid = 1;
  // Get actual entry IDs from the first few vouchers
  const actualEntries = await db.all(sql`SELECT entry_id, voucher_id FROM voucher_entries WHERE voucher_id <= 10 ORDER BY entry_id LIMIT 10`);
  for (const entry of actualEntries) {
    await db.insert(s.voucherCostCentres).values({
      ccEntryId: ccid++, voucherId: entry.voucher_id, entryId: entry.entry_id,
      costCentreId: (ccid % 4) + 1, amount: 5000 + ccid * 2000,
    }).onConflictDoNothing();
  }
  console.log(`Created ${ccid - 1} cost centre allocations.`);

  // ── 11. Employees & Payroll ─────────────────────────────────────────────────
  const employees = [
    [1, 'Amit Sharma', 'EMP001', 'General Manager', 'Sales', '1990-05-15'],
    [2, 'Priya Patel', 'EMP002', 'Senior Developer', 'IT', '1992-08-20'],
    [3, 'Rajesh Kumar', 'EMP003', 'Chief Accountant', 'Finance', '1988-03-10'],
    [4, 'Sneha Gupta', 'EMP004', 'HR Manager', 'HR', '1995-11-25'],
    [5, 'Vikram Singh', 'EMP005', 'Warehouse Manager', 'Operations', '1985-07-30'],
    [6, 'Anita Desai', 'EMP006', 'Sales Executive', 'Sales', '1993-02-14'],
    [7, 'Rahul Verma', 'EMP007', 'Junior Developer', 'IT', '1997-06-08'],
    [8, 'Kavita Joshi', 'EMP008', 'Accountant', 'Finance', '1991-09-22'],
  ];
  for (const [empId, name, code, desig, dept, doj] of employees) {
    await db.insert(s.employees).values({
      employeeId: empId, companyId: cid, name, employeeCode: code,
      designation: desig, department: dept, dateOfJoining: doj,
      isActive: 1, pan: `ABCDE${empId}23F`,
      pfAccountNumber: `MH/BOM/${1000 + empId}`, uan: `100${empId}200${empId}300`,
      esiNumber: `ESI${5000 + empId}`, bankAccountNumber: `0001${empId}2345`,
      bankName: 'HDFC Bank', ifscCode: 'HDFC0001234',
    }).onConflictDoNothing();
  }

  const payHeads = [
    [1, 'Basic Pay', 25000, 'Earnings for Employees', 1],
    [2, 'House Rent Allowance', 10000, 'Earnings for Employees', 1],
    [3, 'Dearness Allowance', 5000, 'Earnings for Employees', 1],
    [4, 'Conveyance Allowance', 1600, 'Earnings for Employees', 1],
    [5, 'Medical Allowance', 1250, 'Earnings for Employees', 1],
    [6, 'Provident Fund', 3600, 'Earnings for Employees', 0],
    [7, 'Professional Tax', 200, 'Earnings for Employees', 0],
    [8, 'Income Tax (TDS)', 2500, 'Earnings for Employees', 0],
    [9, 'ESI Contribution', 475, 'Earnings for Employees', 0],
  ];
  for (const [phId, name, amt, type, affects] of payHeads) {
    await db.insert(s.payHeads).values({
      payHeadId: phId, companyId: cid, name, payHeadType: type,
      affectsNetSalary: affects, isActive: 1,
      statutoryComponent: phId >= 6 ? 'Yes' : null,
      percentageOrAmount: amt,
    }).onConflictDoNothing();
  }

  let ssid = 1;
  for (let e = 1; e <= 8; e++) {
    const multiplier = 1 + (e - 1) * 0.15;
    for (let p = 1; p <= 9; p++) {
      await db.insert(s.salaryStructures).values({
        structureId: ssid++, companyId: cid, employeeId: e,
        effectiveFrom: '2025-04-01', payHeadId: p,
        amount: Math.round(payHeads[p - 1][2] * multiplier), isActive: 1,
      }).onConflictDoNothing();
    }
  }

  // Payroll vouchers (8 employees × 1 month)
  let pvid = eid;
  for (let e = 1; e <= 8; e++) {
    const vId = vid++;
    vouchers.push(vId);
    await db.insert(s.vouchers).values({
      voucherId: vId, companyId: cid, fyId, voucherType: 'Payroll',
      voucherNumber: `PAY/${e}`,
      date: '2025-04-30',
      isCancelled: 0, isOptional: 0, isPostDated: 0,
      narration: `Salary for April 2025 - ${employees[e - 1][1]}`,
      partyName: employees[e - 1][1], isAccountingVoucher: 1,
    });
    const multiplier = 1 + (e - 1) * 0.15;
    for (let p = 1; p <= 9; p++) {
      await db.insert(s.voucherPayrollEntries).values({
        payrollEntryId: pvid++, voucherId: vId, employeeId: e, payHeadId: p,
        amount: Math.round(payHeads[p - 1][2] * multiplier),
      });
    }
  }
  console.log(`Created 8 employees with payroll data.`);

  // ── 12. Bank Reconciliation ─────────────────────────────────────────────────
  const bankEntries = await db.all(sql`SELECT entry_id, voucher_id FROM voucher_entries WHERE ledger_id = 2 AND type = 'Dr' ORDER BY entry_id LIMIT 5`);
  let reconId = 1;
  for (const entry of bankEntries) {
    await db.insert(s.reconciliations).values({
      reconciliationId: reconId, entryId: entry.entry_id, voucherId: entry.voucher_id,
      ledgerId: 2, reconciledDate: `2025-${String(4 + reconId).padStart(2, '0')}-${String(15 + reconId)}`,
      bankDate: `2025-${String(4 + reconId).padStart(2, '0')}-${String(16 + reconId)}`,
      bankReference: `BANK-REF-${reconId}`,
    }).onConflictDoNothing();
    reconId++;
  }
  console.log(`Created ${reconId - 1} bank reconciliation entries.`);

  // ── 13. Audit Trail ─────────────────────────────────────────────────────────
  for (let i = 1; i <= 20; i++) {
    await db.insert(s.auditTrail).values({
      logId: i, companyId: cid,
      entityType: i <= 10 ? 'voucher' : 'ledger',
      entityId: i,
      action: i % 3 === 0 ? 'DELETE' : (i % 2 === 0 ? 'UPDATE' : 'CREATE'),
      user: i % 4 === 0 ? 'admin' : (i % 3 === 0 ? 'manager' : 'accountant'),
      rowHash: `hash_${i}`,
    }).onConflictDoNothing();
  }
  console.log('Created 20 audit trail entries.');

  // ── 14. GST Registration ────────────────────────────────────────────────────
  await db.insert(s.gstRegistrations).values({
    gstId: 1, companyId: cid, registrationType: 'Regular',
    registrationStatus: 'Active', gstin: '27AABCS1234A1Z5',
    legalName: 'Sharma & Sons Pvt Ltd', tradeName: 'Sharma & Sons',
    stateId: '27', eInvoiceApplicable: 1, eWayBillApplicable: 1,
    isActive: 1,
  }).onConflictDoNothing();
  console.log('Created GST registration.');

  // ── 15. TDS/TCS Nature ──────────────────────────────────────────────────────
  await db.insert(s.tdsNatureOfPayment).values({
    tdsId: 1, companyId: cid, name: 'Payment to Contractors', section: '194C',
    rateIndividualWithPan: 1, rateOtherWithPan: 2, thresholdLimit: 30000, isActive: 1,
  }).onConflictDoNothing();
  await db.insert(s.tdsNatureOfPayment).values({
    tdsId: 2, companyId: cid, name: 'Professional Fees', section: '194J',
    rateIndividualWithPan: 10, rateOtherWithPan: 20, thresholdLimit: 30000, isActive: 1,
  }).onConflictDoNothing();
  await db.insert(s.tcsNatureOfGoods).values({
    tcsId: 1, companyId: cid, name: 'Sale of Scrap', section: '206C(1)',
    rateIndividualWithPan: 1, rateOtherWithPan: 5, thresholdLevel: 0, isActive: 1,
  }).onConflictDoNothing();
  console.log('Created TDS/TCS nature of payment entries.');

  // ── 16. Misc Masters ────────────────────────────────────────────────────────
  await db.insert(s.units).values({ unitId: 1, companyId: cid, name: 'Kg', symbol: 'kg', formalName: 'Kilogram', isActive: 1, isSimple: 1 }).onConflictDoNothing();
  await db.insert(s.units).values({ unitId: 2, companyId: cid, name: 'Nos', symbol: 'nos', formalName: 'Numbers', isActive: 1, isSimple: 1 }).onConflictDoNothing();
  await db.insert(s.units).values({ unitId: 3, companyId: cid, name: 'Mtr', symbol: 'mtr', formalName: 'Meter', isActive: 1, isSimple: 1 }).onConflictDoNothing();
  await db.insert(s.units).values({ unitId: 4, companyId: cid, name: 'Box', symbol: 'box', formalName: 'Box', isActive: 1, isSimple: 1 }).onConflictDoNothing();

  await db.insert(s.stockCategories).values({ scId: 1, companyId: cid, name: 'General', isActive: 1 }).onConflictDoNothing();
  await db.insert(s.stockCategories).values({ scId: 2, companyId: cid, name: 'Imported', isActive: 1 }).onConflictDoNothing();

  // Batches
  const stockEntriesList = await db.all(sql`SELECT stock_entry_id, voucher_id FROM voucher_stock_entries ORDER BY stock_entry_id LIMIT 3`);
  if (stockEntriesList.length > 0) {
    await db.insert(s.voucherBatches).values({ batchId: 1, voucherId: stockEntriesList[0].voucher_id, stockEntryId: stockEntriesList[0].stock_entry_id, batchNumber: 'BATCH-2025-001', expiryDate: '2026-06-30', quantity: 150, rate: 180 }).onConflictDoNothing();
  }
  if (stockEntriesList.length > 1) {
    await db.insert(s.voucherBatches).values({ batchId: 2, voucherId: stockEntriesList[1].voucher_id, stockEntryId: stockEntriesList[1].stock_entry_id, batchNumber: 'BATCH-2025-002', expiryDate: '2026-09-15', quantity: 200, rate: 320 }).onConflictDoNothing();
  }

  await db.insert(s.attendanceTypes).values({ attendanceTypeId: 1, companyId: cid, name: 'Present', type: 'Attendance / Leave with Pay', period: 'Per Day', isActive: 1 }).onConflictDoNothing();
  await db.insert(s.attendanceTypes).values({ attendanceTypeId: 2, companyId: cid, name: 'Absent', type: 'Absences', period: 'Per Day', isActive: 1 }).onConflictDoNothing();
  await db.insert(s.attendanceTypes).values({ attendanceTypeId: 3, companyId: cid, name: 'Paid Leave', type: 'Attendance / Leave with Pay', period: 'Per Day', carryForward: 1, maxDays: 12, isActive: 1 }).onConflictDoNothing();

  await db.insert(s.employeeCategories).values({ employeeCategoryId: 1, companyId: cid, name: 'Permanent', isActive: 1 }).onConflictDoNothing();
  await db.insert(s.employeeCategories).values({ employeeCategoryId: 2, companyId: cid, name: 'Contract', isActive: 1 }).onConflictDoNothing();
  await db.insert(s.employeeGroups).values({ employeeGroupId: 1, companyId: cid, name: 'All Employees', isActive: 1 }).onConflictDoNothing();
  await db.insert(s.employeeGroups).values({ employeeGroupId: 2, companyId: cid, name: 'Management', parentGroupId: 1, isActive: 1 }).onConflictDoNothing();

  await db.insert(s.tallyFeatures).values({
    tallyFeatureId: 1, companyId: cid,
    maintainAccounts: 1, enableBillWiseEntry: 1, enableCostCentres: 1,
    maintainInventory: 1, integrateAccountsWithInventory: 1,
    enableBatches: 1, maintainExpiryDateForBatches: 1,
    enableGst: 1, enableTds: 1, enableTcs: 1,
  }).onConflictDoNothing();

  // eInvoice records
  for (let i = 1; i <= 5; i++) {
    await db.insert(s.einvoiceRecords).values({
      irnId: i, companyId: cid, voucherId: i, invoiceNumber: `S/${1000 + i}`,
      invoiceDate: `2025-04-${String(5 + i * 2).padStart(2, '0')}`,
      buyerGstin: `27AABCT${i}234B1Z5`,
      irn: `IRN${String(i).padStart(40, '0')}`,
      ackNo: `ACK${String(i).padStart(15, '0')}`,
      status: i <= 3 ? 'Generated' : (i === 4 ? 'Cancelled' : 'Pending'),
    }).onConflictDoNothing();
  }

  console.log('Created miscellaneous masters.');

  console.log('\n✅ Seed complete!');
  console.log(`  Company: Sharma & Sons Pvt Ltd (id: ${cid})`);
  console.log(`  FY: 2025-04-01 to 2026-03-31 (id: ${fyId})`);
  console.log(`  Groups: 24`);
  console.log(`  Ledgers: ${ledgers.length}`);
  console.log(`  Vouchers: ${vouchers.length}`);
  console.log(`  Stock Items: ${stockItems.length}`);
  console.log(`  Employees: 8`);
  console.log(`  All 586 reports should now return real data.`);
}

seed()
  .then(() => process.exit(0))
  .catch(e => { console.error('Seed failed:', e.message); process.exit(1); });
