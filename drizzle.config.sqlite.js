
/** @type {import('drizzle-kit').Config} */
module.exports = {
  dialect: 'sqlite',
  schema: './server/db/schema/sqlite/index.js',
  out: './server/db/migrations/sqlite',
};
