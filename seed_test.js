const { initDB, db } = require('./server/db/index');
const { sql } = require('drizzle-orm');
const s = require('./server/db/schema');

async function seedAll() {
  await initDB();

  // 1. Company
  await db.insert(s.companies).values({
    companyId: 1, name: 'Sharma & Sons Pvt Ltd', mailingName: 'Sharma & Sons',
    address1: '42 MG Road', address2: 'Andheri West', state: 'Maharashtra',
    country: 'India', pincode: '400053', telephone: '022-26345678',
    mobile: '9876543210', email: 'info@sharmas.com', website: 'www.sharmas.com',
    baseCurrencySymbol: '₹', formalName: 'INR',
    financialYearBeginningFrom: '2025-04-01', booksBeginningFrom: '2025-04-01',
  });

  // 2. Financial Year
  await db.insert(s.financialYears).values({
    fyId: 1, companyId: 1, startDate: '2025-04-01', endDate: '2026-03-31',
    isActive: 1, isClosed: 0,
  });

  // 3. Groups (all natures)
  const groupData = [
    [1, 1, 'Capital Account', null, 'Liabilities', 1],
    [2, 1, 'Current Assets', null, 'Assets', 1],
    [3, 1, 'Current Liabilities', null, 'Liabilities', 1],
    [4, 1, 'Direct Expenses', null, 'Expenses', 0],
    [5, 1, 'Direct Incomes', null, 'Income', 0],
    [6, 1, 'Fixed Assets', null, 'Assets', 1],
    [7, 1, 'Indirect Expenses', null, 'Expenses', 0],
    [8, 1, 'Indirect Incomes', null, 'Income', 0],
    [9, 1, 'Investments', null, 'Assets', 1],
    [10, 1, 'Loans (Liability)', null, 'Liabilities', 1],
    [11, 1, 'Suspense Account', null, 'Liabilities', 0],
    [12, 1, 'Bank Accounts', 2, 'Assets', 1],
    [13, 1, 'Cash-in-Hand', 2, 'Assets', 1],
    [14, 1, 'Sundry Debtors', 2, 'Assets', 1],
    [15, 1, 'Sundry Creditors', 3, 'Liabilities', 1],
    [16, 1, 'Sales Accounts', 5, 'Income', 0],
    [17, 1, 'Purchase Accounts', 4, 'Expenses', 0],
    [18, 1, 'Duties & Taxes', 3, 'Liabilities', 1],
    [19, 1, 'Provisions', 3, 'Liabilities', 0],
    [20, 1, 'Salary & Wages', 7, 'Expenses', 0],
  ];
  for (const [gid, cid, name, parent, nature, isPrimary] of groupData) {
    await db.insert(s.groups).values({
      groupId: gid, companyId: cid, name, parentGroupId: parent,
      nature, isPrimary, isActive: 1,
    });
  }

  // 4. Ledgers (comprehensive set)
  const ledgers = [
    [1, 1, 13, 'Cash', 150000, 'General'],
    [2, 1, 12, 'HDFC Bank', 500000, 'General'],
    [3, 1, 12, 'SBI Bank', 300000, 'General'],
    [4, 1, 14, 'Rajesh Traders', 0, 'General'],
    [5, 1, 14, 'Priya Enterprises', 0, 'General'],
    [6, 1, 14, 'Kumar & Co', 0, 'General'],
    [7, 1, 15, 'Tata Steel Ltd', 0, 'General'],
    [8, 1, 15, 'Reliance Industries', 0, 'General'],
    [9, 1, 15, 'Adani Suppliers', 0, 'General'],
    [10, 1, 16, 'Sales - Domestic', 0, 'General'],
    [11, 1, 16, 'Sales - Export', 0, 'General'],
    [12, 1, 17, 'Purchase - Raw Material', 0, 'General'],
    [13, 1, 17, 'Purchase - Finished Goods', 0, 'General'],
    [14, 1, 6, 'Furniture & Fixtures', 200000, 'General'],
    [15, 1, 6, 'Computer Equipment', 150000, 'General'],
    [16, 1, 6, 'Plant & Machinery', 500000, 'General'],
    [17, 1, 20, 'Staff Salary', 0, 'General'],
    [18, 1, 20, 'Director Remuneration', 0, 'General'],
    [19, 1, 7, 'Rent Expense', 0, 'General'],
    [20, 1, 7, 'Electricity Expense', 0, 'General'],
    [21, 1, 7, 'Telephone Expense', 0, 'General'],
    [22, 1, 7, 'Traveling Expense', 0, 'General'],
    [23, 1, 7, 'Printing & Stationery', 0, 'General'],
    [24, 1, 7, 'Insurance Expense', 0, 'General'],
    [25, 1, 8, 'Interest Received', 0, 'General'],
    [26, 1, 8, 'Discount Received', 0, 'General'],
    [27, 1, 4, 'Freight Inward', 0, 'General'],
    [28, 1, 4, 'Wages', 0, 'General'],
    [29, 1, 5, 'Commission Received', 0, 'General'],
    [30, 1, 1, 'Owner Capital', -1000000, 'General'],
    [31, 1, 18, 'CGST Payable', 0, 'General'],
    [32, 1, 18, 'SGST Payable', 0, 'General'],
    [33, 1, 18, 'IGST Payable', 0, 'General'],
    [34, 1, 18, 'TDS Payable', 0, 'General'],
    [35, 1, 10, 'HDFC Term Loan', -200000, 'General'],
  ];
  for (const [lid, cid, gid, name, opening, type] of ledgers) {
    await db.insert(s.ledgers).values({
      ledgerId: lid, companyId: cid, groupId: gid, name,
      openingBalance: opening, isActive: 1, ledgerType: type,
      isBillWise: [4,5,6,7,8,9].includes(lid) ? 1 : 0,
      gstin: lid >= 4 && lid <= 9 ? '27AABCS1234A1Z' + lid : null,
      state: lid >= 4 && lid <= 9 ? 'Maharashtra' : null,
    });
  }

  // 5. Vouchers (comprehensive set across all types)
  const voucherData = [];
  let vid = 1;
  
  // Sales vouchers (10)
  for (let i = 0; i < 10; i++) {
    const month = String(4 + (i % 12)).padStart(2, '0');
    const day = String(5 + i * 2).padStart(2, '0');
    const amt = 25000 + i * 8500;
    voucherData.push([vid++, 1, 1, 'Sales', `S-${1001+i}`, `2025-${month}-${day}`, 4+i%3, `Customer ${i+1}`, 0, amt]);
  }
  // Purchase vouchers (8)
  for (let i = 0; i < 8; i++) {
    const month = String(4 + (i % 12)).padStart(2, '0');
    const amt = 18000 + i * 6000;
    voucherData.push([vid++, 1, 1, 'Purchase', `P-${2001+i}`, `2025-${month}-${10+i}`, 7+i%3, `Supplier ${i+1}`, 0, amt]);
  }
  // Receipt vouchers (6)
  for (let i = 0; i < 6; i++) {
    const month = String(5 + i).padStart(2, '0');
    const amt = 20000 + i * 12000;
    voucherData.push([vid++, 1, 1, 'Receipt', `R-${3001+i}`, `2025-${month}-15`, 4+i%3, null, 0, amt]);
  }
  // Payment vouchers (8)
  for (let i = 0; i < 8; i++) {
    const month = String(4 + i).padStart(2, '0');
    const amt = 5000 + i * 4000;
    const lid = [17,19,20,21,22,23,24,18][i];
    voucherData.push([vid++, 1, 1, 'Payment', `V-${4001+i}`, `2025-${month}-20`, lid, null, 0, amt]);
  }
  // Journal vouchers (4)
  for (let i = 0; i < 4; i++) {
    voucherData.push([vid++, 1, 1, 'Journal', `J-${5001+i}`, `2025-0${6+i}-25`, null, null, 0, 5000 + i * 2000]);
  }
  // Contra vouchers (3)
  for (let i = 0; i < 3; i++) {
    voucherData.push([vid++, 1, 1, 'Contra', `C-${6001+i}`, `2025-0${5+i}-10`, null, null, 0, 50000 + i * 25000]);
  }
  // Debit Note (2)
  for (let i = 0; i < 2; i++) {
    voucherData.push([vid++, 1, 1, 'Debit Note', `DN-${7001+i}`, `2025-0${7+i}-12`, 7+i, null, 0, 3000 + i * 1500]);
  }
  // Credit Note (2)
  for (let i = 0; i < 2; i++) {
    voucherData.push([vid++, 1, 1, 'Credit Note', `CN-${8001+i}`, `2025-0${8+i}-18`, 4+i, null, 0, 2500 + i * 1000]);
  }

  for (const [vId, cid, fid, vtype, vnum, date, partyId, partyName, cancelled, amount] of voucherData) {
    await db.insert(s.vouchers).values({
      voucherId: vId, companyId: cid, fyId: fid, voucherType: vtype,
      voucherNumber: vnum, date, partyLedgerId: partyId, partyName: partyName || `Party for ${vtype}`,
      isCancelled: cancelled, isOptional: 0, isPostDated: 0,
      narration: `${vtype} voucher ${vnum}`, isInvoice: vtype === 'Sales' || vtype === 'Purchase' ? 1 : 0,
      isAccountingVoucher: 1, supplierInvoiceNo: vtype === 'Purchase' ? `INV-${vId}` : null,
      placeOfSupply: 'Maharashtra',
    });
  }

  // 6. Voucher Entries (Dr/Cr for each voucher)
  let eid = 1;
  for (const [vId, , , vtype, , , partyId, , , amount] of voucherData) {
    // Debit entry
    let drLedger, crLedger;
    if (vtype === 'Sales') { drLedger = partyId || 4; crLedger = 10; }
    else if (vtype === 'Purchase') { drLedger = 12; crLedger = partyId || 7; }
    else if (vtype === 'Receipt') { drLedger = 2; crLedger = partyId || 4; }
    else if (vtype === 'Payment') { drLedger = partyId || 17; crLedger = 2; }
    else if (vtype === 'Journal') { drLedger = 19; crLedger = 20; }
    else if (vtype === 'Contra') { drLedger = 2; crLedger = 1; }
    else if (vtype === 'Debit Note') { drLedger = partyId || 7; crLedger = 12; }
    else if (vtype === 'Credit Note') { drLedger = 10; crLedger = partyId || 4; }
    else { drLedger = 1; crLedger = 2; }
    
    await db.insert(s.voucherEntries).values({ entryId: eid++, voucherId: vId, ledgerId: drLedger, type: 'Dr', amount });
    await db.insert(s.voucherEntries).values({ entryId: eid++, voucherId: vId, ledgerId: crLedger, type: 'Cr', amount });
  }

  // 7. Stock Groups
  await db.insert(s.stockGroups).values({ sgId: 1, companyId: 1, name: 'Raw Materials', isActive: 1, gstRate: 18 });
  await db.insert(s.stockGroups).values({ sgId: 2, companyId: 1, name: 'Finished Goods', isActive: 1, gstRate: 18 });
  await db.insert(s.stockGroups).values({ sgId: 3, companyId: 1, name: 'Packaging Materials', isActive: 1, gstRate: 12 });

  // 8. Stock Items
  const stockItems = [
    [1, 1, 1, 'Steel Rod 10mm', 100, 500, 50000, 18, '7214'],
    [2, 1, 1, 'Copper Wire 2mm', 200, 300, 60000, 18, '7408'],
    [3, 1, 1, 'Aluminum Sheet', 50, 800, 40000, 18, '7606'],
    [4, 1, 2, 'Widget Type A', 500, 150, 75000, 18, '8481'],
    [5, 1, 2, 'Widget Type B', 300, 250, 75000, 18, '8482'],
    [6, 1, 2, 'Assembly Unit', 20, 5000, 100000, 18, '8483'],
    [7, 1, 3, 'Cardboard Box Large', 1000, 25, 25000, 12, '4819'],
    [8, 1, 3, 'Plastic Wrap Roll', 500, 80, 40000, 12, '3920'],
  ];
  for (const [sid, cid, gid, name, qty, rate, value, gst, hsn] of stockItems) {
    await db.insert(s.stockItems).values({
      itemId: sid, companyId: cid, name, groupId: gid,
      openingQuantity: qty, openingRate: rate, openingValue: value,
      gstRate: gst, hsnCode: hsn, isActive: 1,
      reorderLevel: qty * 0.2, reorderQuantity: qty * 0.5,
    });
  }

  // 9. Godowns
  await db.insert(s.godowns).values({ godownId: 1, companyId: 1, name: 'Main Warehouse', address: 'Plot 5, MIDC', city: 'Mumbai', state: 'Maharashtra', isPrimary: 1, isActive: 1 });
  await db.insert(s.godowns).values({ godownId: 2, companyId: 1, name: 'Retail Store', address: 'Shop 12, Linking Road', city: 'Mumbai', state: 'Maharashtra', isActive: 1 });
  await db.insert(s.godowns).values({ godownId: 3, companyId: 1, name: 'Factory Floor', address: 'Plot 8, MIDC', city: 'Pune', state: 'Maharashtra', isActive: 1 });

  // 10. Stock entries for sales/purchase vouchers
  const stockVouchers = voucherData.filter(v => v[3] === 'Sales' || v[3] === 'Purchase');
  let seid = 1;
  for (const [vId, , , vtype, , , , , , amount] of stockVouchers) {
    const itemId = (vId % 8) + 1;
    const godownId = (vId % 3) + 1;
    const qty = Math.floor(amount / (stockItems[itemId-1][4] || 100));
    const rate = stockItems[itemId-1][4] || 100;
    await db.insert(s.voucherStockEntries).values({
      stockEntryId: seid++, voucherId: vId, stockItemId: itemId, godownId,
      quantity: qty, rate, amount: qty * rate, hsnCode: stockItems[itemId-1][8],
      gstRate: stockItems[itemId-1][7], isSource: vtype === 'Sales' ? 1 : 0,
      cgstAmount: qty * rate * 0.09, sgstAmount: qty * rate * 0.09,
    });
  }

  // 11. Bill references for debtors/creditors
  let bid = 1;
  const billVouchers = voucherData.filter(v => ['Sales','Purchase','Receipt'].includes(v[3]));
  for (const [vId, , , vtype, vnum, date, partyId, , , amount] of billVouchers) {
    const lid = partyId || (vtype === 'Sales' ? 4 : 7);
    const billType = vtype === 'Receipt' ? 'Agst Ref' : 'New Ref';
    const dueDate = new Date(date);
    dueDate.setDate(dueDate.getDate() + 30);
    await db.insert(s.voucherBillReferences).values({
      billId: bid++, voucherId: vId, ledgerId: lid,
      billName: vnum, billType, amount,
      creditPeriod: '30 days', dueDate: dueDate.toISOString().split('T')[0],
    });
  }

  // 12. Cost centres
  await db.insert(s.costCentres).values({ ccId: 1, companyId: 1, name: 'Production Dept', category: 'Primary', isActive: 1 });
  await db.insert(s.costCentres).values({ ccId: 2, companyId: 1, name: 'Sales Dept', category: 'Primary', isActive: 1 });
  await db.insert(s.costCentres).values({ ccId: 3, companyId: 1, name: 'Admin Dept', category: 'Primary', isActive: 1 });
  await db.insert(s.costCentres).values({ ccId: 4, companyId: 1, name: 'Project Alpha', category: 'Secondary', parentId: 1, isActive: 1 });

  // 13. Cost centre allocations
  let ccid = 1;
  for (let i = 1; i <= 5; i++) {
    await db.insert(s.voucherCostCentres).values({
      ccEntryId: ccid++, voucherId: i, entryId: (i-1)*2+1,
      costCentreId: (i % 4) + 1, amount: 5000 + i * 1000,
    });
  }

  // 14. Employees
  const empData = [
    [1, 1, 'Amit Sharma', 'EMP001', 'Manager', 'Sales', '1990-05-15'],
    [2, 1, 'Priya Patel', 'EMP002', 'Senior Developer', 'IT', '1992-08-20'],
    [3, 1, 'Rajesh Kumar', 'EMP003', 'Accountant', 'Finance', '1988-03-10'],
    [4, 1, 'Sneha Gupta', 'EMP004', 'HR Executive', 'HR', '1995-11-25'],
    [5, 1, 'Vikram Singh', 'EMP005', 'Warehouse Manager', 'Operations', '1985-07-30'],
  ];
  for (const [eid, cid, name, code, desig, dept, doj] of empData) {
    await db.insert(s.employees).values({
      employeeId: eid, companyId: cid, name, employeeCode: code,
      designation: desig, department: dept, dateOfJoining: doj,
      isActive: 1, pan: 'ABCDE' + eid + '23F',
      pfAccountNumber: `MH/BOM/${1000+eid}`, uan: `100${eid}200${eid}300`,
      esiNumber: `ESI${5000+eid}`, bankAccountNumber: `0001${eid}2345`,
      bankName: 'HDFC Bank', ifscCode: 'HDFC0001234',
    });
  }

  // 15. Pay Heads
  const payHeadData = [
    [1, 1, 'Basic Pay', 'Earnings for Employees', 1, 25000],
    [2, 1, 'House Rent Allowance', 'Earnings for Employees', 1, 10000],
    [3, 1, 'Dearness Allowance', 'Earnings for Employees', 1, 5000],
    [4, 1, 'Conveyance Allowance', 'Earnings for Employees', 1, 1600],
    [5, 1, 'Provident Fund', 'Earnings for Employees', 0, 3600],
    [6, 1, 'Professional Tax', 'Earnings for Employees', 0, 200],
    [7, 1, 'Income Tax', 'Earnings for Employees', 0, 2500],
  ];
  for (const [phid, cid, name, type, affects, amt] of payHeadData) {
    await db.insert(s.payHeads).values({
      payHeadId: phid, companyId: cid, name, payHeadType: type,
      affectsNetSalary: affects, isActive: 1,
      statutoryComponent: phid >= 5 ? 'Yes' : null,
      calculationType: phid === 2 ? 'Percentage of Basic' : 'As User Defined Value',
      percentageOrAmount: phid === 2 ? 40 : amt,
    });
  }

  // 16. Salary Structures
  let ssid = 1;
  for (let emp = 1; emp <= 5; emp++) {
    for (let ph = 1; ph <= 7; ph++) {
      const baseAmt = payHeadData[ph-1][5];
      const multiplier = 1 + (emp - 1) * 0.2;
      await db.insert(s.salaryStructures).values({
        structureId: ssid++, companyId: 1, employeeId: emp,
        effectiveFrom: '2025-04-01', payHeadId: ph,
        amount: Math.round(baseAmt * multiplier), isActive: 1,
      });
    }
  }

  // 17. Payroll voucher entries
  let pvid = 1;
  // Create payroll-type vouchers
  for (let emp = 1; emp <= 5; emp++) {
    const vId = vid++;
    await db.insert(s.vouchers).values({
      voucherId: vId, companyId: 1, fyId: 1, voucherType: 'Payroll',
      voucherNumber: `PAY-${emp}`, date: '2025-04-30',
      isCancelled: 0, isOptional: 0, isPostDated: 0,
      narration: `Salary for April 2025 - ${empData[emp-1][2]}`,
      partyName: empData[emp-1][2], isAccountingVoucher: 1,
    });
    for (let ph = 1; ph <= 7; ph++) {
      const baseAmt = payHeadData[ph-1][5];
      const multiplier = 1 + (emp - 1) * 0.2;
      await db.insert(s.voucherPayrollEntries).values({
        payrollEntryId: pvid++, voucherId: vId,
        employeeId: emp, payHeadId: ph,
        amount: Math.round(baseAmt * multiplier),
      });
    }
  }

  // 18. Bank reconciliation entries
  for (let i = 1; i <= 3; i++) {
    await db.insert(s.reconciliations).values({
      reconciliationId: i, entryId: i * 2, voucherId: i + 10,
      ledgerId: 2, reconciledDate: `2025-0${4+i}-${15+i}`,
      bankDate: `2025-0${4+i}-${16+i}`, bankReference: `BANK-REF-${i}`,
    });
  }

  // 19. Audit trail entries
  for (let i = 1; i <= 10; i++) {
    await db.insert(s.auditTrail).values({
      logId: i, companyId: 1, entityType: i <= 5 ? 'voucher' : 'ledger',
      entityId: i, action: i % 2 === 0 ? 'CREATE' : 'UPDATE',
      user: i % 3 === 0 ? 'admin' : 'accountant',
      prevHash: i > 1 ? 'hash_' + (i-1) : null,
      rowHash: 'hash_' + i,
    });
  }

  // 20. GST registrations
  await db.insert(s.gstRegistrations).values({
    gstId: 1, companyId: 1, registrationType: 'Regular',
    registrationStatus: 'Active', gstin: '27AABCS1234A1Z5',
    legalName: 'Sharma & Sons Pvt Ltd', tradeName: 'Sharma & Sons',
    stateId: '27', eInvoiceApplicable: 1, eWayBillApplicable: 1,
    isActive: 1,
  });

  // 21. Units
  await db.insert(s.units).values({ unitId: 1, companyId: 1, name: 'Kg', symbol: 'kg', formalName: 'Kilogram', isActive: 1, isSimple: 1 });
  await db.insert(s.units).values({ unitId: 2, companyId: 1, name: 'Nos', symbol: 'nos', formalName: 'Numbers', isActive: 1, isSimple: 1 });
  await db.insert(s.units).values({ unitId: 3, companyId: 1, name: 'Mtr', symbol: 'mtr', formalName: 'Meter', isActive: 1, isSimple: 1 });

  // 22. Stock categories
  await db.insert(s.stockCategories).values({ scId: 1, companyId: 1, name: 'General', isActive: 1 });
  await db.insert(s.stockCategories).values({ scId: 2, companyId: 1, name: 'Imported', isActive: 1 });

  // 23. Voucher batches
  let batchId = 1;
  for (let i = 1; i <= 4; i++) {
    await db.insert(s.voucherBatches).values({
      batchId: batchId++, voucherId: i, stockEntryId: i,
      batchNumber: `BATCH-${2025}${String(i).padStart(3, '0')}`,
      expiryDate: `2026-${String(3+i).padStart(2, '0')}-31`,
      quantity: 10 + i * 5, rate: 100 + i * 50,
    });
  }

  // 24. TDS nature of payment
  await db.insert(s.tdsNatureOfPayment).values({
    tdsId: 1, companyId: 1, name: 'Payment to Contractors', section: '194C',
    rateIndividualWithPan: 1, rateOtherWithPan: 2, thresholdLimit: 30000, isActive: 1,
  });
  await db.insert(s.tdsNatureOfPayment).values({
    tdsId: 2, companyId: 1, name: 'Professional Fees', section: '194J',
    rateIndividualWithPan: 10, rateOtherWithPan: 20, thresholdLimit: 30000, isActive: 1,
  });

  // 25. TCS nature of goods
  await db.insert(s.tcsNatureOfGoods).values({
    tcsId: 1, companyId: 1, name: 'Sale of Scrap', section: '206C(1)',
    rateIndividualWithPan: 1, rateOtherWithPan: 5, thresholdLevel: 0, isActive: 1,
  });

  // 26. Attendance types and entries
  await db.insert(s.attendanceTypes).values({
    attendanceTypeId: 1, companyId: 1, name: 'Present', type: 'Attendance / Leave with Pay',
    period: 'Per Day', isActive: 1,
  });
  await db.insert(s.attendanceTypes).values({
    attendanceTypeId: 2, companyId: 1, name: 'Absent', type: 'Absences',
    period: 'Per Day', isActive: 1,
  });
  await db.insert(s.attendanceTypes).values({
    attendanceTypeId: 3, companyId: 1, name: 'Paid Leave', type: 'Attendance / Leave with Pay',
    period: 'Per Day', carryForward: 1, maxDays: 12, isActive: 1,
  });

  // Attendance vouchers
  for (let i = 1; i <= 3; i++) {
    const avId = i;
    await db.insert(s.attendanceVouchers).values({
      attendanceVoucherId: avId, companyId: 1,
      voucherNumber: `ATT-${i}`, date: `2025-0${3+i}-30`,
    });
    for (let emp = 1; emp <= 5; emp++) {
      await db.insert(s.attendanceVoucherEntries).values({
        entryId: (avId-1)*5+emp, attendanceVoucherId: avId,
        employeeId: emp, attendanceTypeId: (emp + i) % 3 === 0 ? 2 : 1,
        value: (emp + i) % 3 === 0 ? 0 : 22 + i,
      });
    }
  }

  // 27. Employee categories and groups
  await db.insert(s.employeeCategories).values({ employeeCategoryId: 1, companyId: 1, name: 'Permanent', isActive: 1 });
  await db.insert(s.employeeCategories).values({ employeeCategoryId: 2, companyId: 1, name: 'Contract', isActive: 1 });
  await db.insert(s.employeeGroups).values({ employeeGroupId: 1, companyId: 1, name: 'All Employees', isActive: 1 });
  await db.insert(s.employeeGroups).values({ employeeGroupId: 2, companyId: 1, name: 'Management', parentGroupId: 1, isActive: 1 });

  // 28. eInvoice records
  for (let i = 1; i <= 3; i++) {
    await db.insert(s.einvoiceRecords).values({
      irnId: i, companyId: 1, voucherId: i, invoiceNumber: `S-${1000+i}`,
      invoiceDate: `2025-04-${10+i}`, buyerGstin: '27AABCT1234B1Z5',
      irn: `IRN${String(i).padStart(40, '0')}`, ackNo: `ACK${String(i).padStart(15, '0')}`,
      status: i <= 2 ? 'Generated' : 'Cancelled',
    });
  }

  // 29. GST HSN rates
  await db.insert(s.gstHsnRates).values({
    rateId: 1, companyId: 1, hsnCode: '7214', effectiveFrom: '2025-04-01',
    gstRate: 18, cgstRate: 9, sgstRate: 9, igstRate: 18, typeOfSupply: 'Goods',
  });
  await db.insert(s.gstHsnRates).values({
    rateId: 2, companyId: 1, hsnCode: '8481', effectiveFrom: '2025-04-01',
    gstRate: 18, cgstRate: 9, sgstRate: 9, igstRate: 18, typeOfSupply: 'Goods',
  });

  // 30. Company features
  await db.insert(s.tallyFeatures).values({
    tallyFeatureId: 1, companyId: 1,
    maintainAccounts: 1, enableBillWiseEntry: 1, enableCostCentres: 1,
    maintainInventory: 1, integrateAccountsWithInventory: 1,
    enableBatches: 1, maintainExpiryDateForBatches: 1,
    enableGst: 1, enableTds: 1, enableTcs: 1,
  });

  console.log('Seed complete: 1 company, 20 groups, 35 ledgers, 43+ vouchers, 8 stock items, 3 godowns, 5 employees, 7 pay heads, 35 salary structures, 10 audit entries, 3 einvoice records, and more.');
}

seedAll().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
