import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { generateDiff, formatDiff } from '../core/diffPreview.js';
import { resolveInsideWorkspace } from '../core/workspace.js';
import type { Tool, ReverseOp, ToolResult } from './types.js';

const inputSchema = z
  .object({
    filePath: z.string().min(1),
    content: z.string(),
  })
  .strict();

type Input = z.infer<typeof inputSchema>;

export const writeFileTool: Tool<Input> = {
  name: 'write_file',
  description: 'Write content to a file inside the workspace. Reports a diff if the file already exists.',
  access: 'write',
  inputSchema,
  isConcurrencySafe: () => false,

  isUndoable: () => true,

  reverse(input: Input, result: ToolResult): ReverseOp | undefined {
    const existed = result.metadata?.existed === true;
    if (existed) {
      // File existed before — we can't restore the original content without a backup.
      // For now, warn. In future we'll store backups.
      return undefined;
    }
    // File was new — delete it
    return {
      toolName: 'edit_file',
      input: { filePath: input.filePath, oldString: input.content, newString: '' },
      description: `Undo write_file: delete newly created file "${input.filePath}"`,
    };
  },

  async run(input, context) {
    const filePath = resolveInsideWorkspace(context.cwd, input.filePath);

    let output: string;
    const exists = await fileExists(filePath);

    if (exists) {
      const original = await readFile(filePath, 'utf8');
      const diff = generateDiff(original, input.content);
      output = formatDiff(diff);
    } else {
      await mkdir(path.dirname(filePath), { recursive: true });
      output = `Creating new file: ${input.filePath}`;
    }

    await writeFile(filePath, input.content, 'utf8');

    return {
      title: `Write ${input.filePath}`,
      output,
      metadata: {
        path: filePath,
        bytes: Buffer.byteLength(input.content, 'utf8'),
        existed: exists,
      },
    };
  },
};

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await readFile(filePath, 'utf8');
    return true;
  } catch {
    return false;
  }
}
