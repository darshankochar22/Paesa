// A scripted stand-in for an OpenAI-compatible /chat/completions endpoint, so the Copilot
// agent loop can be tested without a network. Pass `fetchImpl` to agent.ask(); each step is
// the provider's answer to one request, in order:
//   reply('text')                    an answer with no tool calls
//   toolCall(id, name, args)         a turn asking for one tool call (args may be a raw
//                                    string, to send arguments that are not valid JSON)
//   { status: 500, body: 'down' }    an HTTP error
//   { throws: error }                fetch rejects with `error` (for example a timeout)
// `calls` records every request: { url, headers, body (parsed), signal }.
function fakeOpenAI(steps) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, headers: init.headers, body: JSON.parse(init.body), signal: init.signal });
    const step = steps[calls.length - 1];
    if (step === undefined) throw new Error(`fakeOpenAI: no step for request ${calls.length}`);
    if (step.throws) throw step.throws;
    if (step.status) return { ok: false, status: step.status, text: async () => step.body || '' };
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: step }] }) };
  };
  return { fetchImpl, calls };
}

const reply = (text) => ({ role: 'assistant', content: text });

const toolCall = (id, name, args) => ({
  role: 'assistant',
  content: null,
  tool_calls: [
    {
      id,
      type: 'function',
      function: { name, arguments: typeof args === 'string' ? args : JSON.stringify(args) },
    },
  ],
});

module.exports = { fakeOpenAI, reply, toolCall };
