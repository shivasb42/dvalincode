import type { ChatMessage, ChatResponse, ToolCall, ToolDef, ProviderAdapter } from '../providers/types.js';
import type { ToolRegistry } from '../tools/registry.js';
import type { ForgeContext } from '../core/context.js';
import type { TurnConfig } from './types.js';

export type RunnerOptions = {
  provider: ProviderAdapter;
  registry: ToolRegistry;
  context: ForgeContext;
  config: TurnConfig;
  systemPrompt: string;
};

export class AgentRunner {
  private provider: ProviderAdapter;
  private registry: ToolRegistry;
  private context: ForgeContext;
  private config: TurnConfig;
  private systemPrompt: string;
  private iterationCount: number = 0;

  constructor(options: RunnerOptions) {
    this.provider = options.provider;
    this.registry = options.registry;
    this.context = options.context;
    this.config = options.config;
    this.systemPrompt = options.systemPrompt;
  }

  /** Run a single turn: user message → LLM → (tool calls → LLM) → final response */
  async runTurn(
    userMessage: string,
    history: ChatMessage[],
  ): Promise<{ messages: ChatMessage[]; finalResponse: string; iterationsUsed: number }> {
    const messages: ChatMessage[] = [...history, { role: 'user', content: userMessage }];
    this.iterationCount = 0;

    while (this.iterationCount < this.config.maxIterations) {
      this.iterationCount++;

      // Build tool definitions from registry
      const toolDefs = this.buildToolDefs();

      // Call LLM
      const response: ChatResponse = await this.provider.chat({
        system: this.systemPrompt,
        messages,
        tools: toolDefs.length > 0 ? toolDefs : undefined,
      });

      // Add assistant message
      const assistantMsg: ChatMessage = { role: 'assistant', content: response.content };
      messages.push(assistantMsg);

      // Check for tool calls in the response content — parse JSON tool call syntax
      const toolCalls = this.parseToolCalls(response.content);
      if (toolCalls.length === 0) {
        // No tool calls — this is the final response
        return { messages, finalResponse: response.content, iterationsUsed: this.iterationCount };
      }

      // Cap tool calls per turn
      const callsToExecute = toolCalls.slice(0, this.config.maxToolCallsPerTurn);

      // Execute tool calls
      for (const tc of callsToExecute) {
        try {
          const result = await this.registry.run(tc.name, JSON.parse(tc.arguments), this.context);
          messages.push({
            role: 'tool',
            content: `[Tool ${tc.name} result]:\n${result.output}`,
          });
        } catch (err) {
          messages.push({
            role: 'tool',
            content: `[Tool ${tc.name} error]: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
      }
    }

    // Max iterations reached
    const lastMsg = messages.filter(m => m.role === 'assistant').pop();
    return {
      messages,
      finalResponse: lastMsg?.content ?? 'Max iterations reached without final response.',
      iterationsUsed: this.iterationCount,
    };
  }

  private buildToolDefs(): ToolDef[] {
    return this.registry.list().map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: (tool.inputSchema as any)?._def ?? {},
    }));
  }

  private parseToolCalls(content: string): ToolCall[] {
    const calls: ToolCall[] = [];
    // Pattern: @tool(name, {...arguments})
    const regex = /@tool\s*\(\s*["']([^"']+)["']\s*,\s*({[^}]+})\s*\)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      calls.push({
        id: `tc_${calls.length}`,
        name: match[1],
        arguments: match[2],
      });
    }
    return calls;
  }
}
