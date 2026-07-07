// In-app copilot agent loop. Runs in the Electron main process, drives an LLM with the
// 3 consolidated tools (see tools.js), and returns a final answer plus any write proposals
// for the UI to confirm. A hard MAX_ROUNDS cap is the loop backstop.
//
// Single transport: ANY OpenAI-compatible /chat/completions endpoint — Groq (default),
// DeepSeek, OpenRouter, Together, a local server, … — selected by baseUrl + model. The key
// and endpoint are read from the environment (see keyStore.js); nothing is entered in the UI.

const { TOOL_DEFS, callTool } = require('./tools');
const { GROQ_BASE_URL, GROQ_DEFAULT_MODEL } = require('./keyStore');

const MAX_ROUNDS = 6; // anti-loop guard on tool turns
const MAX_TOKENS = 1536;

function systemPrompt(context) {
  return [
    'You are an accounting copilot embedded in a Tally-style ERP (a "Cursor for Tally").',
    'You help a CA/accountant read the books, draft entries, generate custom reports, explain anomalies, and suggest corrections or follow-up actions.',
    `Active context: company_id=${context.company_id ?? 'none'}, fy_id=${context.fy_id ?? 'none'}.`,
    'Rules:',
    '- ALWAYS use the `query` tool for any figure — never invent numbers. Resolve names to ids with `lookup` first.',
    '- For any change to the books (vouchers, reconciliation), use `propose` to draft it. NEVER claim something was saved — proposals require the user to approve in the app.',
    '- Be concise. Show amounts in ₹.',
    '- NATURAL-LANGUAGE REPORTS: If asked to create a custom report or analyze data, query the raw data (e.g. vouchers, ledgers) and output a clean Markdown table.',
    '- CITE SOURCES: You MUST always cite the report and filters you used at the bottom of your answer (e.g., "Source: vouchers query, filtered by type=Sales").',
    '- DRILLABLE LINKS: Every entity in your answer must be drillable. Use markdown links with custom app schemes:',
    '   - For vouchers: `[Vch #123](/vouchers/123)` (replace 123 with actual voucher_id)',
    '   - For ledgers: `[Cash Account](/reports/accounts/ledger?id=456)` (replace 456 with actual ledger_id)',
    '   - For stock items: `[Item Name](/stock/789)` (replace 789 with actual stock_item_id)',
    '- If the company/fy is missing, say so.',
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
      if (c.name === 'propose' && result && result.ok && result.proposal)
        proposals.push(result.proposal);
    } catch (err) {
      result = { error: err.message };
    }
    out.push({ id: c.id, name: c.name, result });
  }
  return out;
}

// config: { apiKey, baseUrl?, model? }
async function ask({ config, prompt, context = {}, history = [] }) {
  if (!config || !config.apiKey)
    return { success: false, error: 'AI is not configured on the server.' };
  if (!prompt || !prompt.trim()) return { success: false, error: 'Empty prompt.' };
  return askOpenAICompatible({
    apiKey: config.apiKey,
    baseUrl: config.baseUrl || GROQ_BASE_URL,
    model: config.model || GROQ_DEFAULT_MODEL,
    prompt,
    context,
    history,
  });
}

// OpenAI-compatible /chat/completions transport (Groq, DeepSeek, OpenRouter, local, …).
async function askOpenAICompatible({ apiKey, baseUrl, model, prompt, context, history }) {
  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const tools = TOOL_DEFS.map((t) => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.input_schema },
  }));
  const messages = [
    { role: 'system', content: systemPrompt(context) },
    ...history
      .filter((m) => m && m.text)
      .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text })),
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
        body: JSON.stringify({
          model,
          messages,
          tools,
          tool_choice: 'auto',
          max_tokens: MAX_TOKENS,
        }),
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
        return {
          success: true,
          model,
          text: (msg.content || '').trim(),
          proposals,
          rounds,
          toolTrace,
        };
      }
      // Echo the assistant tool-call message, then append a tool message per call.
      messages.push({ role: 'assistant', content: msg.content || null, tool_calls: toolCalls });
      const calls = toolCalls.map((tc) => {
        let input = {};
        try {
          input = JSON.parse(tc.function.arguments || '{}');
        } catch (_) {
          /* keep {} */
        }
        return { id: tc.id, name: tc.function.name, input };
      });
      const results = await execTools(calls, context, proposals, toolTrace);
      for (const r of results) {
        messages.push({
          role: 'tool',
          tool_call_id: r.id,
          content: JSON.stringify(r.result).slice(0, 12000),
        });
      }
    }
    return {
      success: true,
      model,
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

module.exports = { ask, MAX_ROUNDS, GROQ_BASE_URL, GROQ_DEFAULT_MODEL };
