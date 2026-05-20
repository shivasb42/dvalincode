import { describe, it, expect } from 'vitest';
import { createDefaultToolRegistry } from '../src/tools/registry.js';
import { createForgeContext } from '../src/core/context.js';
import type { ReverseOp } from '../src/tools/types.js';

const context = createForgeContext({
  cwd: process.cwd(),
  allowWrite: true,
  allowExecute: true,
});

describe('Undo system', () => {
  it('edit_file declares undoable', () => {
    const tool = createDefaultToolRegistry().get('edit_file');
    expect(tool?.isUndoable?.(null as never)).toBe(true);
  });

  it('edit_file computes reverse operation (swap strings)', () => {
    const tool = createDefaultToolRegistry().get('edit_file')!;
    const reverseOp = tool.reverse!(
      { filePath: 'test.ts', oldString: 'foo', newString: 'bar' },
      { title: '', output: '' },
    ) as ReverseOp;
    expect(reverseOp).toBeDefined();
    expect(reverseOp.toolName).toBe('edit_file');
    expect((reverseOp.input as Record<string, string>).newString).toBe('foo');
    expect((reverseOp.input as Record<string, string>).oldString).toBe('foo'); // swaps back
  });

  it('write_file declares undoable', () => {
    const tool = createDefaultToolRegistry().get('write_file');
    expect(tool?.isUndoable?.(null as never)).toBe(true);
  });

  it('write_file reverse returns edit_file delete for new files', () => {
    const tool = createDefaultToolRegistry().get('write_file')!;
    const reverseOp = tool.reverse!(
      { filePath: 'newfile.ts', content: 'export const x = 1;' },
      { title: '', output: '', metadata: { existed: false } },
    ) as ReverseOp;
    expect(reverseOp).toBeDefined();
    expect(reverseOp.toolName).toBe('edit_file');
    expect(reverseOp.description).toContain('delete newly created file');
  });

  it('write_file reverse returns undefined for existing files (no backup yet)', () => {
    const tool = createDefaultToolRegistry().get('write_file')!;
    const reverseOp = tool.reverse!(
      { filePath: 'existing.ts', content: 'new content' },
      { title: '', output: '', metadata: { existed: true } },
    );
    expect(reverseOp).toBeUndefined();
  });
});
