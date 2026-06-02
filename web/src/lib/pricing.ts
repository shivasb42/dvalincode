/** Token pricing in USD per 1M tokens. */
type ModelPricing = { input: number; output: number };

/** Hardcoded defaults for common providers/models. */
const PRICING_TABLE: Record<string, ModelPricing> = {
  // DeepSeek
  'deepseek-chat':     { input: 0.14,  output: 0.28  },
  'deepseek-coder':    { input: 0.14,  output: 0.28  },
  'deepseek-reasoner': { input: 0.55,  output: 2.19  },

  // OpenAI
  'gpt-4o':            { input: 2.50,  output: 10.00 },
  'gpt-4o-mini':       { input: 0.15,  output: 0.60  },
  'o1':                { input: 15.00, output: 60.00 },
  'o3-mini':           { input: 1.10,  output: 4.40  },

  // Groq (free tier, show $0)
  'llama-3.3-70b-versatile': { input: 0.00, output: 0.00 },
  'llama-3.1-8b-instant':    { input: 0.00, output: 0.00 },
  'mixtral-8x7b-32768':      { input: 0.00, output: 0.00 },

  // OpenRouter (approximate)
  'anthropic/claude-3.5-sonnet': { input: 3.00,  output: 15.00 },
  'google/gemini-2.0-flash-001': { input: 0.10,  output: 0.40  },
};

/** Fallback for unknown models — conservative estimate. */
const DEFAULT_PRICING: ModelPricing = { input: 1.00, output: 3.00 };

export function getPricing(model: string): ModelPricing {
  if (PRICING_TABLE[model]) return PRICING_TABLE[model];
  // Partial match — e.g. "deepseek-chat-v3" → use "deepseek-chat" pricing
  const key = Object.keys(PRICING_TABLE).find((k) => model.startsWith(k) || k.startsWith(model));
  return key ? PRICING_TABLE[key] : DEFAULT_PRICING;
}

export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  model: string,
): number {
  const p = getPricing(model);
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

export function formatCost(usd: number): string {
  if (usd === 0) return '$0';
  if (usd < 0.0001) return '<$0.0001';
  if (usd < 0.01)   return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(3)}`;
}
