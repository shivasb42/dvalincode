import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { scanProject } from '../src/core/projectScanner.js';

describe('scanProject', () => {
  it('detects TypeScript Node projects', async () => {
    const root = join(tmpdir(), `dvalincode-scan-${Date.now()}`);
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(join(root, 'package.json'), JSON.stringify({ devDependencies: { typescript: '^5.0.0' } }));
    await writeFile(join(root, 'tsconfig.json'), '{}');
    await writeFile(join(root, 'src', 'index.ts'), 'export const value = 1;\n');

    const summary = await scanProject(root);

    expect(summary.fileCount).toBe(3);
    expect(summary.signals).toContain('Node.js package');
    expect(summary.signals).toContain('TypeScript');
    expect(summary.signals).toContain('TypeScript config');
  });
});

