// drizzle-kit config — PostgreSQL dialect.
// Generates migrations from the pgTable schema into server/db/migrations/pg.
//   npx drizzle-kit generate --config=drizzle.config.pg.js
/** @type {import('drizzle-kit').Config} */
module.exports = {
  dialect: 'postgresql',
  schema: './server/db/schema/pg/index.js',
  out: './server/db/migrations/pg',
};
