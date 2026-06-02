import { Router } from 'express';
import { readConfig, writeConfig, maskConfig } from '../configStore.js';
import type { LLMConfig } from '../configStore.js';

export const configRouter = Router();

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
