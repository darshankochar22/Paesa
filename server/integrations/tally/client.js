// ---------------------------------------------------------------------------
// Tally HTTP/XML client (read-side).
//
// Tally runs an HTTP server (default 127.0.0.1:9000) that accepts a POSTed XML
// <ENVELOPE> request and replies with an XML <ENVELOPE> response. This module is
// the thin networking layer: it POSTs a request XML string and returns the raw
// XML response text. Parsing is the parser's job; DB work is the importer's job.
//
// Uses the global fetch (Node 18+ / Electron). All network errors are caught and
// surfaced as structured results — we never throw raw network errors at callers.
// CommonJS module.
// ---------------------------------------------------------------------------
const xmlRequests = require("./xmlRequests");

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 9000;
const DEFAULT_TIMEOUT_MS = 15000;

// POST a raw XML envelope to Tally and return the raw XML response text.
//
//   postToTally(xml, { host, port, timeoutMs })
//
// Returns: { success: true, status, xml }  on a 2xx response
//          { success: false, error, code }  on network / non-2xx errors
const postToTally = async (xml, options = {}) => {
  const {
    host = DEFAULT_HOST,
    port = DEFAULT_PORT,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  const url = `http://${host}:${port}`;

  // AbortController-based timeout so a non-listening port doesn't hang forever.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml;charset=utf-16",
      },
      body: xml,
      signal: controller.signal,
    });

    const responseText = await res.text();

    if (!res.ok) {
      return {
        success: false,
        status: res.status,
        error: `Tally responded with HTTP ${res.status}`,
        xml: responseText,
      };
    }

    return { success: true, status: res.status, xml: responseText };
  } catch (err) {
    // Network unreachable, connection refused, DNS, abort/timeout, etc.
    const isAbort = err && (err.name === "AbortError" || err.code === "ABORT_ERR");
    return {
      success: false,
      error: isAbort
        ? `Timed out connecting to Tally at ${url} after ${timeoutMs}ms`
        : `Could not reach Tally at ${url}: ${err && err.message ? err.message : String(err)}`,
      code: isAbort ? "TIMEOUT" : (err && err.code) || "NETWORK_ERROR",
    };
  } finally {
    clearTimeout(timer);
  }
};

// Probe Tally: POST the company-info request, report reachability + the active
// company name. Never throws.
//
// Returns: { reachable: true,  company, raw }              when reachable
//          { reachable: false, error, code }               when not
const testConnection = async (options = {}) => {
  const result = await postToTally(xmlRequests.testConnection(), options);

  if (!result.success) {
    return { reachable: false, error: result.error, code: result.code, status: result.status };
  }

  // Extract the open company name from the response.
  let company = null;
  try {
    company = extractCompanyName(result.xml);
  } catch (_e) {
    company = null;
  }

  return { reachable: true, company, raw: result.xml };
};

// Best-effort company-name extraction from a CompanyInfo response. Tally returns
// either <COMPANY NAME="..."> or a <NAME> child, sometimes wrapped in a report.
const extractCompanyName = (xml) => {
  if (!xml) return null;
  // @NAME attribute on a COMPANY element.
  const attr = xml.match(/<COMPANY\b[^>]*\bNAME="([^"]+)"/i);
  if (attr && attr[1]) return attr[1].trim();
  // <COMPANY> ... <NAME>...</NAME> ... </COMPANY>
  const block = xml.match(/<COMPANY\b[^>]*>([\s\S]*?)<\/COMPANY>/i);
  if (block) {
    const name = block[1].match(/<NAME>([\s\S]*?)<\/NAME>/i);
    if (name && name[1]) return name[1].trim();
  }
  // Fallback: SVCURRENTCOMPANY or first <NAME>.
  const sv = xml.match(/<SVCURRENTCOMPANY>([\s\S]*?)<\/SVCURRENTCOMPANY>/i);
  if (sv && sv[1]) return sv[1].trim();
  const anyName = xml.match(/<NAME>([\s\S]*?)<\/NAME>/i);
  if (anyName && anyName[1]) return anyName[1].trim();
  return null;
};

// Convenience fetchers: POST a master/voucher request and return raw XML.
// These return the same { success, xml } / { success:false, error } shape as
// postToTally so callers can pass `.xml` straight into the parser.
const fetchGroups = (options = {}) => postToTally(xmlRequests.groups(), options);
const fetchLedgers = (options = {}) => postToTally(xmlRequests.ledgers(), options);
const fetchStockItems = (options = {}) => postToTally(xmlRequests.stockItems(), options);
const fetchUnits = (options = {}) => postToTally(xmlRequests.units(), options);
const fetchVouchers = (from_date, to_date, options = {}) =>
  postToTally(xmlRequests.vouchers(from_date, to_date), options);

module.exports = {
  DEFAULT_HOST,
  DEFAULT_PORT,
  postToTally,
  testConnection,
  extractCompanyName,
  fetchGroups,
  fetchLedgers,
  fetchStockItems,
  fetchUnits,
  fetchVouchers,
};
