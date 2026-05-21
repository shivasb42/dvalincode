import { readFile, stat } from 'node:fs/promises';
import { z } from 'zod';
import { resolveInsideWorkspace } from '../core/workspace.js';
import type { Tool } from './types.js';

const inputSchema = z
  .object({
    filePath: z.string().min(1),
    offset: z.number().int().nonnegative().optional(),
    limit: z.number().int().positive().max(1000).optional(),
  })
  .strict();

type Input = z.infer<typeof inputSchema>;

export const readFileTool: Tool<Input> = {
  name: 'read_file',
  description: 'Read a UTF-8 text file from inside the workspace.',
  access: 'read',
  inputSchema,
  isConcurrencySafe: () => true,
  async run(input, context) {
    const resolvedPath = await resolveInsideWorkspace(context.cwd, input.filePath);
    const info = await stat(resolvedPath);

    if (info.isDirectory()) {
      throw new Error(`Cannot read a directory as a file: ${input.filePath}`);
    }

    if (info.size > context.maxBytes) {
      throw new Error(`File is larger than the configured limit (${context.maxBytes} bytes).`);
    }

    const text = await readFile(resolvedPath, 'utf8');
    const lines = text.split(/\r?\n/);
    const start = input.offset ?? 0;
    const end = input.limit ? start + input.limit : lines.length;
    const selected = lines.slice(start, end);
    const numbered = selected.map((line, index) => `${String(start + index + 1).padStart(4, ' ')} | ${line}`);

    return {
      title: `Read ${input.filePath}`,
      output: numbered.join('\n'),
      metadata: {
        bytes: info.size,
        totalLines: lines.length,
        offset: start,
        returnedLines: selected.length,
      },
    };
  },
};

