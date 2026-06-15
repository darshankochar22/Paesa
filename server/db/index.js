const path = require("path");
const schema = require("./schema");

// ---------------------------------------------------------------------------
// dbPath — unchanged logic.
//   NODE_ENV === 'test'  -> in-memory libsql DB (fresh per process)
//   otherwise            -> Electron userData/startup.db
// ---------------------------------------------------------------------------
let dbPath;
if (process.env.NODE_ENV === "test") {
  dbPath = "file::memory:";
} else {
  const { app } = require("electron");
  dbPath = `file:${path.join(app.getPath("userData"), "startup.db")}`;
}

const DIALECT = process.env.DB_DIALECT === "pg" ? "pg" : "sqlite";

let rawDb;
let db;

if (DIALECT === "pg") {
  // -------------------------------------------------------------------------
  // Postgres path — lazy: only require pg / node-postgres when selected.
  // rawDb is the pg Pool; db is the drizzle instance bound to it.
  // -------------------------------------------------------------------------
  const { Pool } = require("pg");
  const { drizzle } = require("drizzle-orm/node-postgres");
  rawDb = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(rawDb, { schema });
} else {
  // -------------------------------------------------------------------------
  // SQLite path (default) — libsql client + drizzle/libsql.
  // rawDb is the @libsql/client instance (unchanged URL logic).
  // db is the drizzle instance. We additionally attach a backward-compatible
  // `execute` method that delegates to rawDb so the not-yet-migrated services
  // (which do `const { db } = require('../db/index'); db.execute(sql, params)`)
  // keep working unchanged, while converted modules use db.select()/insert()/etc.
  // -------------------------------------------------------------------------
  const { createClient } = require("@libsql/client");
  const { drizzle } = require("drizzle-orm/libsql");
  rawDb = createClient({ url: dbPath });
  db = drizzle(rawDb, { schema });
  if (typeof db.execute !== "function") {
    db.execute = (...args) => rawDb.execute(...args);
  }
}

// ---------------------------------------------------------------------------
// initDB — bootStrategy: 'init-kept'.
//
// We keep calling each module's existing init() for DDL + seed logic. This
// guarantees the exact schema (column defaults, FK ON DELETE CASCADE,
// AUTOINCREMENT, UNIQUE constraints) and the exact seed data (featureGroup /
// featureItem) the 126-test oracle was written against. The Drizzle schema
// files + generated migrations in server/db/migrations/{sqlite,pg} exist as
// tooling / source-of-truth for the eventual cut-over, but are NOT what boots
// the test DB here.
//
// init() functions expect the raw libsql client (they call .execute(sql,
// params)), so we pass rawDb.
// ---------------------------------------------------------------------------
const initDB = async () => {
  if (DIALECT !== "pg") {
    await rawDb.execute("PRAGMA journal_mode = WAL;");
    await rawDb.execute("PRAGMA foreign_keys = ON;");
  }

  await require("../company/company").init(rawDb);
  await require("../financialYear/financialYear").init(rawDb);
  await require("../group/group").init(rawDb);
  await require("../ledger/ledger").init(rawDb);
  await require("../voucherType/voucherType").init(rawDb);
  await require("../voucher/voucher").init(rawDb);
  await require("../unit/unit").init(rawDb);
  await require("../stockGroup/stockGroup").init(rawDb);
  await require("../stockCategory/stockCategory").init(rawDb);
  await require("../stockItem/stockItem").init(rawDb);
  await require("../godown/godown").init(rawDb);
  await require("../physicalStock/physicalStock").init(rawDb);
  await require("../attendance/attendance").init(rawDb);
  await require("../currency/currency").init(rawDb);
  await require("../costCentre/costCentre").init(rawDb);
  await require("../gstRegistration/gstRegistration").init(rawDb);
  await require("../gstClassification/gstClassification").init(rawDb);
  await require("../tcsNatureOfGoods/tcsNatureOfGoods").init(rawDb);
  await require("../tdsNatureOfPayment/tdsNatureOfPayment").init(rawDb);
  await require("../gst/gst").init(rawDb);
  await require("../featureGroup/featureGroup").init(rawDb);
  await require("../featureItem/featureItem").init(rawDb);
  await require("../companyFeatureValues/companyFeatureValues").init(rawDb);
  await require("../companyGstDetails/companyGstDetails").init(rawDb);
  await require("../companyTdsDetails/companyTdsDetails").init(rawDb);
  await require("../companyTcsDetails/companyTcsDetails").init(rawDb);
  await require("../companyPanCinDetails/companyPanCinDetails").init(rawDb);
  await require("../companyCreationSuccess/companyCreationSuccess").init(rawDb);
  await require("../employeeCategory/employeeCategory").init(rawDb);
  await require("../employeeGroup/employeeGroup").init(rawDb);
  await require("../employee/employee").init(rawDb);
  await require("../payrollUnit/payrollUnit").init(rawDb);
  await require("../tallyFeatures/tallyFeatures").init(rawDb);
  await require("../banking/banking").init(rawDb);
  await require("../attendanceType/attendanceType").init(rawDb);
  await require("../payHead/payHead").init(rawDb);
  await require("../dayBookReport/dayBookReport").init(rawDb);
  await require("../balanceSheetReport/balanceSheetReport").init(rawDb);
  await require("../profitLossReport/profitLossReport").init(rawDb);
  await require("../trialBalanceReport/trialBalanceReport").init(rawDb);
  await require("../salaryStructure/salaryStructure").init(rawDb);
  await require("../taxUnits/taxUnit").init(rawDb);
  await require("../priceLevels/priceLevel").init(rawDb);
  await require("../priceList/priceList").init(rawDb);
  await require("../voucherEntryActions/voucherEntryActions").init(rawDb);
  await require("../eInvoice/eInvoice").init(rawDb);
  await require("../whatsapp/whatsapp").init(rawDb);
};

module.exports = { rawDb, db, initDB };
