# DvalinCode — Phase 1 开发计划

> **目标:** 从 Read-Only CLI 升级为全功能 agentic coding CLI
> 
> **架构原则**: 保持 and 现有风格（Zod schemas, pure TypeScript, 无大框架）和松耦合
> 
> **Tech Stack**: TypeScript 5.9, NodeNext, Commander, Zod, `child_process` for LLM, `diff` for preview

---

## 阶段划分

### Phase 1A: Provider Adapter 架构（LLM 对接能力）
### Phase 1B: Write Tools（write_file + edit_file + diff preview）
### Phase 1C: Session 管理 + dvalincode chat 交互模式

---

## Phase 1A: Provider Adapter

### Task 1: Provider 类型定义

**Objective:** 定义 LLM provider 的通用接口

**Files:**
- Create: `src/providers/types.ts`
- Test: `tests/providers.test.ts`

**代码:**

```typescript
// src/providers/types.ts
import type { z } from 'zod';

export type ProviderConfig = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
};

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type ChatRequest = {
  messages: ChatMessage[];
  system?: string;
  maxTokens?: number;
  temperature?: number;
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
```

**测试:**

```typescript
// tests/providers.test.ts
import { describe, expect, it } from 'vitest';
import type { ChatRequest, ProviderAdapter } from '../src/providers/types.js';

describe('ProviderAdapter interface', () => {
  it('defines the contract for a provider', () => {
    const mock: ProviderAdapter = {
      name: 'mock',
      async chat(req: ChatRequest) {
        return { content: `Echo: ${req.messages[0]?.content}`, model: 'mock' };
      },
    };
    expect(mock.name).toBe('mock');
  });

  it('mock provider echoes input', async () => {
    const mock: ProviderAdapter = {
      name: 'mock',
      async chat(req) {
        return { content: `Echo: ${req.messages[0]?.content}`, model: 'mock' };
      },
    };
    const res = await mock.chat({
      messages: [{ role: 'user', content: 'hello' }],
    });
    expect(res.content).toBe('Echo: hello');
  });
});
```

**验证:** `npm test` → 2 passed

---

### Task 2: OpenAI-兼容 Provider（DeepSeek / OpenRouter）

**Objective:** 实现 OpenAI Chat Completions API 兼容的 provider

**Files:**
- Create: `src/providers/openaiCompatible.ts`
- Modify: `tests/providers.test.ts`（追加测试）

**代码:**

```typescript
// src/providers/openaiCompatible.ts
import { request } from 'node:https';
import type { ProviderAdapter, ChatRequest, ChatResponse, ProviderConfig } from './types.js';

export type OpenAIConfig = ProviderConfig & {
  name?: string;
};

export function createOpenAICompatibleProvider(config: OpenAIConfig): ProviderAdapter {
  const baseUrl = config.baseUrl ?? 'https://api.openai.com/v1';
  const model = config.model ?? 'gpt-4o';

  async function chat(request: ChatRequest): Promise<ChatResponse> {
    const body = JSON.stringify({
      model,
      messages: [
        ...(request.system ? [{ role: 'system' as const, content: request.system }] : []),
        ...request.messages,
      ],
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.7,
    });

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
```

> **注意:** 使用 Node.js 内置 `fetch`（Node 20+ 原生支持），不需要额外依赖。

**测试:**

```typescript
// 在 tests/providers.test.ts 追加
it('openai provider rejects with invalid key', async () => {
  const provider = await import('../src/providers/openaiCompatible.js').then(m =>
    m.createOpenAICompatibleProvider({ apiKey: 'bad', model: 'gpt-4o' })
  );
  await expect(provider.chat({ messages: [{ role: 'user', content: 'hi' }] })).rejects.toThrow();
});
```

**验证:** `npm test` → 3 passed

---

### Task 3: Provider 管理工厂

**Objective:** 统一管理多 provider 配置

**Files:**
- Create: `src/providers/manager.ts`
- Test: `tests/providers.test.ts`（追加）

**代码:**

```typescript
// src/providers/manager.ts
import type { ProviderAdapter, ProviderConfig } from './types.js';
import type { OpenAIConfig } from './openaiCompatible.js';
import { createOpenAICompatibleProvider } from './openaiCompatible.js';

export type ConfiguredProvider = {
  name: string;
  adapter: ProviderAdapter;
};

export class ProviderManager {
  private providers = new Map<string, ProviderAdapter>();

  addOpenAI(name: string, config: OpenAIConfig): this {
    const adapter = createOpenAICompatibleProvider({ ...config, name });
    this.providers.set(name, adapter);
    return this;
  }

  get(name: string): ProviderAdapter {
    const provider = this.providers.get(name);
    if (!provider) throw new Error(`Unknown provider: ${name}. Available: ${[...this.providers.keys()].join(', ')}`);
    return provider;
  }

  list(): ConfiguredProvider[] {
    return [...this.providers.entries()].map(([name, adapter]) => ({ name, adapter }));
  }

  /** Load from env: DVALINCODE_PROVIDER, DVALINCODE_API_KEY, DVALINCODE_BASE_URL, DVALINCODE_MODEL */
  loadFromEnv(): this {
    const providerName = process.env.DVALINCODE_PROVIDER ?? 'deepseek';
    const apiKey = process.env.DVALINCODE_API_KEY;
    const baseUrl = process.env.DVALINCODE_BASE_URL;
    const model = process.env.DVALINCODE_MODEL;

    this.addOpenAI(providerName, { apiKey, baseUrl, model });
    return this;
  }
}
```

**测试:**

```typescript
it('provider manager loads from env', () => {
  process.env.DVALINCODE_API_KEY = 'test-key';
  process.env.DVALINCODE_MODEL = 'test-model';
  const mgr = new ProviderManager().loadFromEnv();
  const p = mgr.get('deepseek');
  expect(p.name).toBe('deepseek');
  delete process.env.DVALINCODE_API_KEY;
  delete process.env.DVALINCODE_MODEL;
});

it('provider manager throws for unknown provider', () => {
  const mgr = new ProviderManager();
  expect(() => mgr.get('nope')).toThrow('Unknown provider');
});
```

**验证:** `npm test` → 5 passed

---

## Phase 1B: Write Tools

### Task 4: writeFile tool

**Objective:** 创建写文件工具，带 diff preview 和安全确认

**Files:**
- Create: `src/tools/writeFile.ts`
- Modify: `src/tools/registry.ts`（注册）
- Create: `src/core/diffPreview.ts`
- Test: `tests/writeFile.test.ts`

**代码:**

```typescript
// src/core/diffPreview.ts
export type DiffLine = {
  type: 'add' | 'remove' | 'keep';
  content: string;
};

export function generateDiff(original: string, updated: string): DiffLine[] {
  const origLines = original.split('\n');
  const newLines = updated.split('\n');
  const lines: DiffLine[] = [];

  // Simple line-by-line diff (no LCS — good enough for preview)
  const maxLen = Math.max(origLines.length, newLines.length);
  for (let i = 0; i < maxLen; i++) {
    const oldLine = origLines[i] ?? '';
    const newLine = newLines[i] ?? '';
    if (oldLine === newLine) {
      lines.push({ type: 'keep', content: oldLine });
    } else {
      if (oldLine !== undefined) lines.push({ type: 'remove', content: oldLine });
      if (newLine !== undefined) lines.push({ type: 'add', content: newLine });
    }
  }
  return lines;
}

export function formatDiff(lines: DiffLine[]): string {
  return lines
    .map(l => {
      switch (l.type) {
        case 'add': return `+ ${l.content}`;
        case 'remove': return `- ${l.content}`;
        case 'keep': return `  ${l.content}`;
      }
    })
    .join('\n');
}
```

```typescript
// src/tools/writeFile.ts
import { writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { generateDiff, formatDiff } from '../core/diffPreview.js';
import type { Tool, ToolResult } from './types.js';
import type { ForgeContext } from '../core/context.js';

const inputSchema = z.object({
  filePath: z.string().describe('Relative path within the workspace'),
  content: z.string().describe('New file content'),
});

export const writeFileTool: Tool<z.infer<typeof inputSchema>> = {
  name: 'write_file',
  description: 'Write content to a file inside the workspace',
  access: 'write',
  inputSchema,
  async run(input, context: ForgeContext): Promise<ToolResult> {
    const fullPath = path.resolve(context.cwd, input.filePath);

    // Try to read existing content for diff
    let existingContent: string | null = null;
    try {
      existingContent = await readFile(fullPath, 'utf8');
    } catch {
      // File doesn't exist yet — new file
    }

    // Ensure parent directory exists
    const { mkdir } = await import('node:fs/promises');
    const dir = path.dirname(fullPath);
    await mkdir(dir, { recursive: true });

    await writeFile(fullPath, input.content, 'utf8');

    const lines: string[] = [`Wrote ${input.filePath} (${input.content.length} bytes)`];
    if (existingContent !== null) {
      lines.push('');
      lines.push('Diff:');
      const diff = generateDiff(existingContent, input.content);
      lines.push(formatDiff(diff));
    }

    return {
      title: `Write ${input.filePath}`,
      output: lines.join('\n'),
      metadata: { filePath: input.filePath, bytes: input.content.length, isNew: existingContent === null },
    };
  },
};
```

**测试:**

```typescript
// tests/writeFile.test.ts
import { mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { writeFileTool } from '../src/tools/writeFile.js';
import { createForgeContext } from '../src/core/context.js';
import { generateDiff, formatDiff } from '../src/core/diffPreview.js';

describe('generateDiff', () => {
  it('detects added lines', () => {
    const diff = generateDiff('hello', 'hello\nworld');
    expect(diff.some(l => l.type === 'add' && l.content === 'world')).toBe(true);
  });

  it('detects removed lines', () => {
    const diff = generateDiff('hello\nworld', 'hello');
    expect(diff.some(l => l.type === 'remove' && l.content === 'world')).toBe(true);
  });
});

describe('writeFileTool', () => {
  it('creates a new file', async () => {
    const tmp = join(tmpdir(), `dvalincode-write-${Date.now()}`);
    await mkdir(tmp, { recursive: true });
    const result = await writeFileTool.run(
      { filePath: 'test.txt', content: 'hello' },
      createForgeContext({ cwd: tmp }),
    );
    expect(result.output).toContain('test.txt');
    expect(await readFile(join(tmp, 'test.txt'), 'utf8')).toBe('hello');
    await rm(tmp, { recursive: true, force: true });
  });

  it('reports diff for existing file', async () => {
    const tmp = join(tmpdir(), `dvalincode-write-${Date.now()}`);
    await mkdir(tmp, { recursive: true });
    await writeFileTool.run(
      { filePath: 'test.txt', content: 'old content' },
      createForgeContext({ cwd: tmp }),
    );
    const result = await writeFileTool.run(
      { filePath: 'test.txt', content: 'new content' },
      createForgeContext({ cwd: tmp }),
    );
    expect(result.output).toContain('- old content');
    expect(result.output).toContain('+ new content');
    await rm(tmp, { recursive: true, force: true });
  });
});
```

---

### Task 5: editFile tool（基于 patch 的精确编辑）

**Objective:** 实现 `edit_file` — 查找替换式精确编辑，比全量写文件更安全

**Files:**
- Create: `src/tools/editFile.ts`
- Modify: `src/tools/registry.ts`（注册）
- Test: `tests/editFile.test.ts`

**代码:**

```typescript
// src/tools/editFile.ts
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { generateDiff, formatDiff } from '../core/diffPreview.js';
import type { Tool, ToolResult } from './types.js';
import type { ForgeContext } from '../core/context.js';

const inputSchema = z.object({
  filePath: z.string().describe('Relative path within the workspace'),
  oldString: z.string().describe('Exact text to replace'),
  newString: z.string().describe('Replacement text'),
});

export const editFileTool: Tool<z.infer<typeof inputSchema>> = {
  name: 'edit_file',
  description: 'Replace exact text in a file',
  access: 'write',
  inputSchema,
  async run(input, context: ForgeContext): Promise<ToolResult> {
    const fullPath = path.resolve(context.cwd, input.filePath);
    const existing = await readFile(fullPath, 'utf8');

    const idx = existing.indexOf(input.oldString);
    if (idx === -1) {
      throw new Error(`Could not find oldString in ${input.filePath}`);
    }

    const before = input.oldString.length > 60
      ? input.oldString.slice(0, 60) + '…'
      : input.oldString;

    const updated = existing.replace(input.oldString, input.newString);
    await writeFile(fullPath, updated, 'utf8');

    const diff = generateDiff(existing, updated);
    return {
      title: `Edit ${input.filePath}`,
      output: [`Replaced: "${before}"`, '', formatDiff(diff)].join('\n'),
      metadata: { filePath: input.filePath, occurrences: 1 },
    };
  },
};
```

**测试:**

```typescript
// tests/editFile.test.ts
import { mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { editFileTool } from '../src/tools/editFile.js';
import { writeFileTool } from '../src/tools/writeFile.js';
import { createForgeContext } from '../src/core/context.js';

describe('editFileTool', () => {
  it('replaces exact text in a file', async () => {
    const tmp = join(tmpdir(), `dvalincode-edit-${Date.now()}`);
    await mkdir(tmp, { recursive: true });
    await writeFileTool.run(
      { filePath: 'greeting.txt', content: 'Hello, World!' },
      createForgeContext({ cwd: tmp }),
    );
    const result = await editFileTool.run(
      { filePath: 'greeting.txt', oldString: 'World', newString: 'DvalinCode' },
      createForgeContext({ cwd: tmp }),
    );
    expect(result.output).toContain('DvalinCode');
    expect(await readFile(join(tmp, 'greeting.txt'), 'utf8')).toBe('Hello, DvalinCode!');
    await rm(tmp, { recursive: true, force: true });
  });

  it('throws if oldString not found', async () => {
    const tmp = join(tmpdir(), `dvalincode-edit-${Date.now()}`);
    await mkdir(tmp, { recursive: true });
    await writeFileTool.run(
      { filePath: 'a.txt', content: 'hello' },
      createForgeContext({ cwd: tmp }),
    );
    await expect(
      editFileTool.run({ filePath: 'a.txt', oldString: 'nope', newString: 'x' }, createForgeContext({ cwd: tmp })),
    ).rejects.toThrow('Could not find');
    await rm(tmp, { recursive: true, force: true });
  });
});
```

---

### Task 6: 注册 writeFile + editFile 到 registry

**Files:**
- Modify: `src/tools/registry.ts`

```typescript
// 在 createDefaultToolRegistry 追加
import { writeFileTool } from './writeFile.js';
import { editFileTool } from './editFile.js';

export function createDefaultToolRegistry(options?: { allowWrite?: boolean }): ToolRegistry {
  const registry = new ToolRegistry();
  registry.register(listFilesTool);
  registry.register(readFileTool);
  registry.register(searchTextTool);
  registry.register(shellTool);
  registry.register(writeFileTool);
  registry.register(editFileTool);
  return registry;
}
```

**验证:** `npm test` → 全部通过

---

## Phase 1C: Sessions + dvalincode chat

### Task 7: Session 管理

**Objective:** 对话持久化 — 保存/恢复会话

**Files:**
- Create: `src/sessions/store.ts`
- Test: `tests/sessions.test.ts`

```typescript
// src/sessions/store.ts
import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { homedir } from 'node:os';
import type { ChatMessage } from '../providers/types.js';

export type Session = {
  id: string;
  createdAt: string;
  updatedAt: string;
  cwd: string;
  goal?: string;
  messages: ChatMessage[];
  metadata?: Record<string, unknown>;
};

function sessionDir(): string {
  return path.join(homedir(), '.dvalincode', 'sessions');
}

export async function listSessions(): Promise<Session[]> {
  const dir = sessionDir();
  try {
    const entries = await readdir(dir);
    const sessions: Session[] = [];
    for (const entry of entries) {
      if (entry.endsWith('.json')) {
        const content = await readFile(path.join(dir, entry), 'utf8');
        sessions.push(JSON.parse(content));
      }
    }
    return sessions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

export async function loadSession(id: string): Promise<Session | null> {
  try {
    const content = await readFile(path.join(sessionDir(), `${id}.json`), 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function saveSession(session: Session): Promise<void> {
  session.updatedAt = new Date().toISOString();
  const dir = sessionDir();
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${session.id}.json`), JSON.stringify(session, null, 2), 'utf8');
}

export async function deleteSession(id: string): Promise<void> {
  await rm(path.join(sessionDir(), `${id}.json`), { force: true });
}

export function createSession(cwd: string, goal?: string): Session {
  const id = `dc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  return { id, createdAt: now, updatedAt: now, cwd, goal, messages: [] };
}
```

**测试:**

```typescript
// tests/sessions.test.ts
import { rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { createSession, saveSession, loadSession, listSessions, deleteSession } from '../src/sessions/store.js';

const SESSION_ID = `test_${Date.now()}`;

describe('session store', () => {
  afterEach(async () => {
    await deleteSession(SESSION_ID);
  });

  it('creates and saves a session', async () => {
    const session = createSession('/tmp', 'fix bugs');
    // Override ID for test
    const s = { ...session, id: SESSION_ID };
    await saveSession(s);
    const loaded = await loadSession(SESSION_ID);
    expect(loaded).not.toBeNull();
    expect(loaded!.goal).toBe('fix bugs');
    expect(loaded!.cwd).toBe('/tmp');
  });

  it('lists sessions sorted by update time', async () => {
    const s1 = createSession('/tmp', 'task 1');
    const s2 = createSession('/tmp', 'task 2');
    await saveSession({ ...s1, id: `test_a_${Date.now()}` });
    await saveSession({ ...s2, id: SESSION_ID });
    const list = await listSessions();
    expect(list.length).toBeGreaterThanOrEqual(2);
    await deleteSession(`test_a_${Date.now()}`);
    await deleteSession(SESSION_ID);
  });
});
```

---

### Task 8: dvalincode chat 命令

**Objective:** `dvalincode chat "你的需求"` — 整合 scanner + provider + tools 的交互模式

**Files:**
- Create: `src/commands/chat.ts`
- Modify: `src/cli.ts`（注册）

```typescript
// src/commands/chat.ts
import type { Command } from 'commander';
import { scanProject } from '../core/projectScanner.js';
import { createForgeContext } from '../core/context.js';
import type { ToolRegistry } from '../tools/registry.js';
import { ProviderManager } from '../providers/manager.js';
import { createSession, saveSession, loadSession } from '../sessions/store.js';

export function registerChatCommand(program: Command, registry: ToolRegistry): void {
  program
    .command('chat')
    .description('Start an interactive coding session')
    .argument('[message...]', 'Initial prompt')
    .option('--session <id>', 'Resume a session by ID')
    .option('--provider <name>', 'LLM provider (default: deepseek)', 'deepseek')
    .option('--model <name>', 'Model name')
    .action(async (messageParts: string[], options: { session?: string; provider: string; model?: string }) => {
      const providerMgr = new ProviderManager().loadFromEnv();
      const provider = providerMgr.get(options.provider);

      // Load or create session
      let session = options.session
        ? await loadSession(options.session)
        : null;

      if (!session) {
        session = createSession(process.cwd(), messageParts.join(' '));
      }

      if (messageParts.length > 0) {
        session.messages.push({ role: 'user', content: messageParts.join(' ') });
      }

      // Scan workspace
      const summary = await scanProject(session.cwd);

      // Build system prompt from context
      const systemPrompt = [
        'You are DvalinCode, a local-first coding assistant.',
        '',
        'Workspace context:',
        `- Path: ${summary.root}`,
        `- Files: ${summary.fileCount}`,
        `- Signals: ${summary.signals.join(', ') || 'none'}`,
        '',
        'Available tools:',
        ...registry.list().map(t => `- ${t.name} (${t.access}): ${t.description}`),
        '',
        'You can use shell commands to interact with the workspace.',
        'Use write_file and edit_file for code changes.',
        'Always generate diffs before making changes.',
        'Confirm with the user before execute-level operations.',
      ].join('\n');

      const response = await provider.chat({
        system: systemPrompt,
        messages: session.messages,
      });

      session.messages.push({ role: 'assistant', content: response.content });
      await saveSession(session);

      console.log(response.content);
      console.log(`\n---\nSession: ${session.id} | Model: ${response.model}`);
      if (response.usage) {
        console.log(`Tokens: ${response.usage.inputTokens} in / ${response.usage.outputTokens} out`);
      }
    });
}
```

```typescript
// 在 cli.ts 中追加
import { registerChatCommand } from './commands/chat.js';

// 在 buildProgram() 中
registerChatCommand(program, registry);
```

**测试:** `npm run build && npm start chat "列出我的项目结构"` → 验证输出

---

### Task 9: dvalincode init 命令（配置生成器）

**Objective:** `dvalincode init` — 创建 `.dvalincode.json` 配置文件

**Files:**
- Create: `src/commands/init.ts`
- Modify: `src/cli.ts`（注册）
- Test: `tests/init.test.ts`

```typescript
// src/commands/init.ts
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Command } from 'commander';

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Initialize dvalincode configuration in this workspace')
    .action(async () => {
      const configPath = path.resolve(process.cwd(), '.dvalincode.json');
      const config = {
        provider: process.env.DVALINCODE_PROVIDER ?? 'deepseek',
        model: process.env.DVALINCODE_MODEL ?? 'deepseek-chat',
        systemPrompt: [
          'You are DvalinCode, a local-first coding assistant.',
          'Prefer reading before writing.',
          'Always generate diff previews before changes.',
          'Write clean, minimal code (Karpathy principles).',
        ].join('\n'),
      };

      await writeFile(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
      console.log(`Created ${configPath}`);
    });
}
```

**测试:**

```typescript
// tests/init.test.ts
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { Command } from 'commander';
import { registerInitCommand } from '../src/commands/init.js';

describe('init command', () => {
  it('creates .dvalincode.json in cwd', async () => {
    const tmp = join(tmpdir(), `dvalincode-init-${Date.now()}`);
    await import('node:fs/promises').then(m => m.mkdir(tmp, { recursive: true }));
    const originalCwd = process.cwd;
    process.cwd = () => tmp;
    try {
      const program = new Command();
      registerInitCommand(program);
      // Run the action directly
      const cmd = program.commands.find(c => c.name() === 'init')!;
      await cmd.parseAsync(['init'], { from: 'user' });
      const content = await readFile(join(tmp, '.dvalincode.json'), 'utf8');
      expect(content).toContain('"provider"');
    } finally {
      process.cwd = originalCwd;
      await rm(tmp, { recursive: true, force: true });
    }
  });
});
```

---

## 总结

| 阶段 | Task | 文件 | 测试 |
|------|------|------|------|
| 1A-1 | Provider 类型定义 | `src/providers/types.ts` | `tests/providers.test.ts` |
| 1A-2 | OpenAI 兼容 Provider | `src/providers/openaiCompatible.ts` | 同上 |
| 1A-3 | Provider Manager | `src/providers/manager.ts` | 同上 |
| 1B-4 | writeFile 工具 + diff | `src/tools/writeFile.ts`, `src/core/diffPreview.ts` | `tests/writeFile.test.ts` |
| 1B-5 | editFile 工具 | `src/tools/editFile.ts` | `tests/editFile.test.ts` |
| 1B-6 | Registry 注册 | `src/tools/registry.ts`（修改） | 已有测试自动覆盖 |
| 1C-7 | Session 存储 | `src/sessions/store.ts` | `tests/sessions.test.ts` |
| 1C-8 | dvalincode chat 命令 | `src/commands/chat.ts`, `src/cli.ts`（修改） | 手动验证 |
| 1C-9 | dvalincode init 命令 | `src/commands/init.ts`, `src/cli.ts`（修改） | `tests/init.test.ts` |
