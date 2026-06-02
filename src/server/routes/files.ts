import { Router } from 'express';
import glob from 'fast-glob';

export const filesRouter = Router();

filesRouter.get('/', async (req, res) => {
  const cwd = typeof req.query.cwd === 'string' ? req.query.cwd : process.cwd();
  try {
    const files = await glob('**/*', {
      cwd,
      ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/dist-bin/**', '**/.vite/**'],
      onlyFiles: true,
      followSymbolicLinks: false,
    });
    res.json(files.sort());
  } catch {
    res.json([]);
  }
});
