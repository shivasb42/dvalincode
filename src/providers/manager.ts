import type { ProviderAdapter } from './types.js';
import type { OpenAIConfig } from './openaiCompatible.js';
import { createOpenAICompatibleProvider } from './openaiCompatible.js';

export type ConfiguredProvider = {
  name: string;
  adapter: ProviderAdapter;
};

export class ProviderManager {
  private providers = new Map<string, ProviderAdapter>();

  addOpenAI(name: string, config: OpenAIConfig): this {
    const adapter = createOpenAICompatibleProvider({ ...config, name });
    this.providers.set(name, adapter);
    return this;
  }

  get(name: string): ProviderAdapter {
    const provider = this.providers.get(name);
    if (!provider) throw new Error(`Unknown provider: ${name}. Available: ${[...this.providers.keys()].join(', ')}`);
    return provider;
  }

  list(): ConfiguredProvider[] {
    return [...this.providers.entries()].map(([name, adapter]) => ({ name, adapter }));
  }

  /** Load from env: DVALINCODE_PROVIDER, DVALINCODE_API_KEY, DVALINCODE_BASE_URL, DVALINCODE_MODEL */
  loadFromEnv(): this {
    const providerName = process.env.DVALINCODE_PROVIDER ?? 'deepseek';
    const apiKey = process.env.DVALINCODE_API_KEY;
    const baseUrl = process.env.DVALINCODE_BASE_URL;
    const model = process.env.DVALINCODE_MODEL;

    this.addOpenAI(providerName, { apiKey, baseUrl, model });
    return this;
  }
}
