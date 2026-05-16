const db = require("./index");

db.execute(`
  CREATE TABLE IF NOT EXISTS companies (
    company_id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    name                          TEXT NOT NULL,
    mailing_name                  TEXT,
    address1                      TEXT,
    address2                      TEXT,
    state                         TEXT,
    country                       TEXT,
    pincode                       TEXT,
    telephone                     TEXT,
    mobile                        TEXT,
    fax                           TEXT,
    email                         TEXT,
    website                       TEXT,
    base_currency_symbol          TEXT,
    formal_name                   TEXT,
    financial_year_beginning_from TEXT,
    books_beginning_from          TEXT,
    password                      TEXT,
    access_control                TEXT,
    edit_log                      TEXT,
    created_at                    TEXT DEFAULT (datetime('now'))
  )
`);
