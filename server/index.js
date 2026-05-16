const { ipcMain } = require('electron');

const companyController = require('./controllers/companyController');
const financialYearController = require("./controllers/financialYearController"); 
const groupController = require('./controllers/groupController');
const ledgerController = require('./controllers/ledgerController');
const costCentreController = require('./controllers/costController');
const unitController = require('./controllers/unitController');
const stockGroupController = require('./controllers/stockGroupController');
const stockCategoryController = require('./controllers/stockCategoryController');
const stockItemController = require('./controllers/stockItemController');
const godownController = require('./controllers/godownController');
const voucherController = require('./controllers/voucherController');
const reportController = require('./controllers/reportController');
const bankingController = require('./controllers/bankingController');
const currencyController = require('./controllers/currencyController');
const voucherTypeController = require('./controllers/voucherTypeController');
const gstRegistrationController = require('./controllers/gstRegistrationController');
const gstClassificationController = require('./controllers/gstClassificationController');


ipcMain.handle('company:create', companyController.create);
ipcMain.handle('company:getAll', companyController.getAll);
ipcMain.handle('company:getById', companyController.getById);
ipcMain.handle('company:update', companyController.update);
ipcMain.handle('company:delete', companyController.delete);
ipcMain.handle('company:verifyPassword', companyController.verifyPassword);

ipcMain.handle('fy:create', financialYearController.create);
ipcMain.handle('fy:getAll', financialYearController.getAll);
ipcMain.handle('fy:getById', financialYearController.getById);
ipcMain.handle('fy:setActive', financialYearController.setActive);
ipcMain.handle('fy:delete', financialYearController.delete);

ipcMain.handle('group:create', groupController.create);
ipcMain.handle('group:getAll', groupController.getAll);
ipcMain.handle('group:getById', groupController.getById);
ipcMain.handle('group:update', groupController.update);
ipcMain.handle('group:delete', groupController.delete);
ipcMain.handle('group:getTree', groupController.getTree);

ipcMain.handle('ledger:create', ledgerController.create);
ipcMain.handle('ledger:getAll', ledgerController.getAll);
ipcMain.handle('ledger:getById', ledgerController.getById);
ipcMain.handle('ledger:update', ledgerController.update);
ipcMain.handle('ledger:delete', ledgerController.delete);
ipcMain.handle('ledger:getByGroup', ledgerController.getByGroup);

ipcMain.handle('costCentre:create', costCentreController.create);
ipcMain.handle('costCentre:getAll', costCentreController.getAll);
ipcMain.handle('costCentre:getById', costCentreController.getById);
ipcMain.handle('costCentre:update', costCentreController.update);
ipcMain.handle('costCentre:delete', costCentreController.delete);
ipcMain.handle('costCetre:getTree', costCentreController.getTree);

ipcMain.handle('unit:create', unitController.create);
ipcMain.handle('unit:getAll', unitController.getAll);
ipcMain.handle('unit:getById', unitController.getById);
ipcMain.handle('unit:update', unitController.update);
ipcMain.handle('unit:delete', unitController.delete);

ipcMain.handle('stockGroup:create', stockGroupController.create);
ipcMain.handle('stockGroup:getAll', stockGroupController.getAll);
ipcMain.handle('stockGroup:getById', stockGroupController.getById);
ipcMain.handle('stockGroup:update', stockGroupController.update);
ipcMain.handle('stockGroup:delete', stockGroupController.delete);
ipcMain.handle('stockGroup:getTree', stockGroupController.getTree);

ipcMain.handle('stockCategory:create', stockCategoryController.create);
ipcMain.handle('stockCategory:getAll', stockCategoryController.getAll);
ipcMain.handle('stockCategory:getById', stockCategoryController.getById);
ipcMain.handle('stockCategory:update', stockCategoryController.update);
ipcMain.handle('stockCategory:delete', stockCategoryController.delete);

ipcMain.handle('stockItem:create', stockItemController.create);
ipcMain.handle('stockItem:getAll', stockItemController.getAll);
ipcMain.handle('stockItem:getById', stockItemController.getById);
ipcMain.handle('stockItem:update', stockItemController.update);
ipcMain.handle('stockItem:delete', stockItemController.delete);
ipcMain.handle('stockItem:getByGroup', stockItemController.getByGroup);
ipcMain.handle('stockItem:getByCategory', stockItemController.getByCategory);

ipcMain.handle('godown:create', godownController.create);
ipcMain.handle('godown:getAll', godownController.getAll);
ipcMain.handle('godown:getById', godownController.getById);
ipcMain.handle('godown:update', godownController.update);
ipcMain.handle('godown:delete', godownController.delete);
ipcMain.handle('godown:getTree', godownController.getTree);

ipcMain.handle('voucher:create', voucherController.create);
ipcMain.handle('voucher:getAll', voucherController.getAll);
ipcMain.handle('voucher:getById', voucherController.getById);
ipcMain.handle('voucher:update', voucherController.update);
ipcMain.handle('voucher:delete', voucherController.delete);
ipcMain.handle('voucher:cancel', voucherController.cancel);
ipcMain.handle('voucher:getDaybook', voucherController.getDaybook);
ipcMain.handle('voucher:getByType', voucherController.getByType);
ipcMain.handle('voucher:getByLedger', voucherController.getByLedger);

ipcMain.handle('report:trialBalance', reportController.trialBalance);
ipcMain.handle('report:balanceSheet', reportController.balanceSheet);
ipcMain.handle('report:profitLoss', reportController.profitLoss);
ipcMain.handle('report:ledgerReport', reportController.ledgerReport);
ipcMain.handle('report:cashBook', reportController.cashBook);
ipcMain.handle('report:bankBook', reportController.bankBook);
ipcMain.handle('report:daybook', reportController.daybook);

ipcMain.handle('banking:getUnreconciled', bankingController.getUnreconciled);
ipcMain.handle('banking:reconcile', bankingController.reconcile);
ipcMain.handle('banking:unreconcile', bankingController.unreconcile);
ipcMain.handle('banking:getStatement', bankingController.getStatement);
ipcMain.handle('banking:getSummary', bankingController.getSummary);

ipcMain.handle('currency:create', currencyController.create);
ipcMain.handle('currency:getAll', currencyController.getAll);
ipcMain.handle('currency:getById', currencyController.getById);
ipcMain.handle('currency:update', currencyController.update);
ipcMain.handle('currency:delete', currencyController.delete);
ipcMain.handle('currency:setDefault', currencyController.setDefault);

ipcMain.handle('voucherType:create', voucherTypeController.create);
ipcMain.handle('voucherType:getAll', voucherTypeController.getAll);
ipcMain.handle('voucherType:getById', voucherTypeController.getById);
ipcMain.handle('voucherType:update', voucherTypeController.update);
ipcMain.handle('voucherType:delete', voucherTypeController.delete);
ipcMain.handle('voucherType:getConfig', voucherTypeController.getConfig);
ipcMain.handle('voucherType:updateConfig', voucherTypeController.updateConfig);

ipcMain.handle('gstRegistration:create', gstRegistrationController.create);
ipcMain.handle('gstRegistration:getAll', gstRegistrationController.getAll);
ipcMain.handle('gstRegistration:getById', gstRegistrationController.getById);
ipcMain.handle('gstRegistration:update', gstRegistrationController.update);
ipcMain.handle('gstRegistration:delete', gstRegistrationController.delete);

ipcMain.handle('gstClassification:create', gstClassificationController.create);
ipcMain.handle('gstClassification:getAll', gstClassificationController.getAll);
ipcMain.handle('gstClassification:getById', gstClassificationController.getById);
ipcMain.handle('gstClassification:update', gstClassificationController.update);
ipcMain.handle('gstClassification:delete', gstClassificationController.delete);