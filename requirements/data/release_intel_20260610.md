# Release Intelligence Report
## Sources: GitHub Releases / Changelogs — opencode · Claude Code · OpenAI Codex

Collected: 2026-06-10
Window since last analysis (2026-05-22, Codex v0.133):
- **opencode** v1.16.0 (06-05) · v1.16.2 (06-05) · v1.17.0 (06-10)
- **Claude Code** 2.1.157 → 2.1.170
- **OpenAI Codex** rust-v0.134.0 (05-26) → rust-v0.139.0 (06-09)

---

## opencode (v1.16.0 – v1.17.0)

- **Background subagents** — running subagents can be sent to the background so you keep working (v1.16.2)
- **Workspace/session mobility** — managed workspace cloning that keeps dirty + untracked files; move sessions between workspaces and directories; project copies managed from the TUI (v1.16.0–v1.17.0)
- **Skill discovery + file-based agent loading** (v1.16.0)
- `run --replay` interactive session replay; restored full ACP session replay (v1.16.0)
- **Edit safety** — edit operations now *refuse loose matches* that could overwrite the wrong code or replace an existing file by mistake (v1.16.2)
- Diff viewer hunk navigation (v1.16.2)
- **Context-overflow recovery** — sessions recover once from provider context-overflow errors instead of failing (v1.17.0)
- **MCP hardening** — tool calls receive abort signals; catalogs paginate correctly; servers' advertised capabilities respected; clearer connection-status messages; `mcp add` works non-interactively (v1.17.0)
- Faster file search across large projects (fff-backed) (v1.17.0)
- Desktop: WSL-backed support, multi-server, color themes (v1.16.x–v1.17.0)

## Claude Code (2.1.157 – 2.1.170)

- **Background agents (`claude agents`) — the dominant theme, touched in every release**: dispatch/attach/reply flows, retire→wake state preservation (flags, conversation, running background tasks), `--json` output with `id`/`state`/`waitingFor`, worktree isolation for spawned agents, queued replies on delivery failure, daemon/teardown hardening (SIGTERM before SIGKILL)
- **Skills/plugins ecosystem** — plugins in `.claude/skills` auto-load with no marketplace required; `claude plugin init` scaffolding; `/plugin list`; bundled-skills disable controls (2.1.157, 2.1.163, 2.1.169)
- **Write-path safety** — prompt before writing shell startup files (`.zshenv`, `.zlogin`, `.bash_login`) and `~/.config/git/`; `acceptEdits` prompts before build-tool configs that grant code execution (`.npmrc`, `.yarnrc*`, `bunfig.toml`, `.bazelrc`, `.pre-commit-config.yaml`, `.devcontainer/`) (2.1.160)
- **Permission hardening** — glob patterns in deny rules; `$HOME`-aliased deny paths enforced in Bash; Read deny rules hide files from search; MCP secrets redacted in `mcp list/get`; cross-session messages stripped of user authority (2.1.161–2.1.166)
- **Resilience** — `fallbackModel` setting (up to three, tried in order); automatic one-shot retry on fallback model; restored idle timeouts on stalled streams (2.1.166, 2.1.169)
- Session ergonomics: `/cd` moves a session's working directory without breaking prompt cache; `--safe-mode` starts with all customizations disabled; Stop/SubagentStop hooks can return `additionalContext`; parallel tool calls fail independently (2.1.161–2.1.169)
- LSP tool `workspaceSymbol` fixed (2.1.162)

## OpenAI Codex (rust-v0.134.0 – v0.139.0)

- **Session lifecycle** — search across local conversation history with previews (v0.134); `/archive` + `codex archive`/`unarchive` with resume/fork protection (v0.136); `resume`/`fork --last` accept initial prompts (v0.139); forked threads keep renamed titles (v0.138)
- **Multi-agent v2** — runtime choice kept per thread; cleaner spawn metadata and follow-up defaults; subagent identity in hook inputs; subagent MCP warnings stay in the owning thread (v0.134–v0.139)
- **MCP/connectors** — per-server env targeting + OAuth for streamable HTTP (v0.134); read-only MCP tools run concurrently when they advertise `readOnlyHint` (v0.134); `oneOf`/`allOf` + `$ref`/`$defs` schema preservation with smarter compaction (v0.134, v0.139)
- **Safety/sandbox** — `/diff` no longer executes repository-provided git helpers/hooks; PowerShell parser not invoked on non-Windows; deny read rules enforced on safe-command and approval-bypass paths (v0.136); sandbox preserves approved escalation decisions and enforces proxy-only networking (v0.139); named permission profiles via `/permissions` + `--profile` as primary selector (v0.134–v0.135)
- Plugins: `--json` across marketplace/add/remove commands, cached remote catalogs (v0.137–v0.139)
- `/goal` workflow refinements; code mode can call standalone web search, including from nested JS tool calls (v0.138–v0.139)

---

## Cross-cutting themes (by signal strength)

| # | Theme | opencode | Claude Code | Codex | DvalinCode today |
|---|-------|----------|-------------|-------|------------------|
| 1 | **Subagents & background tasks** | background subagents | `claude agents` (massive, sustained) | multi-agent v2 | ❌ none |
| 2 | **MCP as core infrastructure** | abort/pagination/capabilities | policy + secrets hardening | readOnlyHint concurrency, OAuth, schema fidelity | ❌ none |
| 3 | **Write/exec safety hardening** | refuse loose edit matches | guarded config writes | sandbox escalation, command safety | ⚠️ partial (approval modes ✅, macOS sandbox ✅; loose `edit_file`, no Linux sandbox, no guarded paths) |
| 4 | Session lifecycle v2 (search/archive/replay/recovery) | move/replay/overflow-recovery | retire→wake, `/cd` | history search, archive | ⚠️ partial (store + UI restore ✅) |
| 5 | Plugins/skills ecosystems | skill discovery | `.claude/skills` auto-load | marketplace JSON | ❌ none |

## DvalinCode reality check (code-verified 2026-06-10)

Already shipped (FEATURE_GAP.md of 2026-05-22 is **stale**): streaming (`openaiCompatible.ts` SSE), interrupt/cancel (`wsHandler.ts` AbortController), three-mode approval flow + `ApprovalDialog`/`ApprovalModeSwitch` UI, session restore in web UI (`useChat.loadSession`), AGENTS.md project memory, token usage surfacing, undo stack, `git_status` tool, ignore-file, macOS `sandbox-exec` shell wrapping.

Confirmed gaps matching themes 1–3: no subagent/task capability; no MCP; `edit_file` silently replaces the first occurrence when `oldString` is ambiguous (`src/tools/editFile.ts`); `write_file` overwrites without a flag; no Linux sandbox (`src/tools/shell.ts` darwin-only); no guarded sensitive-path approvals.

→ Three requirements derived from this report: see `REQUIREMENTS.md` items 14–16 and `plans/02–04`.
