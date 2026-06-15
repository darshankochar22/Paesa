// Dialect-switching schema barrel.
//
// Services import tables from here:  const { ledgers } = require('../db/schema');
// The active dialect is chosen by the DB_DIALECT env var. Default is sqlite,
// which is what the Electron desktop app and the Jest test suite run on.
//   DB_DIALECT === 'pg'  -> Postgres (pgTable) schema
//   otherwise            -> SQLite (sqliteTable) schema
module.exports =
  process.env.DB_DIALECT === 'pg'
    ? require('./pg')
    : require('./sqlite');
