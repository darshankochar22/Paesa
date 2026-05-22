const { createClient } = require("@libsql/client");
const path = require("path");
const { app } = require("electron");

const dbPath = `file:${path.join(app.getPath("userData"), "startup.db")}`;
const db = createClient({ url: dbPath });

const initDB = async () => {
  await db.execute('PRAGMA journal_mode = WAL;');
  await db.execute('PRAGMA foreign_keys = ON;');

  await require('../company/company').init(db);
  await require('../financialYear/financialYear').init(db);
  await require('../group/group').init(db);
  await require('../ledger/ledger').init(db);
  await require('../voucherType/voucherType').init(db);
  await require('../voucher/voucher').init(db);
  await require('../unit/unit').init(db);
  await require('../stockGroup/stockGroup').init(db);
  await require('../stockCategory/stockCategory').init(db);
  await require('../stockItem/stockItem').init(db);
  await require('../godown/godown').init(db);
  await require('../currency/currency').init(db);
  await require('../costCentre/costCentre').init(db);
  await require('../gstRegistration/gstRegistration').init(db);
  await require('../gstClassification/gstClassification').init(db);
  await require('../featureGroup/featureGroup').init(db);
  await require('../featureItem/featureItem').init(db);
  await require('../companyFeatureValues/companyFeatureValues').init(db);
  await require('../companyCreationSuccess/companyCreationSuccess').init(db);
  await require('../employeeCategory/employeeCategory').init(db);
  await require('../employeeGroup/employeeGroup').init(db);
  await require('../employee/employee').init(db);
  await require('../payrollUnit/payrollUnit').init(db);
  await require('../tallyFeatures/tallyFeatures').init(db);
  await require('../banking/banking').init(db);
  await require('../attendanceType/attendanceType').init(db);
  await require('../payHead/payHead').init(db);
  await require('../dayBookReport/dayBookReport').init(db);
  await require('../balanceSheetReport/balanceSheetReport').init(db);
  await require('../profitLossReport/profitLossReport').init(db);
  await require('../trialBalanceReport/trialBalanceReport').init(db);
  await require('../salaryStructure/salaryStructure').init(db);
  await require('../voucherEntryActions/voucherEntryActions').init(db);
};

module.exports = { db, initDB };