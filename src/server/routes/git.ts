import { Router } from 'express';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(execFile);
export const gitRouter = Router();

gitRouter.get('/', async (req, res) => {
  const cwd = typeof req.query.cwd === 'string' ? req.query.cwd : process.cwd();
  try {
    const { stdout: branch } = await execAsync('git', ['branch', '--show-current'], { cwd });
    const { stdout: log } = await execAsync('git', ['log', '--oneline', '-1'], { cwd });
    res.json({ branch: branch.trim() || null, lastCommit: log.trim() || null });
  } catch {
    res.json({ branch: null, lastCommit: null });
  }
});
