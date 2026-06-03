<p align="center">
  <img src="assets/hero.png" alt="DvalinCode" width="100%">
</p>

<h1 align="center">DvalinCode</h1>

<p align="center">
  <a href="https://github.com/arthurpanhku/dvalincode/releases/latest"><img src="https://img.shields.io/github/v/release/arthurpanhku/dvalincode?style=for-the-badge&color=818cf8&label=Release" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License"></a>
  <a href="#-一行安装"><img src="https://img.shields.io/badge/Platforms-macOS%20·%20Windows%20·%20Linux-blue?style=for-the-badge" alt="Platforms"></a>
  <a href="README.md"><img src="https://img.shields.io/badge/Lang-English-blue?style=for-the-badge" alt="English"></a>
</p>

<p align="center">
  <b>本地优先、模型无关的 AI 编码助手 —— 三种工作模式：</b><br>
  <b>Chat 提问、Cowork 协作规划、Code 自主执行。</b>
</p>

<p align="center">
  自带模型 —— DeepSeek、OpenAI、Claude (via OpenRouter)、Groq、Ollama，或任何 OpenAI 兼容端点。一键切换，无需改代码，无供应商绑定。
</p>

---

<table>
<tr><td><b>🗨️ Chat 模式</b></td><td>只读问答，附带一键提示词模板 —— 解释代码库、查找 TODO、审查变更、写测试。Agent 可读文件、可搜索，但绝不写入。</td></tr>
<tr><td><b>👥 Cowork 模式</b></td><td>先规划后执行。Agent 写出编号步骤，你点 <b>Proceed</b>，每次文件写入都需要明确批准——批准前会看到红绿 diff。</td></tr>
<tr><td><b>⚡ Code 模式</b></td><td>自主代理，全工具权限。一键运行测试、类型检查、构建、Lint（侧栏 <b>Routines</b> 面板）。macOS shell 调用在 <code>sandbox-exec</code> 沙箱内执行，网络被禁用。</td></tr>
<tr><td><b>🎯 一流的 GUI</b></td><td>现代化 Web UI，包含代码语法高亮、<code>@</code> 文件引用、<code>/</code> 斜杠命令、Git 分支显示、实时 Token 与费用统计、多 LLM Profile。</td></tr>
<tr><td><b>🪶 零依赖二进制</b></td><td>每平台单文件可执行程序 ~25MB。无需 Node、Python、Docker。启动后自动打开浏览器。</td></tr>
<tr><td><b>🔐 本地优先</b></td><td>Session、配置、Profile 均保存在 <code>~/.dvalincode/</code>。<code>.dvalincodeignore</code> 阻止 Agent 访问敏感文件。仓库根目录的 <code>AGENTS.md</code> 作为项目级持久指令自动加载。</td></tr>
</table>

---

## 📸 预览

**切换模式 —— 每种模式都有不同的侧边栏：**

<p align="center">
  <img src="assets/modes.gif" alt="切换模式" width="100%">
</p>

**输入框中的斜杠命令与文件引用：**

<p align="center">
  <img src="assets/slash.gif" alt="斜杠命令与文件引用" width="100%">
</p>

---

## 🚀 一行安装

### macOS / Linux

```sh
curl -fsSL https://raw.githubusercontent.com/arthurpanhku/dvalincode/main/scripts/install.sh | bash
```

自动检测系统和架构、下载对应二进制、安装到 `~/.dvalincode/`、添加到 `PATH`。重新加载 shell 后：

```sh
source ~/.zshrc    # 或 ~/.bashrc
dvalincode         # 启动服务并自动打开浏览器
```

### Windows

从 [Releases](https://github.com/arthurpanhku/dvalincode/releases/latest) 下载 `dvalincode-v*-windows-x64.zip`，解压后双击 `start.bat`。

### 手动下载

从 [Releases 页面](https://github.com/arthurpanhku/dvalincode/releases/latest) 获取对应平台的压缩包：

| 平台 | 文件 |
|---|---|
| macOS Apple Silicon (M1/M2/M3) | `dvalincode-v*-macos-arm64.tar.gz` |
| macOS Intel | `dvalincode-v*-macos-x64.tar.gz` |
| Windows x64 | `dvalincode-v*-windows-x64.zip` |
| Linux ARM64 | `dvalincode-v*-linux-arm64.tar.gz` |
| Linux x64 | `dvalincode-v*-linux-x64.tar.gz` |

每个 release 都附带 `SHA256SUMS.txt` 用于校验。

> **macOS Gatekeeper：** 二进制未签名。首次运行可执行 `xattr -dr com.apple.quarantine ~/.dvalincode/bin/dvalincode`，或在 Finder 中右键 → 打开一次。

---

## 🎬 首次配置

安装后运行 `dvalincode`：

1. 服务在 `http://localhost:3000` 启动，浏览器自动打开。
2. 点击侧边栏底部的 **LLM Configuration**。
3. 选择 Provider、粘贴 API Key、选择模型、保存。
4. 可选：将当前配置保存为命名 Profile（如 `fast`、`cheap`、`local-ollama`），日后一键切换。

完成 —— 在底部输入框开始对话。

---

## ✨ 功能列表

| 类别 | 功能 | 说明 |
|---|---|---|
| **模式** | Chat / Cowork / Code | 各自独立的侧边栏（Templates / Projects / Routines）与工具权限策略 |
| **输入框** | `@` 文件引用 | 输入 `@` 触发模糊文件搜索，选中文件自动插入到 prompt |
| | `/` 斜杠命令 | `/clear` `/compact` `/git` `/plan` `/undo` `/help` |
| | 多行输入 + 中断 | <kbd>Shift</kbd>+<kbd>Enter</kbd> 换行，Stop 按钮中断生成 |
| **工具 UI** | 行内 diff | `edit_file` 与 `write_file` 结果以红绿统一 diff 呈现，默认折叠 |
| | 审批对话框含 diff | Cowork 模式下，文件变更在执行前显示 diff |
| | 实时 Token + 费用统计 | 顶栏实时显示当前 session 累计数据 |
| **Agent** | LLM 上下文压缩 | `/compact` 将历史压缩为 目标/已完成/决策/待办 结构化摘要 |
| | 持久化 Undo 栈 | `/undo [N]` 撤销最近 N 个工具调用 |
| | Git 感知 | 顶栏显示分支名；`git_status` 工具；Git 上下文自动注入 prompt |
| | `AGENTS.md` 项目记忆 | 每个仓库的持久指令，每轮对话自动加载 |
| **安全** | macOS Shell 沙箱 | `sandbox-exec` 拒绝网络；写入仅限 cwd 与 `/tmp` |
| | `.dvalincodeignore` | 类 gitignore 排除；阻止 `read_file` / `list_files` / `search_text` |
| | 逐操作审批 | Cowork 模式下每次写入/删除/shell 都需用户批准 |
| **Providers** | OpenAI 兼容端点 | DeepSeek · OpenAI · Groq · OpenRouter · Ollama · 自定义 |
| | 多 Profile 配置 | 保存并切换多组 (provider, model, API key) 命名配置 |
| **Session** | 自动保存与恢复 | 所有 session 以 JSON 持久化到 `~/.dvalincode/sessions/` |
| | LLM 摘要记忆 | 跨 session 摘要在重启后保持 Agent 上下文 |

---

## ⌨️ 斜杠命令

| 命令 | 说明 |
|---|---|
| `/clear` | 清空当前对话（客户端，开启新 session） |
| `/compact` | 调用 LLM 生成结构化摘要压缩上下文 |
| `/undo [N]` | 撤销最近 N 个工具调用（默认 1） |
| `/git` | 执行 `git_status`，显示分支、最近提交、变更文件 |
| `/plan <task>` | 让 Agent 逐步规划任务而**不**执行 |
| `/help` | 显示所有可用命令 |

---

## 🛠️ 架构

```
┌─────────────────────────────────────────────────────────┐
│  浏览器 GUI (React + TypeScript + Tailwind, Vite)        │
│  ChatThread · Composer · DiffViewer · PlanCard · …      │
└──────────────────────────┬──────────────────────────────┘
                  HTTP / WebSocket
┌──────────────────────────▼──────────────────────────────┐
│  Express + ws 服务（Bun --compile 单文件二进制）          │
│  /api/sessions · /api/config · /api/files · /api/git    │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                  Agent 引擎                              │
│  AgentLoop（8 状态机） → AgentRunner                     │
│  流式输出 · 中断 · Undo 栈 · LLM 压缩                    │
└──────────────────────────┬──────────────────────────────┘
                           │ run()
┌──────────────────────────▼──────────────────────────────┐
│  ToolRegistry — Zod schema + 权限控制                    │
│  read_file · list_files · search_text · git_status ·    │
│  write_file · edit_file · delete_file · shell           │
└─────────────────────────────────────────────────────────┘
```

### Agent Loop — 8 状态

```
RESTORE → COMPACT → COMMAND → BUILD → RUN → SAVE → RESPOND → DONE
```

---

## 🧪 测试

```sh
npm test
```

**47 个测试 · 9 个文件 · 全部通过。**

---

## 🏗️ 源码构建

需要 [Bun](https://bun.sh)（`curl -fsSL https://bun.sh/install | bash`）。

```sh
git clone https://github.com/arthurpanhku/dvalincode
cd dvalincode
npm install
npm run dev:all                 # 后端 (3001) + Vite (5173)
```

构建所有平台 release 二进制：

```sh
bash scripts/build-release.sh   # → release/ 包含 tar.gz / zip + SHA256SUMS.txt
bash scripts/build-release.sh darwin    # 仅 macOS
bash scripts/build-release.sh windows   # 仅 Windows
```

---

## 🌐 Providers

DvalinCode 支持任意 OpenAI 兼容端点。内置预设：

| Provider | 说明 |
|---|---|
| **DeepSeek** | `deepseek-chat`、`deepseek-coder`、`deepseek-reasoner` —— 便宜且强大 |
| **OpenAI** | `gpt-4o`、`gpt-4o-mini`、`o1`、`o3-mini` |
| **Groq** | Llama 3.3 70B、Mixtral —— 最快的开源模型 |
| **OpenRouter** | 200+ 模型，包括 Claude、Gemini、Llama |
| **Ollama** | 本地模型 —— `qwen2.5-coder`、`llama3.2`、`codellama`（无需 API Key）|
| **Custom** | 任意 OpenAI 兼容的 base URL |

全部在 GUI 的 **LLM Configuration** 弹窗里配置。

---

## 🤝 贡献

欢迎贡献！代码库保持紧凑、不堆叠 —— 详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

```sh
git clone https://github.com/arthurpanhku/dvalincode
cd dvalincode && npm install
npm test                # 47/47 ✅
npm run typecheck
```

---

## 📄 License

MIT —— 详见 [LICENSE](LICENSE)。

---

## 🔗 独立声明

DvalinCode 与 Anthropic、Claude、OpenAI 或任何其他供应商**无任何关联**。

设计过程参考了现代编码 Agent（Codex CLI、Claude Code、Hermes Agent 等）的常见模式以学习架构，但实现完全原创 —— 拥有自己的状态机、UI 语言、工具 schema、模块布局。未抄袭任何其他项目的源代码、prompt 或 UI 文本。
