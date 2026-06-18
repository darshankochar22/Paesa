const { pgTable, bigint, text, numeric, timestamp } = require('drizzle-orm/pg-core');
const { taxUnits } = require('./taxUnits');

// Excise Tariff Details table for managing tax unit-specific tariff rates
const exciseTariffDetails = pgTable('excise_tariff_details', {
  tariffDetailId: bigint('tariff_detail_id', { mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  taxUnitId: bigint('tax_unit_id', { mode: 'number' })
    .notNull()
    .references(() => taxUnits.taxUnitId, { onDelete: 'cascade' }),
  tariffDescription: text('tariff_description').notNull(),
  applicability: text('applicability').notNull().default('All'),
  tariffType: text('tariff_type').notNull().default('Standard'),
  particulars: text('particulars'),
  igstRate: numeric('igst_rate', { precision: 18, scale: 4 }).notNull().default('0'),
  cgstRate: numeric('cgst_rate', { precision: 18, scale: 4 }).notNull().default('0'),
  sgstRate: numeric('sgst_rate', { precision: 18, scale: 4 }).notNull().default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

module.exports = {
  exciseTariffDetails,
};
