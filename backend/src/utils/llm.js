/**
 * LLM adapter — one interface, two providers (Anthropic ⇄ Groq).
 *
 * Switch with AI_PROVIDER=anthropic|groq in .env.
 *
 * Anthropic is the quality primary (native vision + PDF).
 * Groq is the cheaper fallback.
 *
 * Every function returns/accepts a normalized shape:
 *   usage → { prompt_tokens, completion_tokens }
 *   attachments → [{ kind: 'image'|'pdf', mime, base64 }]
 */

const Groq = require('groq-sdk');

let Anthropic = null;

try {
  Anthropic = require('@anthropic-ai/sdk');
} catch {
  // Anthropic SDK not installed → Anthropic unavailable
}

// ─────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────

const WANT = (process.env.AI_PROVIDER || 'groq').toLowerCase();

const hasGroqKey =
  typeof process.env.GROQ_API_KEY === 'string' &&
  process.env.GROQ_API_KEY.trim().length > 0;

const hasAnthropicKey =
  typeof process.env.ANTHROPIC_API_KEY === 'string' &&
  process.env.ANTHROPIC_API_KEY.trim().length > 0;

// ─────────────────────────────────────────────────────────────
// Provider clients
// IMPORTANT: Do NOT instantiate Groq if there is no key.
// ─────────────────────────────────────────────────────────────

const groq = hasGroqKey
  ? new Groq({
      apiKey: process.env.GROQ_API_KEY,
    })
  : null;

const anthropic =
  Anthropic && hasAnthropicKey
    ? new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      })
    : null;

// ─────────────────────────────────────────────────────────────
// Active provider
// ─────────────────────────────────────────────────────────────

function activeProvider() {
  if (WANT === 'anthropic' && anthropic) {
    return 'anthropic';
  }

  if (WANT === 'groq' && groq) {
    return 'groq';
  }

  // Fallback if selected provider is unavailable
  if (anthropic) {
    return 'anthropic';
  }

  if (groq) {
    return 'groq';
  }

  throw new Error(
    'No LLM provider is configured. Set ANTHROPIC_API_KEY or GROQ_API_KEY in your .env file.'
  );
}

function supportsNativeFiles() {
  return activeProvider() === 'anthropic';
}

// ─────────────────────────────────────────────────────────────
// Models
// ─────────────────────────────────────────────────────────────

const MODELS = {
  anthropic: {
    gate:
      process.env.ANTHROPIC_MODEL_LIGHT ||
      'claude-haiku-4-5-20251001',

    light:
      process.env.ANTHROPIC_MODEL_LIGHT ||
      'claude-haiku-4-5-20251001',

    reason:
      process.env.ANTHROPIC_MODEL_REASON ||
      'claude-sonnet-4-6',
  },

  groq: {
    gate: 'openai/gpt-oss-20b',
    light: 'qwen/qwen3.6-27b',
    reason: 'openai/gpt-oss-120b',
  },
};

function modelFor(tier) {
  const provider = activeProvider();

  return (
    MODELS[provider][tier] ||
    MODELS[provider].reason
  );
}

// ─────────────────────────────────────────────────────────────
// Provider-specific content
// ─────────────────────────────────────────────────────────────

function anthropicUserContent(userText, attachments = []) {
  const blocks = [];

  for (const a of attachments) {
    if (a.kind === 'image') {
      blocks.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: a.mime,
          data: a.base64,
        },
      });
    } else if (a.kind === 'pdf') {
      blocks.push({
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: a.base64,
        },
      });
    }
  }

  blocks.push({
    type: 'text',
    text: userText,
  });

  return blocks;
}

// ─────────────────────────────────────────────────────────────
// Usage normalization
// ─────────────────────────────────────────────────────────────

function normUsageAnthropic(u) {
  return {
    prompt_tokens: u?.input_tokens ?? null,
    completion_tokens: u?.output_tokens ?? null,
  };
}

function normUsageGroq(u) {
  return {
    prompt_tokens: u?.prompt_tokens ?? null,
    completion_tokens: u?.completion_tokens ?? null,
  };
}

// ─────────────────────────────────────────────────────────────
// Scope gate / classifier
// ─────────────────────────────────────────────────────────────

async function classify(prompt) {
  const provider = activeProvider();

  if (provider === 'anthropic') {
    const msg = await anthropic.messages.create({
      model: modelFor('gate'),
      max_tokens: 80,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    return msg.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
  }

  const res = await groq.chat.completions.create({
    model: modelFor('gate'),
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    max_tokens: 80,
    temperature: 0,
  });

  return res.choices[0]?.message?.content?.trim() ?? '{}';
}

// ─────────────────────────────────────────────────────────────
// One-shot completion
// ─────────────────────────────────────────────────────────────

async function chatOnce({
  system,
  history = [],
  userText,
  attachments = [],
  model,
  maxTokens,
  temperature = 0.5,
}) {
  const provider = activeProvider();

  if (provider === 'anthropic') {
    const msg = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,

      system: [
        {
          type: 'text',
          text: system,
          cache_control: {
            type: 'ephemeral',
          },
        },
      ],

      messages: [
        ...history,
        {
          role: 'user',
          content: anthropicUserContent(
            userText,
            attachments
          ),
        },
      ],
    });

    return {
      text: msg.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('')
        .trim(),

      usage: normUsageAnthropic(msg.usage),
    };
  }

  const completion = await groq.chat.completions.create({
    model,

    messages: [
      {
        role: 'system',
        content: system,
      },
      ...history,
      {
        role: 'user',
        content: userText,
      },
    ],

    max_tokens: maxTokens,
    temperature,
  });

  return {
    text:
      completion.choices[0]?.message?.content?.trim() ?? '',

    usage: normUsageGroq(completion.usage),
  };
}

// ─────────────────────────────────────────────────────────────
// Streaming completion
// ─────────────────────────────────────────────────────────────

async function chatStream({
  system,
  history = [],
  userText,
  attachments = [],
  model,
  maxTokens,
  temperature = 0.5,
  onDelta,
}) {
  let text = '';

  let usage = {
    prompt_tokens: null,
    completion_tokens: null,
  };

  const provider = activeProvider();

  // ───────────────────────────────────────────────────────────
  // Anthropic
  // ───────────────────────────────────────────────────────────

  if (provider === 'anthropic') {
    const stream = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      stream: true,

      system: [
        {
          type: 'text',
          text: system,
          cache_control: {
            type: 'ephemeral',
          },
        },
      ],

      messages: [
        ...history,
        {
          role: 'user',
          content: anthropicUserContent(
            userText,
            attachments
          ),
        },
      ],
    });

    for await (const event of stream) {
      if (event.type === 'message_start') {
        usage.prompt_tokens =
          event.message?.usage?.input_tokens ?? null;
      }

      else if (
        event.type === 'content_block_delta' &&
        event.delta?.type === 'text_delta'
      ) {
        text += event.delta.text;

        if (onDelta) {
          onDelta(event.delta.text);
        }
      }

      else if (
        event.type === 'message_delta' &&
        event.usage
      ) {
        usage.completion_tokens =
          event.usage.output_tokens ??
          usage.completion_tokens;
      }
    }

    return {
      text,
      usage,
    };
  }

  // ───────────────────────────────────────────────────────────
  // Groq
  // ───────────────────────────────────────────────────────────

  const stream = await groq.chat.completions.create({
    model,

    messages: [
      {
        role: 'system',
        content: system,
      },
      ...history,
      {
        role: 'user',
        content: userText,
      },
    ],

    max_tokens: maxTokens,
    temperature,
    stream: true,
  });

  for await (const chunk of stream) {
    const delta =
      chunk.choices?.[0]?.delta?.content ?? '';

    if (delta) {
      text += delta;

      if (onDelta) {
        onDelta(delta);
      }
    }

    if (chunk.x_groq?.usage) {
      usage = normUsageGroq(
        chunk.x_groq.usage
      );
    }
  }

  return {
    text,
    usage,
  };
}

// ─────────────────────────────────────────────────────────────
// Groq image transcription / vision fallback
// ─────────────────────────────────────────────────────────────

async function transcribeImageGroq({
  base64,
  mime,
  prompt,
}) {
  if (!groq) {
    throw new Error(
      'Groq is not configured. Set GROQ_API_KEY in your .env file.'
    );
  }

  const res = await groq.chat.completions.create({
    model: 'qwen/qwen3.6-27b',

    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt,
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mime};base64,${base64}`,
            },
          },
        ],
      },
    ],

    max_tokens: 2000,
    temperature: 0.1,
  });

  return (
    res.choices[0]?.message?.content?.trim() ?? ''
  );
}

// ─────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────

module.exports = {
  activeProvider,
  supportsNativeFiles,
  modelFor,
  classify,
  chatOnce,
  chatStream,
  transcribeImageGroq,
};