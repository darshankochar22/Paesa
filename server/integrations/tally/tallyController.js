// ---------------------------------------------------------------------------
// Tally integration controller (IPC handlers).
//
// Wires the read-side client + pure parser + importer into the app's IPC layer.
// Every handler accepts EITHER a live Tally endpoint ({ host, port }) — in which
// case it fetches the XML over HTTP — OR a raw { xml } string (parse-only), so
// the whole connector works without a live Tally on :9000 (the test/sample path).
//
// Channels (registered in server/index.js):
//   tally:testConnection  -> testConnection({ host, port })
//   tally:preview         -> preview({ xml } | { host, port, from_date, to_date })
//   tally:importMasters   -> importMasters({ company_id, fy_id, host, port | xml })
//   tally:importVouchers  -> importVouchers({ company_id, fy_id, host, port,
//                                             from_date, to_date | xml })
//
// HARD RULES: CommonJS. No direct DB access here — all writes go through the
// importer, which goes through the existing services. The controller only
// orchestrates fetch -> parse -> import and shapes { success, ... } results.
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const client = require('./client');
const parser = require('./xmlParser');
const importer = require('./importer');
const { extractCompany } = require('./binExtract');
const { adapt, importParsed } = require('./binImportRunner');
const { repairImportedGst } = require('./gstBackfill');

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

// Fetch master XML (groups + ledgers + stock items + units) from a live Tally
// and return one merged ParsedTally. Returns { success:false, error } on the
// first unreachable/failed request.
const fetchAndParseMasters = async (options) => {
  const [g, l, s] = await Promise.all([
    client.fetchGroups(options),
    client.fetchLedgers(options),
    client.fetchStockItems(options),
  ]);

  for (const r of [g, l, s]) {
    if (!r.success) {
      return { success: false, error: r.error, code: r.code, status: r.status };
    }
  }

  const parsed = {
    meta: { source: 'tally-xml', requestType: 'Export', collectionType: 'Master' },
    groups: parser.parseGroups(g.xml),
    ledgers: parser.parseLedgers(l.xml),
    stockItems: parser.parseStockItems(s.xml),
    vouchers: [],
  };
  return { success: true, parsed };
};

// Fetch voucher (Day Book) XML from a live Tally and return a ParsedTally that
// carries only vouchers.
const fetchAndParseVouchers = async (from_date, to_date, options) => {
  const v = await client.fetchVouchers(from_date, to_date, options);
  if (!v.success) {
    return { success: false, error: v.error, code: v.code, status: v.status };
  }
  const parsed = {
    meta: { source: 'tally-xml', requestType: 'Export', collectionType: 'Voucher' },
    groups: [],
    ledgers: [],
    stockItems: [],
    vouchers: parser.parseVouchers(v.xml),
  };
  return { success: true, parsed };
};

module.exports = {
  // Probe a live Tally endpoint. Returns reachability + the open company name.
  //   testConnection({ host, port })
  testConnection: async (_event, { host, port } = {}) => {
    const result = await client.testConnection({ host, port });
    if (result.reachable) {
      return { success: true, reachable: true, company: result.company || null };
    }
    return {
      success: false,
      reachable: false,
      error: result.error,
      code: result.code,
      status: result.status,
    };
  },

  // Dry-run: count what would be imported. No DB writes.
  // Accepts a raw { xml } (parse-only) OR a live { host, port[, from_date, to_date] }.
  // With a live endpoint it pulls BOTH masters and (when dates given) vouchers.
  //   preview({ xml }) | preview({ host, port, from_date, to_date })
  preview: async (_event, payload = {}) => {
    try {
      const { xml, host, port, from_date, to_date } = payload;

      if (xml != null) {
        const parsed = parser.parse(xml);
        return { success: true, preview: importer.preview(parsed) };
      }

      // Live: fetch masters, plus vouchers when a date range is supplied.
      const m = await fetchAndParseMasters({ host, port });
      if (!m.success) return m;

      const parsed = m.parsed;
      if (from_date != null && to_date != null) {
        const v = await fetchAndParseVouchers(from_date, to_date, { host, port });
        if (!v.success) return v;
        parsed.vouchers = v.parsed.vouchers;
      }

      return { success: true, preview: importer.preview(parsed) };
    } catch (err) {
      return { success: false, error: err && err.message ? err.message : String(err) };
    }
  },

  // Import master data (groups -> units -> ledgers -> stock items) into the
  // active company. Accepts raw { xml } or a live { host, port }.
  //   importMasters({ company_id, fy_id, xml | host, port })
  importMasters: async (_event, payload = {}) => {
    try {
      const { company_id, fy_id, xml, host, port } = payload;
      if (company_id == null) {
        return { success: false, error: 'company_id is required' };
      }

      let parsed;
      if (xml != null) {
        parsed = parser.parse(xml);
      } else {
        const m = await fetchAndParseMasters({ host, port });
        if (!m.success) return m;
        parsed = m.parsed;
      }

      // importMode carries Tally opening balances onto pre-seeded ledgers
      // (Cash / P&L A/c) and inserts historical tax lines verbatim — the same
      // fidelity the .1800 folder import gets.
      const result = await importer.importMasters(parsed, { company_id, fy_id, importMode: true });
      return {
        success: true,
        groups: result.groups,
        units: result.units,
        ledgers: result.ledgers,
        stockItems: result.stockItems,
      };
    } catch (err) {
      return { success: false, error: err && err.message ? err.message : String(err) };
    }
  },

  // Import vouchers (Day Book) into the active company + financial year.
  // Accepts raw { xml } or a live { host, port, from_date, to_date }.
  //   importVouchers({ company_id, fy_id, xml | host, port, from_date, to_date })
  importVouchers: async (_event, payload = {}) => {
    try {
      const { company_id, fy_id, xml, host, port, from_date, to_date } = payload;
      if (company_id == null) {
        return { success: false, error: 'company_id is required' };
      }
      if (fy_id == null) {
        return { success: false, error: 'fy_id is required for voucher import' };
      }

      let parsed;
      if (xml != null) {
        parsed = parser.parse(xml);
      } else {
        const v = await fetchAndParseVouchers(from_date, to_date, { host, port });
        if (!v.success) return v;
        parsed = v.parsed;
      }

      const result = await importer.importVouchers(parsed, { company_id, fy_id, importMode: true });
      return { success: true, vouchers: result.vouchers };
    } catch (err) {
      return { success: false, error: err && err.message ? err.message : String(err) };
    }
  },

  // ---- TallyPrime native-folder import (.1800 binary) --------------------

  // Open a native directory picker so the user selects their Tally data folder.
  //   pickTallyFolder()
  pickTallyFolder: async () => {
    try {
      const { dialog, BrowserWindow } = require('electron');
      const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0] || null;
      const res = await dialog.showOpenDialog(win, {
        title: 'Select TallyPrime data folder',
        properties: ['openDirectory'],
        message:
          'Choose the company folder (or the Data folder) containing Manager.1800 / TranMgr.1800',
      });
      if (res.canceled || !res.filePaths || !res.filePaths.length) {
        return { success: true, canceled: true };
      }
      const folder = res.filePaths[0];
      const { dir, candidates } = resolveTallyDataDir(folder);
      return {
        success: true,
        canceled: false,
        folder,
        dataDir: dir,
        valid: !!dir,
        error: dir ? null : dataDirError(candidates),
      };
    } catch (err) {
      return { success: false, error: err && err.message ? err.message : String(err) };
    }
  },

  // Decode a folder WITHOUT writing anything — returns counts so the UI can
  // preview before committing.  previewTallyFolder({ folder })
  previewTallyFolder: async (_event, { folder } = {}) => {
    try {
      const { dir: dataDir, candidates } = resolveTallyDataDir(folder || '');
      if (!dataDir) return { success: false, error: dataDirError(candidates) };
      const { masters, vouchers } = extractCompany(dataDir);
      const { parsed } = adapt(masters, { vouchers }, {});
      return { success: true, dataDir, preview: importer.preview(parsed) };
    } catch (err) {
      return { success: false, error: err && err.message ? err.message : String(err) };
    }
  },

  // Full import of a TallyPrime folder into a NEW (or matched) company.
  //   importTallyFolder({ folder, company_name, fy_start, preserve_numbers })
  // Repairs the GST fields a pre-existing Tally import left empty (UQC, GST tax-ledger
  // tagging, per-line gst_rate). New imports fill these inline; this is for companies
  // imported before that. `dry_run` reports what would change without writing.
  repairImportedGst: async (_event, { company_id, fy_id, dry_run = false } = {}) => {
    return await repairImportedGst(company_id, fy_id, { dryRun: dry_run });
  },

  importTallyFolder: async (
    event,
    { folder, company_name, fy_start, preserve_numbers = true } = {},
  ) => {
    try {
      const { dir: dataDir, candidates } = resolveTallyDataDir(folder || '');
      if (!dataDir) return { success: false, error: dataDirError(candidates) };
      if (!company_name || !company_name.trim())
        return { success: false, error: 'Company name is required.' };
      if (!fy_start || !/^\d{4}-\d{2}-\d{2}$/.test(fy_start))
        return { success: false, error: 'Financial-year start (YYYY-MM-DD) is required.' };

      const send = (info) => {
        try {
          event && event.sender && event.sender.send('tally:folderImportProgress', info);
        } catch (_) {}
      };
      send({ phase: 'extract' });
      const { masters, vouchers } = extractCompany(dataDir);
      const { parsed } = adapt(masters, { vouchers }, {});
      send({ phase: 'extracted', preview: importer.preview(parsed) });

      const summary = await importParsed(parsed, {
        company: company_name.trim(),
        fyStart: fy_start,
        preserveNumbers: !!preserve_numbers,
        companyGstin: (masters.company && masters.company.gstin) || null,
        gstRegistrations: masters.gstRegistrations || [],
        onProgress: (phase, i) => send({ phase, ...i }),
      });
      return { success: true, summary };
    } catch (err) {
      return { success: false, error: err && err.message ? err.message : String(err) };
    }
  },
};
