const { pgTable, bigint, text, boolean, integer } = require('drizzle-orm/pg-core');

const featureGroups = pgTable('feature_groups', {
  featureGroupId: bigint('feature_group_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  groupKey: text('group_key').notNull().unique(),
  groupName: text('group_name').notNull(),
  onlineAccess: boolean('online_access').notNull().default(false),
  displayOrder: integer('display_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
});

module.exports = { featureGroups };
