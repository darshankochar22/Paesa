const { initDB } = require('./server/db/index');
const reportRuntime = require('./server/report/reportRuntime');
const { registry } = require('./server/report/reportRegistry');
const s = require('./server/db/schema');
const { sql } = require('drizzle-orm');

async function run() {
  const { db } = require('./server/db/index');
  await initDB();
  
  // Quick seed
  await db.insert(s.companies).values({ companyId: 1, name: 'Sharma & Sons', baseCurrencySymbol: '₹', formalName: 'INR', financialYearBeginningFrom: '2025-04-01', booksBeginningFrom: '2025-04-01' });
  await db.insert(s.financialYears).values({ fyId: 1, companyId: 1, startDate: '2025-04-01', endDate: '2026-03-31', isActive: 1 });
  
  // Groups
  const groups = [[1,1,'Capital Account',null,'Liabilities',1],[2,1,'Current Assets',null,'Assets',1],[3,1,'Current Liabilities',null,'Liabilities',1],[4,1,'Direct Expenses',null,'Expenses',0],[5,1,'Direct Incomes',null,'Income',0],[6,1,'Fixed Assets',null,'Assets',1],[7,1,'Indirect Expenses',null,'Expenses',0],[8,1,'Indirect Incomes',null,'Income',0],[9,1,'Investments',null,'Assets',1],[10,1,'Loans (Liability)',null,'Liabilities',1],[12,1,'Bank Accounts',2,'Assets',1],[13,1,'Cash-in-Hand',2,'Assets',1],[14,1,'Sundry Debtors',2,'Assets',1],[15,1,'Sundry Creditors',3,'Liabilities',1],[16,1,'Sales Accounts',5,'Income',0],[17,1,'Purchase Accounts',4,'Expenses',0],[18,1,'Duties & Taxes',3,'Liabilities',1],[20,1,'Salary & Wages',7,'Expenses',0]];
  for (const [gid,cid,name,parent,nature,pri] of groups) await db.insert(s.groups).values({groupId:gid,companyId:cid,name,parentGroupId:parent,nature,isPrimary:pri,isActive:1});
  
  // Ledgers
  const lds = [[1,1,13,'Cash',150000],[2,1,12,'HDFC Bank',500000],[3,1,12,'SBI Bank',300000],[4,1,14,'Rajesh Traders',0],[5,1,14,'Priya Enterprises',0],[6,1,14,'Kumar & Co',0],[7,1,15,'Tata Steel',0],[8,1,15,'Reliance',0],[9,1,15,'Adani Suppliers',0],[10,1,16,'Sales Domestic',0],[11,1,16,'Sales Export',0],[12,1,17,'Purchase RM',0],[13,1,17,'Purchase FG',0],[14,1,6,'Furniture',200000],[15,1,6,'Computers',150000],[16,1,6,'Machinery',500000],[17,1,20,'Staff Salary',0],[18,1,20,'Director Remun',0],[19,1,7,'Rent',0],[20,1,7,'Electricity',0],[21,1,7,'Telephone',0],[22,1,7,'Travel',0],[23,1,7,'Printing',0],[24,1,7,'Insurance',0],[25,1,8,'Interest Received',0],[26,1,8,'Discount Received',0],[27,1,4,'Freight Inward',0],[28,1,4,'Wages',0],[29,1,5,'Commission',0],[30,1,1,'Owner Capital',-1000000],[31,1,18,'CGST Payable',0],[32,1,18,'SGST Payable',0],[33,1,18,'IGST Payable',0],[34,1,18,'TDS Payable',0],[35,1,10,'HDFC Loan',-200000]];
  for (const [lid,cid,gid,name,ob] of lds) await db.insert(s.ledgers).values({ledgerId:lid,companyId:cid,groupId:gid,name,openingBalance:ob,isActive:1,gstin:lid>=4&&lid<=9?'27AABCS1234A1Z5':null,state:'Maharashtra'});
  
  // Vouchers
  let vid=1;
  for(let i=0;i<10;i++){const m=String(4+i%12).padStart(2,'0');await db.insert(s.vouchers).values({voucherId:vid++,companyId:1,fyId:1,voucherType:'Sales',voucherNumber:'S-'+String(1001+i),date:'2025-'+m+'-'+String(5+i*2).padStart(2,'0'),partyLedgerId:4+i%3,partyName:'Customer '+(i+1),isCancelled:0,isOptional:0,isPostDated:0,narration:'Sale '+i,isInvoice:1,placeOfSupply:'Maharashtra',supplierInvoiceNo:'INV-'+vid});}
  for(let i=0;i<8;i++){const m=String(4+i%12).padStart(2,'0');await db.insert(s.vouchers).values({voucherId:vid++,companyId:1,fyId:1,voucherType:'Purchase',voucherNumber:'P-'+String(2001+i),date:'2025-'+m+'-'+String(10+i).padStart(2,'0'),partyLedgerId:7+i%3,partyName:'Supplier '+(i+1),isCancelled:0,isOptional:0,isPostDated:0,narration:'Purchase '+i,isInvoice:1,placeOfSupply:'Maharashtra',supplierInvoiceNo:'SINV-'+vid});}
  for(let i=0;i<6;i++){await db.insert(s.vouchers).values({voucherId:vid++,companyId:1,fyId:1,voucherType:'Receipt',voucherNumber:'R-'+String(3001+i),date:'2025-'+String(5+i).padStart(2,'0')+'-15',partyLedgerId:4+i%3,partyName:'Customer '+(i+1),isCancelled:0,isOptional:0,isPostDated:0,narration:'Receipt '+i});}
  for(let i=0;i<8;i++){const lids=[17,19,20,21,22,23,24,18];await db.insert(s.vouchers).values({voucherId:vid++,companyId:1,fyId:1,voucherType:'Payment',voucherNumber:'V-'+String(4001+i),date:'2025-'+String(4+i).padStart(2,'0')+'-20',partyLedgerId:lids[i],partyName:'Payee '+i,isCancelled:0,isOptional:0,isPostDated:0,narration:'Payment '+i});}
  for(let i=0;i<4;i++){await db.insert(s.vouchers).values({voucherId:vid++,companyId:1,fyId:1,voucherType:'Journal',voucherNumber:'J-'+String(5001+i),date:'2025-0'+String(6+i)+'-25',isCancelled:0,isOptional:0,isPostDated:0,narration:'Journal '+i});}
  for(let i=0;i<3;i++){await db.insert(s.vouchers).values({voucherId:vid++,companyId:1,fyId:1,voucherType:'Contra',voucherNumber:'C-'+String(6001+i),date:'2025-0'+String(5+i)+'-10',isCancelled:0,isOptional:0,isPostDated:0,narration:'Contra '+i});}
  for(let i=0;i<2;i++){await db.insert(s.vouchers).values({voucherId:vid++,companyId:1,fyId:1,voucherType:'Debit Note',voucherNumber:'DN-'+String(7001+i),date:'2025-0'+String(7+i)+'-12',partyLedgerId:7+i,isCancelled:0,isOptional:0,isPostDated:0,narration:'Debit Note '+i});}
  for(let i=0;i<2;i++){await db.insert(s.vouchers).values({voucherId:vid++,companyId:1,fyId:1,voucherType:'Credit Note',voucherNumber:'CN-'+String(8001+i),date:'2025-0'+String(8+i)+'-18',partyLedgerId:4+i,isCancelled:0,isOptional:0,isPostDated:0,narration:'Credit Note '+i});}
  
  // Entries
  let eid=1;
  for(let v=1;v<vid;v++){const amt=5000+v*3000;await db.insert(s.voucherEntries).values({entryId:eid++,voucherId:v,ledgerId:v<=10?(4+(v-1)%3):v<=18?(12+(v-11)%3):v<=24?2:v<=32?[17,19,20,21,22,23,24,18][(v-33+8)%8]:19,type:'Dr',amount:amt});await db.insert(s.voucherEntries).values({entryId:eid++,voucherId:v,ledgerId:v<=10?10:v<=18?(7+(v-11)%3):v<=24?(4+(v-25)%3):v<=32?2:20,type:'Cr',amount:amt});}
  
  // Stock
  await db.insert(s.stockGroups).values({sgId:1,companyId:1,name:'Raw Materials',isActive:1,gstRate:18});
  await db.insert(s.stockGroups).values({sgId:2,companyId:1,name:'Finished Goods',isActive:1,gstRate:18});
  const sis=[[1,1,1,'Steel Rod',100,500,50000],[2,1,1,'Copper Wire',200,300,60000],[3,1,2,'Widget A',500,150,75000],[4,1,2,'Widget B',300,250,75000]];
  for(const[sid,cid,gid,nm,q,r,v]of sis)await db.insert(s.stockItems).values({itemId:sid,companyId:cid,name:nm,groupId:gid,openingQuantity:q,openingRate:r,openingValue:v,gstRate:18,hsnCode:'7214',isActive:1,reorderLevel:q*0.2,reorderQuantity:q*0.5});
  await db.insert(s.godowns).values({godownId:1,companyId:1,name:'Main Warehouse',city:'Mumbai',state:'Maharashtra',isPrimary:1,isActive:1});
  await db.insert(s.godowns).values({godownId:2,companyId:1,name:'Retail Store',city:'Pune',state:'Maharashtra',isActive:1});
  
  // Stock entries for sales/purchase vouchers
  let seid=1;
  for(let v=1;v<=18;v++){const iid=(v%4)+1;await db.insert(s.voucherStockEntries).values({stockEntryId:seid++,voucherId:v,stockItemId:iid,godownId:(v%2)+1,quantity:10+v*3,rate:100+v*50,amount:(10+v*3)*(100+v*50),hsnCode:'7214',gstRate:18,isSource:v<=10?1:0,cgstAmount:(10+v*3)*(100+v*50)*0.09,sgstAmount:(10+v*3)*(100+v*50)*0.09});}
  
  // Bill refs
  let bid=1;
  for(let v=1;v<=24;v++){const lid=v<=10?(4+(v-1)%3):v<=18?(7+(v-11)%3):4+(v-19)%3;const bt=v>18?'Agst Ref':'New Ref';await db.insert(s.voucherBillReferences).values({billId:bid++,voucherId:v,ledgerId:lid,billName:'BILL-'+v,billType:bt,amount:5000+v*3000,creditPeriod:'30 days',dueDate:'2025-'+String(Math.min(12,4+Math.floor(v/4))).padStart(2,'0')+'-28'});}
  
  // Cost centres
  await db.insert(s.costCentres).values({ccId:1,companyId:1,name:'Production',category:'Primary',isActive:1});
  await db.insert(s.costCentres).values({ccId:2,companyId:1,name:'Sales',category:'Primary',isActive:1});
  let ccid=1;for(let i=1;i<=5;i++)await db.insert(s.voucherCostCentres).values({ccEntryId:ccid++,voucherId:i,entryId:(i-1)*2+1,costCentreId:(i%2)+1,amount:5000+i*1000});
  
  // Employees + payroll
  const emps=[[1,'Amit Sharma','EMP001','Manager','Sales'],[2,'Priya Patel','EMP002','Developer','IT'],[3,'Rajesh Kumar','EMP003','Accountant','Finance'],[4,'Sneha Gupta','EMP004','HR Exec','HR'],[5,'Vikram Singh','EMP005','Warehouse Mgr','Ops']];
  for(const[eid,nm,code,desig,dept]of emps)await db.insert(s.employees).values({employeeId:eid,companyId:1,name:nm,employeeCode:code,designation:desig,department:dept,dateOfJoining:'2020-01-15',isActive:1,pan:'ABCDE'+eid+'23F',pfAccountNumber:'MH/BOM/'+(1000+eid),uan:'100'+eid+'200',esiNumber:'ESI'+(5000+eid)});
  const phs=[[1,'Basic Pay',25000],[2,'HRA',10000],[3,'DA',5000],[4,'Conveyance',1600],[5,'PF',3600],[6,'Prof Tax',200],[7,'Income Tax',2500]];
  for(const[pid,nm,amt]of phs)await db.insert(s.payHeads).values({payHeadId:pid,companyId:1,name:nm,payHeadType:'Earnings for Employees',affectsNetSalary:pid<=4?1:0,isActive:1,statutoryComponent:pid>=5?'Yes':null,percentageOrAmount:amt});
  let ssid=1;for(let e=1;e<=5;e++)for(let p=1;p<=7;p++)await db.insert(s.salaryStructures).values({structureId:ssid++,companyId:1,employeeId:e,effectiveFrom:'2025-04-01',payHeadId:p,amount:Math.round(phs[p-1][2]*(1+(e-1)*0.2)),isActive:1});
  
  // Payroll voucher entries
  let pvid=1;
  for(let e=1;e<=5;e++){const v=vid++;await db.insert(s.vouchers).values({voucherId:v,companyId:1,fyId:1,voucherType:'Payroll',voucherNumber:'PAY-'+e,date:'2025-04-30',isCancelled:0,isOptional:0,isPostDated:0,narration:'Salary Apr',partyName:emps[e-1][1],isAccountingVoucher:1});for(let p=1;p<=7;p++)await db.insert(s.voucherPayrollEntries).values({payrollEntryId:pvid++,voucherId:v,employeeId:e,payHeadId:p,amount:Math.round(phs[p-1][2]*(1+(e-1)*0.2))});}
  
  // Bank reconciliation
  for(let i=1;i<=3;i++)await db.insert(s.reconciliations).values({reconciliationId:i,entryId:i*2,voucherId:i+10,ledgerId:2,reconciledDate:'2025-0'+String(4+i)+'-'+String(15+i),bankDate:'2025-0'+String(4+i)+'-'+String(16+i),bankReference:'BREF-'+i});
  
  // Audit trail
  for(let i=1;i<=10;i++)await db.insert(s.auditTrail).values({logId:i,companyId:1,entityType:i<=5?'voucher':'ledger',entityId:i,action:i%2===0?'CREATE':'UPDATE',user:i%3===0?'admin':'accountant',rowHash:'hash_'+i});
  
  // GST + misc
  await db.insert(s.gstRegistrations).values({gstId:1,companyId:1,registrationType:'Regular',registrationStatus:'Active',gstin:'27AABCS1234A1Z5',legalName:'Sharma & Sons',stateId:'27',eInvoiceApplicable:1,eWayBillApplicable:1,isActive:1});
  await db.insert(s.tallyFeatures).values({tallyFeatureId:1,companyId:1,maintainAccounts:1,enableBillWiseEntry:1,enableCostCentres:1,maintainInventory:1,enableGst:1,enableTds:1,enableTcs:1});
  await db.insert(s.units).values({unitId:1,companyId:1,name:'Kg',symbol:'kg',formalName:'Kilogram',isActive:1,isSimple:1});
  await db.insert(s.stockCategories).values({scId:1,companyId:1,name:'General',isActive:1});
  await db.insert(s.voucherBatches).values({batchId:1,voucherId:1,stockEntryId:1,batchNumber:'BATCH-001',expiryDate:'2026-06-30',quantity:15,rate:150});
  await db.insert(s.tdsNatureOfPayment).values({tdsId:1,companyId:1,name:'Contractor Payment',section:'194C',rateIndividualWithPan:1,rateOtherWithPan:2,thresholdLimit:30000,isActive:1});
  await db.insert(s.tcsNatureOfGoods).values({tcsId:1,companyId:1,name:'Sale of Scrap',section:'206C(1)',rateIndividualWithPan:1,rateOtherWithPan:5,thresholdLevel:0,isActive:1});
  await db.insert(s.attendanceTypes).values({attendanceTypeId:1,companyId:1,name:'Present',type:'Attendance / Leave with Pay',period:'Per Day',isActive:1});
  await db.insert(s.attendanceTypes).values({attendanceTypeId:2,companyId:1,name:'Absent',type:'Absences',period:'Per Day',isActive:1});
  await db.insert(s.employeeCategories).values({employeeCategoryId:1,companyId:1,name:'Permanent',isActive:1});
  await db.insert(s.employeeGroups).values({employeeGroupId:1,companyId:1,name:'All Employees',isActive:1});
  for(let i=1;i<=3;i++){await db.insert(s.einvoiceRecords).values({irnId:i,companyId:1,voucherId:i,invoiceNumber:'S-'+String(1000+i),invoiceDate:'2025-04-'+String(10+i),buyerGstin:'27AABCT1234B1Z5',irn:'IRN'+String(i).padStart(40,'0'),ackNo:'ACK'+String(i).padStart(15,'0'),status:i<=2?'Generated':'Cancelled'});}
  
  console.log('Seeded. Running all ' + Object.keys(registry).length + ' reports...');
  
  // Run all reports
  const allIds = Object.keys(registry);
  let ok = 0, withData = 0, empty = 0, fail = 0;
  const failures = [];
  const empties = [];
  
  for (const id of allIds) {
    const r = await reportRuntime.runReport(id, { company_id: 1, fy_id: 1, from_date: '2025-04-01', to_date: '2026-03-31', as_on_date: '2026-03-31' });
    if (r.success) {
      ok++;
      // Check ALL possible data keys, not just rows
      let hasData = false;
      for (const k of Object.keys(r)) {
        if (k === 'success' || k === 'error' || k === 'message') continue;
        const v = r[k];
        if (Array.isArray(v) && v.length > 0) { hasData = true; break; }
        if (typeof v === 'number' && v > 0) { hasData = true; break; }
        if (typeof v === 'string' && v.length > 0 && (k.includes('name') || k.includes('ledger'))) { hasData = true; break; }
      }
      if (hasData) { withData++; }
      else { empty++; empties.push(id); }
    } else {
      fail++;
      failures.push(id + ': ' + (r.error || 'unknown').substring(0, 80));
    }
  }
  
  console.log('Total: ' + allIds.length);
  console.log('Passed: ' + ok + ' (with data: ' + withData + ', empty: ' + empty + ')');
  console.log('Failed: ' + fail);
  if (failures.length > 0) { console.log('\nFailures:'); failures.forEach(f => console.log('  ' + f)); }
  if (empties.length > 0 && empties.length < 30) { console.log('\nEmpty reports:'); empties.forEach(e => console.log('  ' + e)); }
  else if (empties.length >= 30) { console.log('\nEmpty reports (' + empties.length + '): first 30:'); empties.slice(0,30).forEach(e => console.log('  ' + e)); }
  process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });
