const { register: registerCore } = require('./ipc/registerCoreHandlers');
const { register: registerInventory } = require('./ipc/registerInventoryHandlers');
const { register: registerTransactions } = require('./ipc/registerTransactionHandlers');
const { register: registerPayroll } = require('./ipc/registerPayrollHandlers');
const { register: registerStatutory } = require('./ipc/registerStatutoryHandlers');
const { register: registerReports } = require('./ipc/registerReportHandlers');
const { register: registerIntegrations } = require('./ipc/registerIntegrationHandlers');

function registerAllHandlers() {
  registerCore();
  registerInventory();
  registerTransactions();
  registerPayroll();
  registerStatutory();
  registerReports();
  registerIntegrations();
}

// Called for side effects when required (preserves existing main.js interface).
registerAllHandlers();

module.exports = registerAllHandlers;
