// Synthetic TallyPrime test data. Never real customer data: every name, number and
// GSTIN here is invented.
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

// A throwaway Tally "Data" folder with one sub-folder per company, each holding empty
// Manager.1800 / TranMgr.1800 files (enough for the folder checks; tests mock the decoder).
// Returns { root, dirs: { <company>: path }, remove() }.
function makeTallyFolder({ companies = ['10000'] } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'paesa-tally-'));
  const dirs = {};
  for (const name of companies) {
    const dir = path.join(root, name);
    fs.mkdirSync(dir);
    for (const file of ['Manager.1800', 'TranMgr.1800']) fs.writeFileSync(path.join(dir, file), '');
    dirs[name] = dir;
  }
  return { root, dirs, remove: () => fs.rmSync(root, { recursive: true, force: true }) };
}

const line = (ledger_name, dr_cr, amount) => ({ ledger_name, dr_cr, amount });

// A small company in the shape binExtract.extractCompany returns. Eight vouchers, each there
// for a reason:
//   S-1  Sales with a stock line             imports
//   R-1  Receipt                             imports
//   S-2  "Tax Invoice" (custom type)         imports as Sales; type guessed from the name
//   P-1  Payment, Dr 300 vs Cr 250           does not import: unbalanced
//   J-1  Journal, 2nd line's ledger unnamed  does not import: link id 999 has no master
//   M-1  Memorandum                          imports as Journal although Tally does not post it
//   J-3  Journal, 1st line's ledger unnamed  saved with no lines (F22), link id 998
//   J-2  Journal in the next financial year  imports
function tallyCompany() {
  const gstin = '27ABCDE1234F1Z5'; // invented, pattern-valid
  const masters = {
    groups: [],
    ledgers: [
      {
        name: 'Alpha Traders',
        parent: 'Sundry Debtors',
        opening_balance: 5000,
        opening_balance_type: 'Dr',
        gstin: '27AAAAA0000A1Z5',
        registration_type: 'Regular',
        state: 'Maharashtra',
      },
      { name: 'Sales Account', parent: 'Sales Accounts' },
      { name: 'Output CGST', parent: 'Duties & Taxes' },
      { name: 'Output SGST', parent: 'Duties & Taxes' },
      { name: 'Cash', parent: 'Cash-in-hand', opening_balance: 2000, opening_balance_type: 'Dr' },
      { name: 'Office Expenses', parent: 'Indirect Expenses' },
    ],
    stockItems: [
      {
        name: 'Widget',
        base_unit: 'Nos',
        opening_quantity: 10,
        opening_rate: 100,
        opening_value: 1000,
        hsn_sac: '8471',
        type_of_supply: 'Goods',
      },
    ],
    units: [],
    godowns: [],
    voucherTypes: [],
    gstRegistrations: [{ name: 'Maharashtra Registration', gstin, state: 'Maharashtra' }],
    company: { gstin },
  };
  const vouchers = [
    {
      date: '2025-04-10',
      voucher_type: 'Sales',
      number: 'S-1',
      party: 'Alpha Traders',
      entries: [
        line('Alpha Traders', 'Dr', 1180),
        line('Sales Account', 'Cr', 1000),
        line('Output CGST', 'Cr', 90),
        line('Output SGST', 'Cr', 90),
      ],
      inventory: [{ item: 'Widget', qty: 10, rate: 100, amount: 1000 }],
    },
    {
      date: '2025-05-02',
      voucher_type: 'Receipt',
      number: 'R-1',
      party: 'Alpha Traders',
      entries: [line('Cash', 'Dr', 1180), line('Alpha Traders', 'Cr', 1180)],
      inventory: [],
    },
    {
      date: '2025-06-15',
      voucher_type: 'Tax Invoice',
      number: 'S-2',
      party: 'Alpha Traders',
      entries: [
        line('Alpha Traders', 'Dr', 590),
        line('Sales Account', 'Cr', 500),
        line('Output CGST', 'Cr', 45),
        line('Output SGST', 'Cr', 45),
      ],
      inventory: [],
    },
    {
      date: '2025-07-01',
      voucher_type: 'Payment',
      number: 'P-1',
      entries: [line('Office Expenses', 'Dr', 300), line('Cash', 'Cr', 250)],
      inventory: [],
    },
    {
      date: '2025-08-01',
      voucher_type: 'Journal',
      number: 'J-1',
      entries: [
        line('Cash', 'Cr', 50),
        { ledger_name: null, ledger_link_id: 999, dr_cr: 'Dr', amount: 50 },
      ],
      inventory: [],
    },
    {
      date: '2025-09-01',
      voucher_type: 'Memorandum',
      number: 'M-1',
      entries: [line('Office Expenses', 'Dr', 10), line('Cash', 'Cr', 10)],
      inventory: [],
    },
    {
      date: '2025-10-01',
      voucher_type: 'Journal',
      number: 'J-3',
      entries: [
        { ledger_name: null, ledger_link_id: 998, dr_cr: 'Dr', amount: 30 },
        line('Office Expenses', 'Cr', 30),
      ],
      inventory: [],
    },
    {
      date: '2026-04-02',
      voucher_type: 'Journal',
      number: 'J-2',
      entries: [line('Office Expenses', 'Dr', 200), line('Cash', 'Cr', 200)],
      inventory: [],
    },
  ];
  return { masters, vouchers, stats: {} };
}

module.exports = { makeTallyFolder, tallyCompany };
