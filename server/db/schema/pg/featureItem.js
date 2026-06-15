const { pgTable, bigint, text, boolean, integer } = require('drizzle-orm/pg-core');
const { featureGroups } = require('./featureGroup');

const featureItems = pgTable('feature_items', {
  featureItemId: bigint('feature_item_id', { mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  featureGroupId: bigint('feature_group_id', { mode: 'number' })
    .notNull()
    .references(() => featureGroups.featureGroupId, { onDelete: 'cascade' }),
  featureKey: text('feature_key').notNull().unique(),
  featureName: text('feature_name').notNull(),
  description: text('description'),
  controlType: text('control_type').notNull().default('boolean'),
  defaultValueBoolean: boolean('default_value_boolean').notNull().default(false),
  displayOrder: integer('display_order').notNull().default(0),
  isMandatory: boolean('is_mandatory').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
});

module.exports = { featureItems };
