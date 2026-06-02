import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

export type LLMConfig = {
  provider: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
};

export type AppConfig = {
  llm: LLMConfig;
};

const CONFIG_DIR = join(homedir(), '.dvalincode');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

const DEFAULTS: AppConfig = {
  llm: {
    provider: process.env['DVALINCODE_PROVIDER'] ?? 'deepseek',
    apiKey: process.env['DVALINCODE_API_KEY'],
    baseUrl: process.env['DVALINCODE_BASE_URL'],
    model: process.env['DVALINCODE_MODEL'],
  },
};

export async function readConfig(): Promise<AppConfig> {
  try {
    const raw = await readFile(CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<AppConfig>;
    // Merge with defaults (env vars are overridden by saved config)
    return {
      llm: { ...DEFAULTS.llm, ...parsed.llm },
    };
  } catch {
    return DEFAULTS;
  }
}

export async function writeConfig(config: AppConfig): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

/** Return config safe for the browser (API key masked). */
export function maskConfig(config: AppConfig): AppConfig & { llm: { apiKeySet: boolean } } {
  return {
    ...config,
    llm: {
      ...config.llm,
      apiKey: config.llm.apiKey ? '••••••••' : undefined,
      apiKeySet: !!config.llm.apiKey,
    },
  };
}
