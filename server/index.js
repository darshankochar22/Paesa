const { ipcMain } = require('electron');

const companyController = require('./controllers/companyController');
const financialYearController = require("./controllers/financialYearController"); 
const groupController = require('./controllers/groupController');

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
