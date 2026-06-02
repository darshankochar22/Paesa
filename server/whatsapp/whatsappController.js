const whatsappService = require('./whatsappService');

module.exports = {
  saveConfig: async (event, data) => {
    return await whatsappService.saveConfig(data);
  },

  getConfig: async (event, { company_id }) => {
    return await whatsappService.getConfig(company_id);
  },

  sendInvoice: async (event, { company_id, voucher_id, to_phone, invoice_data }) => {
    return await whatsappService.sendInvoice(company_id, voucher_id, to_phone, invoice_data);
  },

  sendPaymentReminder: async (event, { company_id, to_phone, reminder_data }) => {
    return await whatsappService.sendPaymentReminder(company_id, to_phone, reminder_data);
  },

  sendStatement: async (event, { company_id, to_phone, statement_data }) => {
    return await whatsappService.sendStatement(company_id, to_phone, statement_data);
  },

  sendText: async (event, { company_id, to_phone, message }) => {
    return await whatsappService.sendText(company_id, to_phone, message);
  },

  getLogs: async (event, { company_id, limit }) => {
    return await whatsappService.getLogs(company_id, limit);
  },

  verifyWebhook: async (event, { mode, token, challenge, verify_token }) => {
    return whatsappService.verifyWebhook(mode, token, challenge, verify_token);
  },
};