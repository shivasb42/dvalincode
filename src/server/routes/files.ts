import { Router } from 'express';
import glob from 'fast-glob';
import { resolveAllowedCwd } from '../security.js';

export const filesRouter = Router();

filesRouter.get('/', async (req, res) => {
  try {
    const cwd = await resolveAllowedCwd(typeof req.query.cwd === 'string' ? req.query.cwd : undefined);
    const files = await glob('**/*', {
      cwd,
      ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/dist-bin/**', '**/.vite/**'],
      onlyFiles: true,
      followSymbolicLinks: false,
    });
    res.json(files.sort());
  } catch (err) {
    res.status(403).json({ error: err instanceof Error ? err.message : 'Workspace is not allowed' });
  }
});
