// Synthetic TallyPrime test data. Never real customer data: every name, number and
// GSTIN here is invented.
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

// A throwaway Tally "Data" folder with one sub-folder per company, each holding empty
// Manager.1800 / TranMgr.1800 files (enough for the folder checks; tests mock the decoder).
// Returns { root, dirs: { <company>: path }, remove() }.
function makeTallyFolder({ companies = ['10000'] } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'paesa-tally-'));
  const dirs = {};
  for (const name of companies) {
    const dir = path.join(root, name);
    fs.mkdirSync(dir);
    for (const file of ['Manager.1800', 'TranMgr.1800']) fs.writeFileSync(path.join(dir, file), '');
    dirs[name] = dir;
  }
  return { root, dirs, remove: () => fs.rmSync(root, { recursive: true, force: true }) };
}

module.exports = { makeTallyFolder };
