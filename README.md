# DvalinCode

> A local-first, provider-neutral CLI foundation for agentic coding workflows.

DvalinCode is an original implementation of a terminal-based coding agent. It combines a state‑machine agent loop, a typed tool system, and a provider‑neutral LLM adapter into a single, zero‑runtime‑dependency TypeScript CLI.

**Design philosophy:** Read the [architecture diagram](./dvalincode-architecture.html) for the big picture.

---

## Quick Start

```sh
npm install
npm run build
```

Run in development mode:

```sh
npm run dev -- chat "list all TypeScript files in the project"
npm run dev -- scan
npm run dev -- tools
```

After building:

```sh
npm start -- chat "show me the test coverage"
```

---

## Commands

| Command | Description |
|---------|-------------|
| `dvalincode chat <message...>` | Chat with the AI agent. Runs the full AgentLoop state machine — autoloads sessions, calls tools, saves history. |
| `dvalincode ask <goal>` | Generate a local execution brief for a coding goal using the current workspace summary. |
| `dvalincode scan [path]` | Summarize a workspace: file count, package-manager signals, top extensions, and key directories. |
| `dvalincode tools` | List all registered tools and their permission levels. |
| `dvalincode run-tool <name> -i '<json>'` | Run a registered tool directly with JSON input. |
| `dvalincode init` | Create a `.dvalincode.json` config file from env vars. |

### Chat Command Options

```
dvalincode chat "refactor the module"                  # New session
dvalincode chat --session dc_123456 "continue this"    # Resume session
dvalincode chat --model deepseek-chat "analyze this"   # Override model
```

---

## Architecture

```
┌─────────────────────────────────────────────┐
│             CLI Layer (commander.js)         │
│  dvalincode → chat · ask · scan · tools etc  │
└────────────────────┬────────────────────────┘
                     │
┌────────────────────▼────────────────────────┐
│              Agent Engine                    │
│  ┌──────────┐   ┌──────────────┐            │
│  │ Loop     │──▶│ Runner       │──▶ Provider │
│  │ 8-state  │   │ tool-calling │   Adapter   │
│  │ machine  │   │ loop         │   (API)     │
│  └──────────┘   └──────────────┘            │
│  ┌──────────┐   ┌──────────────┐            │
│  │ Session  │   │ Summary      │            │
│  │ Store    │   │ Memory       │            │
│  └──────────┘   └──────────────┘            │
└────────────────────┬────────────────────────┘
                     │ run()
┌────────────────────▼────────────────────────┐
│              Tool System                     │
│  ToolRegistry → read · write · execute       │
│  (Zod schemas · permission-gated)           │
└─────────────────────────────────────────────┘
```

View the full interactive [architecture diagram](./dvalincode-architecture.html) (dark‑themed SVG, open in browser).

---

## Agent Engine

DvalinCode's agent is built on two core components:

### AgentLoop — 8‑State State Machine

Each turn processes a user message through these states:

```
RESTORE → COMPACT → COMMAND → BUILD → RUN → SAVE → RESPOND → DONE
```

1. **RESTORE** — Load or restore session from `~/.dvalincode/sessions/`
2. **COMPACT** — If context is near the token limit, compress history
3. **COMMAND** — Handle built‑in slash commands (`/compact`, `/retry`)
4. **BUILD** — Construct the system prompt with workspace context + tool descriptions
5. **RUN** — Delegate to `AgentRunner` for the LLM tool‑calling loop
6. **SAVE** — Persist session to disk (`~/.dvalincode/sessions/*.json`)
7. **RESPOND** — Generate session summary for cross‑session memory
8. **DONE** — Turn complete

### AgentRunner — Tool‑Calling Loop

The runner calls the LLM in a loop:

1. Send history + system prompt + tool definitions
2. Parse tool calls from the response (native `function_calls` API → fallback `@tool()` text syntax)
3. Execute each tool via `ToolRegistry` (with permission checks)
4. Feed results back to the LLM
5. Repeat until max iterations or no tool calls

Supports both OpenAI‑compatible **native function calling** and a **`@tool()` text syntax** for models that don't support function calling:

```
@tool("list_files", {"pattern": "src/**/*.ts"})
@tool("read_file", {"filePath": "src/index.ts"})
@tool("shell", {"command": "npm test"})
```

---

## Tool System

Each tool declares typed inputs via **Zod schemas**, a permission level, and a `run()` function:

| Tool | Access | Purpose |
|------|--------|---------|
| `list_files` | Read | List files by glob pattern |
| `read_file` | Read | Read a UTF‑8 file inside the workspace |
| `search_text` | Read | Search matching lines in text files |
| `write_file` | Write | Write a file with diff preview |
| `edit_file` | Write | Find‑and‑replace edit with diff preview |
| `shell` | Execute | Run a process (requires `--yes` or agent permission) |

All tools are registered centrally in `ToolRegistry` and permission‑gated via `ForgeContext`.

---

## Provider Layer

DvalinCode is **provider‑neutral**. By default it uses:

```
DVALINCODE_API_KEY      # API key
DVALINCODE_BASE_URL     # Base URL (default: https://api.openai.com/v1)
DVALINCODE_MODEL        # Model name (default: gpt-4o)
DVALINCODE_PROVIDER     # Provider name (default: deepseek)
```

### Example configurations

**DeepSeek (default):**
```
DVALINCODE_PROVIDER=deepseek
DVALINCODE_API_KEY=sk-...
DVALINCODE_BASE_URL=https://api.deepseek.com/v1
DVALINCODE_MODEL=deepseek-chat
```

**OpenAI:**
```
DVALINCODE_PROVIDER=openai
DVALINCODE_API_KEY=sk-...
DVALINCODE_BASE_URL=https://api.openai.com/v1
DVALINCODE_MODEL=gpt-4o
```

The `ProviderAdapter` interface makes adding new providers straightforward — implement `chat()`, register with `ProviderManager`.

---

## Session Persistence

Every chat session is saved to `~/.dvalincode/sessions/` as a JSON file. Sessions track:

- Full message history
- Workspace context
- Auto‑generated summary for cross‑session memory

Resume a session:
```sh
dvalincode chat --session dc_1745606400_abc123 "continue the refactor"
```

---

## Test Suite

```
npm test
```

Current status: **42 tests · 8 files · all green**

```
 ✓ tests/init.test.ts         (2 tests)
 ✓ tests/projectScanner.test.ts (1 test)
 ✓ tests/sessions.test.ts     (9 tests)
 ✓ tests/registry.test.ts     (2 tests)
 ✓ tests/writeFile.test.ts    (7 tests)
 ✓ tests/editFile.test.ts     (7 tests)
 ✓ tests/agent.test.ts        (8 tests)
 ✓ tests/providers.test.ts    (6 tests)

 Test Files  8 passed (8)
      Tests  42 passed (42)
```

### Real‑world Integration Test

DvalinCode has been tested end‑to‑end against the DeepSeek API with a real tool‑calling conversation:

```
$ dvalincode chat "list all TypeScript files in the project, organized by directory"

项目中共有 30 个 TypeScript 文件，按目录分组如下：

src/
├── core/
│   ├── context.ts       — ForgeContext & tool runtime
│   ├── diffPreview.ts   — 行级差异生成器
│   ├── permissions.ts   — 读写执行权限控制
│   ├── projectScanner.ts— 工作区分析器
│   └── workspace.ts     — 路径安全解析

├── agent/
│   ├── types.ts         — TurnState 枚举、配置类型
│   ├── loop.ts          — AgentLoop 8状态机
│   └── runner.ts        — 工具调用循环引擎

├── providers/
│   ├── types.ts         — 统一 ProviderAdapter 接口
│   ├── manager.ts       — 多 Provider 注册与发现
│   ├── openaiCompatible.ts — OpenAI 兼容 API 适配器
│   └── localPlanner.ts  — 本地执行计划生成

├── tools/
│   ├── types.ts         — Tool 接口定义
│   ├── registry.ts      — 工具注册中心
│   ├── listFiles.ts     — 文件枚举
│   ├── readFile.ts      — 文件读取
│   ├── writeFile.ts     — 文件写入（带差异预览）
│   ├── editFile.ts      — 精确查找替换编辑
│   ├── searchText.ts    — 文本搜索
│   └── shell.ts         — 进程执行

├── commands/
│   ├── chat.ts          — chat 命令（完整 AgentLoop）
│   ├── ask.ts           — ask 命令（本地计划）
│   ├── init.ts          — 项目初始化
│   ├── runTool.ts       — 直接工具调用
│   ├── scan.ts          — 工作区扫描
│   └── tools.ts         — 工具列表

├── ui/
│   └── output.ts        — 输出格式化

├── index.ts             — 导出入口
└── cli.ts               — CLI 入口与命令注册

--- Session: dc_1745606500_abc123 | (2 iterations) | Model: deepseek ---
```

The agent successfully:
- Called `list_files` via native function calling ✅
- Received results and organized them by directory ✅
- Completed in **2 iterations** (1 tool call + 1 final response) ✅

---

## Project Status

DvalinCode is in active development. Current features are stable and tested.

| Feature | Status |
|---------|--------|
| CLI commands (chat, scan, tools, init, run-tool) | ✅ |
| AgentLoop state machine (8 states) | ✅ |
| AgentRunner tool‑calling loop | ✅ |
| ProviderAdapter + OpenAI‑compatible provider | ✅ |
| Native function calling (`tool_calls` API) | ✅ |
| @tool() text syntax fallback | ✅ |
| Session persistence (save/load/list/delete) | ✅ |
| Cross‑session summary memory | ✅ |
| Write/edit tools with diff preview | ✅ |
| Read tools (list, read, search) | ✅ |
| Shell execution tool | ✅ |
| ProviderManager (env var config) | ✅ |
| Project scanner (signals, depext) | ✅ |
| Permission system (read/write/execute) | ✅ |
| 42 tests, all passing | ✅ |
| Real end‑to‑end integration tested | ✅ |

### Roadmap

Near‑term work:

- Terminal UI with streaming output and progress indicators
- Plugin tool loading (user‑defined tools from `~/.dvalincode/tools/`)
- Context compression (smart token budget management)
- Parallel tool execution
- Initialization wizard (`dvalincode init --interactive`)
- Anthropic provider adapter

---

## Independence & Attribution

DvalinCode is **not affiliated** with Anthropic, Claude, or Claude Code.

The design process included studying common patterns in modern terminal coding assistants for architectural learning. The implementation is intentionally original — it uses its own naming, UI language, state machine design, and module structure. No source code, prompts, or UI text from other projects is copied.

---

## Install

### Standalone binary (no Node required)

Download the binary for your platform from the [Releases page](../../releases), then make it executable and put it on your `PATH`:

```sh
# macOS (Apple Silicon)
curl -L -o dvalincode https://github.com/OWNER/dvalincode/releases/latest/download/dvalincode-macos-arm64
chmod +x dvalincode
sudo mv dvalincode /usr/local/bin/

# Linux (x64)
curl -L -o dvalincode https://github.com/OWNER/dvalincode/releases/latest/download/dvalincode-linux-x64
chmod +x dvalincode
sudo mv dvalincode /usr/local/bin/
```

Available targets: `macos-arm64`, `macos-x64`, `linux-arm64`, `linux-x64`.

Verify the download against `SHA256SUMS.txt`:

```sh
shasum -a 256 -c SHA256SUMS.txt        # macOS
sha256sum -c SHA256SUMS.txt            # Linux
```

> **macOS Gatekeeper:** the binary is unsigned, so the first run may be blocked.
> Clear the quarantine flag with `xattr -d com.apple.quarantine ./dvalincode`,
> or allow it under System Settings → Privacy & Security.

### From npm

```sh
npm install -g dvalincode
```

### Build binaries yourself

Requires [Bun](https://bun.sh) (`curl -fsSL https://bun.sh/install | bash`). Bun
cross-compiles every target from a single machine — no per-platform runner needed.

```sh
npm run build:binaries            # all targets → dist-bin/
npm run build:binaries:darwin     # macOS only
npm run build:binaries:linux      # Linux only
```

Artifacts and a `SHA256SUMS.txt` checksum file land in `dist-bin/`.

---

## License

MIT
