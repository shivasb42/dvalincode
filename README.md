<p align="center">
  <img src="assets/hero.png" alt="DvalinCode" width="100%">
</p>

<h1 align="center">DvalinCode</h1>

<p align="center">
  <a href="https://github.com/arthurpanhku/dvalincode/releases/latest"><img src="https://img.shields.io/github/v/release/arthurpanhku/dvalincode?style=for-the-badge&color=818cf8&label=Release" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License"></a>
  <a href="#-quick-install"><img src="https://img.shields.io/badge/Platforms-macOS%20·%20Windows%20·%20Linux-blue?style=for-the-badge" alt="Platforms"></a>
  <a href="README.zh-CN.md"><img src="https://img.shields.io/badge/Lang-中文-red?style=for-the-badge" alt="中文"></a>
</p>

<p align="center">
  <b>A local-first, provider-neutral AI coding agent with three modes —</b><br>
  <b>Chat for questions, Cowork for plan-then-execute, Code for autonomous work.</b>
</p>

<p align="center">
  Bring your own model — DeepSeek, OpenAI, Claude (via OpenRouter), Groq, Ollama, or any OpenAI-compatible endpoint. Switch with one click, no code changes, no lock-in.
</p>

---

<table>
<tr><td><b>🗨️ Chat mode</b></td><td>Read-only Q&A with one-click prompt templates — explain a codebase, find TODOs, review changes, write tests. The agent can read files and search, but never writes.</td></tr>
<tr><td><b>👥 Cowork mode</b></td><td>Plan-then-execute. The agent drafts a numbered plan, you click <b>Proceed</b>, and every file write asks for explicit approval — with an inline red/green diff before you say yes.</td></tr>
<tr><td><b>⚡ Code mode</b></td><td>Autonomous agent with full tool access. Run tests, type-check, build, lint — one click via the <b>Routines</b> panel. macOS shell calls run inside a <code>sandbox-exec</code> profile with network denied.</td></tr>
<tr><td><b>🎯 First-class GUI</b></td><td>Modern web UI with code highlighting, file <code>@</code>-references, <code>/</code> slash commands, Git branch indicator, live token + cost counter, multi-profile LLM config.</td></tr>
<tr><td><b>🪶 Zero-dependency binary</b></td><td>Single ~25MB executable per platform. No Node, no Python, no Docker. Auto-opens your browser on launch.</td></tr>
<tr><td><b>🔐 Local-first</b></td><td>Sessions, config, and profiles live in <code>~/.dvalincode/</code>. <code>.dvalincodeignore</code> blocks the agent from reading sensitive files. <code>AGENTS.md</code> in your repo becomes persistent project instructions.</td></tr>
</table>

---

## 📸 Preview

**Switching modes — each mode has its own sidebar:**

<p align="center">
  <img src="assets/modes.gif" alt="Mode switching" width="100%">
</p>

**Slash commands & file references in the composer:**

<p align="center">
  <img src="assets/slash.gif" alt="Slash commands and @ file references" width="100%">
</p>

---

## 🚀 Quick Install

### macOS / Linux (one-liner)

```sh
curl -fsSL https://raw.githubusercontent.com/arthurpanhku/dvalincode/main/scripts/install.sh | bash
```

Detects your OS + arch, downloads the right binary, installs to `~/.dvalincode/`, and adds it to your `PATH`. After reload:

```sh
source ~/.zshrc    # or ~/.bashrc
dvalincode         # starts the server, opens your browser
```

### Windows

Download `dvalincode-v*-windows-x64.zip` from [Releases](https://github.com/arthurpanhku/dvalincode/releases/latest), unzip, then double-click `start.bat`.

### Manual download

Grab the archive for your platform from the [Releases page](https://github.com/arthurpanhku/dvalincode/releases/latest):

| Platform | Archive |
|---|---|
| macOS Apple Silicon (M1/M2/M3) | `dvalincode-v*-macos-arm64.tar.gz` |
| macOS Intel | `dvalincode-v*-macos-x64.tar.gz` |
| Windows x64 | `dvalincode-v*-windows-x64.zip` |
| Linux ARM64 | `dvalincode-v*-linux-arm64.tar.gz` |
| Linux x64 | `dvalincode-v*-linux-x64.tar.gz` |

Verify against `SHA256SUMS.txt` (included in each release).

> **macOS Gatekeeper:** binaries are unsigned. On first run, either clear the quarantine flag with `xattr -dr com.apple.quarantine ~/.dvalincode/bin/dvalincode`, or right-click → Open in Finder once.

---

## 🎬 First-time setup

After install, run `dvalincode` and:

1. The server starts on `http://localhost:3000` and your browser opens automatically.
2. Click **LLM Configuration** in the sidebar (bottom-left).
3. Pick a provider, paste your API key, choose a model, hit **Save**.
4. Optional: save the current config as a named profile (e.g. `fast`, `cheap`, `local-ollama`) to switch quickly later.

That's it — start chatting in the composer at the bottom.

---

## ✨ Features

| Category | Feature | Notes |
|---|---|---|
| **Modes** | Chat / Cowork / Code | Each with a distinct sidebar (Templates / Projects / Routines) and tool-access policy |
| **Composer** | `@` file references | Type `@` for a fuzzy file search; selected files get inlined into the prompt |
| | `/` slash commands | `/clear` `/compact` `/git` `/plan` `/undo` `/help` |
| | Multiline + interrupt | <kbd>Shift</kbd>+<kbd>Enter</kbd> for newline, stop button to abort mid-stream |
| **Tool UI** | Inline diffs | `edit_file` and `write_file` results render as red/green unified diff, default folded |
| | Approval dialog with diff | Cowork mode shows the diff *before* the change is applied |
| | Live tool counter + token + cost | Topbar shows session totals in real time |
| **Agent** | LLM-based context compaction | `/compact` summarises into Goal / Completed / Decisions / Pending |
| | Persistent undo stack | `/undo [N]` reverses the last N tool calls |
| | Git awareness | Branch name in topbar; `git_status` tool; git context auto-injected into prompt |
| | `AGENTS.md` project memory | Per-repo persistent instructions, auto-loaded each turn |
| **Security** | macOS shell sandbox | `sandbox-exec` denies network; allows writes only inside cwd + `/tmp` |
| | `.dvalincodeignore` | gitignore-style exclusion; blocks `read_file` / `list_files` / `search_text` |
| | Per-action approval | Approve/deny each write / delete / shell call in Cowork mode |
| **Providers** | OpenAI-compatible endpoints | DeepSeek · OpenAI · Groq · OpenRouter · Ollama · custom |
| | Multi-profile config | Save and switch between named (provider, model, API key) sets |
| **Sessions** | Auto-save + restore | All sessions persisted to `~/.dvalincode/sessions/` as JSON |
| | LLM summary memory | Cross-session summary keeps the agent oriented after restart |

---

## ⌨️ Slash Commands

| Command | Description |
|---|---|
| `/clear` | Clear the current conversation (client-side, starts a fresh session) |
| `/compact` | LLM-based context compaction — replaces history with a structured summary |
| `/undo [N]` | Reverse the last N tool calls (default 1) |
| `/git` | Run `git_status` and show branch, recent commits, changed files |
| `/plan <task>` | Ask the agent to plan the task step-by-step *without* executing |
| `/help` | Show all available slash commands |

---

## 🛠️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser GUI (React + TypeScript + Tailwind, Vite)      │
│  ChatThread · Composer · DiffViewer · PlanCard · …      │
└──────────────────────────┬──────────────────────────────┘
                  HTTP / WebSocket
┌──────────────────────────▼──────────────────────────────┐
│  Express + ws server (single binary via Bun --compile)  │
│  /api/sessions · /api/config · /api/files · /api/git    │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                    Agent Engine                          │
│  AgentLoop (8-state machine) → AgentRunner              │
│  Streaming · Interrupt · Undo stack · LLM compaction    │
└──────────────────────────┬──────────────────────────────┘
                           │ run()
┌──────────────────────────▼──────────────────────────────┐
│  ToolRegistry — Zod schemas + permission gating         │
│  read_file · list_files · search_text · git_status ·    │
│  write_file · edit_file · delete_file · shell           │
└─────────────────────────────────────────────────────────┘
```

### Agent Loop — 8 States

```
RESTORE → COMPACT → COMMAND → BUILD → RUN → SAVE → RESPOND → DONE
```

1. **RESTORE** — Load session from `~/.dvalincode/sessions/`
2. **COMPACT** — If context near the limit, compress history (LLM summary)
3. **COMMAND** — Handle built-in slash commands
4. **BUILD** — Assemble system prompt (mode prompt + project + git + AGENTS.md)
5. **RUN** — Delegate to `AgentRunner` for the LLM tool-calling loop
6. **SAVE** — Persist session
7. **RESPOND** — Generate cross-session summary memory
8. **DONE**

---

## 🧪 Tests

```sh
npm test
```

**47 tests · 9 files · all green.**

---

## 🏗️ Build from source

Requires [Bun](https://bun.sh) (`curl -fsSL https://bun.sh/install | bash`).

```sh
git clone https://github.com/arthurpanhku/dvalincode
cd dvalincode
npm install
npm run dev:all                 # start backend (3001) + Vite (5173)
```

Build release binaries for every platform:

```sh
bash scripts/build-release.sh   # → release/ with tar.gz / zip + SHA256SUMS.txt
bash scripts/build-release.sh darwin    # macOS only
bash scripts/build-release.sh windows   # Windows only
```

---

## 🌐 Providers

DvalinCode supports any OpenAI-compatible endpoint. Built-in presets:

| Provider | Notes |
|---|---|
| **DeepSeek** | `deepseek-chat`, `deepseek-coder`, `deepseek-reasoner` — cheap and capable |
| **OpenAI** | `gpt-4o`, `gpt-4o-mini`, `o1`, `o3-mini` |
| **Groq** | Llama 3.3 70B, Mixtral — fastest open models |
| **OpenRouter** | 200+ models including Claude, Gemini, Llama |
| **Ollama** | Local models — `qwen2.5-coder`, `llama3.2`, `codellama` (no API key needed) |
| **Custom** | Any OpenAI-compatible base URL |

All configured via the **LLM Configuration** modal in the GUI.

---

## 🤝 Contributing

Contributions welcome. The codebase is intentionally small and surgical — see [CONTRIBUTING.md](CONTRIBUTING.md).

```sh
git clone https://github.com/arthurpanhku/dvalincode
cd dvalincode && npm install
npm test                # 47/47 ✅
npm run typecheck
```

---

## 📄 License

MIT — see [LICENSE](LICENSE).

---

## 🔗 Independence & Attribution

DvalinCode is **not affiliated** with Anthropic, Claude, OpenAI, or any other vendor.

The design process included studying common patterns in modern coding agents (Codex CLI, Claude Code, Hermes Agent, etc.) for architectural learning. The implementation is intentionally original — its own state machine, UI language, tool schemas, and module layout. No source code, prompts, or UI text from other projects is copied.
