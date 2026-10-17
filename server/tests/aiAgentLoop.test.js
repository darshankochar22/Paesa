// The Copilot agent loop (server/ai/agent.js) driven by a scripted provider: request shape,
// tool results, proposal handling, the round cap and transport errors (F9).
const { setupTestDB, createTestCompany, db } = require('./helpers');
const { ask, toolResultContent, MAX_ROUNDS } = require('../ai/agent');
const groupService = require('../group/groupService');
const ledgerService = require('../ledger/ledgerService');
const { fakeOpenAI, reply, toolCall } = require('./fakeOpenAI');

const config = { apiKey: 'test-key', baseUrl: 'https://llm.example/v1/', model: 'test-model' };

describe('Copilot agent loop', () => {
  let ctx;
  let receipt; // a balanced create_voucher payload in the test company

  beforeAll(async () => {
    await setupTestDB();
    const company = await createTestCompany('Agent Loop Co');
    const fy = await db.execute(
      'SELECT fy_id FROM financial_years WHERE company_id = ? AND is_active = 1',
      [company.company_id],
    );
    ctx = { company_id: company.company_id, fy_id: fy.rows[0].fy_id };

    const groups = (await groupService.getAll(ctx.company_id)).groups;
    const party = await ledgerService.create({
      company_id: ctx.company_id,
      name: 'Loop Party',
      group_id: groups.find((g) => g.name === 'Sundry Debtors').group_id,
    });
    const cash = await db.execute(
      'SELECT ledger_id FROM ledgers WHERE company_id = ? AND name = ?',
      [ctx.company_id, 'Cash'],
    );
    receipt = {
      voucher_type: 'Receipt',
      date: '2026-04-15',
      entries: [
        { ledger_id: Number(cash.rows[0].ledger_id), type: 'Dr', amount: 250 },
        { ledger_id: Number(party.ledger.ledger_id), type: 'Cr', amount: 250 },
      ],
    };
  });

  const run = (steps, prompt = 'How is cash?') => {
    const fake = fakeOpenAI(steps);
    return ask({ config, prompt, context: ctx, fetchImpl: fake.fetchImpl }).then((res) => ({
      res,
      calls: fake.calls,
    }));
  };

  const toolMessages = (call) => call.body.messages.filter((m) => m.role === 'tool');

  it('sends an OpenAI-compatible request with the three tools and a timeout', async () => {
    const { res, calls } = await run([reply('Cash is fine.')]);

    expect(res).toMatchObject({ success: true, text: 'Cash is fine.', model: 'test-model' });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://llm.example/v1/chat/completions');
    expect(calls[0].headers.Authorization).toBe('Bearer test-key');
    expect(calls[0].body.model).toBe('test-model');
    expect(calls[0].body.tools.map((t) => t.function.name)).toEqual(['query', 'lookup', 'propose']);
    expect(calls[0].body.tool_choice).toBe('auto');
    expect(calls[0].signal).toBeInstanceOf(AbortSignal);
  });

  it('returns each tool result as valid JSON tied to its tool_call_id, and traces it', async () => {
    const { res, calls } = await run([
      toolCall('call-1', 'query', { resource: 'ledgers' }),
      reply('Listed.'),
    ]);

    const [msg] = toolMessages(calls[1]);
    expect(msg.tool_call_id).toBe('call-1');
    expect(JSON.parse(msg.content).success).toBe(true);
    expect(res.toolTrace).toEqual([
      { tool: 'query', input: { resource: 'ledgers' }, ok: true, ms: expect.any(Number) },
    ]);
  });

  it('collects proposals while the model only sees that they are queued', async () => {
    const { res, calls } = await run([
      toolCall('call-1', 'propose', { action: 'create_voucher', payload: receipt }),
      reply('Drafted a receipt for you to approve.'),
    ]);

    expect(res.proposals).toHaveLength(1);
    expect(res.proposals[0].channel).toBe('automation:createVoucher');
    expect(res.proposals[0].args.entries).toHaveLength(2);

    const seen = JSON.parse(toolMessages(calls[1])[0].content);
    expect(seen).toMatchObject({ ok: true, queued_for_user_approval: true });
    expect(seen.preview.length).toBeGreaterThan(0);
    expect(seen).not.toHaveProperty('proposal');
    expect(JSON.stringify(seen)).not.toContain('automation:createVoucher');
  });

  it('asks for an answer instead of more tools on the last round', async () => {
    const steps = [];
    for (let i = 1; i < MAX_ROUNDS; i++)
      steps.push(toolCall(`call-${i}`, 'query', { resource: 'ledgers' }));
    steps.push(reply('Here is what I found.'));
    const { res, calls } = await run(steps);

    expect(calls).toHaveLength(MAX_ROUNDS);
    expect(calls.slice(0, -1).every((c) => c.body.tool_choice === 'auto')).toBe(true);
    expect(calls[MAX_ROUNDS - 1].body.tool_choice).toBe('none');
    expect(res.text).toBe('Here is what I found.');
    expect(res.capped).toBeUndefined();
  });

  it('stops as capped, without running them, if the model still asks for tools', async () => {
    const steps = [];
    for (let i = 1; i <= MAX_ROUNDS; i++)
      steps.push(toolCall(`call-${i}`, 'query', { resource: 'ledgers' }));
    const { res } = await run(steps);

    expect(res.capped).toBe(true);
    expect(res.text).toMatch(/tool-round limit/);
    expect(res.toolTrace).toHaveLength(MAX_ROUNDS - 1);
  });

  it('reports an HTTP error from the provider', async () => {
    const { res } = await run([{ status: 500, body: 'upstream down' }]);
    expect(res).toEqual({ success: false, error: 'LLM 500: upstream down' });
  });

  it('reports a provider that does not answer in time', async () => {
    // What fetch rejects with when AbortSignal.timeout() fires.
    const timeout = new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    const { res } = await run([{ throws: timeout }]);
    expect(res.success).toBe(false);
    expect(res.error).toBe('The AI provider did not respond within 60s.');
  });

  it('does not run a tool whose arguments are not valid JSON', async () => {
    const { res, calls } = await run([
      toolCall('call-1', 'propose', '{"action": "create_voucher", '),
      reply('Sorry, let me try again.'),
    ]);

    expect(res.proposals).toEqual([]);
    expect(res.toolTrace).toEqual([
      {
        tool: 'propose',
        input: {},
        ok: false,
        error: 'The tool arguments were not valid JSON.',
        ms: expect.any(Number),
      },
    ]);
    expect(JSON.parse(toolMessages(calls[1])[0].content).error).toMatch(/not valid JSON/);
  });

  it('shortens oversized tool results instead of cutting the JSON', () => {
    const rows = Array.from({ length: 2000 }, (_, i) => ({ id: i, name: `Ledger ${i}` }));
    const content = toolResultContent({ success: true, rows });

    expect(content.length).toBeLessThanOrEqual(12000);
    const parsed = JSON.parse(content); // still valid JSON
    expect(parsed.truncated).toBe(true);
    expect(parsed.result.rows.length).toBeLessThan(rows.length);
    expect(parsed.result.rows[0]).toEqual({ id: 0, name: 'Ledger 0' });
  });
});
