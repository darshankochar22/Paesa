const { sqliteTable, integer, text } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');

// Mirrors server/eInvoice/eInvoice.js CREATE TABLE statements (SQLite ground truth).

// einvoice_credentials: one IRP credential set per company.
const einvoiceCredentials = sqliteTable('einvoice_credentials', {
  credId: integer('cred_id').primaryKey({ autoIncrement: true }),
  // FK -> companies(company_id) ON DELETE CASCADE (owned by company module).
  companyId: integer('company_id').notNull(),
  clientId: text('client_id').notNull(),
  clientSecret: text('client_secret').notNull(),
  username: text('username').notNull(),
  password: text('password').notNull(),
  appKey: text('app_key').notNull(),
  // SQLite INTEGER 0/1 flag; keep raw integer to preserve behavior.
  isSandbox: integer('is_sandbox').default(1),
  // SQLite: TEXT DEFAULT (datetime('now')) storing ISO strings; keep raw TEXT.
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// einvoice_records: one row per generated/cancelled e-Invoice (IRN).
const einvoiceRecords = sqliteTable('einvoice_records', {
  irnId: integer('irn_id').primaryKey({ autoIncrement: true }),
  // FK -> companies(company_id) ON DELETE CASCADE (owned by company module).
  companyId: integer('company_id').notNull(),
  // Nullable; links a record to its source voucher.
  voucherId: integer('voucher_id'),
  invoiceNumber: text('invoice_number').notNull(),
  invoiceDate: text('invoice_date').notNull(),
  buyerGstin: text('buyer_gstin'),
  irn: text('irn'),
  ackNo: text('ack_no'),
  ackDt: text('ack_dt'),
  signedInvoice: text('signed_invoice'),
  signedQrCode: text('signed_qr_code'),
  ewbNo: text('ewb_no'),
  ewbDt: text('ewb_dt'),
  status: text('status').default('PENDING'),
  // IRP cancellation reason code; stays integer.
  cancelReason: integer('cancel_reason'),
  cancelRemarks: text('cancel_remarks'),
  cancelledAt: text('cancelled_at'),
  rawResponse: text('raw_response'),
  // SQLite: TEXT DEFAULT (datetime('now')) storing ISO strings; keep raw TEXT.
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

module.exports = { einvoiceCredentials, einvoiceRecords };
