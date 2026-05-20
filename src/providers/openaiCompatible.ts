import type { ProviderAdapter, ChatRequest, ChatResponse, ProviderConfig } from './types.js';

export type OpenAIConfig = ProviderConfig & {
  name?: string;
};

export function createOpenAICompatibleProvider(config: OpenAIConfig): ProviderAdapter {
  const baseUrl = config.baseUrl ?? 'https://api.openai.com/v1';
  const model = config.model ?? 'gpt-4o';

  async function chat(request: ChatRequest): Promise<ChatResponse> {
    const bodyObj: Record<string, unknown> = {
      model,
      messages: [
        ...(request.system ? [{ role: 'system' as const, content: request.system }] : []),
        ...request.messages,
      ],
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.7,
    };

    // Add tool definitions if provided
    if (request.tools && request.tools.length > 0) {
      bodyObj.tools = request.tools.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));
    }

    const body = JSON.stringify(bodyObj);

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Provider API error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
      model: string;
      usage?: { prompt_tokens: number; completion_tokens: number };
    };

    return {
      content: data.choices[0]?.message?.content ?? '',
      model: data.model,
      usage: data.usage
        ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens }
        : undefined,
    };
  }

  return { name: config.name ?? 'openai-compatible', chat };
}
