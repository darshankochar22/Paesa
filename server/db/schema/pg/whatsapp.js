const { pgTable, bigint, text, boolean, timestamp } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');
const { companies } = require('./company');

// whatsapp_config
// company_id FK is EXPLICIT in the SQLite source (REFERENCES companies ON DELETE CASCADE).
const whatsappConfig = pgTable('whatsapp_config', {
  configId: bigint('config_id', { mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  companyId: bigint('company_id', { mode: 'number' })
    .notNull()
    .references(() => companies.companyId, { onDelete: 'cascade' }),
  phoneNumberId: text('phone_number_id').notNull(),
  wabaId: text('waba_id').notNull(),
  accessToken: text('access_token').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
});

// whatsapp_templates
const whatsappTemplates = pgTable('whatsapp_templates', {
  templateId: bigint('template_id', { mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  companyId: bigint('company_id', { mode: 'number' })
    .notNull()
    .references(() => companies.companyId, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  language: text('language').notNull().default('en'),
  category: text('category'),
  status: text('status').notNull().default('PENDING'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
});

// whatsapp_logs
// voucher_id FK is INFERRED only (no explicit constraint in SQLite source, and no
// vouchers schema module exists yet) -> left as a plain nullable column.
const whatsappLogs = pgTable('whatsapp_logs', {
  logId: bigint('log_id', { mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  companyId: bigint('company_id', { mode: 'number' })
    .notNull()
    .references(() => companies.companyId, { onDelete: 'cascade' }),
  voucherId: bigint('voucher_id', { mode: 'number' }),
  toNumber: text('to_number').notNull(),
  messageType: text('message_type').notNull(),
  templateName: text('template_name'),
  status: text('status').notNull().default('PENDING'),
  wamid: text('wamid'),
  error: text('error'),
  sentAt: timestamp('sent_at', { withTimezone: true }).notNull().default(sql`now()`),
});

module.exports = {
  whatsappConfig,
  whatsappTemplates,
  whatsappLogs,
};
