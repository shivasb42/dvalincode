import { Router } from 'express';
import { execFile } from 'node:child_process';
import { mkdir, realpath } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { allowWorkspaceRoot, resolveAllowedCwd } from '../security.js';

const execAsync = promisify(execFile);
export const projectsRouter = Router();

function projectsHome(): string {
  return path.join(homedir(), '.dvalincode', 'projects');
}

function safeName(value: string): string {
  return value
    .trim()
    .replace(/\.git$/, '')
    .split(/[\\/]/)
    .pop()!
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || `project-${Date.now()}`;
}

function nameFromGitUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return safeName(parsed.pathname);
  } catch {
    return safeName(url);
  }
}

async function pickFolder(): Promise<string> {
  if (process.platform === 'darwin') {
    const script = 'POSIX path of (choose folder with prompt "Choose a DvalinCode workspace")';
    const { stdout } = await execAsync('osascript', ['-e', script]);
    return stdout.trim();
  }

  if (process.platform === 'win32') {
    const script = [
      'Add-Type -AssemblyName System.Windows.Forms',
      '$dialog = New-Object System.Windows.Forms.FolderBrowserDialog',
      '$dialog.Description = "Choose a DvalinCode workspace"',
      'if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { $dialog.SelectedPath }',
    ].join('; ');
    const { stdout } = await execAsync('powershell.exe', ['-NoProfile', '-STA', '-Command', script]);
    return stdout.trim();
  }

  for (const picker of [
    { command: 'zenity', args: ['--file-selection', '--directory', '--title=DvalinCode workspace'] },
    { command: 'kdialog', args: ['--getexistingdirectory', process.cwd(), 'DvalinCode workspace'] },
  ]) {
    try {
      const { stdout } = await execAsync(picker.command, picker.args);
      return stdout.trim();
    } catch {
      // Try the next desktop picker.
    }
  }
  throw new Error('No folder picker is available. Enter the workspace path manually.');
}

projectsRouter.post('/open', async (req, res) => {
  const body = req.body as { cwd?: string };
  try {
    const cwd = body.cwd
      ? await allowWorkspaceRoot(body.cwd)
      : await allowWorkspaceRoot(await pickFolder());
    res.json({ cwd });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Could not open workspace' });
  }
});

projectsRouter.post('/clone', async (req, res) => {
  const body = req.body as { url?: string; parentDir?: string; name?: string };
  if (!body.url?.trim()) {
    res.status(400).json({ error: 'Missing Git URL' });
    return;
  }

  try {
    const parent = body.parentDir?.trim()
      ? await allowWorkspaceRoot(body.parentDir)
      : await allowWorkspaceRoot(projectsHome());
    await mkdir(parent, { recursive: true });
    const target = path.join(parent, safeName(body.name || nameFromGitUrl(body.url)));
    await execAsync('git', ['clone', body.url.trim(), target], { cwd: parent });
    const cwd = await allowWorkspaceRoot(target);
    res.json({ cwd });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Could not clone repository' });
  }
});

projectsRouter.post('/worktree', async (req, res) => {
  const body = req.body as { cwd?: string; branch?: string; path?: string; createBranch?: boolean };
  if (!body.cwd || !body.branch?.trim() || !body.path?.trim()) {
    res.status(400).json({ error: 'cwd, branch, and path are required' });
    return;
  }

  try {
    const repo = await resolveAllowedCwd(body.cwd);
    const target = path.resolve(body.path);
    await mkdir(path.dirname(target), { recursive: true });
    const args = body.createBranch
      ? ['worktree', 'add', '-b', body.branch.trim(), target]
      : ['worktree', 'add', target, body.branch.trim()];
    await execAsync('git', args, { cwd: repo });
    const cwd = await allowWorkspaceRoot(await realpath(target));
    res.json({ cwd });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Could not create worktree' });
  }
});
