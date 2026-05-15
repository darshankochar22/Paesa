const { ipcMain } = require('electron');

const companyController = require('./controllers/companyController');
const financialYearController = require("./controllers/financialYearController"); 
const groupController = require('./controllers/groupController');
const ledgerController = require('./controllers/ledgerController');
const costCentreController = require('./controllers/costController');
const unitController = require('./controllers/unitController');
const stockGroupController = require('./controllers/stockGroupController');

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
