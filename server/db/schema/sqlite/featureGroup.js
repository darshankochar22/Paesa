const { sqliteTable, integer, text } = require('drizzle-orm/sqlite-core');

const featureGroups = sqliteTable('feature_groups', {
  featureGroupId: integer('feature_group_id').primaryKey({ autoIncrement: true }),
  groupKey: text('group_key').notNull().unique(),
  groupName: text('group_name').notNull(),
  onlineAccess: integer('online_access').default(0),
  displayOrder: integer('display_order').default(0),
  isActive: integer('is_active').default(1),
});

module.exports = { featureGroups };
