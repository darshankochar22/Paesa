// The AI copilot tool layer — DELIBERATELY SMALL (3 tools, not 252 channels).
//
// Exposing one tool per IPC channel makes models thrash and loop. Instead we give the
// model THREE consolidated tools and let it fill an enum field to pick the operation:
//   - query   : enum-routed READS (reports, balances, vouchers, reconciliation)
//   - lookup  : resolve a ledger/party/item name -> id (so the model never guesses ids)
//   - propose : build a REVIEWABLE write action (never executed here — the UI commits on approval)
//
// company_id / fy_id are injected from the active context, so the model doesn't have to
// pass them (fewer args = fewer wrong calls = fewer loops).

const reportService = require('../report/reportService');
const outstandingReportService = require('../report/outstandingReportService');
const cashFlowReportService = require('../report/cashFlowReportService');
const fundsFlowReportService = require('../report/fundsFlowReportService');
const stockSummaryReportService = require('../report/stockSummaryReportService');
const ratioAnalysisReportService = require('../report/ratioAnalysisReportService');
const voucherService = require('../voucher/voucherService');
const bankingService = require('../banking/bankingService');
const ledgerService = require('../ledger/ledgerService');
const auditTrailService = require('../auditTrail/auditTrailService');

const QUERY_RESOURCES = {
  trial_balance:    (c) => reportService.trialBalance(c.company_id, c.fy_id),
  balance_sheet:    (c) => reportService.balanceSheet(c.company_id, c.fy_id),
  profit_loss:      (c) => reportService.profitLoss(c.company_id, c.fy_id),
  daybook:          (c, a) => reportService.daybook(c.company_id, c.fy_id, a.from_date, a.to_date),
  cash_book:        (c, a) => reportService.cashBook(c.company_id, c.fy_id, a.from_date, a.to_date),
  bank_book:        (c, a) => reportService.bankBook(c.company_id, c.fy_id, a.ledger_id, a.from_date, a.to_date),
  ledger_statement: (c, a) => reportService.ledgerReport(c.company_id, c.fy_id, a.ledger_id, a.from_date, a.to_date),
  bills_receivable: (c) => outstandingReportService.billsReceivable(c.company_id, c.fy_id),
  bills_payable:    (c) => outstandingReportService.billsPayable(c.company_id, c.fy_id),
  cash_flow:        (c, a) => cashFlowReportService.cashFlow(c.company_id, c.fy_id, a.from_date, a.to_date),
  funds_flow:       (c, a) => fundsFlowReportService.fundsFlow(c.company_id, c.fy_id, a.from_date, a.to_date),
  stock_summary:    (c, a) => stockSummaryReportService.stockSummary(c.company_id, c.fy_id, a.as_on_date || a.to_date),
  ratio_analysis:   (c) => ratioAnalysisReportService.ratioAnalysis(c.company_id, c.fy_id),
  ledger_balance:   (c, a) => voucherService.getLedgerBalance(a.ledger_id, c.company_id, c.fy_id),
  pending_bills:    (c, a) => voucherService.getPendingBills(a.ledger_id, c.company_id, c.fy_id),
  vouchers:         (c) => voucherService.getAll(c.company_id, c.fy_id),
  unreconciled_bank:(c, a) => bankingService.getUnreconciled(c.company_id, c.fy_id, a.ledger_id),
  bank_summary:     (c, a) => bankingService.getSummary(c.company_id, c.fy_id, a.ledger_id),
  ledgers:          (c) => ledgerService.getAll(c.company_id),
  audit_trail:      (c, a) => auditTrailService.getAll(c.company_id, { limit: a.limit || 50 }),
};

const PROPOSABLE = {
  create_voucher: { channel: 'voucher:create', required: ['voucher_type', 'date', 'entries'] },
  reconcile:      { channel: 'banking:reconcile', required: ['entry_id', 'voucher_id', 'ledger_id'] },
  unreconcile:    { channel: 'banking:unreconcile', required: ['entry_id'] },
};

// Anthropic tool definitions (also mapped to MCP params by the FastMCP server).
const TOOL_DEFS = [
  {
    name: 'query',
    description:
      'Read accounting data for the active company/financial year. Pick a resource and (when needed) a ledger_id / date range. ' +
      'Resources: ' + Object.keys(QUERY_RESOURCES).join(', ') + '. ' +
      'Use this for any question about balances, reports, vouchers or bank reconciliation. Do NOT pass company_id/fy_id — they are implicit.',
    input_schema: {
      type: 'object',
      properties: {
        resource: { type: 'string', enum: Object.keys(QUERY_RESOURCES) },
        ledger_id: { type: 'number', description: 'Required for ledger_* / bank_* resources. Resolve names via the lookup tool first.' },
        from_date: { type: 'string', description: 'ISO date YYYY-MM-DD (optional range start)' },
        to_date: { type: 'string', description: 'ISO date YYYY-MM-DD (optional range end)' },
        limit: { type: 'number', description: 'Max rows to return (used by the audit_trail resource; defaults to 50).' },
      },
      required: ['resource'],
    },
  },
  {
    name: 'lookup',
    description: 'Resolve a ledger / party / stock-item name to its id before querying or proposing actions. Returns the closest matches.',
    input_schema: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['ledger', 'party', 'stock_item'] },
        query: { type: 'string', description: 'Name or partial name to search for' },
      },
      required: ['kind', 'query'],
    },
  },
  {
    name: 'propose',
    description:
      'Draft a WRITE action (create_voucher / reconcile / unreconcile) for the user to review and approve. ' +
      'This does NOT execute anything — it returns a preview the user must confirm in the app. Always propose; never assume it is committed.',
    input_schema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: Object.keys(PROPOSABLE) },
        payload: { type: 'object', description: 'The action payload (e.g. voucher with entries). Use resolved ids from lookup.' },
        summary: { type: 'string', description: 'One-line human summary of what this action does.' },
      },
      required: ['action', 'payload'],
    },
  },
];

async function runQuery(context, args) {
  const fn = QUERY_RESOURCES[args.resource];
  if (!fn) throw new Error(`Unknown resource "${args.resource}"`);
  if (!context.company_id) throw new Error('No active company selected.');
  return fn(context, args || {});
}

async function runLookup(context, args) {
  if (!context.company_id) throw new Error('No active company selected.');
  const q = (args.query || '').trim();
  if (args.kind === 'stock_item') {
    const stockItemService = require('../stockItem/stockItemService');
    const res = await stockItemService.getAll(context.company_id);
    const items = (res.stockItems || res || []).filter((i) =>
      (i.name || '').toLowerCase().includes(q.toLowerCase()));
    return { matches: items.slice(0, 10).map((i) => ({ id: i.stock_item_id, name: i.name })) };
  }
  // ledger or party -> ledger search
  const res = await voucherService.searchLedgers(context.company_id, q);
  const rows = res.ledgers || res || [];
  return { matches: rows.slice(0, 10).map((l) => ({ id: l.ledger_id, name: l.name, group: l.group_name })) };
}

async function runPropose(context, args) {
  const spec = PROPOSABLE[args.action];
  if (!spec) throw new Error(`Unknown action "${args.action}"`);
  const payload = { ...(args.payload || {}) };
  // Inject active context onto write payloads where applicable.
  if (context.company_id && payload.company_id == null) payload.company_id = context.company_id;
  if (context.fy_id && payload.fy_id == null) payload.fy_id = context.fy_id;

  const missing = spec.required.filter((k) => payload[k] == null);
  if (missing.length) {
    return { ok: false, error: `Missing required fields for ${args.action}: ${missing.join(', ')}` };
  }
  // A PROPOSAL — not executed. The renderer renders it and calls `channel` with `args` on approval.
  return {
    ok: true,
    proposal: {
      action: args.action,
      channel: spec.channel,
      args: payload,
      summary: args.summary || args.action,
      requiresApproval: true,
    },
  };
}

// Single dispatch used by BOTH the in-app agent and the FastMCP server.
async function callTool(name, args = {}, context = {}) {
  switch (name) {
    case 'query': return runQuery(context, args);
    case 'lookup': return runLookup(context, args);
    case 'propose': return runPropose(context, args);
    default: throw new Error(`Unknown tool "${name}"`);
  }
}

module.exports = { TOOL_DEFS, callTool, QUERY_RESOURCES, PROPOSABLE };
