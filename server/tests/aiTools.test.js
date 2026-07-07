const { setupTestDB, createTestCompany, db } = require('./helpers');
const { TOOL_DEFS, callTool } = require('../ai/tools');
const { getConfig, GROQ_BASE_URL, GROQ_DEFAULT_MODEL } = require('../ai/keyStore');

describe('AI copilot tool layer (consolidated, anti-loop)', () => {
  let ctx;

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany('AI Tools Co');
    const fy = await db.execute(
      `SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1`,
      [company.company_id],
    );
    ctx = { company_id: company.company_id, fy_id: fy.rows[0].fy_id };
  });

  it('exposes exactly 3 tools (not one per channel)', () => {
    expect(TOOL_DEFS.map((t) => t.name).sort()).toEqual(['lookup', 'propose', 'query']);
  });

  it('resolves an env-only OpenAI-compatible config, defaulting to Groq', () => {
    const saved = {
      AI_API_KEY: process.env.AI_API_KEY,
      AI_BASE_URL: process.env.AI_BASE_URL,
      AI_MODEL: process.env.AI_MODEL,
    };
    try {
      delete process.env.AI_API_KEY;
      expect(getConfig()).toBeNull(); // no key configured → not available

      process.env.AI_API_KEY = 'gsk_testkey_0123456789';
      delete process.env.AI_BASE_URL;
      delete process.env.AI_MODEL;
      const cfg = getConfig();
      expect(cfg.apiKey).toBe('gsk_testkey_0123456789');
      expect(cfg.baseUrl).toBe(GROQ_BASE_URL); // defaults to Groq's endpoint
      expect(cfg.model).toBe(GROQ_DEFAULT_MODEL);

      process.env.AI_BASE_URL = 'https://api.deepseek.com/v1';
      process.env.AI_MODEL = 'deepseek-chat';
      const custom = getConfig();
      expect(custom.baseUrl).toBe('https://api.deepseek.com/v1'); // any OpenAI-compatible host
      expect(custom.model).toBe('deepseek-chat');
    } finally {
      for (const [k, v] of Object.entries(saved)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  });

  it('query routes to reports by resource enum', async () => {
    const tb = await callTool('query', { resource: 'trial_balance' }, ctx);
    expect(tb.success).toBe(true);
    expect(Array.isArray(tb.rows)).toBe(true);

    const ledgers = await callTool('query', { resource: 'ledgers' }, ctx);
    expect(ledgers.success).toBe(true);
    expect(Array.isArray(ledgers.ledgers)).toBe(true);
    expect(ledgers.ledgers.length).toBeGreaterThan(0); // seeded masters
  });

  it('query refuses unknown resources and missing company', async () => {
    await expect(callTool('query', { resource: 'nope' }, ctx)).rejects.toThrow(/Unknown resource/);
    await expect(callTool('query', { resource: 'trial_balance' }, {})).rejects.toThrow(
      /No active company/,
    );
  });

  it('lookup resolves a seeded ledger name to an id', async () => {
    const res = await callTool('lookup', { kind: 'ledger', query: 'Cash' }, ctx);
    expect(Array.isArray(res.matches)).toBe(true);
    const cash = res.matches.find((m) => m.name === 'Cash');
    expect(cash && typeof cash.id).toBe('number');
  });

  it('propose drafts a reviewable action and never executes', async () => {
    const res = await callTool(
      'propose',
      {
        action: 'create_voucher',
        summary: 'Receipt ₹1000',
        payload: {
          voucher_type: 'Receipt',
          date: '2026-04-10',
          entries: [{ ledger_id: 1, type: 'Dr', amount: 1000 }],
        },
      },
      ctx,
    );
    expect(res.ok).toBe(true);
    expect(res.proposal.requiresApproval).toBe(true);
    expect(res.proposal.channel).toBe('voucher:create');
    expect(res.proposal.args.company_id).toBe(ctx.company_id); // context injected
  });

  it('propose reports missing required fields instead of guessing', async () => {
    const res = await callTool('propose', { action: 'reconcile', payload: { entry_id: 5 } }, ctx);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/voucher_id|ledger_id/);
  });
});
