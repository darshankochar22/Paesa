const { createClient } = require("@libsql/client");
const path = require("path");

const dbPath = "file:" + path.join(process.env.HOME, "Library", "Application Support", "Startup", "startup.db");
const db = createClient({ url: dbPath });

async function run() {
  const group = await db.execute("SELECT * FROM groups WHERE group_id = 42");
  console.log("Group Details for ID 42:", group.rows[0]);
  process.exit(0);
}
run();
