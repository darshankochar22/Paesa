const { ipcMain } = require('electron');

const employeeController = require('../employee/employeeController');
const employeeGroupController = require('../employeeGroup/employeeGroupController');
const employeeCategoryController = require('../employeeCategory/employeeCategoryController');
const payrollUnitController = require('../payrollUnit/payrollUnitController');
const attendanceTypeController = require('../attendanceType/attendanceTypeController');
const payHeadController = require('../payHead/payHeadController');
const salaryStructureController = require('../salaryStructure/salaryStructureController');
const attendanceController = require('../attendance/attendanceController');

function register() {
  ipcMain.handle('employee:create', employeeController.create);
  ipcMain.handle('employee:getAll', employeeController.getAll);
  ipcMain.handle('employee:getById', employeeController.getById);
  ipcMain.handle('employee:update', employeeController.update);
  ipcMain.handle('employee:delete', employeeController.delete);
  ipcMain.handle('employee:getByGroup', employeeController.getByGroup);

  ipcMain.handle('employeeGroup:create', employeeGroupController.create);
  ipcMain.handle('employeeGroup:getAll', employeeGroupController.getAll);
  ipcMain.handle('employeeGroup:getById', employeeGroupController.getById);
  ipcMain.handle('employeeGroup:update', employeeGroupController.update);
  ipcMain.handle('employeeGroup:delete', employeeGroupController.delete);
  ipcMain.handle('employeeGroup:getTree', employeeGroupController.getTree);

  ipcMain.handle('employeeCategory:create', employeeCategoryController.create);
  ipcMain.handle('employeeCategory:getAll', employeeCategoryController.getAll);
  ipcMain.handle('employeeCategory:getById', employeeCategoryController.getById);
  ipcMain.handle('employeeCategory:update', employeeCategoryController.update);
  ipcMain.handle('employeeCategory:delete', employeeCategoryController.delete);

  ipcMain.handle('payrollUnit:create', payrollUnitController.create);
  ipcMain.handle('payrollUnit:getAll', payrollUnitController.getAll);
  ipcMain.handle('payrollUnit:getById', payrollUnitController.getById);
  ipcMain.handle('payrollUnit:update', payrollUnitController.update);
  ipcMain.handle('payrollUnit:delete', payrollUnitController.delete);

  ipcMain.handle('attendanceType:create', attendanceTypeController.create);
  ipcMain.handle('attendanceType:getAll', attendanceTypeController.getAll);
  ipcMain.handle('attendanceType:getById', attendanceTypeController.getById);
  ipcMain.handle('attendanceType:update', attendanceTypeController.update);
  ipcMain.handle('attendanceType:delete', attendanceTypeController.delete);

  ipcMain.handle('payHead:create', payHeadController.create);
  ipcMain.handle('payHead:getAll', payHeadController.getAll);
  ipcMain.handle('payHead:getById', payHeadController.getById);
  ipcMain.handle('payHead:update', payHeadController.update);
  ipcMain.handle('payHead:delete', payHeadController.delete);
  ipcMain.handle('payHead:getSlabs', payHeadController.getSlabs);
  ipcMain.handle('payHead:createSlab', payHeadController.createSlab);
  ipcMain.handle('payHead:deleteSlab', payHeadController.deleteSlab);
  ipcMain.handle('payHead:getFormulas', payHeadController.getFormulas);
  ipcMain.handle('payHead:createFormula', payHeadController.createFormula);
  ipcMain.handle('payHead:deleteFormula', payHeadController.deleteFormula);

  ipcMain.handle('salaryStructure:create', salaryStructureController.create);
  ipcMain.handle('salaryStructure:getAll', salaryStructureController.getAll);
  ipcMain.handle('salaryStructure:getById', salaryStructureController.getById);
  ipcMain.handle('salaryStructure:getByEmployee', salaryStructureController.getByEmployee);
  ipcMain.handle('salaryStructure:update', salaryStructureController.update);
  ipcMain.handle('salaryStructure:delete', salaryStructureController.delete);
  ipcMain.handle('salaryStructure:createBulk', salaryStructureController.createBulk);

  ipcMain.handle('attendance:create', attendanceController.create);
  ipcMain.handle('attendance:getAll', attendanceController.getAll);
  ipcMain.handle('attendance:getById', attendanceController.getById);
  ipcMain.handle('attendance:delete', attendanceController.delete);
  ipcMain.handle('attendance:getNextNumber', attendanceController.getNextNumber);
}

module.exports = { register };
