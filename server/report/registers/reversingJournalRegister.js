const { getRegisterData } = require('../utils/registerBuilder');

const reversingJournalRegister = async (company_id, fy_id) => {
  try {
    const rows = await getRegisterData(company_id, fy_id, 'Reversing Journal');
    return { success: true, rows };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = { reversingJournalRegister };
