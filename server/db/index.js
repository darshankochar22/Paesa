const { createClient } = require("@libsql/client");
const path = require("path");
const { app } = require("electron");

const dbPath = `file:${path.join(app.getPath("userData"), "startup.db")}`;
const db = createClient({ url: dbPath });

const initDB = async () => {
  await db.execute('PRAGMA journal_mode = WAL;');
  await db.execute('PRAGMA foreign_keys = ON;');

  await require('./company').init(db);
  await require('./financialYear').init(db);
  await require('./group').init(db);
  await require('./ledger').init(db);
  await require('./voucherType').init(db);
  await require('./voucher').init(db);
  await require('./unit').init(db);
  await require('./stockGroup').init(db);
  await require('./stockCategory').init(db);
  await require('./stockItem').init(db);
  await require('./godown').init(db);
  await require('./currency').init(db);
  await require('./costCentre').init(db);
  await require('./gstRegistration').init(db);
  await require('./gstClassification').init(db);
  await require('./featureGroup').init(db);
  await require('./featureItem').init(db);
  await require('./companyFeatureValues').init(db);
  await require('./companyCreationSuccess').init(db);
  await require('./employeeGroup').init(db);
  await require('./employee').init(db);
  await require('./payrollUnit').init(db);
  await require('./tallyFeatures').init(db);
  await require('./banking').init(db);
  await require('./attendanceType').init(db);
  await require('./payHead').init(db); 
  await require('./dayBookReport').init(db);  
  await require('./balanceSheetReport').init(db);
  await require('./profitLossReport').init(db);
  await require('./trialBalanceReport').init(db);
  await require('./salaryStructure').init(db);
};

module.exports = { db, initDB };