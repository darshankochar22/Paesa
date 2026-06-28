const { ipcMain } = require('electron');

const voucherController = require('../voucher/voucherController');
const voucherTypeController = require('../voucherType/voucherTypeController');
const voucherEntryActionsController = require('../voucherEntryActions/voucherEntryActionsController');
const dayBookReportController = require('../dayBookReport/dayBookReportController');

function register() {
  ipcMain.handle('voucher:create', voucherController.create);
  ipcMain.handle('voucher:getAll', voucherController.getAll);
  ipcMain.handle('voucher:getById', voucherController.getById);
  ipcMain.handle('voucher:update', voucherController.update);
  ipcMain.handle('voucher:delete', voucherController.delete);
  ipcMain.handle('voucher:cancel', voucherController.cancel);
  ipcMain.handle('voucher:getDaybook', voucherController.getDaybook);
  ipcMain.handle('voucher:getByType', voucherController.getByType);
  ipcMain.handle('voucher:getByLedger', voucherController.getByLedger);
  ipcMain.handle('voucher:getNextNumber', voucherController.getNextNumber);
  ipcMain.handle('voucher:getLedgerBalance', voucherController.getLedgerBalance);
  ipcMain.handle('voucher:searchLedgers', voucherController.searchLedgers);
  ipcMain.handle('voucher:getPendingBills', voucherController.getPendingBills);

  ipcMain.handle('voucherType:create', voucherTypeController.create);
  ipcMain.handle('voucherType:getAll', voucherTypeController.getAll);
  ipcMain.handle('voucherType:getById', voucherTypeController.getById);
  ipcMain.handle('voucherType:update', voucherTypeController.update);
  ipcMain.handle('voucherType:delete', voucherTypeController.delete);
  ipcMain.handle('voucherType:getConfig', voucherTypeController.getConfig);
  ipcMain.handle('voucherType:updateConfig', voucherTypeController.updateConfig);

  ipcMain.handle('voucherEntryActions:create', voucherEntryActionsController.create);
  ipcMain.handle('voucherEntryActions:getAll', voucherEntryActionsController.getAll);
  ipcMain.handle('voucherEntryActions:getByVoucher', voucherEntryActionsController.getByVoucher);
  ipcMain.handle('voucherEntryActions:delete', voucherEntryActionsController.delete);

  ipcMain.handle('dayBookReport:create', dayBookReportController.create);
  ipcMain.handle('dayBookReport:getAll', dayBookReportController.getAll);
  ipcMain.handle('dayBookReport:getById', dayBookReportController.getById);
  ipcMain.handle('dayBookReport:delete', dayBookReportController.delete);
}

module.exports = { register };
