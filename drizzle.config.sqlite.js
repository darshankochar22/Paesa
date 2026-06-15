// drizzle-kit config — SQLite dialect.
// Generates migrations from the sqliteTable schema into server/db/migrations/sqlite.
//   npx drizzle-kit generate --config=drizzle.config.sqlite.js
/** @type {import('drizzle-kit').Config} */
module.exports = {
  dialect: 'sqlite',
  schema: './server/db/schema/sqlite/index.js',
  out: './server/db/migrations/sqlite',
};
