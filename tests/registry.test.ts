import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createDvalinContext } from '../src/core/context.js';
import { ToolRegistry } from '../src/tools/registry.js';
import type { Tool } from '../src/tools/types.js';

describe('ToolRegistry', () => {
  it('validates input and runs registered tools', async () => {
    const registry = new ToolRegistry();
    const echoTool: Tool<{ text: string }> = {
      name: 'echo',
      description: 'Echo input',
      access: 'read',
      inputSchema: z.object({ text: z.string() }),
      async run(input) {
        return { title: 'Echo', output: input.text };
      },
    };

    registry.register(echoTool);
    const result = await registry.run('echo', { text: 'hello' }, createDvalinContext());

    expect(result.output).toBe('hello');
  });

  it('blocks execute tools unless permission is granted', async () => {
    const registry = new ToolRegistry();
    registry.register({
      name: 'exec',
      description: 'Execute',
      access: 'execute',
      inputSchema: z.object({}),
      async run() {
        return { title: 'Exec', output: 'done' };
      },
    });

    await expect(registry.run('exec', {}, createDvalinContext())).rejects.toThrow('execute processes');
  });
});

