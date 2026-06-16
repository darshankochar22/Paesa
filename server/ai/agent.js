// In-app copilot agent loop. Runs in the Electron main process, drives Claude with the
// 3 consolidated tools (see tools.js), and returns a final answer plus any write
// proposals for the UI to confirm. A hard MAX_ROUNDS cap is the loop backstop.

const { TOOL_DEFS, callTool } = require('./tools');

const DEFAULT_MODEL = 'claude-sonnet-4-6'; // fast; override per request
const MAX_ROUNDS = 6;                       // anti-loop guard on tool turns
const MAX_TOKENS = 1536;

function systemPrompt(context) {
  return [
    'You are an accounting copilot embedded in a Tally-style ERP (a "Cursor for Tally").',
    'You help a CA/accountant read the books and draft entries.',
    `Active context: company_id=${context.company_id ?? 'none'}, fy_id=${context.fy_id ?? 'none'}.`,
    'Rules:',
    '- ALWAYS use the `query` tool for any figure — never invent numbers. Resolve names to ids with `lookup` first.',
    '- For any change to the books (vouchers, reconciliation), use `propose` to draft it. NEVER claim something was saved — proposals require the user to approve in the app.',
    '- Be concise. Show amounts in ₹ and cite where they came from. If the company/fy is missing, say so.',
  ].join('\n');
}

function toAnthropic(history = []) {
  // history items: { role: 'user'|'assistant', text }
  return history
    .filter((m) => m && m.text)
    .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text }));
}

async function ask({ apiKey, prompt, context = {}, history = [], model = DEFAULT_MODEL }) {
  if (!apiKey) return { success: false, error: 'No Anthropic API key configured.' };
  if (!prompt || !prompt.trim()) return { success: false, error: 'Empty prompt.' };

  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });

  const messages = [...toAnthropic(history), { role: 'user', content: prompt }];
  const proposals = [];
  const toolTrace = [];
  let rounds = 0;

  try {
    while (rounds < MAX_ROUNDS) {
      rounds++;
      const resp = await client.messages.create({
        model,
        max_tokens: MAX_TOKENS,
        system: systemPrompt(context),
        tools: TOOL_DEFS,
        messages,
      });

      messages.push({ role: 'assistant', content: resp.content });

      if (resp.stop_reason !== 'tool_use') {
        const text = resp.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
        return { success: true, text, proposals, rounds, toolTrace };
      }

      // Execute each requested tool and feed results back.
      const toolResults = [];
      for (const block of resp.content) {
        if (block.type !== 'tool_use') continue;
        toolTrace.push({ tool: block.name, input: block.input });
        let result;
        try {
          result = await callTool(block.name, block.input, context);
          if (block.name === 'propose' && result && result.ok && result.proposal) {
            proposals.push(result.proposal);
          }
        } catch (err) {
          result = { error: err.message };
        }
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result).slice(0, 12000),
        });
      }
      messages.push({ role: 'user', content: toolResults });
    }

    return {
      success: true,
      text: 'Stopped after reaching the tool-round limit. Please refine the request.',
      proposals,
      rounds,
      toolTrace,
      capped: true,
    };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
}

async function testKey(apiKey, model = DEFAULT_MODEL) {
  if (!apiKey) return { success: false, error: 'No key provided.' };
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });
    await client.messages.create({ model, max_tokens: 8, messages: [{ role: 'user', content: 'ping' }] });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
}

module.exports = { ask, testKey, DEFAULT_MODEL, MAX_ROUNDS };
