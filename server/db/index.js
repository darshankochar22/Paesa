const { createClient } = require("@libsql/client");
const path = require("path");
const { app } = require("electron");

const dbPath = `file:${path.join(app.getPath("userData"), "startup.db")}`;
const db = createClient({ url: dbPath });

db.execute('PRAGMA journal_mode = WAL;');
db.execute("PRAGMA foreign_keys = ON;");

module.exports = db;

require("./company");
require("./financialYear");
require("./group");
require("./ledger");
require("./voucherType");
require("./voucher");
require("./unit");
require("./stockGroup");
require("./stockCategory");
require("./stockItem");
require("./godown");
require("./currency");
require("./costCentre");
require("./gstRegistration");
require("./gstClassification");
