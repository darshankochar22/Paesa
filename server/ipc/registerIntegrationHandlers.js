const { ipcMain } = require('electron');

const eInvoiceController = require('../eInvoice/eInvoiceController');
const ewayBillController = require('../ewayBill/ewayBillController');
const gstFilingController = require('../gstFiling/gstFilingController');
const whatsappController = require('../whatsapp/whatsappController');
const aiController = require('../ai/aiController');
const automationController = require('../automation/automationController');
const tallyController = require('../integrations/tally/tallyController');

function register() {
  ipcMain.handle('eInvoice:authenticate', eInvoiceController.authenticate);
  ipcMain.handle('eInvoice:getGSTINDetails', eInvoiceController.getGSTINDetails);
  ipcMain.handle('eInvoice:generateIRN', eInvoiceController.generateIRN);
  ipcMain.handle('eInvoice:getIRNDetails', eInvoiceController.getIRNDetails);
  ipcMain.handle('eInvoice:syncGSTINFromCP', eInvoiceController.syncGSTINFromCP);
  ipcMain.handle('eInvoice:getRejectedIRNs', eInvoiceController.getRejectedIRNs);
  ipcMain.handle('eInvoice:getB2CQRCode', eInvoiceController.getB2CQRCode);
  ipcMain.handle('eInvoice:cancelIRN', eInvoiceController.cancelIRN);
  ipcMain.handle('eInvoice:saveCredentials', eInvoiceController.saveCredentials);
  ipcMain.handle('eInvoice:getCredentials', eInvoiceController.getCredentials);
  ipcMain.handle('eInvoice:getRecords', eInvoiceController.getRecords);
  ipcMain.handle('eInvoice:getRecordByIRN', eInvoiceController.getRecordByIRN);
  ipcMain.handle('eInvoice:getByVoucher', eInvoiceController.getByVoucher);
  ipcMain.handle('eInvoice:getStatus', eInvoiceController.getStatus);
  ipcMain.handle('eInvoice:generateFromVoucher', eInvoiceController.generateFromVoucher);

  ipcMain.handle('ewayBill:getStatus', ewayBillController.getStatus);
  ipcMain.handle('ewayBill:generateFromVoucher', ewayBillController.generateFromVoucher);
  ipcMain.handle('ewayBill:generateByIrn', ewayBillController.generateByIrn);
  ipcMain.handle('ewayBill:cancel', ewayBillController.cancel);
  ipcMain.handle('ewayBill:get', ewayBillController.get);
  ipcMain.handle('ewayBill:getByIrn', ewayBillController.getByIrn);
  ipcMain.handle('ewayBill:getByVoucher', ewayBillController.getByVoucher);
  ipcMain.handle('ewayBill:getRecords', ewayBillController.getRecords);
  ipcMain.handle('ewayBill:generate', ewayBillController.generate);
  ipcMain.handle('ewayBill:updatePartB', ewayBillController.updatePartB);
  ipcMain.handle('ewayBill:generateConsolidated', ewayBillController.generateConsolidated);
  ipcMain.handle('ewayBill:reject', ewayBillController.reject);
  ipcMain.handle('ewayBill:updateTransporter', ewayBillController.updateTransporter);
  ipcMain.handle('ewayBill:extendValidity', ewayBillController.extendValidity);
  ipcMain.handle('ewayBill:regenerateConsolidated', ewayBillController.regenerateConsolidated);
  ipcMain.handle('ewayBill:initMultiVehicle', ewayBillController.initMultiVehicle);
  ipcMain.handle('ewayBill:addMultiVehicle', ewayBillController.addMultiVehicle);
  ipcMain.handle('ewayBill:closeEwb', ewayBillController.closeEwb);
  ipcMain.handle('ewayBill:forTransporterByDate', ewayBillController.forTransporterByDate);
  ipcMain.handle('ewayBill:forTransporterByState', ewayBillController.forTransporterByState);
  ipcMain.handle('ewayBill:forTransporterByGstin', ewayBillController.forTransporterByGstin);
  ipcMain.handle(
    'ewayBill:reportByTransporterAssignedDate',
    ewayBillController.reportByTransporterAssignedDate,
  );
  ipcMain.handle('ewayBill:byDate', ewayBillController.byDate);
  ipcMain.handle('ewayBill:rejectedByOthers', ewayBillController.rejectedByOthers);
  ipcMain.handle('ewayBill:ofOtherParty', ewayBillController.ofOtherParty);
  ipcMain.handle('ewayBill:getConsolidated', ewayBillController.getConsolidated);
  ipcMain.handle('ewayBill:byConsigner', ewayBillController.byConsigner);
  ipcMain.handle('ewayBill:getErrorList', ewayBillController.getErrorList);
  ipcMain.handle('ewayBill:getGstinDetails', ewayBillController.getGstinDetails);
  ipcMain.handle('ewayBill:getTransporterDetails', ewayBillController.getTransporterDetails);
  ipcMain.handle('ewayBill:getHsnDetails', ewayBillController.getHsnDetails);
  ipcMain.handle('ewayBill:ewayRequest', ewayBillController.ewayRequest);

  ipcMain.handle('gstFiling:getStatus', gstFilingController.getStatus);
  ipcMain.handle('gstFiling:prepare', gstFilingController.prepare);
  ipcMain.handle('gstFiling:saveToPortal', gstFilingController.saveToPortal);
  ipcMain.handle('gstFiling:fileReturn', gstFilingController.fileReturn);
  ipcMain.handle('gstFiling:getFilings', gstFilingController.getFilings);
  ipcMain.handle('gstFiling:markAsFiled', gstFilingController.markAsFiled);
  ipcMain.handle('gstFiling:updateArn', gstFilingController.updateArn);
  ipcMain.handle('gstFiling:getFilingInfo', gstFilingController.getFilingInfo);
  ipcMain.handle('gstFiling:requestOtp', gstFilingController.requestOtp);
  ipcMain.handle('gstFiling:authenticate', gstFilingController.authenticate);
  ipcMain.handle('gstFiling:requestEvc', gstFilingController.requestEvc);
  ipcMain.handle('gstFiling:getReturnStatus', gstFilingController.getReturnStatus);
  ipcMain.handle('gstFiling:portalRequest', gstFilingController.portalRequest);
  ipcMain.handle('gstFiling:getSection', gstFilingController.getSection);
  ipcMain.handle('gstFiling:getSummary', gstFilingController.getSummary);
  ipcMain.handle('gstFiling:retTrack', gstFilingController.retTrack);
  ipcMain.handle('gstFiling:publicSearch', gstFilingController.publicSearch);
  ipcMain.handle('gstFiling:publicRetTrack', gstFilingController.publicRetTrack);
  ipcMain.handle('gstFiling:getPreferences', gstFilingController.getPreferences);
  ipcMain.handle('gstFiling:urdDetails', gstFilingController.urdDetails);
  ipcMain.handle('gstFiling:urdValidate', gstFilingController.urdValidate);
  ipcMain.handle('gstFiling:refreshToken', gstFilingController.refreshToken);
  ipcMain.handle('gstFiling:requestEvcFor', gstFilingController.requestEvcFor);

  ipcMain.handle('whatsapp:saveConfig', whatsappController.saveConfig);
  ipcMain.handle('whatsapp:getConfig', whatsappController.getConfig);
  ipcMain.handle('whatsapp:sendInvoice', whatsappController.sendInvoice);
  ipcMain.handle('whatsapp:sendPaymentReminder', whatsappController.sendPaymentReminder);
  ipcMain.handle('whatsapp:sendStatement', whatsappController.sendStatement);
  ipcMain.handle('whatsapp:sendText', whatsappController.sendText);
  ipcMain.handle('whatsapp:getLogs', whatsappController.getLogs);
  ipcMain.handle('whatsapp:verifyWebhook', whatsappController.verifyWebhook);
  ipcMain.handle('whatsapp:getStatus', whatsappController.getStatus);
  ipcMain.handle('whatsapp:sendTemplate', whatsappController.sendTemplate);
  ipcMain.handle('whatsapp:sendDocument', whatsappController.sendDocument);
  ipcMain.handle('whatsapp:importContacts', whatsappController.importContacts);
  ipcMain.handle('whatsapp:getConversations', whatsappController.getConversations);
  ipcMain.handle('whatsapp:getConversation', whatsappController.getConversation);
  ipcMain.handle('whatsapp:syncConversation', whatsappController.syncConversation);
  ipcMain.handle('whatsapp:markRead', whatsappController.markRead);
  ipcMain.handle('whatsapp:reply', whatsappController.reply);
  ipcMain.handle('whatsapp:getTemplates', whatsappController.getTemplates);
  ipcMain.handle('whatsapp:syncTemplates', whatsappController.syncTemplates);
  ipcMain.handle('whatsapp:runCampaign', whatsappController.runCampaign);
  ipcMain.handle('whatsapp:getCampaigns', whatsappController.getCampaigns);

  ipcMain.handle('ai:getKeyStatus', aiController.getKeyStatus);
  ipcMain.handle('ai:ask', aiController.ask);

  ipcMain.handle('automation:getVoucherSchema', automationController.getVoucherSchema);
  ipcMain.handle('automation:validateVoucher', automationController.validateVoucher);
  ipcMain.handle('automation:createVoucher', automationController.createVoucher);

  ipcMain.handle('tally:testConnection', tallyController.testConnection);
  ipcMain.handle('tally:preview', tallyController.preview);
  ipcMain.handle('tally:importMasters', tallyController.importMasters);
  ipcMain.handle('tally:importVouchers', tallyController.importVouchers);
}

module.exports = { register };
