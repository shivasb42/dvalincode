import type { ChatMessage, ToolDef } from '../providers/types.js';
import type { ToolRegistry } from '../tools/registry.js';

export enum TurnState {
  /** Restore session state */
  RESTORE = 'RESTORE',
  /** Compact/compress context if near limit */
  COMPACT = 'COMPACT',
  /** Handle built-in commands (/compact, /retry) */
  COMMAND = 'COMMAND',
  /** Build system prompt with workspace context */
  BUILD = 'BUILD',
  /** Call LLM and process tool calls in a loop */
  RUN = 'RUN',
  /** Persist session to disk */
  SAVE = 'SAVE',
  /** Format and output response */
  RESPOND = 'RESPOND',
  /** Turn complete */
  DONE = 'DONE',
}

export type TurnConfig = {
  maxIterations: number;
  maxToolCallsPerTurn: number;
  contextTokenLimit: number;
  compactThreshold: number; // 0.0-1.0, fraction of limit that triggers compact
};

export const DEFAULT_TURN_CONFIG: TurnConfig = {
  maxIterations: 10,
  maxToolCallsPerTurn: 15,
  contextTokenLimit: 128_000,
  compactThreshold: 0.7,
};

export type SlashCommand = {
  name: string;
  description: string;
  handler: (args: string, messages: ChatMessage[]) => { messages: ChatMessage[]; output?: string };
};

export type LoopResult = {
  messages: ChatMessage[];
  output: string;
  iterationsUsed: number;
};
