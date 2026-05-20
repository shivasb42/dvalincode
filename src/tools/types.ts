import type { z } from 'zod';
import type { ForgeContext } from '../core/context.js';

export type ToolAccess = 'read' | 'write' | 'execute';

export type ToolResult = {
  title: string;
  output: string;
  metadata?: Record<string, unknown>;
};

export type Tool<Input> = {
  name: string;
  description: string;
  access: ToolAccess;
  inputSchema: z.ZodType<Input>;
  isConcurrencySafe?: (input: Input) => boolean;
  run(input: Input, context: ForgeContext): Promise<ToolResult>;

  /** Whether this tool can be undone. If false, undo is not supported. */
  isUndoable?: (input: Input) => boolean;

  /**
   * Compute the reverse operation input for an undo.
   * Returns the input that would reverse the effect (e.g., swap old/new strings).
   * If undo is not possible after the fact, return undefined.
   * Called only if isUndoable() returned true.
   */
  reverse?: (input: Input, result: ToolResult) => ReverseOp | undefined;
};

export type ReverseOp = {
  /** Tool name to run for the reversal (usually same tool) */
  toolName: string;
  /** Input for the reverse tool call */
  input: unknown;
  /** Human-readable description of the undo action */
  description: string;
};

