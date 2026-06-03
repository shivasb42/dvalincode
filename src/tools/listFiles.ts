import fg from 'fast-glob';
import { z } from 'zod';
import { loadIgnorePatterns } from '../core/ignorefile.js';
import type { Tool } from './types.js';

const inputSchema = z
  .object({
    pattern: z.string().default('**/*'),
    limit: z.number().int().positive().max(2000).default(200),
  })
  .strict();

type Input = z.infer<typeof inputSchema>;

export const listFilesTool: Tool<Input> = {
  name: 'list_files',
  description: 'List files in the current workspace using a glob pattern.',
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

    const selected = files.sort().slice(0, input.limit);
    return {
      title: `Listed ${selected.length} file${selected.length === 1 ? '' : 's'}`,
      output: selected.join('\n') || '(no files matched)',
      metadata: {
        totalMatches: files.length,
        limit: input.limit,
      },
    };
  },
};

