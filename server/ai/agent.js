// In-app copilot agent loop. Runs in the Electron main process, drives an LLM with the
// 3 consolidated tools (see tools.js), and returns a final answer plus any write proposals
// for the UI to confirm. A hard MAX_ROUNDS cap is the loop backstop.
//
// Provider-pluggable: the active provider is auto-detected from the key —
//   sk-ant-...  -> Anthropic Claude (SDK)
//   otherwise   -> Google Gemini   (REST generateContent + function calling)
// Both providers share the SAME tool layer, so the loop-resistant design is identical.

const { TOOL_DEFS, callTool } = require('./tools');

const ANTHROPIC_MODEL = 'claude-sonnet-4-6'; // fast
const GEMINI_MODEL = 'gemini-flash-latest';  // fast
const MAX_ROUNDS = 6;                          // anti-loop guard on tool turns
const MAX_TOKENS = 1536;

function providerFor(apiKey) {
  return apiKey && apiKey.startsWith('sk-ant') ? 'anthropic' : 'gemini';
}
function modelFor(provider) {
  return provider === 'anthropic' ? ANTHROPIC_MODEL : GEMINI_MODEL;
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

async function ask({ apiKey, prompt, context = {}, history = [], model }) {
  if (!apiKey) return { success: false, error: 'No API key configured.' };
  if (!prompt || !prompt.trim()) return { success: false, error: 'Empty prompt.' };
  const provider = providerFor(apiKey);
  return provider === 'anthropic'
    ? askAnthropic({ apiKey, prompt, context, history, model: model || ANTHROPIC_MODEL })
    : askGemini({ apiKey, prompt, context, history, model: model || GEMINI_MODEL });
}

// ---------------------------------------------------------------- Anthropic
function anthropicHistory(history = []) {
  return history.filter((m) => m && m.text).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text }));
}

async function askAnthropic({ apiKey, prompt, context, history, model }) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });
  const messages = [...anthropicHistory(history), { role: 'user', content: prompt }];
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
        return { success: true, provider: 'anthropic', text, proposals, rounds, toolTrace };
      }
      const calls = resp.content.filter((b) => b.type === 'tool_use').map((b) => ({ id: b.id, name: b.name, input: b.input }));
      const results = await execTools(calls, context, proposals, toolTrace);
      messages.push({
        role: 'user',
        content: results.map((r) => ({ type: 'tool_result', tool_use_id: r.id, content: JSON.stringify(r.result).slice(0, 12000) })),
      });
    }
    return { success: true, provider: 'anthropic', text: 'Stopped after reaching the tool-round limit. Please refine the request.', proposals, rounds, toolTrace, capped: true };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
}

// ------------------------------------------------------------------- Gemini
// Convert our JSON-schema tool params to Gemini's Schema (uppercase Type enums).
function geminiSchema(s) {
  if (!s || typeof s !== 'object') return s;
  const out = {};
  if (s.type) out.type = String(s.type).toUpperCase();
  if (s.description) out.description = s.description;
  if (s.enum) out.enum = s.enum;
  if (s.properties) {
    out.properties = {};
    for (const k of Object.keys(s.properties)) out.properties[k] = geminiSchema(s.properties[k]);
  }
  if (s.required) out.required = s.required;
  if (s.items) out.items = geminiSchema(s.items);
  return out;
}
const GEMINI_TOOLS = [{
  functionDeclarations: TOOL_DEFS.map((t) => ({ name: t.name, description: t.description, parameters: geminiSchema(t.input_schema) })),
}];

async function askGemini({ apiKey, prompt, context, history, model }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const contents = [
    ...history.filter((m) => m && m.text).map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.text }] })),
    { role: 'user', parts: [{ text: prompt }] },
  ];
  const proposals = [];
  const toolTrace = [];
  let rounds = 0;

  try {
    while (rounds < MAX_ROUNDS) {
      rounds++;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey },
        body: JSON.stringify({ system_instruction: { parts: [{ text: systemPrompt(context) }] }, contents, tools: GEMINI_TOOLS }),
      });
      if (!resp.ok) {
        const t = await resp.text();
        return { success: false, error: `Gemini ${resp.status}: ${t.slice(0, 300)}` };
      }
      const data = await resp.json();
      const cand = data.candidates && data.candidates[0];
      const parts = (cand && cand.content && cand.content.parts) || [];
      const fcParts = parts.filter((p) => p.functionCall);

      if (fcParts.length === 0) {
        const text = parts.filter((p) => p.text).map((p) => p.text).join('\n').trim();
        return { success: true, provider: 'gemini', text, proposals, rounds, toolTrace };
      }

      // Echo the model's function calls, then return tool results.
      contents.push({ role: 'model', parts: fcParts });
      const calls = fcParts.map((p) => ({ name: p.functionCall.name, input: p.functionCall.args || {} }));
      const results = await execTools(calls, context, proposals, toolTrace);
      contents.push({
        role: 'user',
        parts: results.map((r) => ({
          functionResponse: { name: r.name, response: (r.result && typeof r.result === 'object') ? r.result : { result: r.result } },
        })),
      });
    }
    return { success: true, provider: 'gemini', text: 'Stopped after reaching the tool-round limit. Please refine the request.', proposals, rounds, toolTrace, capped: true };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
}

// ----------------------------------------------------------------- testKey
async function testKey(apiKey) {
  if (!apiKey) return { success: false, error: 'No key provided.' };
  const provider = providerFor(apiKey);
  try {
    if (provider === 'anthropic') {
      const Anthropic = require('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey });
      await client.messages.create({ model: ANTHROPIC_MODEL, max_tokens: 8, messages: [{ role: 'user', content: 'ping' }] });
      return { success: true, provider };
    }
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'ping' }] }] }),
    });
    if (resp.ok) return { success: true, provider };
    return { success: false, error: `Gemini ${resp.status}: ${(await resp.text()).slice(0, 200)}` };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
}

module.exports = { ask, testKey, providerFor, modelFor, ANTHROPIC_MODEL, GEMINI_MODEL, MAX_ROUNDS };
