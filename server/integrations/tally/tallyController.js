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
const client = require("./client");
const parser = require("./xmlParser");
const importer = require("./importer");

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
    meta: { source: "tally-xml", requestType: "Export", collectionType: "Master" },
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
    meta: { source: "tally-xml", requestType: "Export", collectionType: "Voucher" },
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
        return { success: false, error: "company_id is required" };
      }

      let parsed;
      if (xml != null) {
        parsed = parser.parse(xml);
      } else {
        const m = await fetchAndParseMasters({ host, port });
        if (!m.success) return m;
        parsed = m.parsed;
      }

      const result = await importer.importMasters(parsed, { company_id, fy_id });
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
        return { success: false, error: "company_id is required" };
      }
      if (fy_id == null) {
        return { success: false, error: "fy_id is required for voucher import" };
      }

      let parsed;
      if (xml != null) {
        parsed = parser.parse(xml);
      } else {
        const v = await fetchAndParseVouchers(from_date, to_date, { host, port });
        if (!v.success) return v;
        parsed = v.parsed;
      }

      const result = await importer.importVouchers(parsed, { company_id, fy_id });
      return { success: true, vouchers: result.vouchers };
    } catch (err) {
      return { success: false, error: err && err.message ? err.message : String(err) };
    }
  },
};
