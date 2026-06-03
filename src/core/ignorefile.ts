import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function loadIgnorePatterns(cwd: string): Promise<string[]> {
  try {
    const content = await readFile(join(cwd, '.dvalincodeignore'), 'utf8');
    return content.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  } catch {
    return [];
  }
}
