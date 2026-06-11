import { Router } from 'express';
import { readConfig, writeConfig, maskConfig } from '../configStore.js';
import type { LLMConfig, Profile, ProviderPoolConfig } from '../configStore.js';
import { resetRRCursor } from '../../providers/pool.js';

export const configRouter = Router();

// Profile routes must be registered before the root route to avoid being shadowed

configRouter.get('/profiles', async (_req, res) => {
  const config = await readConfig();
  const profiles = config.profiles ?? {};
  // Mask apiKey in each profile
  const masked = Object.fromEntries(
    Object.entries(profiles).map(([name, profile]) => [
      name,
      { ...profile, apiKey: profile.apiKey ? '••••••••' : undefined },
    ]),
  );
  res.json(masked);
});

configRouter.post('/profiles/:name', async (req, res) => {
  const { name } = req.params;
  const body = req.body as Partial<Profile>;
  if (!body.provider) {
    res.status(400).json({ error: 'Missing required field: provider' });
    return;
  }

  const config = await readConfig();
  const profiles = config.profiles ?? {};
  profiles[name] = {
    provider: body.provider,
    apiKey: body.apiKey || undefined,
    baseUrl: body.baseUrl || undefined,
    model: body.model || undefined,
  };
  const updated = { ...config, profiles };
  await writeConfig(updated);
  res.json({ name, profile: { ...profiles[name], apiKey: profiles[name].apiKey ? '••••••••' : undefined } });
});

configRouter.delete('/profiles/:name', async (req, res) => {
  const { name } = req.params;
  const config = await readConfig();
  const profiles = config.profiles ?? {};
  if (!profiles[name]) {
    res.status(404).json({ error: `Profile "${name}" not found` });
    return;
  }
  delete profiles[name];
  const updated = { ...config, profiles };
  await writeConfig(updated);
  res.json({ deleted: name });
});

configRouter.post('/profiles/:name/apply', async (req, res) => {
  const { name } = req.params;
  const config = await readConfig();
  const profiles = config.profiles ?? {};
  const profile = profiles[name];
  if (!profile) {
    res.status(404).json({ error: `Profile "${name}" not found` });
    return;
  }
  const updated = {
    ...config,
    llm: {
      provider: profile.provider,
      apiKey: profile.apiKey,
      baseUrl: profile.baseUrl,
      model: profile.model,
    },
  };
  await writeConfig(updated);
  res.json(maskConfig(updated));
});

configRouter.get('/', async (_req, res) => {
  const config = await readConfig();
  res.json(maskConfig(config));
});

configRouter.post('/', async (req, res) => {
  const body = req.body as { llm?: Partial<LLMConfig> };
  if (!body.llm) {
    res.status(400).json({ error: 'Missing llm config' });
    return;
  }

  const current = await readConfig();

  // If apiKey is the mask placeholder, keep the existing key
  const incomingKey = body.llm.apiKey;
  const apiKey =
    incomingKey === '••••••••' || incomingKey === undefined
      ? current.llm.apiKey
      : incomingKey || undefined;

  const updated = {
    ...current,
    llm: {
      ...current.llm,
      ...body.llm,
      apiKey,
    },
  };

  await writeConfig(updated);
  res.json(maskConfig(updated));
});

// ── Provider pool ─────────────────────────────────────────────────────────────

configRouter.get('/pool', async (_req, res) => {
  const config = await readConfig();
  const masked = maskConfig(config);
  res.json(masked.pool ?? { enabled: false, policy: 'round-robin', entries: [] });
});

configRouter.post('/pool', async (req, res) => {
  const body = req.body as Partial<ProviderPoolConfig>;
  if (!body || typeof body.enabled !== 'boolean') {
    res.status(400).json({ error: 'Invalid pool config' });
    return;
  }

  const current = await readConfig();
  const existingEntries = current.pool?.entries ?? [];

  // Preserve real API keys where the browser sent the mask placeholder
  const entries = (body.entries ?? []).map(incoming => {
    const existing = existingEntries.find(e => e.id === incoming.id);
    const apiKey =
      incoming.apiKey === '••••••••' || incoming.apiKey === undefined
        ? existing?.apiKey
        : incoming.apiKey || undefined;
    return { ...incoming, apiKey };
  });

  const updated: typeof current = {
    ...current,
    pool: {
      enabled: body.enabled,
      policy: body.policy ?? 'round-robin',
      entries,
    },
  };

  await writeConfig(updated);
  resetRRCursor();
  res.json(maskConfig(updated).pool);
});
