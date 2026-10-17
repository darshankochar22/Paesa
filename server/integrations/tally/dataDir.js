// ---------------------------------------------------------------------------
// Locating a TallyPrime company data folder: the one that holds Manager.1800
// and TranMgr.1800. Shared by the folder-import IPC handlers and the
// Copilot's read-only Tally review.
// ---------------------------------------------------------------------------
'use strict';

const fs = require('fs');
const path = require('path');

// A TallyPrime data folder must contain these native files.
const REQUIRED_BIN_FILES = ['Manager.1800', 'TranMgr.1800'];

// Resolve the company data dir for a picked folder.
//   { dir }           -> the folder itself, or its single company sub-dir, holds the .1800 files
//   { candidates }     -> the folder holds several company sub-dirs (Data/<number>/...); ambiguous
//   { dir:null }       -> no Tally data anywhere under it
const resolveTallyDataDir = (folder) => {
  const has = (dir) => REQUIRED_BIN_FILES.every((f) => fs.existsSync(path.join(dir, f)));
  if (folder && has(folder)) return { dir: folder, candidates: [] };
  let entries = [];
  try {
    entries = fs.readdirSync(folder, { withFileTypes: true });
  } catch (_) {
    return { dir: null, candidates: [] };
  }
  const hits = entries
    .filter((e) => e.isDirectory())
    .map((e) => path.join(folder, e.name))
    .filter(has);
  if (hits.length === 1) return { dir: hits[0], candidates: [] };
  return { dir: null, candidates: hits };
};

// Human message for the "no single data dir" case.
const dataDirError = (candidates) =>
  candidates && candidates.length > 1
    ? `This folder holds ${candidates.length} companies (${candidates
        .map((c) => path.basename(c))
        .join(', ')}). Open one company sub-folder instead.`
    : 'No TallyPrime data here (Manager.1800 / TranMgr.1800 not found).';

module.exports = { REQUIRED_BIN_FILES, resolveTallyDataDir, dataDirError };
