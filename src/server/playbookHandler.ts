import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Request, Response } from 'express';

type PlaybookRoutine = { label: string; prompt: string };

async function loadPlaybook(cwd: string): Promise<PlaybookRoutine[]> {
  try {
    const raw = await fs.readFile(path.join(cwd, 'dvalin.json'), 'utf-8');
    const data = JSON.parse(raw) as { version: number; routines: PlaybookRoutine[] };
    if (data.version === 1 && Array.isArray(data.routines)) return data.routines;
  } catch { /* absent or invalid */ }
  return [];
}

export async function getPlaybook(req: Request, res: Response): Promise<void> {
  const cwd = req.query.cwd as string;
  if (!cwd) { res.status(400).json({ error: 'cwd required' }); return; }
  res.json({ routines: await loadPlaybook(cwd) });
}

export async function savePlaybook(req: Request, res: Response): Promise<void> {
  const { cwd, routines } = req.body as { cwd: string; routines: PlaybookRoutine[] };
  if (!cwd || !Array.isArray(routines)) {
    res.status(400).json({ error: 'cwd and routines required' });
    return;
  }
  const out = JSON.stringify({ version: 1, routines }, null, 2) + '\n';
  const tmp = path.join(cwd, '.dvalin.json.tmp');
  const dest = path.join(cwd, 'dvalin.json');
  await fs.writeFile(tmp, out, 'utf-8');
  await fs.rename(tmp, dest);
  res.json({ ok: true });
}
