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

const { trialBalance } = require('../report/services/trailbalanceService');
const { balanceSheet } = require('../report/services/balanceSheetService');
const profitLoss = require('../report/financial/profitAndLoss');
const daybook = require('../report/daybook/daybook');
const cashBook = require('../report/ledger/cashBook');
const bankBook = require('../report/ledger/bankBook');
const ledgerReport = require('../report/ledger/ledgerReport');
const outstandingReportService = require('../report/outstandingReportService');
const cashFlowReportService = require('../report/cashFlowReportService');
const fundsFlowReportService = require('../report/fundsFlowReportService');
const stockSummaryReportService = require('../report/stockSummaryReportService');
const ratioAnalysisReportService = require('../report/ratioAnalysisReportService');
const voucherService = require('../voucher/voucherService');
const bankingService = require('../banking/bankingService');
const ledgerService = require('../ledger/ledgerService');
const auditTrailService = require('../auditTrail/auditTrailService');
const advancedInventoryReportService = require('../report/advancedInventoryReportService');
const advancedAccountingReportService = require('../report/advancedAccountingReportService');
const { db } = require('../db/index');
const { validatePayload, isBalanced } = require('../automation/voucherContract');

const QUERY_RESOURCES = {
  trial_balance: (c) =>
    trialBalance(c.company_id, c.fy_id).then((res) =>
      res.success ? { ...res, rows: res.groups } : res,
    ),
  balance_sheet: (c) => balanceSheet(c.company_id, c.fy_id),
  profit_loss: (c) => profitLoss(c.company_id, c.fy_id),
  daybook: (c, a) => daybook(c.company_id, c.fy_id, a.from_date, a.to_date),
  cash_book: (c, a) => cashBook(c.company_id, c.fy_id, a.from_date, a.to_date),
  bank_book: (c, a) => bankBook(c.company_id, c.fy_id, a.ledger_id, a.from_date, a.to_date),
  ledger_statement: (c, a) =>
    ledgerReport(c.company_id, c.fy_id, a.ledger_id, a.from_date, a.to_date),
  bills_receivable: (c) => outstandingReportService.billsReceivable(c.company_id, c.fy_id),
  bills_payable: (c) => outstandingReportService.billsPayable(c.company_id, c.fy_id),
  cash_flow: (c, a) =>
    cashFlowReportService.cashFlow(c.company_id, c.fy_id, a.from_date, a.to_date),
  funds_flow: (c, a) =>
    fundsFlowReportService.fundsFlow(c.company_id, c.fy_id, a.from_date, a.to_date),
  stock_summary: (c, a) =>
    stockSummaryReportService.stockSummary(c.company_id, c.fy_id, a.as_on_date || a.to_date),
  ratio_analysis: (c) => ratioAnalysisReportService.ratioAnalysis(c.company_id, c.fy_id),
  ledger_balance: (c, a) => voucherService.getLedgerBalance(a.ledger_id, c.company_id, c.fy_id),
  pending_bills: (c, a) => voucherService.getPendingBills(a.ledger_id, c.company_id, c.fy_id),
  vouchers: (c) => voucherService.getAll(c.company_id, c.fy_id),
  unreconciled_bank: (c, a) => bankingService.getUnreconciled(c.company_id, c.fy_id, a.ledger_id),
  bank_summary: (c, a) => bankingService.getSummary(c.company_id, c.fy_id, a.ledger_id),
  ledgers: (c) => ledgerService.getAll(c.company_id),
  audit_trail: (c, a) => auditTrailService.getAll(c.company_id, { limit: a.limit || 50 }),

  // Phase 4 additions
  godown_summary: (c, a) =>
    advancedInventoryReportService.godownSummary(c.company_id, c.fy_id, a.as_on_date || a.to_date),
  stock_ageing: (c, a) =>
    advancedInventoryReportService.stockAgeing(c.company_id, c.fy_id, a.as_on_date || a.to_date),
  movement_analysis: (c, a) =>
    advancedInventoryReportService.movementAnalysis(
      c.company_id,
      c.fy_id,
      a.as_on_date || a.to_date,
    ),
  reorder_status: (c) => advancedInventoryReportService.reorderStatus(c.company_id, c.fy_id),
  sales_outstanding: (c) =>
    advancedInventoryReportService.orderOutstanding(c.company_id, c.fy_id, 'sales'),
  purchase_outstanding: (c) =>
    advancedInventoryReportService.orderOutstanding(c.company_id, c.fy_id, 'purchase'),
  cost_centre: (c, a) =>
    advancedAccountingReportService.costCentreReport(
      c.company_id,
      c.fy_id,
      a.as_on_date || a.to_date,
    ),
  budget_variance: (c) => advancedAccountingReportService.budgetVsActual(c.company_id, c.fy_id),
};

// ── Voucher drafts ─────────────────────────────────────────────────────────────
// Types a Copilot draft may create. Payroll is left out: voucherCreate rebuilds its lines
// from pay heads on save, so the voucher written would not be the one the user approved.
const DRAFT_VOUCHER_TYPES = [
  'Journal',
  'Payment',
  'Receipt',
  'Contra',
  'Sales',
  'Purchase',
  'Credit Note',
  'Debit Note',
];

const rupees = (n) =>
  `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Models sometimes send numbers as strings ("1000"). Convert those; leave anything else for
// validatePayload to reject.
const asNumber = (v) =>
  typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v)) ? Number(v) : v;

// Non-object entries are passed through for validatePayload to report.
const rebuildEntry = (e) =>
  e && typeof e === 'object'
    ? {
        ledger_id: asNumber(e.ledger_id),
        ledger_name: e.ledger_name,
        type: e.type,
        amount: asNumber(e.amount),
      }
    : e;

// Copy only the fields a draft may set, for the active company. The two flags save the
// lines exactly as previewed: plain Dr/Cr rows with the balance enforced, as in the entry
// screen's "As Voucher" mode. Without as_voucher_mode a Sales/Purchase/note draft would go
// through the GST engine, which recomputes tax lines from stock items a draft does not have
// and rewrites the party line.
function rebuildVoucherDraft(context, draft) {
  const payload = {
    company_id: Number(context.company_id),
    fy_id: asNumber(draft.fy_id),
    voucher_type: draft.voucher_type,
    date: draft.date,
    entries: Array.isArray(draft.entries) ? draft.entries.map(rebuildEntry) : draft.entries,
    is_accounting_voucher: 1,
    as_voucher_mode: 1,
  };
  for (const key of ['narration', 'reference_number']) {
    if (typeof draft[key] === 'string' && draft[key].trim()) payload[key] = draft[key].trim();
  }
  return payload;
}

// One read of the company's active ledgers. Returns resolve(id, name), which accepts an id
// only if it is one of them and a name only if it matches one exactly (ignoring case).
async function companyLedgerResolver(companyId) {
  const res = await db.execute(
    'SELECT ledger_id, name FROM ledgers WHERE company_id = ? AND COALESCE(is_active, 1) = 1',
    [companyId],
  );
  const nameKey = (name) =>
    String(name || '')
      .trim()
      .toLowerCase();
  const nameById = new Map(res.rows.map((l) => [Number(l.ledger_id), l.name]));
  const idByName = new Map(res.rows.map((l) => [nameKey(l.name), Number(l.ledger_id)]));
  return (id, name) => {
    const ledgerId = id != null ? Number(id) : idByName.get(nameKey(name));
    return nameById.has(ledgerId)
      ? { ledger_id: ledgerId, ledger_name: nameById.get(ledgerId) }
      : null;
  };
}

// What the approval card shows: every line, the total, and the party and narration if set.
function voucherPreview(payload) {
  const total = payload.entries.reduce((sum, e) => (e.type === 'Dr' ? sum + e.amount : sum), 0);
  return {
    summary: `${payload.voucher_type} of ${rupees(total)} on ${payload.date}`,
    preview: [
      { label: 'Voucher', value: payload.voucher_type, detail: payload.date },
      ...(payload.party_name ? [{ label: 'Party', value: payload.party_name }] : []),
      ...payload.entries.map((e) => ({
        label: `${e.type} ${e.ledger_name}`,
        value: rupees(e.amount),
      })),
      { label: 'Total', value: rupees(total), detail: 'Debit = Credit' },
      ...(payload.narration ? [{ label: 'Narration', value: payload.narration }] : []),
    ],
  };
}

// Check a model-drafted voucher against the active company before the user is shown an
// Approve button (F5). Returns { ok: true, payload, summary, preview } or { ok: false, error }.
async function prepareVoucherProposal(context, draft) {
  const fail = (error) => ({ ok: false, error });
  if (draft.company_id != null && Number(draft.company_id) !== Number(context.company_id)) {
    return fail('Vouchers can only be drafted for the active company.');
  }
  if (draft.voucher_type === 'Payroll') {
    return fail(
      'Payroll vouchers cannot be drafted here: their lines are rebuilt from pay heads on save. Use the Payroll voucher screen.',
    );
  }
  if (!DRAFT_VOUCHER_TYPES.includes(draft.voucher_type)) {
    return fail(`voucher_type must be one of: ${DRAFT_VOUCHER_TYPES.join(', ')}.`);
  }

  const payload = rebuildVoucherDraft(context, draft);
  const shape = validatePayload(payload);
  if (!shape.ok) return fail(shape.errors.join(' '));
  // validatePayload requires balance only for Journal/Payment/Receipt/Contra. A draft gets
  // no automatic tax lines, so every type must balance as written.
  if (!isBalanced(payload.entries)) {
    return fail(
      'Debit total must equal credit total. Ask the user for the missing line instead of adding a balancing entry.',
    );
  }

  const fyRes = await db.execute(
    'SELECT start_date, end_date FROM financial_years WHERE fy_id = ? AND company_id = ?',
    [payload.fy_id, payload.company_id],
  );
  const fy = fyRes.rows[0];
  if (!fy) return fail('fy_id is not a financial year of the active company.');
  if (payload.date < fy.start_date || payload.date > fy.end_date) {
    return fail(`date must fall inside the financial year (${fy.start_date} to ${fy.end_date}).`);
  }

  const resolveLedger = await companyLedgerResolver(payload.company_id);
  const notFound = (id, name) =>
    `${id != null ? `Ledger id ${id}` : `Ledger "${name}"`} is not a ledger of the active company. Use lookup to find it.`;
  for (const e of payload.entries) {
    const hit = resolveLedger(e.ledger_id, e.ledger_name);
    if (!hit) return fail(notFound(e.ledger_id, e.ledger_name));
    Object.assign(e, hit); // the books' spelling of the name, not the model's
  }
  if (draft.party_ledger_id != null || draft.party_name) {
    const party = resolveLedger(asNumber(draft.party_ledger_id), draft.party_name);
    if (!party) return fail(notFound(draft.party_ledger_id, draft.party_name));
    payload.party_ledger_id = party.ledger_id;
    payload.party_name = party.ledger_name;
  }

  return { ok: true, payload, ...voucherPreview(payload) };
}

// An action may define prepare(context, payload) to rebuild and check its payload on the
// server; the renderer then calls `channel` with the prepared payload on approval.
const PROPOSABLE = {
  create_voucher: {
    channel: 'automation:createVoucher',
    required: ['voucher_type', 'date', 'entries'],
    prepare: prepareVoucherProposal,
  },
  reconcile: { channel: 'banking:reconcile', required: ['entry_id', 'voucher_id', 'ledger_id'] },
  unreconcile: { channel: 'banking:unreconcile', required: ['entry_id'] },
};

// Anthropic tool definitions (also mapped to MCP params by the FastMCP server).
const TOOL_DEFS = [
  {
    name: 'query',
    description:
      'Read accounting data for the active company/financial year. Pick a resource and (when needed) a ledger_id / date range. ' +
      'Resources: ' +
      Object.keys(QUERY_RESOURCES).join(', ') +
      '. ' +
      'Use this for any question about balances, reports, vouchers or bank reconciliation. Do NOT pass company_id/fy_id — they are implicit.',
    input_schema: {
      type: 'object',
      properties: {
        resource: { type: 'string', enum: Object.keys(QUERY_RESOURCES) },
        ledger_id: {
          type: 'number',
          description:
            'Required for ledger_* / bank_* resources. Resolve names via the lookup tool first.',
        },
        from_date: { type: 'string', description: 'ISO date YYYY-MM-DD (optional range start)' },
        to_date: { type: 'string', description: 'ISO date YYYY-MM-DD (optional range end)' },
        limit: {
          type: 'number',
          description: 'Max rows to return (used by the audit_trail resource; defaults to 50).',
        },
      },
      required: ['resource'],
    },
  },
  {
    name: 'lookup',
    description:
      'Resolve a ledger / party / stock-item name to its id before querying or proposing actions. Returns the closest matches.',
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
      'This does NOT execute anything: it returns a preview the user must confirm in the app. Always propose; never assume it is committed. ' +
      'create_voucher takes { voucher_type, date, entries: [{ ledger_id, type: "Dr"|"Cr", amount }], narration? } for the active company; ' +
      'Dr must equal Cr and the date must fall in the financial year.',
    input_schema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: Object.keys(PROPOSABLE) },
        payload: {
          type: 'object',
          description:
            'The action payload (e.g. voucher with entries). Use resolved ids from lookup. Voucher types: ' +
            DRAFT_VOUCHER_TYPES.join(', ') +
            '.',
        },
        summary: {
          type: 'string',
          description: 'One-line human summary of what this action does.',
        },
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
      (i.name || '').toLowerCase().includes(q.toLowerCase()),
    );
    return { matches: items.slice(0, 10).map((i) => ({ id: i.item_id, name: i.name })) };
  }
  // ledger or party -> ledger search
  const res = await voucherService.searchLedgers(context.company_id, q);
  const rows = res.ledgers || res || [];
  return {
    matches: rows.slice(0, 10).map((l) => ({ id: l.ledger_id, name: l.name, group: l.group_name })),
  };
}

async function runPropose(context, args) {
  const spec = PROPOSABLE[args.action];
  if (!spec) throw new Error(`Unknown action "${args.action}"`);
  let payload = { ...(args.payload || {}) };
  // Inject active context onto write payloads where applicable.
  if (context.company_id && payload.company_id == null) payload.company_id = context.company_id;
  if (context.fy_id && payload.fy_id == null) payload.fy_id = context.fy_id;

  const missing = spec.required.filter((k) => payload[k] == null);
  if (missing.length) {
    return {
      ok: false,
      error: `Missing required fields for ${args.action}: ${missing.join(', ')}`,
    };
  }

  // The model's own one-line summary. When prepare() builds the summary on the server, the
  // model's text is kept beside it as a note.
  const note = typeof args.summary === 'string' ? args.summary.trim() : '';
  let summary = note || args.action;
  let preview;
  if (spec.prepare) {
    const prepared = await spec.prepare(context, payload);
    if (!prepared.ok) return { ok: false, error: prepared.error };
    payload = prepared.payload;
    summary = prepared.summary;
    preview = prepared.preview;
  }
  // A PROPOSAL — not executed. The renderer renders it and calls `channel` with `args` on approval.
  return {
    ok: true,
    proposal: {
      action: args.action,
      channel: spec.channel,
      args: payload,
      summary,
      ...(spec.prepare && note ? { note } : {}),
      ...(preview ? { preview } : {}),
      requiresApproval: true,
    },
  };
}

// Single dispatch used by BOTH the in-app agent and the FastMCP server.
async function callTool(name, args = {}, context = {}) {
  switch (name) {
    case 'query':
      return runQuery(context, args);
    case 'lookup':
      return runLookup(context, args);
    case 'propose':
      return runPropose(context, args);
    default:
      throw new Error(`Unknown tool "${name}"`);
  }
}

module.exports = { TOOL_DEFS, callTool, QUERY_RESOURCES, PROPOSABLE };
