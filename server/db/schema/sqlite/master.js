// Module "master" owns NO database tables.
//
// There is no master.js schema-init file. masterService.getMenu() builds the
// "Masters" navigation menu purely in memory from hardcoded label lists, gated
// by Tally feature flags read from the tallyFeatures module.
//
// No CREATE TABLE, no seed/INSERT logic. Nothing to export here.

module.exports = {};
