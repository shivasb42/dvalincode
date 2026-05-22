import { Router } from 'express';
import { createDefaultToolRegistry } from '../../tools/registry.js';

export const toolsRouter = Router();

toolsRouter.get('/', (_req, res) => {
  const registry = createDefaultToolRegistry();
  res.json(
    registry.list().map((t) => ({
      name: t.name,
      description: t.description,
      access: t.access,
    })),
  );
});
