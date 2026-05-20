# ForgeCode Requirements

> Auto-generated from community intelligence pipeline.
> Last updated: 2026-05-20

## Priority Framework (First Principles)

Every feature is scored on 5 dimensions (1-5):

| Dimension | Description |
|-----------|-------------|
| **Pain** | How many users complain? How loud? |
| **Alignment** | Does this fit our design philosophy (local-first, zero deps, provider-neutral)? |
| **Cost** | Implementation complexity (5=trivial, 1=hard) |
| **Risk** | Could it break existing functionality? (5=safe, 1=high risk) |
| **Gap** | How far behind are we vs Codex/Claude Code? (5=way behind, 1=on par) |

**Score = (Pain × Alignment × Gap) / (Cost × Risk)**

| Score Threshold | Priority |
|----------------|----------|
| ≥ 18 | P0 — Must Have (roadblockers) |
| ≥ 8 | P1 — Should Have (high impact) |
| ≥ 3 | P2 — Nice to Have (useful) |
| < 3 | P3 — Future Fuel (deferrable) |

---

## Current Backlog

### P1 — Should Have

#### 1. Undo/Rollback Command (Score: 13.3)
- **Signal**: Codex CLI users: "/undo" needs to come back (↑510). Claude Code users: destructive changes without review.
- **What to build**: `forgecode chat` should support `/undo` — revert the last tool action. Keep a stack of tool results with reverse operations.
- **ForgeCode advantage**: Since we have typed tools with known schemas, we can compute reverse operations:

```
/edit_file "src/main.ts" old:"a()" new:"b()"  →  /undo  →  edit back old:"b()" new:"a()"
/write_file "config.ts" content:"..."         →  /undo  →  restore previous version or delete
/shell "rm -rf dist"                           →  /undo  →  warn: irreversible
```
- **Implementation**: `AgentLoop` gains an `UNDO` state. Track per-turn tool calls in a stack. Each tool declares `isUndoable()` and `reverse(input, result)`.
- **Files to modify**: `src/agent/types.ts` (TurnState.UNDO), `src/agent/loop.ts` (undo handler), `src/tools/types.ts` (reverse interface), `src/tools/writeFile.ts`, `src/tools/editFile.ts` (reverse implementations)

---

### P2 — Nice to Have

#### 2. Token Efficiency / Cost Awareness (Score: 6.4)
- **Signal**: "Burning tokens very fast" (↑558). Agent context bloat.
- **What to build**: Show token cost per turn. Implement smart context compaction. Add `--cost` flag that shows running total.
- **Already partially done**: The AgentLoop has a `COMPACT` state and `summarizeSession()`. Need to surface costs and make compaction smarter.

#### 3. Provider-Neutral + Local Model Support (Score: 6.0)
- **Signal**: Cross-source. Claude regression (↑3337/992), rate limits (↑2513), Qwen approaching Opus (↑2075).
- **What to build**: Already built (`ProviderAdapter`)! Just need to document how to add custom providers and add an Ollama/local model guide. Also add a `--provider` flag override.
- **Already done**: ProviderManager, env vars, OpenAI-compatible adapter. Quick win: write a provider docs guide.

#### 4. Session Lifecycle Management (Score: 6.0)
- **Signal**: Context management tools confusion (↑175), losing work, session fragmentation.
- **What to build**: `forgecode sessions list`, `forgecode sessions delete`, `forgecode chat --resume` with interactive session picker. Show last N sessions on `forgecode chat` startup.
- **Already partially done**: Sessions store exists (save/load/list/delete). Need CLI commands + better UX.

#### 5. Approval Gates / Guardrails (Score: 4.8 / 3.8)
- **Signal**: Vibe coding quality issues (↑7046), destructive changes without review (cross-source).
- **What to build**: Pre-commit review mode: agent makes changes in a draft branch, user approves per-file before apply. Also: `.forgecodeignore` file for excluding sensitive paths.
- **Already partially done**: Permission system exists (read/write/execute). Need ignore-file and review mode.

#### 6. LSP Integration / Code Intelligence (Score: 4.5)
- **Signal**: Codex CLI #8745 (↑768).
- **What to build**: Auto-detect project LSP, pipe diagnostics to agent for context-aware code analysis.
- **Note**: High complexity. Could start with a `diagnose` tool that runs `tsc --noEmit` or similar.

#### 7. Sensitive File Exclusion (Score: 3.8)
- **Signal**: "A way to exclude sensitive files" (↑766).
- **What to build**: `.forgecodeignore` file (like `.gitignore`) that the tool system respects globally. Agent cannot read/write ignored files.

#### 8. Large Context Support (Score: 3.3)
- **Signal**: 1M token context request (↑482).
- **What to build**: When sending to providers that support large context, pass max context size. ProviderAdapters should advertise `maxContextTokens`.

---

### P3 — Future Fuel

| Score | Requirement | Note |
|-------|-------------|------|
| 2.9 | Rate limit awareness | Informational (provider-side, not ForgeCode's problem to solve) |
| 2.2 | .gitignore-aware search | Already partially implemented (read tool skips node_modules) |
| 2.2 | Model comparison/benchmarks | Informational, out of scope for a coding agent |
| 2.2 | Local model (Ollama) support | ProviderAdapter already supports this — docs gap only |
| 2.2 | Context management UX | Session management (P2 above) covers most of this |
| 1.2 | Command discoverability | `forgecode --help` already works, could be richer |
| 1.1 | Shell ENV management | Edge case, low demand |
| 0.2 | Desktop app | Irrelevant for CLI tool |

---

## Source Log

| Date | Source | Key Signal | Priority |
|------|--------|------------|----------|
| 2026-05-20 | GitHub CodexCLI #9203 | /undo restore request (↑510) | P1 |
| 2026-05-20 | GitHub CodexCLI #8745 | LSP integration (↑768) | P2 |
| 2026-05-20 | GitHub CodexCLI #2847 | Sensitive file exclusion (↑766) | P2 |
| 2026-05-20 | GitHub CodexCLI #14593 | Token burn rate (↑558) | P2 |
| 2026-05-20 | GitHub CodexCLI #2952 | .gitignore-aware search (↑180) | P3 |
| 2026-05-20 | Reddit r/ClaudeCode | Claude quality regression (↑3337) | P3 |
| 2026-05-20 | Reddit r/ClaudeCode | Rate limit complaints (↑2513) | P3 |
| 2026-05-20 | Reddit r/ClaudeCode | Vibe coding quality issues (↑7046) | P2 |
| 2026-05-20 | Reddit r/ClaudeCode | Context tool confusion (↑175) | P2 |
| 2026-05-20 | Reddit r/ClaudeCode | Provider lock-in / vendor independence | P2 |
| 2026-05-20 | HN Search | Agent coding tool discussions | P2 |

## Shipped

| Date | Feature | Requirement |
|------|---------|-------------|
| 2026-05-20 | ProviderAdapter + OpenAI-compatible provider | Provider neutrality (P2-3) |
| 2026-05-20 | Session persistence + summary memory | Session management (P2-4) |
| 2026-05-20 | Permission system (read/write/execute) | Execution safety (P2-5) |
