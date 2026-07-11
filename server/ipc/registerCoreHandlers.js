const { ipcMain } = require('electron');

const companyController = require('../company/companyController');
const financialYearController = require('../financialYear/financialYearController');
const groupController = require('../group/groupController');
const ledgerController = require('../ledger/ledgerController');
const costCentreController = require('../costCentre/costCentreController');
const costCategoryController = require('../costCategory/costCategoryController');
const budgetController = require('../budget/budgetController');
const scenarioController = require('../scenario/scenarioController');
const currencyController = require('../currency/currencyController');
const tallyFeaturesController = require('../tallyFeatures/tallyFeaturesController');
const companyCreationSuccessController = require('../companyCreationSuccess/companyCreationSuccessController');
const featureGroupController = require('../featureGroup/featureGroupController');
const featureItemController = require('../featureItem/featureItemController');
const companyFeatureValuesController = require('../companyFeatureValues/companyFeatureValuesController');
const masterController = require('../master/masterController');
const pincodeController = require('../pincode/pincodeController');

function register() {
  ipcMain.handle('pincode:lookup', pincodeController.lookup);

  ipcMain.handle('company:create', companyController.create);
  ipcMain.handle('company:getAll', companyController.getAll);
  ipcMain.handle('company:getById', companyController.getById);
  ipcMain.handle('company:update', companyController.update);
  ipcMain.handle('company:delete', companyController.delete);
  ipcMain.handle('company:verifyPassword', companyController.verifyPassword);
  ipcMain.handle('company:setDefaultGstRegistration', companyController.setDefaultGstRegistration);
  ipcMain.handle('company:getDefaultGstRegistration', companyController.getDefaultGstRegistration);

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
  ipcMain.handle('ledger:updateCreditLimits', ledgerController.updateCreditLimits);
  ipcMain.handle('ledger:getTotalOpeningBalance', ledgerController.getTotalOpeningBalance);

  ipcMain.handle('costCentre:create', costCentreController.create);
  ipcMain.handle('costCentre:getAll', costCentreController.getAll);
  ipcMain.handle('costCentre:getById', costCentreController.getById);
  ipcMain.handle('costCentre:update', costCentreController.update);
  ipcMain.handle('costCentre:delete', costCentreController.delete);
  ipcMain.handle('costCentre:getTree', costCentreController.getTree);

  ipcMain.handle('costCategory:create', costCategoryController.create);
  ipcMain.handle('costCategory:getAll', costCategoryController.getAll);
  ipcMain.handle('costCategory:getById', costCategoryController.getById);
  ipcMain.handle('costCategory:update', costCategoryController.update);
  ipcMain.handle('costCategory:delete', costCategoryController.delete);

  ipcMain.handle('budget:create', budgetController.create);
  ipcMain.handle('budget:getAll', budgetController.getAll);
  ipcMain.handle('budget:getById', budgetController.getById);
  ipcMain.handle('budget:update', budgetController.update);
  ipcMain.handle('budget:delete', budgetController.delete);

  ipcMain.handle('scenario:create', scenarioController.create);
  ipcMain.handle('scenario:getAll', scenarioController.getAll);
  ipcMain.handle('scenario:getById', scenarioController.getById);
  ipcMain.handle('scenario:update', scenarioController.update);
  ipcMain.handle('scenario:delete', scenarioController.delete);

  ipcMain.handle('currency:create', currencyController.create);
  ipcMain.handle('currency:getAll', currencyController.getAll);
  ipcMain.handle('currency:getById', currencyController.getById);
  ipcMain.handle('currency:update', currencyController.update);
  ipcMain.handle('currency:delete', currencyController.delete);
  ipcMain.handle('currency:setDefault', currencyController.setDefault);

  ipcMain.handle('tallyFeatures:get', tallyFeaturesController.get);
  ipcMain.handle('tallyFeatures:update', tallyFeaturesController.update);
  ipcMain.handle('tallyFeatures:reset', tallyFeaturesController.reset);

  ipcMain.handle('companyCreationSuccess:get', companyCreationSuccessController.get);
  ipcMain.handle('companyCreationSuccess:update', companyCreationSuccessController.update);

  ipcMain.handle('featureGroup:getAll', featureGroupController.getAll);
  ipcMain.handle('featureGroup:getById', featureGroupController.getById);

  ipcMain.handle('featureItem:getAll', featureItemController.getAll);
  ipcMain.handle('featureItem:getById', featureItemController.getById);
  ipcMain.handle('featureItem:getByGroup', featureItemController.getByGroup);

  ipcMain.handle('companyFeatureValues:get', companyFeatureValuesController.get);
  ipcMain.handle('companyFeatureValues:getByGroup', companyFeatureValuesController.getByGroup);
  ipcMain.handle('companyFeatureValues:update', companyFeatureValuesController.update);
  ipcMain.handle('companyFeatureValues:updateBulk', companyFeatureValuesController.updateBulk);

  ipcMain.handle('master:getMenu', masterController.getMenu);
}

module.exports = { register };
