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

const hasBinFiles = (dir) => REQUIRED_BIN_FILES.every((f) => fs.existsSync(path.join(dir, f)));

// Resolve the company data dir for a picked folder.
//   { dir }           -> the folder itself, or its single company sub-dir, holds the .1800 files
//   { candidates }     -> the folder holds several company sub-dirs (Data/<number>/...); ambiguous
//   { dir:null }       -> no Tally data anywhere under it
const resolveTallyDataDir = (folder) => {
  if (folder && hasBinFiles(folder)) return { dir: folder, candidates: [] };
  let entries = [];
  try {
    entries = fs.readdirSync(folder, { withFileTypes: true });
  } catch (_) {
    return { dir: null, candidates: [] };
  }
  const hits = entries
    .filter((e) => e.isDirectory())
    .map((e) => path.join(folder, e.name))
    .filter(hasBinFiles);
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

// The folder attached in the Copilot, narrowed to one company. `root` came from the OS
// folder dialog; the model may only add companyDir, the NAME of a direct sub-folder that
// holds the .1800 files. Anything else ("../x", a path) is refused, so a tool call can
// never point the reader at another place on disk. Returns { dir, candidates, error? }
// where candidates are company folder names.
const resolveAttachedDataDir = (root, companyDir) => {
  if (companyDir == null || companyDir === '') {
    const { dir, candidates } = resolveTallyDataDir(root);
    const names = candidates.map((c) => path.basename(c));
    if (dir) return { dir, candidates: [] };
    const error =
      names.length > 1
        ? `This folder holds ${names.length} companies (${names.join(', ')}). Pass company_dir to choose one.`
        : dataDirError(candidates);
    return { dir: null, candidates: names, error };
  }
  const name = String(companyDir);
  if (name !== path.basename(name) || name === '.' || name === '..') {
    return {
      dir: null,
      candidates: [],
      error:
        'company_dir must be the name of a company folder listed by tally_inspect, not a path.',
    };
  }
  if (!hasBinFiles(path.join(root, name))) {
    return {
      dir: null,
      candidates: [],
      error: `"${name}" is not a company folder in the attached folder. Use a company_dir listed by tally_inspect.`,
    };
  }
  return { dir: path.join(root, name), candidates: [] };
};

module.exports = {
  REQUIRED_BIN_FILES,
  resolveTallyDataDir,
  resolveAttachedDataDir,
  dataDirError,
};
