const { setupTestDB, createTestCompany, db } = require('./helpers');
const {
  parseStatement,
  parseDate,
  parseAmount,
  normalizeAccountNumber,
} = require('../banking/statementParser');
const bankStatementService = require('../banking/bankStatementService');
const ledgerService = require('../ledger/ledgerService');

// ---------------------------------------------------------------------------
// Parser unit tests (no DB)
// ---------------------------------------------------------------------------

describe('statementParser', () => {
  test("parses the app's own CSV template layout with account-number metadata", () => {
    const csv = [
      '"Bank Statement Import Template — one row per transaction, sample rows below"',
      '"Account Number","50100 1234 5678"',
      '"Date","Narration","Ref No","Withdrawal","Deposit","Balance"',
      '"05-04-2026","NEFT-ACME TRADERS PVT LTD-INV 101","UTR8801122","","15000.00","115000.00"',
      '"07-04-2026","CHQ PAID-OFFICE RENT APRIL","000451","40000.00","","75000.00"',
    ].join('\n');
    const res = parseStatement(csv);
    expect(res.success).toBe(true);
    expect(res.account_number).toBe('5010012345678');
    expect(res.rows).toHaveLength(2);
    expect(res.rows[0]).toMatchObject({
      txn_date: '2026-04-05',
      narration: 'NEFT-ACME TRADERS PVT LTD-INV 101',
      ref_no: 'UTR8801122',
      withdrawal: 0,
      deposit: 15000,
      balance: 115000,
    });
    expect(res.rows[1]).toMatchObject({ txn_date: '2026-04-07', withdrawal: 40000, deposit: 0 });
  });

  test('recognises real-bank headers (Txn Date / Particulars / Debit / Credit)', () => {
    const csv = [
      'Txn Date,Value Date,Particulars,Chq./Ref.No.,Debit,Credit,Balance',
      '01/05/2026,02/05/2026,IMPS-SUPPLIER PAYMENT,IMPS123,"1,250.50",,"98,749.50"',
      '03/05/2026,03/05/2026,INTEREST CREDIT,,,"420.00","99,170.00"',
      'Closing Balance,,,,,,99170.00',
    ].join('\n');
    const res = parseStatement(csv);
    expect(res.success).toBe(true);
    expect(res.rows).toHaveLength(2);
    expect(res.rows[0]).toMatchObject({ txn_date: '2026-05-01', withdrawal: 1250.5, deposit: 0 });
    expect(res.rows[1]).toMatchObject({ txn_date: '2026-05-03', withdrawal: 0, deposit: 420 });
    expect(res.skipped).toBe(1); // the Closing Balance footer row
  });

  test('supports single Amount + Dr/Cr column layouts', () => {
    const csv = [
      'Date,Description,Amount,Dr/Cr',
      '2026-06-01,POS PURCHASE,500.00,DR',
      '2026-06-02,REFUND CREDIT,200.00,CR',
    ].join('\n');
    const res = parseStatement(csv);
    expect(res.success).toBe(true);
    expect(res.rows[0]).toMatchObject({ withdrawal: 500, deposit: 0 });
    expect(res.rows[1]).toMatchObject({ withdrawal: 0, deposit: 200 });
  });

  test('parseDate handles the documented formats', () => {
    expect(parseDate('05-04-2026')).toBe('2026-04-05');
    expect(parseDate('5/4/26')).toBe('2026-04-05');
    expect(parseDate('2026-04-05')).toBe('2026-04-05');
    expect(parseDate('5-Apr-2026')).toBe('2026-04-05');
    expect(parseDate('5 Apr 26')).toBe('2026-04-05');
    expect(parseDate('13/25/2026')).toBe(null);
    expect(parseDate('Closing Balance')).toBe(null);
  });

  test('parseAmount handles Indian formats and markers', () => {
    expect(parseAmount('1,23,456.78')).toBe(123456.78);
    expect(parseAmount('₹ 500')).toBe(500);
    expect(parseAmount('250.00 Cr')).toBe(250);
    expect(parseAmount('250.00 Dr')).toBe(-250);
    expect(parseAmount('(250)')).toBe(-250);
    expect(parseAmount('-')).toBe(null);
    expect(parseAmount('junk')).toBe(null);
  });

  test('normalizeAccountNumber strips separators', () => {
    expect(normalizeAccountNumber('50100 1234-5678')).toBe('5010012345678');
  });

  test("a 'Type' column holding transfer modes is NOT used as a Dr/Cr indicator", () => {
    const csv = [
      'Date,Type,Narration,Amount,Balance',
      '05-04-2026,NEFT,SALARY CREDIT FROM ACME,50000.00,150000.00',
      '06-04-2026,CHQ,RENT PAID,-40000.00,110000.00',
    ].join('\n');
    const res = parseStatement(csv);
    expect(res.success).toBe(true);
    expect(res.rows[0]).toMatchObject({ withdrawal: 0, deposit: 50000 });
    expect(res.rows[1]).toMatchObject({ withdrawal: 40000, deposit: 0 });
  });

  test('an unlabelled Dr/Cr indicator column is discovered from its data', () => {
    const csv = [
      'Date,Narration,Amount,Ind',
      '05-04-2026,RENT PAID,40000.00,DR',
      '06-04-2026,REFUND,200.00,CR',
    ].join('\n');
    const res = parseStatement(csv);
    expect(res.success).toBe(true);
    expect(res.rows[0]).toMatchObject({ withdrawal: 40000, deposit: 0 });
    expect(res.rows[1]).toMatchObject({ withdrawal: 0, deposit: 200 });
  });

  test("'Debit/Credit' and 'DR|CR' indicator headers are recognised", () => {
    const csv = [
      'Date,Narration,Debit/Credit,Amount,Balance',
      '05-04-2026,POS PURCHASE,DR,500.00,99500.00',
      '06-04-2026,REFUND,CR,200.00,99700.00',
    ].join('\n');
    const res = parseStatement(csv);
    expect(res.success).toBe(true);
    expect(res.rows[0]).toMatchObject({ withdrawal: 500, deposit: 0 });
    expect(res.rows[1]).toMatchObject({ withdrawal: 0, deposit: 200 });

    const axis = [
      'Tran Date,PARTICULARS,Amount(INR),DR|CR,Balance(INR)',
      '05/04/2026,RENT PAID,40000.00,DR,60000.00',
      '06/04/2026,SALARY,50000.00,CR,110000.00',
    ].join('\n');
    const res2 = parseStatement(axis);
    expect(res2.success).toBe(true);
    expect(res2.rows[0]).toMatchObject({ withdrawal: 40000, deposit: 0 });
    expect(res2.rows[1]).toMatchObject({ withdrawal: 0, deposit: 50000 });
  });

  test('a stray inch-mark quote inside an unquoted narration stays literal', () => {
    const csv = [
      'Date,Narration,Ref No,Withdrawal,Deposit,Balance',
      '05-04-2026,PVC PIPE 5" DIA PURCHASE,R1,4000.00,,96000.00',
      '06-04-2026,NEXT ROW SURVIVES,,100.00,,95900.00',
    ].join('\n');
    const res = parseStatement(csv);
    expect(res.success).toBe(true);
    expect(res.rows).toHaveLength(2);
    expect(res.rows[0].narration).toBe('PVC PIPE 5" DIA PURCHASE');
    expect(res.rows[0].withdrawal).toBe(4000);
  });

  test('impossible calendar dates are rejected', () => {
    expect(parseDate('31-02-2026')).toBe(null);
    expect(parseDate('31-04-2026')).toBe(null);
    expect(parseDate('29-02-2027')).toBe(null);
    expect(parseDate('29-02-2028')).toBe('2028-02-29');
    expect(parseDate('05-04-2026 11:23:45')).toBe('2026-04-05');
  });

  test("semicolon-heavy narrations don't flip the delimiter", () => {
    const csv = [
      'Date,Narration,Ref No,Withdrawal,Deposit,Balance',
      '05-04-2026,UPI;P2P;509912;user@okhdfc;PAYMENT;FROM;PHONE,U1,,15000.00,115000.00',
      '06-04-2026,UPI;P2P;509913;shop@okicici;PAYMENT;TO;SHOP,U2,500.00,,114500.00',
    ].join('\n');
    const res = parseStatement(csv);
    expect(res.success).toBe(true);
    expect(res.rows).toHaveLength(2);
    expect(res.rows[0].deposit).toBe(15000);
    expect(res.rows[1].withdrawal).toBe(500);
  });

  test('an MM/DD file is detected once and applied to every row', () => {
    const csv = [
      'Date,Narration,Withdrawal,Deposit',
      '04/05/2026,ROW ONE,100.00,',
      '04/13/2026,ROW TWO,200.00,',
    ].join('\n');
    const res = parseStatement(csv);
    expect(res.success).toBe(true);
    expect(res.rows[0].txn_date).toBe('2026-04-05'); // April 5, not May 4
    expect(res.rows[1].txn_date).toBe('2026-04-13');
  });

  test('metadata summary rows with dates/counts are not mistaken for the header', () => {
    const csv = [
      'Statement generated date: 30-06-2026,Total Debits: 5,Total Credits: 10',
      'Date,Narration,Withdrawal,Deposit',
      '05-04-2026,REAL ROW,100.00,',
    ].join('\n');
    const res = parseStatement(csv);
    expect(res.success).toBe(true);
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].narration).toBe('REAL ROW');
  });

  test('negative or Cr-marked values in the Withdrawal column flip to deposits', () => {
    const csv = [
      'Date,Narration,Withdrawal,Deposit',
      '05-04-2026,CHARGE REVERSAL,-59.00,',
      '06-04-2026,FEE REFUND,(41.00),',
    ].join('\n');
    const res = parseStatement(csv);
    expect(res.success).toBe(true);
    expect(res.rows[0]).toMatchObject({ withdrawal: 0, deposit: 59 });
    expect(res.rows[1]).toMatchObject({ withdrawal: 0, deposit: 41 });
  });

  test('all-positive single-Amount files without an indicator carry a warning', () => {
    const csv = [
      'Date,Narration,Amount',
      '05-04-2026,ROW ONE,100.00',
      '06-04-2026,ROW TWO,200.00',
    ].join('\n');
    const res = parseStatement(csv);
    expect(res.success).toBe(true);
    expect(res.rows.every((r) => r.deposit > 0)).toBe(true);
    expect(res.errors.some((e) => /No Dr\/Cr column/.test(e))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Service integration tests
// ---------------------------------------------------------------------------

describe('bankStatementService', () => {
  let companyId;
  let hdfcId;
  let iciciId;
  let acmeId;
  let chargesId;
  let cashId;

  const groupIdByName = async (name) => {
    const res = await db.execute(
      `SELECT group_id FROM groups WHERE company_id = ? AND LOWER(name) = LOWER(?)`,
      [companyId, name],
    );
    if (!res.rows.length) throw new Error(`Group not found: ${name}`);
    return res.rows[0].group_id;
  };

  const makeLedger = async (name, groupName, bank_details = null) => {
    const res = await ledgerService.create({
      company_id: companyId,
      name,
      group_id: await groupIdByName(groupName),
      ...(bank_details ? { bank_details } : {}),
    });
    expect(res.success).toBe(true);
    return res.ledger.ledger_id;
  };

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany('Bank Statement Test Co');
    companyId = company.company_id;

    hdfcId = await makeLedger('HDFC Bank', 'Bank Accounts', {
      account_number: '50100 1234 5678',
      bank_name: 'HDFC Bank',
    });
    iciciId = await makeLedger('ICICI Bank', 'Bank Accounts', {
      account_number: '000905001234',
      bank_name: 'ICICI Bank',
    });
    acmeId = await makeLedger('Acme Traders Pvt Ltd', 'Sundry Debtors');
    chargesId = await makeLedger('Bank Charges', 'Indirect Expenses');

    const cash = await db.execute(
      `SELECT ledger_id FROM ledgers WHERE company_id = ? AND name = 'Cash'`,
      [companyId],
    );
    cashId = cash.rows[0].ledger_id;
  });

  const STATEMENT_CSV = [
    'Account Number,50100-1234-5678',
    'Date,Narration,Ref No,Withdrawal,Deposit,Balance',
    '05-04-2026,NEFT-ACME TRADERS PVT LTD-INV 101,UTR8801122,,15000.00,115000.00',
    '07-04-2026,SMS CHARGES APR,,59.00,,114941.00',
    '10-04-2026,ATM CASH WITHDRAWAL,,10000.00,,104941.00',
    '12-04-2026,TRF TO A/C 000905001234 OWN,,20000.00,,84941.00',
    '15-04-2026,UPI-RAMESH GENERAL STORE-PAY,,1200.00,,83741.00',
  ].join('\n');

  let importId;
  let lines;

  test('importStatement matches the bank ledger by account number and classifies rows', async () => {
    const res = await bankStatementService.importStatement({
      company_id: companyId,
      file_name: 'apr.csv',
      content: STATEMENT_CSV,
    });
    expect(res.success).toBe(true);
    expect(res.needs_ledger).toBeUndefined();
    expect(res.ledger_id).toBe(hdfcId);
    expect(res.matched_by).toBe('account_number');
    expect(res.total).toBe(5);
    importId = res.import_id;

    const detail = await bankStatementService.getImportLines(companyId, importId);
    expect(detail.success).toBe(true);
    lines = detail.rows;
    expect(lines).toHaveLength(5);

    const byNarration = (frag) => lines.find((l) => (l.narration || '').includes(frag));

    const acme = byNarration('ACME');
    expect(acme.voucher_type).toBe('Receipt');
    expect(acme.contra_ledger_id).toBe(acmeId);
    expect(acme.match_source).toBe('ledger_name');

    const charges = byNarration('SMS CHARGES');
    expect(charges.voucher_type).toBe('Payment');
    expect(charges.contra_ledger_id).toBe(chargesId);

    const atm = byNarration('ATM');
    expect(atm.voucher_type).toBe('Contra');
    expect(atm.contra_ledger_id).toBe(cashId);

    const trf = byNarration('TRF TO');
    expect(trf.voucher_type).toBe('Contra');
    expect(trf.contra_ledger_id).toBe(iciciId);
    expect(trf.match_source).toBe('account_number');

    const ramesh = byNarration('RAMESH');
    expect(ramesh.voucher_type).toBe('Payment');
    expect(ramesh.contra_ledger_id).toBe(null);
  });

  test('importStatement without a resolvable account number asks for the ledger', async () => {
    const csv = ['Date,Narration,Withdrawal,Deposit', '05-04-2026,SOMETHING,100.00,'].join('\n');
    const res = await bankStatementService.importStatement({
      company_id: companyId,
      content: csv,
    });
    expect(res.success).toBe(true);
    expect(res.needs_ledger).toBe(true);
    expect(res.rows_found).toBe(1);
  });

  test('updateLine assigns a ledger manually and validates input', async () => {
    const ramesh = lines.find((l) => (l.narration || '').includes('RAMESH'));

    const bad = await bankStatementService.updateLine({
      company_id: companyId,
      line_id: ramesh.line_id,
      voucher_type: 'Sales',
    });
    expect(bad.success).toBe(false);

    const res = await bankStatementService.updateLine({
      company_id: companyId,
      line_id: ramesh.line_id,
      contra_ledger_id: acmeId,
      voucher_type: 'Payment',
    });
    expect(res.success).toBe(true);
    expect(res.line.contra_ledger_id).toBe(acmeId);
    expect(res.line.match_source).toBe('manual');
  });

  test('createVouchers posts balanced vouchers, auto-reconciles and learns rules', async () => {
    const res = await bankStatementService.createVouchers({
      company_id: companyId,
      line_ids: lines.map((l) => l.line_id),
    });
    expect(res.success).toBe(true);
    expect(res.created).toBe(5);
    expect(res.failed).toBe(0);

    const detail = await bankStatementService.getImportLines(companyId, importId);
    expect(detail.rows.every((l) => l.status === 'created' && l.voucher_id)).toBe(true);

    // Receipt line: Dr bank / Cr party, voucher dated from the statement.
    const acmeLine = detail.rows.find((l) => (l.narration || '').includes('ACME'));
    const voucher = await db.execute(`SELECT * FROM vouchers WHERE voucher_id = ?`, [
      acmeLine.voucher_id,
    ]);
    expect(voucher.rows[0].voucher_type).toBe('Receipt');
    expect(voucher.rows[0].date).toBe('2026-04-05');
    const entries = await db.execute(
      `SELECT ledger_id, type, amount FROM voucher_entries WHERE voucher_id = ? ORDER BY entry_id`,
      [acmeLine.voucher_id],
    );
    expect(entries.rows).toHaveLength(2);
    const drEntry = entries.rows.find((e) => e.type === 'Dr');
    const crEntry = entries.rows.find((e) => e.type === 'Cr');
    expect(drEntry.ledger_id).toBe(hdfcId);
    expect(crEntry.ledger_id).toBe(acmeId);
    expect(drEntry.amount).toBe(15000);

    // The bank leg is reconciled with the statement date as bank date.
    const recon = await db.execute(
      `SELECT r.* FROM reconciliations r JOIN voucher_entries e ON e.entry_id = r.entry_id
       WHERE r.voucher_id = ? AND e.ledger_id = ?`,
      [acmeLine.voucher_id, hdfcId],
    );
    expect(recon.rows).toHaveLength(1);
    expect(recon.rows[0].bank_date).toBe('2026-04-05');

    // The manual RAMESH pick became a learned rule.
    const rules = await db.execute(
      `SELECT * FROM bank_statement_rules WHERE company_id = ? AND match_text LIKE '%RAMESH%'`,
      [companyId],
    );
    expect(rules.rows).toHaveLength(1);
    expect(rules.rows[0].ledger_id).toBe(acmeId);
  });

  test('a later import reuses the learned rule and flags exact duplicates', async () => {
    const csv = [
      'Account Number,50100 1234 5678',
      'Date,Narration,Ref No,Withdrawal,Deposit,Balance',
      // exact duplicate of an already-imported line:
      '05-04-2026,NEFT-ACME TRADERS PVT LTD-INV 101,UTR8801122,,15000.00,115000.00',
      // same counterparty as the manually-assigned line, different details:
      '20-04-2026,UPI-RAMESH GENERAL STORE-PAY,,900.00,,82841.00',
    ].join('\n');
    const res = await bankStatementService.importStatement({
      company_id: companyId,
      file_name: 'apr-2.csv',
      content: csv,
    });
    expect(res.success).toBe(true);
    expect(res.duplicates).toBe(1);

    const detail = await bankStatementService.getImportLines(companyId, res.import_id);
    const dup = detail.rows.find((l) => (l.narration || '').includes('ACME'));
    expect(dup.status).toBe('duplicate');
    const ramesh = detail.rows.find((l) => (l.narration || '').includes('RAMESH'));
    expect(ramesh.match_source).toBe('rule');
    expect(ramesh.contra_ledger_id).toBe(acmeId);
    expect(ramesh.voucher_type).toBe('Payment');

    // Clean up this second import; the first import's vouchers must survive.
    const del = await bankStatementService.deleteImport({
      company_id: companyId,
      import_id: res.import_id,
    });
    expect(del.success).toBe(true);
    const vouchers = await db.execute(`SELECT COUNT(*) AS n FROM vouchers WHERE company_id = ?`, [
      companyId,
    ]);
    expect(vouchers.rows[0].n).toBe(5);
  });

  test('duplicate-flagged lines only post when explicitly included', async () => {
    // Re-import the full statement: every line is a known hash → 'duplicate'.
    const res = await bankStatementService.importStatement({
      company_id: companyId,
      file_name: 'apr-again.csv',
      content: STATEMENT_CSV,
    });
    expect(res.success).toBe(true);
    expect(res.duplicates).toBe(5);

    const detail = await bankStatementService.getImportLines(companyId, res.import_id);
    const allIds = detail.rows.map((l) => l.line_id);

    // Default (bulk) call: nothing posts.
    const bulk = await bankStatementService.createVouchers({
      company_id: companyId,
      line_ids: allIds,
    });
    expect(bulk.success).toBe(true);
    expect(bulk.created).toBe(0);
    expect(bulk.results.every((r) => /duplicate/i.test(r.error))).toBe(true);

    // Explicit selection posts.
    const ramesh = detail.rows.find((l) => (l.narration || '').includes('RAMESH'));
    const explicit = await bankStatementService.createVouchers({
      company_id: companyId,
      line_ids: [ramesh.line_id],
      include_duplicates: true,
    });
    expect(explicit.success).toBe(true);
    expect(explicit.created).toBe(1);

    // Deleting this import (which now has a created line) soft-deletes it:
    // hidden from the list, but its hashes keep feeding duplicate detection.
    const del = await bankStatementService.deleteImport({
      company_id: companyId,
      import_id: res.import_id,
    });
    expect(del.success).toBe(true);
    const list = await bankStatementService.getImports(companyId);
    expect(list.imports.find((i) => i.import_id === res.import_id)).toBeUndefined();

    const reimport = await bankStatementService.importStatement({
      company_id: companyId,
      file_name: 'apr-third.csv',
      content: STATEMENT_CSV,
    });
    expect(reimport.success).toBe(true);
    expect(reimport.duplicates).toBe(5); // history survived the delete
    await bankStatementService.deleteImport({
      company_id: companyId,
      import_id: reimport.import_id,
    });
  });

  test('updateLine rejects direction-contradicting types and the bank ledger itself', async () => {
    const res = await bankStatementService.importStatement({
      company_id: companyId,
      ledger_id: hdfcId,
      content: ['Date,Narration,Withdrawal,Deposit', '05-05-2026,SOME PAYMENT,100.00,'].join('\n'),
    });
    const detail = await bankStatementService.getImportLines(companyId, res.import_id);
    const line = detail.rows[0];

    const wrongType = await bankStatementService.updateLine({
      company_id: companyId,
      line_id: line.line_id,
      voucher_type: 'Receipt', // it's a withdrawal
    });
    expect(wrongType.success).toBe(false);
    expect(wrongType.error).toMatch(/withdrawal cannot be a Receipt/);

    const selfLedger = await bankStatementService.updateLine({
      company_id: companyId,
      line_id: line.line_id,
      contra_ledger_id: hdfcId,
    });
    expect(selfLedger.success).toBe(false);
    expect(selfLedger.error).toMatch(/own bank ledger/);

    await bankStatementService.deleteImport({ company_id: companyId, import_id: res.import_id });
  });

  test('the second side of an inter-bank transfer is not posted twice', async () => {
    // Test 4 already posted the HDFC-side Contra (Dr ICICI / Cr HDFC, 20000 on
    // 2026-04-12). Now import the ICICI side of the same transfer.
    const res = await bankStatementService.importStatement({
      company_id: companyId,
      ledger_id: iciciId,
      content: [
        'Date,Narration,Ref No,Withdrawal,Deposit',
        '12-04-2026,TRF FROM HDFC A/C 5010012345678,,,20000.00',
      ].join('\n'),
    });
    expect(res.success).toBe(true);
    const detail = await bankStatementService.getImportLines(companyId, res.import_id);
    const line = detail.rows[0];
    expect(line.voucher_type).toBe('Contra');
    expect(line.contra_ledger_id).toBe(hdfcId);
    expect(line.match_source).toBe('account_number');

    const created = await bankStatementService.createVouchers({
      company_id: companyId,
      line_ids: [line.line_id],
    });
    expect(created.success).toBe(true);
    expect(created.created).toBe(0);
    expect(created.results[0].error).toMatch(/already exists/);

    await bankStatementService.deleteImport({ company_id: companyId, import_id: res.import_id });
  });

  test('createVouchers refuses lines outside every financial year', async () => {
    const csv = ['Date,Narration,Withdrawal,Deposit', '05-04-1999,OLD TRANSACTION,100.00,'].join(
      '\n',
    );
    const res = await bankStatementService.importStatement({
      company_id: companyId,
      ledger_id: hdfcId,
      content: csv,
    });
    expect(res.success).toBe(true);
    const detail = await bankStatementService.getImportLines(companyId, res.import_id);
    const line = detail.rows[0];
    await bankStatementService.updateLine({
      company_id: companyId,
      line_id: line.line_id,
      contra_ledger_id: acmeId,
    });
    const created = await bankStatementService.createVouchers({
      company_id: companyId,
      line_ids: [line.line_id],
    });
    expect(created.success).toBe(true);
    expect(created.created).toBe(0);
    expect(created.results[0].error).toMatch(/No financial year/);
  });
});
