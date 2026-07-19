const { ipcMain } = require('electron');

const unitController = require('../unit/unitController');
const stockGroupController = require('../stockGroup/stockGroupController');
const stockCategoryController = require('../stockCategory/stockCategoryController');
const stockItemController = require('../stockItem/stockItemController');
const godownController = require('../godown/godownController');
const priceLevelController = require('../priceLevels/priceLevelController');
const priceListController = require('../priceList/priceListController');
const physicalStockController = require('../physicalStock/physicalStockController');

function register() {
  ipcMain.handle('unit:create', unitController.create);
  ipcMain.handle('unit:getAll', unitController.getAll);
  ipcMain.handle('unit:getSimpleUnits', unitController.getSimpleUnits);
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
  ipcMain.handle('stockItem:getStockBalances', stockItemController.getStockBalances);
  ipcMain.handle(
    'stockItem:getStockBalancesByGodown',
    stockItemController.getStockBalancesByGodown,
  );
  ipcMain.handle('stockItem:getLastPurchaseRate', stockItemController.getLastPurchaseRate);
  ipcMain.handle('stockItem:getLastSalesRate', stockItemController.getLastSalesRate);
  ipcMain.handle('stockItem:getActiveBatches', stockItemController.getActiveBatches);

  ipcMain.handle('godown:create', godownController.create);
  ipcMain.handle('godown:getAll', godownController.getAll);
  ipcMain.handle('godown:getById', godownController.getById);
  ipcMain.handle('godown:update', godownController.update);
  ipcMain.handle('godown:delete', godownController.delete);
  ipcMain.handle('godown:getTree', godownController.getTree);

  ipcMain.handle('priceLevels:get', priceLevelController.get);
  ipcMain.handle('priceLevels:save', priceLevelController.save);
  ipcMain.handle('priceLevels:delete', priceLevelController.delete);

  ipcMain.handle('priceList:create', priceListController.create);
  ipcMain.handle('priceList:getAll', priceListController.getAll);
  ipcMain.handle('priceList:getById', priceListController.getById);
  ipcMain.handle('priceList:update', priceListController.update);
  ipcMain.handle('priceList:delete', priceListController.delete);

  ipcMain.handle('physicalStock:create', physicalStockController.create);
  ipcMain.handle('physicalStock:getAll', physicalStockController.getAll);
  ipcMain.handle('physicalStock:getById', physicalStockController.getById);
  ipcMain.handle('physicalStock:delete', physicalStockController.delete);
  ipcMain.handle('physicalStock:getNextNumber', physicalStockController.getNextNumber);
}

module.exports = { register };
