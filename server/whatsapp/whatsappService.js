const https = require('https');
const { db } = require('../db/index');
const { sql, eq } = require('drizzle-orm');
const { whatsappConfig, whatsappLogs } = require('../db/schema');

const META_API_VERSION = 'v19.0';
const META_HOST = 'graph.facebook.com';

const post = (path, body, token) =>
  new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const options = {
      hostname: META_HOST,
      path,
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });

const get = (path, token) =>
  new Promise((resolve, reject) => {
    const options = {
      hostname: META_HOST,
      path,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.end();
  });


const normalizePhone = (phone) => {
  let num = phone.replace(/[\s\-\(\)]/g, '');
  if (num.startsWith('0')) num = '91' + num.slice(1);
  if (!num.startsWith('91') && num.length === 10) num = '91' + num;
  if (num.startsWith('+')) num = num.slice(1);
  return num;
};

const saveConfig = async (data) => {
  try {
    const existing = await db.all(
      sql`SELECT * FROM ${whatsappConfig} WHERE ${whatsappConfig.companyId} = ${data.company_id}`
    );
    if (existing.length > 0) {
      await db
        .update(whatsappConfig)
        .set({
          phoneNumberId: data.phone_number_id,
          wabaId: data.waba_id,
          accessToken: data.access_token,
          isActive: 1,
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(whatsappConfig.companyId, data.company_id));
    } else {
      await db
        .insert(whatsappConfig)
        .values({
          companyId: data.company_id,
          phoneNumberId: data.phone_number_id,
          wabaId: data.waba_id,
          accessToken: data.access_token,
        });
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const getConfig = async (company_id) => {
  try {
    const rows = await db.all(
      sql`SELECT * FROM ${whatsappConfig}
          WHERE ${whatsappConfig.companyId} = ${company_id}
            AND ${whatsappConfig.isActive} = 1`
    );
    if (rows.length === 0) return { success: false, error: 'WhatsApp not configured' };
    return { success: true, config: rows[0] };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const saveLog = async (company_id, voucher_id, to_number, message_type, template_name, status, wamid, error) => {
  try {
    await db
      .insert(whatsappLogs)
      .values({
        companyId: company_id,
        voucherId: voucher_id || null,
        toNumber: to_number,
        messageType: message_type,
        templateName: template_name || null,
        status: status,
        wamid: wamid || null,
        error: error || null,
      });
  } catch (_) {}
};

const sendInvoice = async (company_id, voucher_id, to_phone, invoice_data) => {
  try {
    const configRes = await getConfig(company_id);
    if (!configRes.success) return configRes;
    const { phone_number_id, access_token } = configRes.config;

    const phone = normalizePhone(to_phone);

    const body = {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'template',
      template: {
        name: 'invoice_share',         
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: invoice_data.party_name || 'Customer' },
              { type: 'text', text: invoice_data.voucher_number },
              { type: 'text', text: invoice_data.date },
              { type: 'text', text: `₹${invoice_data.total_amount}` },
            ],
          },
        ],
      },
    };

    const res = await post(
      `/${META_API_VERSION}/${phone_number_id}/messages`,
      body,
      access_token
    );

    const wamid   = res.body?.messages?.[0]?.id || null;
    const success = res.status === 200 && !!wamid;

    await saveLog(
      company_id, voucher_id, phone,
      'INVOICE', 'invoice_share',
      success ? 'SENT' : 'FAILED',
      wamid,
      success ? null : JSON.stringify(res.body?.error)
    );

    return success
      ? { success: true, wamid }
      : { success: false, error: res.body?.error?.message || 'Failed to send' };

  } catch (err) {
    return { success: false, error: err.message };
  }
};


const sendPaymentReminder = async (company_id, to_phone, reminder_data) => {
  try {
    const configRes = await getConfig(company_id);
    if (!configRes.success) return configRes;
    const { phone_number_id, access_token } = configRes.config;

    const phone = normalizePhone(to_phone);

    const body = {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'template',
      template: {
        name: 'payment_reminder',      
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: reminder_data.party_name },
              { type: 'text', text: `₹${reminder_data.outstanding_amount}` },
              { type: 'text', text: reminder_data.due_date || 'immediately' },
            ],
          },
        ],
      },
    };

    const res = await post(
      `/${META_API_VERSION}/${phone_number_id}/messages`,
      body,
      access_token
    );

    const wamid   = res.body?.messages?.[0]?.id || null;
    const success = res.status === 200 && !!wamid;

    await saveLog(
      company_id, null, phone,
      'PAYMENT_REMINDER', 'payment_reminder',
      success ? 'SENT' : 'FAILED',
      wamid,
      success ? null : JSON.stringify(res.body?.error)
    );

    return success
      ? { success: true, wamid }
      : { success: false, error: res.body?.error?.message || 'Failed to send' };

  } catch (err) {
    return { success: false, error: err.message };
  }
};

const sendStatement = async (company_id, to_phone, statement_data) => {
  try {
    const configRes = await getConfig(company_id);
    if (!configRes.success) return configRes;
    const { phone_number_id, access_token } = configRes.config;

    const phone = normalizePhone(to_phone);

    const body = {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'template',
      template: {
        name: 'account_statement',
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: statement_data.party_name },
              { type: 'text', text: statement_data.from_date },
              { type: 'text', text: statement_data.to_date },
              { type: 'text', text: `₹${statement_data.closing_balance}` },
            ],
          },
        ],
      },
    };

    const res = await post(
      `/${META_API_VERSION}/${phone_number_id}/messages`,
      body,
      access_token
    );

    const wamid   = res.body?.messages?.[0]?.id || null;
    const success = res.status === 200 && !!wamid;

    await saveLog(
      company_id, null, phone,
      'STATEMENT', 'account_statement',
      success ? 'SENT' : 'FAILED',
      wamid,
      success ? null : JSON.stringify(res.body?.error)
    );

    return success
      ? { success: true, wamid }
      : { success: false, error: res.body?.error?.message || 'Failed to send' };

  } catch (err) {
    return { success: false, error: err.message };
  }
};

const sendText = async (company_id, to_phone, message) => {
  try {
    const configRes = await getConfig(company_id);
    if (!configRes.success) return configRes;
    const { phone_number_id, access_token } = configRes.config;

    const phone = normalizePhone(to_phone);

    const body = {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'text',
      text: { body: message },
    };

    const res = await post(
      `/${META_API_VERSION}/${phone_number_id}/messages`,
      body,
      access_token
    );

    const wamid   = res.body?.messages?.[0]?.id || null;
    const success = res.status === 200 && !!wamid;

    await saveLog(
      company_id, null, phone,
      'TEXT', null,
      success ? 'SENT' : 'FAILED',
      wamid,
      success ? null : JSON.stringify(res.body?.error)
    );

    return success
      ? { success: true, wamid }
      : { success: false, error: res.body?.error?.message || 'Failed to send' };

  } catch (err) {
    return { success: false, error: err.message };
  }
};

const getLogs = async (company_id, limit = 50) => {
  try {
    const rows = await db.all(
      sql`SELECT * FROM ${whatsappLogs}
          WHERE ${whatsappLogs.companyId} = ${company_id}
          ORDER BY ${whatsappLogs.sentAt} DESC
          LIMIT ${limit}`
    );
    return { success: true, logs: rows };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const verifyWebhook = (mode, token, challenge, verify_token) => {
  if (mode === 'subscribe' && token === verify_token) {
    return { success: true, challenge };
  }
  return { success: false, error: 'Verification failed' };
};

module.exports = {
  saveConfig,
  getConfig,
  sendInvoice,
  sendPaymentReminder,
  sendStatement,
  sendText,
  getLogs,
  verifyWebhook,
};