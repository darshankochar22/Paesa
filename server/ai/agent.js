// In-app copilot agent loop. Runs in the Electron main process, drives an LLM with the
// 3 consolidated tools (see tools.js), and returns a final answer plus any write proposals
// for the UI to confirm. A hard MAX_ROUNDS cap is the loop backstop.
//
// Model-agnostic — two providers cover everything:
//   anthropic : native Claude via the Anthropic SDK.
//   openai    : ANY OpenAI-compatible /chat/completions endpoint (OpenAI, DeepSeek, Groq,
//               OpenRouter, Together, local servers, …) selected by baseUrl + model.
// Both share the SAME tool layer, so the loop-resistant design is identical.

const { TOOL_DEFS, callTool } = require('./tools');

const ANTHROPIC_MODEL = 'claude-sonnet-4-6';     // fast default
const OPENAI_MODEL = 'gpt-4o-mini';              // generic openai-compatible default
const OPENAI_BASE_URL = 'https://api.openai.com/v1';
const MAX_ROUNDS = 6;                             // anti-loop guard on tool turns
const MAX_TOKENS = 1536;

// Convenience default when the UI doesn't send an explicit provider.
function detectProvider(apiKey) {
  return apiKey && apiKey.startsWith('sk-ant') ? 'anthropic' : 'openai';
}
function defaultModel(provider) {
  return provider === 'anthropic' ? ANTHROPIC_MODEL : OPENAI_MODEL;
}

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

// Shared tool executor — collects proposals and returns per-call results.
async function execTools(calls, context, proposals, toolTrace) {
  const out = [];
  for (const c of calls) {
    toolTrace.push({ tool: c.name, input: c.input });
    let result;
    try {
      result = await callTool(c.name, c.input || {}, context);
      if (c.name === 'propose' && result && result.ok && result.proposal) proposals.push(result.proposal);
    } catch (err) {
      result = { error: err.message };
    }
    out.push({ id: c.id, name: c.name, result });
  }
  return out;
}

// config: { provider, apiKey, baseUrl?, model? }
async function ask({ config, prompt, context = {}, history = [] }) {
  if (!config || !config.apiKey) return { success: false, error: 'No API key / model configured.' };
  if (!prompt || !prompt.trim()) return { success: false, error: 'Empty prompt.' };
  const provider = config.provider || detectProvider(config.apiKey);
  const model = config.model || defaultModel(provider);
  if (provider === 'anthropic') {
    return askAnthropic({ apiKey: config.apiKey, model, prompt, context, history });
  }
  return askOpenAICompatible({
    apiKey: config.apiKey,
    baseUrl: config.baseUrl || OPENAI_BASE_URL,
    model,
    prompt, context, history,
  });
}

// ---------------------------------------------------------------- Anthropic
async function askAnthropic({ apiKey, model, prompt, context, history }) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });
  const messages = [
    ...history.filter((m) => m && m.text).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text })),
    { role: 'user', content: prompt },
  ];
  const proposals = [];
  const toolTrace = [];
  let rounds = 0;
  try {
    while (rounds < MAX_ROUNDS) {
      rounds++;
      const resp = await client.messages.create({
        model, max_tokens: MAX_TOKENS, system: systemPrompt(context), tools: TOOL_DEFS, messages,
      });
      messages.push({ role: 'assistant', content: resp.content });
      if (resp.stop_reason !== 'tool_use') {
        const text = resp.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
        return { success: true, provider: 'anthropic', model, text, proposals, rounds, toolTrace };
      }
      const calls = resp.content.filter((b) => b.type === 'tool_use').map((b) => ({ id: b.id, name: b.name, input: b.input }));
      const results = await execTools(calls, context, proposals, toolTrace);
      messages.push({
        role: 'user',
        content: results.map((r) => ({ type: 'tool_result', tool_use_id: r.id, content: JSON.stringify(r.result).slice(0, 12000) })),
      });
    }
    return { success: true, provider: 'anthropic', model, text: 'Stopped after reaching the tool-round limit. Please refine the request.', proposals, rounds, toolTrace, capped: true };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
}

// --------------------------------------------------- OpenAI-compatible (incl. DeepSeek)
async function askOpenAICompatible({ apiKey, baseUrl, model, prompt, context, history }) {
  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const tools = TOOL_DEFS.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.input_schema } }));
  const messages = [
    { role: 'system', content: systemPrompt(context) },
    ...history.filter((m) => m && m.text).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text })),
    { role: 'user', content: prompt },
  ];
  const proposals = [];
  const toolTrace = [];
  let rounds = 0;
  try {
    while (rounds < MAX_ROUNDS) {
      rounds++;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages, tools, tool_choice: 'auto', max_tokens: MAX_TOKENS }),
      });
      if (!resp.ok) {
        const t = await resp.text();
        return { success: false, error: `LLM ${resp.status}: ${t.slice(0, 300)}` };
      }
      const data = await resp.json();
      const msg = data.choices && data.choices[0] && data.choices[0].message;
      if (!msg) return { success: false, error: 'No response from model.' };

      const toolCalls = msg.tool_calls || [];
      if (toolCalls.length === 0) {
        return { success: true, provider: 'openai', model, text: (msg.content || '').trim(), proposals, rounds, toolTrace };
      }
      // Echo the assistant tool-call message, then append a tool message per call.
      messages.push({ role: 'assistant', content: msg.content || null, tool_calls: toolCalls });
      const calls = toolCalls.map((tc) => {
        let input = {};
        try { input = JSON.parse(tc.function.arguments || '{}'); } catch (_) { /* keep {} */ }
        return { id: tc.id, name: tc.function.name, input };
      });
      const results = await execTools(calls, context, proposals, toolTrace);
      for (const r of results) {
        messages.push({ role: 'tool', tool_call_id: r.id, content: JSON.stringify(r.result).slice(0, 12000) });
      }
    }
    return { success: true, provider: 'openai', model, text: 'Stopped after reaching the tool-round limit. Please refine the request.', proposals, rounds, toolTrace, capped: true };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
}

// ----------------------------------------------------------------- testConfig
async function testConfig(config) {
  if (!config || !config.apiKey) return { success: false, error: 'No key provided.' };
  const provider = config.provider || detectProvider(config.apiKey);
  const model = config.model || defaultModel(provider);
  try {
    if (provider === 'anthropic') {
      const Anthropic = require('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey: config.apiKey });
      await client.messages.create({ model, max_tokens: 8, messages: [{ role: 'user', content: 'ping' }] });
      return { success: true, provider, model };
    }
    const url = `${(config.baseUrl || OPENAI_BASE_URL).replace(/\/+$/, '')}/chat/completions`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({ model, max_tokens: 8, messages: [{ role: 'user', content: 'ping' }] }),
    });
    if (resp.ok) return { success: true, provider, model };
    return { success: false, error: `LLM ${resp.status}: ${(await resp.text()).slice(0, 200)}` };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
}

module.exports = { ask, testConfig, detectProvider, defaultModel, ANTHROPIC_MODEL, OPENAI_MODEL, OPENAI_BASE_URL, MAX_ROUNDS };
