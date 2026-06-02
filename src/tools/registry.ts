import { assertToolPermission } from '../core/permissions.js';
import type { DvalinContext } from '../core/context.js';
import { editFileTool } from './editFile.js';
import { listFilesTool } from './listFiles.js';
import { readFileTool } from './readFile.js';
import { searchTextTool } from './searchText.js';
import { shellTool } from './shell.js';
import { writeFileTool } from './writeFile.js';
import { deleteFileTool } from './deleteFile.js';
import type { Tool, ToolResult } from './types.js';

export class ToolRegistry {
  private readonly tools = new Map<string, Tool<unknown>>();
  private allowedToolNames: Set<string> | null = null;

  /** Restrict which tools are visible / executable. Pass null to allow all. */
  setAllowedTools(names: string[] | null): void {
    this.allowedToolNames = names ? new Set(names) : null;
  }

  register<Input>(tool: Tool<Input>): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }

    this.tools.set(tool.name, tool as Tool<unknown>);
  }

  list(): Tool<unknown>[] {
    const all = [...this.tools.values()].sort((a, b) => a.name.localeCompare(b.name));
    return this.allowedToolNames ? all.filter(t => this.allowedToolNames!.has(t.name)) : all;
  }

  get(name: string): Tool<unknown> | undefined {
    if (this.allowedToolNames && !this.allowedToolNames.has(name)) return undefined;
    return this.tools.get(name);
  }

  async run(name: string, rawInput: unknown, context: DvalinContext): Promise<ToolResult> {
    const tool = this.get(name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }

    assertToolPermission(tool.access, context);
    const input = tool.inputSchema.parse(rawInput);

    // In auto-edit mode every non-read tool requires explicit user approval
    if (context.approvalMode === 'auto-edit' && tool.access !== 'read' && context.requestApproval) {
      const approvalId = `apv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const approved = await context.requestApproval(approvalId, name, input);
      if (!approved) {
        throw new Error(`User rejected: ${name}`);
      }
    }

    return tool.run(input, context);
  }
}

export function createDefaultToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry();
  registry.register(editFileTool);
  registry.register(listFilesTool);
  registry.register(readFileTool);
  registry.register(searchTextTool);
  registry.register(shellTool);
  registry.register(writeFileTool);
  registry.register(deleteFileTool);
  return registry;
}

