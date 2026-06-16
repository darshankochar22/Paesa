const { sqliteTable, integer, text } = require('drizzle-orm/sqlite-core');
const { featureGroups } = require('./featureGroup');

const featureItems = sqliteTable('feature_items', {
  featureItemId: integer('feature_item_id').primaryKey({ autoIncrement: true }),
  featureGroupId: integer('feature_group_id')
    .notNull()
    .references(() => featureGroups.featureGroupId, { onDelete: 'cascade' }),
  featureKey: text('feature_key').notNull().unique(),
  featureName: text('feature_name').notNull(),
  description: text('description'),
  controlType: text('control_type').default('boolean'),
  defaultValueBoolean: integer('default_value_boolean').default(0),
  displayOrder: integer('display_order').default(0),
  isMandatory: integer('is_mandatory').default(0),
  isActive: integer('is_active').default(1),
});

module.exports = { featureItems };
