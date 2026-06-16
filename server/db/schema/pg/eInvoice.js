const { pgTable, bigint, text, integer, boolean, timestamp } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');

// Mirrors docs/db/modules/eInvoice.sql (PostgreSQL contract).
// company_id / voucher_id reference tables owned by other modules (companies,
// vouchers); enforced at the DDL layer, kept as plain columns here to avoid
// cross-module require cycles (matches the banking.js convention).

// einvoice_credentials: one IRP credential set per company (unique by company_id).
const einvoiceCredentials = pgTable('einvoice_credentials', {
  credId: bigint('cred_id', { mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  // FK -> companies(company_id) ON DELETE CASCADE; UNIQUE (one row per company).
  companyId: bigint('company_id', { mode: 'number' }).notNull(),
  clientId: text('client_id').notNull(),
  clientSecret: text('client_secret').notNull(),
  username: text('username').notNull(),
  password: text('password').notNull(),
  appKey: text('app_key').notNull(),
  // SQLite INTEGER DEFAULT 1 (0/1) -> BOOLEAN DEFAULT true.
  isSandbox: boolean('is_sandbox').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// einvoice_records: one row per generated/cancelled e-Invoice (IRN).
const einvoiceRecords = pgTable('einvoice_records', {
  irnId: bigint('irn_id', { mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  // FK -> companies(company_id) ON DELETE CASCADE.
  companyId: bigint('company_id', { mode: 'number' }).notNull(),
  // FK -> vouchers(voucher_id) ON DELETE SET NULL (inferred); nullable.
  voucherId: bigint('voucher_id', { mode: 'number' }),
  invoiceNumber: text('invoice_number').notNull(),
  // Kept TEXT: IRP DocDtls.Dt format (dd/mm/yyyy), not ISO; do not coerce to DATE.
  invoiceDate: text('invoice_date').notNull(),
  buyerGstin: text('buyer_gstin'),
  irn: text('irn'),
  ackNo: text('ack_no'),
  // IRP AckDt string (TEXT preserved; IRP format).
  ackDt: text('ack_dt'),
  signedInvoice: text('signed_invoice'),
  signedQrCode: text('signed_qr_code'),
  ewbNo: text('ewb_no'),
  // IRP EwbDt string (TEXT preserved; IRP format).
  ewbDt: text('ewb_dt'),
  status: text('status').notNull().default('PENDING'),
  // IRP cancellation reason code; stays INTEGER.
  cancelReason: integer('cancel_reason'),
  cancelRemarks: text('cancel_remarks'),
  // Set via datetime('now') -> TIMESTAMPTZ.
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  rawResponse: text('raw_response'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

module.exports = { einvoiceCredentials, einvoiceRecords };
