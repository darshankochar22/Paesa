const fs = require('fs');
const path = require('path');
const { getReport } = require('./reportRegistry');

let userDataPath;
try {
  const { app } = require('electron');
  userDataPath = app.getPath('userData');
} catch (e) {
  userDataPath = process.env.TEST_USER_DATA_PATH || require('os').tmpdir();
}

const SAVED_VIEWS_FILE = path.join(userDataPath, 'saved_views.json');

function readSavedViews() {
  try {
    if (!fs.existsSync(SAVED_VIEWS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(SAVED_VIEWS_FILE, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading saved views:', err);
    return [];
  }
}

function writeSavedViews(views) {
  try {
    fs.writeFileSync(SAVED_VIEWS_FILE, JSON.stringify(views, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing saved views:', err);
    return false;
  }
}

async function runReport(reportId, params = {}) {
  const report = getReport(reportId);
  if (!report) {
    return { success: false, error: `Report definition not found: ${reportId}` };
  }
  try {
    const company_id = Number(params.company_id);
    const fy_id = Number(params.fy_id);
    if (!company_id || !fy_id) {
      return { success: false, error: 'company_id and fy_id are required' };
    }
    return await report.run(company_id, fy_id, params);
  } catch (err) {
    console.error(`Error running report ${reportId}:`, err);
    return { success: false, error: err.message };
  }
}

async function getSavedViews(company_id) {
  const views = readSavedViews();
  return {
    success: true,
    views: views.filter(v => Number(v.company_id) === Number(company_id))
  };
}

async function saveView(view) {
  try {
    if (!view || !view.company_id || !view.name || !view.reportId) {
      return { success: false, error: 'Invalid view data: company_id, name, and reportId are required' };
    }
    const views = readSavedViews();
    const id = view.id || `view_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newView = {
      ...view,
      id,
      createdAt: view.createdAt || new Date().toISOString()
    };

    const index = views.findIndex(v => v.id === id);
    if (index > -1) {
      views[index] = newView;
    } else {
      views.push(newView);
    }

    writeSavedViews(views);
    return { success: true, view: newView };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function deleteSavedView(id) {
  try {
    const views = readSavedViews();
    const filtered = views.filter(v => v.id !== id);
    writeSavedViews(filtered);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = {
  runReport,
  getSavedViews,
  saveView,
  deleteSavedView
};
