import { readFile } from 'node:fs/promises';
import fg from 'fast-glob';
import { z } from 'zod';
import { resolveInsideWorkspace } from '../core/workspace.js';
import { loadIgnorePatterns } from '../core/ignorefile.js';
import type { Tool } from './types.js';

const inputSchema = z
  .object({
    query: z.string().min(1),
    pattern: z.string().default('**/*'),
    caseSensitive: z.boolean().default(false),
    limit: z.number().int().positive().max(500).default(50),
  })
  .strict();

type Input = z.infer<typeof inputSchema>;

export const searchTextTool: Tool<Input> = {
  name: 'search_text',
  description: 'Search text files in the workspace and return matching lines.',
  access: 'read',
  inputSchema,
  isConcurrencySafe: () => true,
  async run(input, context) {
    const userIgnore = await loadIgnorePatterns(context.cwd);
    const files = await fg(input.pattern, {
      cwd: context.cwd,
      dot: true,
      onlyFiles: true,
      followSymbolicLinks: false,
      ignore: ['**/.git/**', '**/node_modules/**', '**/dist/**', '**/coverage/**', ...userIgnore],
    });

    const needle = input.caseSensitive ? input.query : input.query.toLowerCase();
    const matches: string[] = [];

    for (const file of files.sort()) {
      if (matches.length >= input.limit) break;
      const filePath = await resolveInsideWorkspace(context.cwd, file);
      const text = await readMaybeText(filePath);
      if (text === null) continue;

      const lines = text.split(/\r?\n/);
      for (let index = 0; index < lines.length; index += 1) {
        const haystack = input.caseSensitive ? lines[index] : lines[index].toLowerCase();
        if (haystack.includes(needle)) {
          matches.push(`${file}:${index + 1}: ${lines[index]}`);
          if (matches.length >= input.limit) break;
        }
      }
    }

    return {
      title: `Found ${matches.length} match${matches.length === 1 ? '' : 'es'}`,
      output: matches.join('\n') || '(no matches)',
      metadata: {
        scannedFiles: files.length,
        limit: input.limit,
      },
    };
  },
};

async function readMaybeText(filePath: string): Promise<string | null> {
  try {
    const text = await readFile(filePath, 'utf8');
    return text.includes('\u0000') ? null : text;
  } catch {
    return null;
  }
}

