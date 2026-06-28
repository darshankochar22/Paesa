const { ipcMain } = require('electron');

const eInvoiceController = require('../eInvoice/eInvoiceController');
const whatsappController = require('../whatsapp/whatsappController');
const aiController = require('../ai/aiController');
const tallyController = require('../integrations/tally/tallyController');

function register() {
  ipcMain.handle('eInvoice:authenticate', eInvoiceController.authenticate);
  ipcMain.handle('eInvoice:getGSTINDetails', eInvoiceController.getGSTINDetails);
  ipcMain.handle('eInvoice:generateIRN', eInvoiceController.generateIRN);
  ipcMain.handle('eInvoice:getIRNDetails', eInvoiceController.getIRNDetails);
  ipcMain.handle('eInvoice:cancelIRN', eInvoiceController.cancelIRN);
  ipcMain.handle('eInvoice:saveCredentials', eInvoiceController.saveCredentials);
  ipcMain.handle('eInvoice:getCredentials', eInvoiceController.getCredentials);
  ipcMain.handle('eInvoice:getRecords', eInvoiceController.getRecords);
  ipcMain.handle('eInvoice:getRecordByIRN', eInvoiceController.getRecordByIRN);

  ipcMain.handle('whatsapp:saveConfig', whatsappController.saveConfig);
  ipcMain.handle('whatsapp:getConfig', whatsappController.getConfig);
  ipcMain.handle('whatsapp:sendInvoice', whatsappController.sendInvoice);
  ipcMain.handle('whatsapp:sendPaymentReminder', whatsappController.sendPaymentReminder);
  ipcMain.handle('whatsapp:sendStatement', whatsappController.sendStatement);
  ipcMain.handle('whatsapp:sendText', whatsappController.sendText);
  ipcMain.handle('whatsapp:getLogs', whatsappController.getLogs);
  ipcMain.handle('whatsapp:verifyWebhook', whatsappController.verifyWebhook);

  ipcMain.handle('ai:getKeyStatus', aiController.getKeyStatus);
  ipcMain.handle('ai:setKey', aiController.setKey);
  ipcMain.handle('ai:clearKey', aiController.clearKey);
  ipcMain.handle('ai:testKey', aiController.testKey);
  ipcMain.handle('ai:ask', aiController.ask);

  ipcMain.handle('tally:testConnection', tallyController.testConnection);
  ipcMain.handle('tally:preview', tallyController.preview);
  ipcMain.handle('tally:importMasters', tallyController.importMasters);
  ipcMain.handle('tally:importVouchers', tallyController.importVouchers);
}

module.exports = { register };
