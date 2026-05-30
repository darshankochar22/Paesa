const { createClient } = require("@libsql/client");
const path = require("path");

const dbPath = "file:" + path.join(process.env.HOME, "Library", "Application Support", "Startup", "startup.db");
const db = createClient({ url: dbPath });

async function run() {
  const ledgers = await db.execute("SELECT * FROM ledgers WHERE ledger_id = 11");
  console.log("Ledger Details for ID 11:", ledgers.rows[0]);
  process.exit(0);
}
run();
