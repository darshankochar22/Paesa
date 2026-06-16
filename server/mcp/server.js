// FastMCP server exposing the accounting copilot's 3 consolidated tools over MCP (stdio).
// Same shared tool logic as the in-app agent (server/ai/tools.js) — so external MCP
// clients (Claude Desktop, Cursor, etc.) get the identical, loop-resistant tool surface.
//
// Run standalone:  STARTUP_DB_PATH=/path/to/startup.db node server/mcp/run.js
// (FastMCP is ESM, so we load it via dynamic import from this CommonJS module.)

const { z } = require('zod');
const { callTool } = require('../ai/tools');

// Resolve the working context (company_id / fy_id) from params, else the first company
// and its active financial year. DB is lazy-initialised on first tool call.
let dbReady = null;
async function ensureDb() {
  if (!dbReady) {
    const { initDB } = require('../db/index');
    dbReady = initDB();
  }
  await dbReady;
}

async function resolveContext(params = {}) {
  await ensureDb();
  const { rawDb } = require('../db/index');
  let { company_id, fy_id } = params;
  if (company_id == null) {
    const r = await rawDb.execute('SELECT company_id FROM companies ORDER BY company_id LIMIT 1');
    company_id = r.rows[0] && r.rows[0].company_id;
  }
  if (fy_id == null && company_id != null) {
    const r = await rawDb.execute({
      sql: 'SELECT fy_id FROM financial_years WHERE company_id = ? ORDER BY is_active DESC, fy_id LIMIT 1',
      args: [company_id],
    });
    fy_id = r.rows[0] && r.rows[0].fy_id;
  }
  return { company_id, fy_id };
}

async function createServer() {
  const { FastMCP } = await import('fastmcp');
  const server = new FastMCP({ name: 'tally-copilot', version: '1.0.0' });

  server.addTool({
    name: 'query',
    description: 'Read accounting data (reports, balances, vouchers, bank reconciliation) for a company/financial year.',
    parameters: z.object({
      resource: z.string(),
      company_id: z.number().optional(),
      fy_id: z.number().optional(),
      ledger_id: z.number().optional(),
      from_date: z.string().optional(),
      to_date: z.string().optional(),
    }),
    execute: async (args) => {
      const ctx = await resolveContext(args);
      return JSON.stringify(await callTool('query', args, ctx));
    },
  });

  server.addTool({
    name: 'lookup',
    description: 'Resolve a ledger / party / stock-item name to its id.',
    parameters: z.object({
      kind: z.enum(['ledger', 'party', 'stock_item']),
      query: z.string(),
      company_id: z.number().optional(),
    }),
    execute: async (args) => {
      const ctx = await resolveContext(args);
      return JSON.stringify(await callTool('lookup', args, ctx));
    },
  });

  server.addTool({
    name: 'propose',
    description: 'Draft a write action (create_voucher / reconcile / unreconcile) for review. Does not execute.',
    parameters: z.object({
      action: z.string(),
      payload: z.record(z.any()),
      summary: z.string().optional(),
      company_id: z.number().optional(),
      fy_id: z.number().optional(),
    }),
    execute: async (args) => {
      const ctx = await resolveContext(args);
      return JSON.stringify(await callTool('propose', args, ctx));
    },
  });

  return server;
}

async function start() {
  const server = await createServer();
  await server.start({ transportType: 'stdio' });
}

module.exports = { createServer, start };
