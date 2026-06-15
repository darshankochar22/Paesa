const { sqliteTable, integer, text } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');

// SQLite stores created_at/updated_at/sent_at as TEXT DEFAULT (datetime('now')).
const datetimeNow = sql`(datetime('now'))`;

// whatsapp_config
const whatsappConfig = sqliteTable('whatsapp_config', {
  configId: integer('config_id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull(),
  phoneNumberId: text('phone_number_id').notNull(),
  wabaId: text('waba_id').notNull(),
  accessToken: text('access_token').notNull(),
  // INTEGER DEFAULT 1 used as boolean flag; kept as raw integer to preserve behavior.
  isActive: integer('is_active').default(1),
  createdAt: text('created_at').default(datetimeNow),
  updatedAt: text('updated_at').default(datetimeNow),
});

// whatsapp_templates
const whatsappTemplates = sqliteTable('whatsapp_templates', {
  templateId: integer('template_id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull(),
  name: text('name').notNull(),
  language: text('language').default('en'),
  category: text('category'),
  status: text('status').default('PENDING'),
  createdAt: text('created_at').default(datetimeNow),
});

// whatsapp_logs
const whatsappLogs = sqliteTable('whatsapp_logs', {
  logId: integer('log_id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull(),
  voucherId: integer('voucher_id'),
  toNumber: text('to_number').notNull(),
  messageType: text('message_type').notNull(),
  templateName: text('template_name'),
  status: text('status').default('PENDING'),
  wamid: text('wamid'),
  error: text('error'),
  sentAt: text('sent_at').default(datetimeNow),
});

module.exports = {
  whatsappConfig,
  whatsappTemplates,
  whatsappLogs,
};
