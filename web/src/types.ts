export type LLMConfig = {
  provider: string;
  apiKey?: string;
  apiKeySet?: boolean;
  baseUrl?: string;
  model?: string;
};

export type AppConfig = {
  llm: LLMConfig;
};

export type SessionMeta = {
  id: string;
  createdAt: string;
  updatedAt: string;
  cwd: string;
  goal?: string;
  summary?: string;
  messageCount: number;
};

export type ToolCallEvent = {
  id: string;
  name: string;
  input: unknown;
  output?: string;
  metadata?: Record<string, unknown>;
  error?: string;
  status: 'running' | 'done' | 'error';
};

export type ChatMessage =
  | { role: 'user'; content: string }
  | {
      role: 'assistant';
      content: string;
      toolCalls: ToolCallEvent[];
      pending?: boolean;
    };

export type ServerEvent =
  | { type: 'session_id'; sessionId: string }
  | { type: 'tool_call'; name: string; id: string; input: unknown }
  | { type: 'tool_result'; name: string; id: string; output: string; metadata?: Record<string, unknown> }
  | { type: 'tool_error'; name: string; id: string; error: string }
  | { type: 'response'; content: string }
  | { type: 'done'; sessionId: string; iterations: number }
  | { type: 'error'; message: string };
