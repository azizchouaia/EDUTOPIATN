/**
 * LLM adapter — one interface, two providers (Anthropic ⇄ Groq).
 *
 * Switch with AI_PROVIDER=anthropic|groq in .env. Anthropic is the quality
 * primary (native vision + PDF, prompt caching); Groq stays as a cheap fallback.
 * If Anthropic is selected but unavailable (no key/SDK), we fall back to Groq
 * so the assistant never goes fully dark.
 *
 * Every function returns/accepts a normalized shape so aiController doesn't care
 * which provider is live:
 *   usage → { prompt_tokens, completion_tokens }
 *   attachments → [{ kind: 'image'|'pdf', mime, base64 }]
 */

const Groq = require('groq-sdk');
let Anthropic = null;
try { Anthropic = require('@anthropic-ai/sdk'); } catch { /* SDK not installed → Groq only */ }

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const anthropic = (Anthropic && process.env.ANTHROPIC_API_KEY)
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const WANT = (process.env.AI_PROVIDER || 'groq').toLowerCase();

function activeProvider() {
  return WANT === 'anthropic' && anthropic ? 'anthropic' : 'groq';
}
function supportsNativeFiles() {
  return activeProvider() === 'anthropic';
}

// Model tiers per provider: gate (cheap classify), light (summaries), reason (hard math/vision)
const MODELS = {
  anthropic: {
    gate:   process.env.ANTHROPIC_MODEL_LIGHT  || 'claude-haiku-4-5-20251001',
    light:  process.env.ANTHROPIC_MODEL_LIGHT  || 'claude-haiku-4-5-20251001',
    reason: process.env.ANTHROPIC_MODEL_REASON || 'claude-sonnet-4-6',
  },
  groq: {
    gate:   'openai/gpt-oss-20b',
    light:  'qwen/qwen3.6-27b',
    reason: 'openai/gpt-oss-120b',
  },
};

function modelFor(tier) {
  return MODELS[activeProvider()][tier] || MODELS[activeProvider()].reason;
}

// ── Build provider-specific user content ────────────────────────
// Anthropic: text + native image/document blocks. Groq: plain text only
// (caller pre-injects any file text, since Groq can't read files inline).
function anthropicUserContent(userText, attachments = []) {
  const blocks = [];
  for (const a of attachments) {
    if (a.kind === 'image') {
      blocks.push({ type: 'image', source: { type: 'base64', media_type: a.mime, data: a.base64 } });
    } else if (a.kind === 'pdf') {
      blocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: a.base64 } });
    }
  }
  blocks.push({ type: 'text', text: userText });
  return blocks;
}

function normUsageAnthropic(u) {
  return { prompt_tokens: u?.input_tokens ?? null, completion_tokens: u?.output_tokens ?? null };
}
function normUsageGroq(u) {
  return { prompt_tokens: u?.prompt_tokens ?? null, completion_tokens: u?.completion_tokens ?? null };
}

// ── Scope gate / classifier (short JSON output) ─────────────────
async function classify(prompt) {
  if (activeProvider() === 'anthropic') {
    const msg = await anthropic.messages.create({
      model: modelFor('gate'),
      max_tokens: 80,
      messages: [{ role: 'user', content: prompt }],
    });
    return msg.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
  }
  const res = await groq.chat.completions.create({
    model: modelFor('gate'),
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 80,
    temperature: 0,
  });
  return res.choices[0]?.message?.content?.trim() ?? '{}';
}

// ── One-shot completion ─────────────────────────────────────────
async function chatOnce({ system, history = [], userText, attachments = [], model, maxTokens, temperature = 0.5 }) {
  if (activeProvider() === 'anthropic') {
    const msg = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: [...history, { role: 'user', content: anthropicUserContent(userText, attachments) }],
    });
    return {
      text: msg.content.filter(b => b.type === 'text').map(b => b.text).join('').trim(),
      usage: normUsageAnthropic(msg.usage),
    };
  }
  const completion = await groq.chat.completions.create({
    model,
    messages: [{ role: 'system', content: system }, ...history, { role: 'user', content: userText }],
    max_tokens: maxTokens,
    temperature,
  });
  return {
    text: completion.choices[0]?.message?.content?.trim() ?? '',
    usage: normUsageGroq(completion.usage),
  };
}

// ── Streaming completion (onDelta per token chunk) ──────────────
async function chatStream({ system, history = [], userText, attachments = [], model, maxTokens, temperature = 0.5, onDelta }) {
  let text = '';
  let usage = { prompt_tokens: null, completion_tokens: null };

  if (activeProvider() === 'anthropic') {
    const stream = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      stream: true,
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: [...history, { role: 'user', content: anthropicUserContent(userText, attachments) }],
    });
    for await (const event of stream) {
      if (event.type === 'message_start') {
        usage.prompt_tokens = event.message?.usage?.input_tokens ?? null;
      } else if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        text += event.delta.text;
        onDelta(event.delta.text);
      } else if (event.type === 'message_delta' && event.usage) {
        usage.completion_tokens = event.usage.output_tokens ?? usage.completion_tokens;
      }
    }
    return { text, usage };
  }

  const stream = await groq.chat.completions.create({
    model,
    messages: [{ role: 'system', content: system }, ...history, { role: 'user', content: userText }],
    max_tokens: maxTokens,
    temperature,
    stream: true,
  });
  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content ?? '';
    if (delta) { text += delta; onDelta(delta); }
    if (chunk.x_groq?.usage) usage = normUsageGroq(chunk.x_groq.usage);
  }
  return { text, usage };
}

// ── Groq-only image transcription (vision fallback) ─────────────
// Used only when provider = groq, which can't read images inline.
async function transcribeImageGroq({ base64, mime, prompt }) {
  const res = await groq.chat.completions.create({
    model: 'qwen/qwen3.6-27b',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:${mime};base64,${base64}` } },
      ],
    }],
    max_tokens: 2000,
    temperature: 0.1,
  });
  return res.choices[0]?.message?.content?.trim() ?? '';
}

module.exports = {
  activeProvider,
  supportsNativeFiles,
  modelFor,
  classify,
  chatOnce,
  chatStream,
  transcribeImageGroq,
};
