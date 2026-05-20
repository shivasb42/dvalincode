import type { z } from 'zod';

export type ProviderConfig = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
};

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
};

export type ToolDef = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type ToolCall = {
  id: string;
  name: string;
  arguments: string;
};

export type ToolResult = {
  name: string;
  result: string;
  error?: string;
};

export type ChatRequest = {
  messages: ChatMessage[];
  system?: string;
  maxTokens?: number;
  temperature?: number;
  tools?: ToolDef[];
};

export type ChatResponse = {
  content: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
};

export interface ProviderAdapter {
  readonly name: string;
  chat(request: ChatRequest): Promise<ChatResponse>;
}
