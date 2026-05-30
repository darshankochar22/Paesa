const { createClient } = require("@libsql/client");
const path = require("path");

const dbPath = "file:" + path.join(process.env.HOME, "Library", "Application Support", "Startup", "startup.db");
const db = createClient({ url: dbPath });

async function run() {
  console.log("=== CHECKING VOUCHER PUR-00001 ===");
  const v = await db.execute("SELECT * FROM vouchers WHERE voucher_number = 'PUR-00001'");
  console.log("Voucher details:", v.rows[0]);

  const entries = await db.execute("SELECT * FROM voucher_entries WHERE voucher_id = ?", [v.rows[0].voucher_id]);
  console.log("\nAccounting Entries:", entries.rows);

  const stock = await db.execute("SELECT * FROM voucher_stock_entries WHERE voucher_id = ?", [v.rows[0].voucher_id]);
  console.log("\nStock Entries:", stock.rows);

  process.exit(0);
}
run();
