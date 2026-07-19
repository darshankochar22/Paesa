// Native Google Gemini client (developer-side, environment-only).
//
// Used for two things:
//   1. Vision bill-scan — read an uploaded invoice/bill image and draft a voucher.
//   2. Conversations — an optional Gemini transport for the Copilot (the OpenAI-compatible
//      agent loop can also point at Gemini's /openai endpoint; this native client is used
//      for the multimodal scan where responseSchema-constrained JSON is the cleanest path).
//
// Config (loaded from .env by server/loadEnv.js, never entered in the UI):
//   GEMINI_API_KEY   Google AI Studio key                         [required for scan]
//   GEMINI_MODEL     model id                                     [default: gemini-2.5-flash]
//
// gemini-2.5-flash is multimodal (image+text in, JSON out), fast and inexpensive — the
// right default for OCR-style structured extraction. Override with GEMINI_MODEL.

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-2.5-flash';

// Falls back to the shared AI_API_KEY only when it is clearly a Google key, so a Groq
// key configured for the Copilot is never mis-sent to Google.
function getConfig() {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) return null;
  return { apiKey, model: (process.env.GEMINI_MODEL || DEFAULT_MODEL).trim() };
}

function maskKey(k) {
  if (!k) return null;
  return k.length <= 11 ? `${k.slice(0, 3)}…` : `${k.slice(0, 7)}…${k.slice(-4)}`;
}

function getStatus() {
  const cfg = getConfig();
  if (!cfg) return { hasKey: false, model: null, masked: null };
  return { hasKey: true, model: cfg.model, masked: maskKey(cfg.apiKey) };
}

// Low-level :generateContent call. `parts` is the Gemini content-parts array (text and/or
// inline_data). `generationConfig` is passed through (responseMimeType, responseSchema, …).
// Returns the raw text of the first candidate, or throws with a readable message.
async function generateContent(parts, generationConfig = {}) {
  const cfg = getConfig();
  if (!cfg)
    throw new Error('Gemini is not configured. Set GEMINI_API_KEY in the server .env and restart.');
  const url = `${GEMINI_BASE}/models/${cfg.model}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig }),
  });
  if (!resp.ok) {
    const t = await resp.text().catch(() => '');
    throw new Error(`Gemini ${resp.status}: ${t.slice(0, 400)}`);
  }
  const data = await resp.json();
  const cand = data.candidates && data.candidates[0];
  if (!cand) {
    const block = data.promptFeedback && data.promptFeedback.blockReason;
    throw new Error(
      block ? `Gemini blocked the request (${block}).` : 'Gemini returned no candidates.',
    );
  }
  const text = ((cand.content && cand.content.parts) || [])
    .map((p) => p.text || '')
    .join('')
    .trim();
  if (!text) throw new Error('Gemini returned an empty response.');
  return text;
}

// JSON Schema (OpenAPI subset Gemini accepts via responseSchema) for one drafted voucher.
// Mirrors the fields server/automation/voucherContract.js expects, minus company_id/fy_id
// (filled server-side) — so the draft flows straight into the voucher entry screen.
const VOUCHER_DRAFT_SCHEMA = {
  type: 'object',
  properties: {
    voucher_type: {
      type: 'string',
      enum: [
        'Sales',
        'Purchase',
        'Credit Note',
        'Debit Note',
        'Payment',
        'Receipt',
        'Journal',
        'Contra',
      ],
      description:
        'Best-fit type. A vendor bill you received = Purchase; an invoice you issued = Sales.',
    },
    date: {
      type: 'string',
      description: 'Invoice date as YYYY-MM-DD. Use today if none is legible.',
    },
    party_name: {
      type: 'string',
      description: 'The other party (supplier for Purchase, customer for Sales).',
    },
    reference_number: {
      type: 'string',
      description: 'Invoice / bill number printed on the document.',
    },
    narration: { type: 'string', description: 'One-line description of the transaction.' },
    entries: {
      type: 'array',
      description:
        'Accounting Dr/Cr lines. Prefer ledger names from the provided existing-ledgers list.',
      items: {
        type: 'object',
        properties: {
          ledger_name: { type: 'string' },
          type: { type: 'string', enum: ['Dr', 'Cr'] },
          amount: { type: 'number' },
        },
        required: ['ledger_name', 'type', 'amount'],
      },
    },
    stock_entries: {
      type: 'array',
      description:
        'Line items if the bill lists goods. Prefer item names from the provided existing-items list.',
      items: {
        type: 'object',
        properties: {
          item_name: { type: 'string' },
          quantity: { type: 'number' },
          rate: { type: 'number' },
          amount: { type: 'number' },
        },
        required: ['item_name', 'amount'],
      },
    },
    tax_amount: { type: 'number', description: 'Total GST on the bill, if shown.' },
    total_amount: { type: 'number', description: 'Invoice grand total.' },
    confidence: { type: 'number', description: '0..1 confidence in the extraction.' },
    notes: {
      type: 'string',
      description: 'Anything ambiguous or unreadable the user should check.',
    },
  },
  required: ['voucher_type', 'date', 'entries'],
};

// Read a bill image and return a drafted voucher object (validated JSON, NOT saved).
// `ledgerNames` / `itemNames` are the company's existing masters so the model maps to
// real names; final id resolution + validation happen server-side before the user reviews.
async function scanBillToVoucher({
  imageBase64,
  mimeType,
  ledgerNames = [],
  itemNames = [],
  today,
}) {
  if (!imageBase64) throw new Error('No image provided.');
  const cap = (arr, n) => (arr.length > n ? arr.slice(0, n) : arr);

  const promptText = [
    'You are an expert accounting data-entry assistant for an Indian (Tally-style) ERP.',
    'Read the attached bill/invoice image and extract ONE voucher as strict JSON matching the response schema.',
    '',
    'Rules:',
    '- Decide voucher_type: a bill/invoice RECEIVED from a supplier = "Purchase"; an invoice you ISSUED to a customer = "Sales". If it clearly reads as a payment/receipt, use those.',
    '- Amounts are positive numbers; the Dr/Cr "type" carries the direction.',
    '- For a Purchase: Dr the expense/purchase and input-GST ledgers, Cr the supplier (party). For a Sales: Dr the customer (party), Cr the sales and output-GST ledgers.',
    '- STRONGLY prefer names from the EXISTING LEDGERS / EXISTING ITEMS lists below (exact spelling) so they resolve to real masters. Only invent a name if nothing fits.',
    '- Put the invoice number in reference_number and the invoice date in date (YYYY-MM-DD).',
    '- If a value is unreadable, make your best estimate and mention it in notes; never fabricate a total that contradicts the visible line items.',
    '',
    `Today's date (fallback): ${today}`,
    `EXISTING LEDGERS (${ledgerNames.length}): ${cap(ledgerNames, 400).join(' | ') || '(none)'}`,
    `EXISTING ITEMS (${itemNames.length}): ${cap(itemNames, 400).join(' | ') || '(none)'}`,
  ].join('\n');

  const parts = [
    { inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } },
    { text: promptText },
  ];

  const raw = await generateContent(parts, {
    responseMimeType: 'application/json',
    responseSchema: VOUCHER_DRAFT_SCHEMA,
    temperature: 0.1,
  });

  let draft;
  try {
    draft = JSON.parse(raw);
  } catch (_) {
    // Defensive: strip a ```json fence if the model added one despite responseMimeType.
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('Gemini did not return parseable JSON.');
    draft = JSON.parse(m[0]);
  }
  return draft;
}

module.exports = {
  getConfig,
  getStatus,
  maskKey,
  generateContent,
  scanBillToVoucher,
  VOUCHER_DRAFT_SCHEMA,
  GEMINI_BASE,
  DEFAULT_MODEL,
};
