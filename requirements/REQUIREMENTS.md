# DvalinCode Requirements

> Auto-generated from community intelligence pipeline.
> Last updated: 2026-05-21

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
- **What to build**: `dvalincode chat` should support `/undo` — revert the last tool action. Keep a stack of tool results with reverse operations.
- **DvalinCode advantage**: Since we have typed tools with known schemas, we can compute reverse operations:

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
- **What to build**: `dvalincode sessions list`, `dvalincode sessions delete`, `dvalincode chat --resume` with interactive session picker. Show last N sessions on `dvalincode chat` startup.
- **Already partially done**: Sessions store exists (save/load/list/delete). Need CLI commands + better UX.

#### 5. Approval Gates / Guardrails (Score: 4.8 / 3.8)
- **Signal**: Vibe coding quality issues (↑7046), destructive changes without review (cross-source).
- **What to build**: Pre-commit review mode: agent makes changes in a draft branch, user approves per-file before apply. Also: `.dvalincodeignore` file for excluding sensitive paths.
- **Already partially done**: Permission system exists (read/write/execute). Need ignore-file and review mode.

#### 6. LSP Integration / Code Intelligence (Score: 4.5)
- **Signal**: Codex CLI #8745 (↑768).
- **What to build**: Auto-detect project LSP, pipe diagnostics to agent for context-aware code analysis.
- **Note**: High complexity. Could start with a `diagnose` tool that runs `tsc --noEmit` or similar.

#### 7. Sensitive File Exclusion (Score: 3.8)
- **Signal**: "A way to exclude sensitive files" (↑766).
- **What to build**: `.dvalincodeignore` file (like `.gitignore`) that the tool system respects globally. Agent cannot read/write ignored files.

#### 8. Large Context Support (Score: 3.3)
- **Signal**: 1M token context request (↑482).
- **What to build**: When sending to providers that support large context, pass max context size. ProviderAdapters should advertise `maxContextTokens`.

---

### P3 — Future Fuel

| Score | Requirement | Note |
|-------|-------------|------|
| 2.9 | Rate limit awareness | Informational (provider-side, not DvalinCode's problem to solve) |
| 2.2 | .gitignore-aware search | Already partially implemented (read tool skips node_modules) |
| 2.2 | Model comparison/benchmarks | Informational, out of scope for a coding agent |
| 2.2 | Local model (Ollama) support | ProviderAdapter already supports this — docs gap only |
| 2.2 | Context management UX | Session management (P2 above) covers most of this |
| 1.2 | Command discoverability | `dvalincode --help` already works, could be richer |
| 1.1 | Shell ENV management | Edge case, low demand |
| 0.2 | Desktop app | Irrelevant for CLI tool |

---
---
|
|### P2 — Nice to Have (New, 2026-05-21)
|
|#### 9. LSP Integration (Score: 6.7) ⬆️ Updated from 4.5
|- **Signal**: Codex CLI #8745 (↑774 — up from ↑768 last week). Growing demand for auto-detect + auto-install LSP.
|- **What to build**: Auto-detect project LSP, pipe diagnostics to agent for context-aware code analysis.
|- **Note**: Already listed as P2 #6 (Score: 4.5). Updated score reflects increased community demand.
|
|#### 10. Claude Code Exodus / Google-Play-Safe Positioning (Score: 6.7)
|- **Signal**: Claude Code removed from Pro plan (↑1704). Growing dissatisfaction — "I've had it with Claude" (↑987), "Something doesn't add up" (↑384).
|- **What to build**: Capitalize on Claude dissatisfaction. Emphasize DvalinCode's provider-neutrality, no-rate-limit model. Not a feature per se — a messaging/positioning opportunity.
|- **Why now**: Anthropic just made Claude Code Pro-only. Competitors are bleeding users. This is a strategic window.
|
|#### 11. Sensitive File Exclusion — Score Upgrade (Was P2 #7, score 3.8 → new score: 5.0)
|- **Signal**: Codex CLI #2847 (↑770 — up from ↑766 last week). Consistent demand.
|- **What to build**: `.dvalincodeignore` file (like `.gitignore`) that the tool system respects globally.
|- **Recommendation**: Merge with P2 #5 (Approval Gates) since both are about execution safety and share similar mechanisms.
|
|#### 12. Vibe Coding Guardrails Amplification (Score: 5.5)
|- **Signal**: "Inherited a vibe-coded repo" hit ↑7061. This is the #1 post on r/ClaudeCode this cycle. Vibe coding quality issues (↑7046) remain the top complaint.
|- **What to build**: Strengthen existing Approval Gates / Guardrails initiative (P2 #5). Add a `dvalincode review` command that analyzes generated code quality before committing. Post-vibe-code audit tooling.
|- **DvalinCode angle**: Position as "the agent that writes maintainable code" vs. the Wild West of vibe coding.
|
|#### 13. Provider-Neutral — Qwen/Ollama Integration Docs (Score: 5.5)
|- **Signal**: Hugging Face co-founder says Qwen 3.6 27B ≈ Opus in Claude Code (↑2069). "This new model is insane" (↑2005). Local model movement is accelerating.
|- **What to build**: Write the Ollama/local model integration guide. Add a `--provider` flag override. This is already mostly done — just a docs/CLI gap.
|- **Already done**: ProviderAdapter, ProviderManager, OpenAI-compatible adapter.
|
|### New Items (P3)
|
|#### My opinion on Opus 4.7 after heavy use since release (Score: 2.0)
|- **Source**: https://reddit.com/r/ClaudeCode/comments/1svzil1/my_opinion_
|- **Pain**: 2/5, **Align**: 3/5, **Cost**: 3/5, **Risk**: 3/5, **Gap**: 3/5
|- **Note**: Personal opinion, no actionable signal.
|
|#### Login shells override inherited PATH (Score: 1.5)
|- **Source**: https://github.com/openai/codex/issues/8922
|- **Pain**: 2/5, **Align**: 1/5, **Cost**: 2/5, **Risk**: 4/5, **Gap**: 2/5
|- **Note**: Codex-specific config issue. DvalinCode uses Hermes runtime with explicit tool env. Not relevant.
|
|#### WebSocket upgrade policy error (Score: 1.2)
|- **Source**: https://github.com/openai/codex/issues/13041
|- **Pain**: 1/5, **Align**: 1/5, **Cost**: 2/5, **Risk**: 4/5, **Gap**: 2/5
|- **Note**: Codex infrastructure bug. Not applicable to DvalinCode.
|
|#### High GPU usage from animation (Score: 0.5)
|- **Source**: https://github.com/openai/codex/issues/16857
|- **Pain**: 1/5, **Align**: 1/5, **Cost**: 3/5, **Risk**: 4/5, **Gap**: 1/5
|- **Note**: Codex terminal UI issue. DvalinCode is CLI-first, irrelevant.
|
|#### Codex desktop app for Linux (Score: 0.2)
|- **Source**: https://github.com/openai/codex/issues/11023
|- **Pain**: 2/5, **Align**: 1/5, **Cost**: 2/5, **Risk**: 4/5, **Gap**: 1/5
|- **Note**: Desktop app is philosophically incompatible with DvalinCode's CLI-first, lightweight approach.
|
|#### I let my interns vibe code from day one but with rules (Score: 2.5)
|- **Source**: https://reddit.com/r/ClaudeCode/comments/1sryeqw
|- **Pain**: 2/5, **Align**: 4/5, **Cost**: 3/5, **Risk**: 4/5, **Gap**: 3/5
|- **Note**: Interesting case study about structured vibe coding. Could inform guardrails feature. Informational.


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

|| 2026-05-21 | Reddit r/ClaudeCode | LSP integration demand update (↑774, up from ↑768) | P2 |
|| 2026-05-21 | Reddit r/ClaudeCode | Claude Code removed from Pro plan (↑1704) — positioning opportunity | P2 |
|| 2026-05-21 | GitHub CodexCLI #2847 | Sensitive file exclusion update (↑770, up from ↑766) | P2 |
|| 2026-05-21 | Reddit r/ClaudeCode | Vibe coding aftermath horror post (↑7061) — guardrails signal | P2 |
|| 2026-05-21 | Reddit r/ClaudeCode | Qwen 3.6 ≈ Opus quality (↑2069) — local model docs priority | P2 |
|| 2026-05-21 | Reddit r/ClaudeCode | "This new model is insane" (↑2005) — local model trend | P3 |
|| 2026-05-21 | Reddit r/ClaudeCode | "I've had it with Claude" (↑987) — vendor lock-in anxiety | P3 |
|| 2026-05-21 | Reddit r/ClaudeCode | Sr Engineer wrote zero code for months (↑1588) | P3 |
|| 2026-05-21 | Reddit r/ClaudeCode | "Something doesn't add up" (↑384) — Claude trust erosion | P3 |
|| 2026-05-21 | Reddit r/ClaudeCode | Anthropic postmortem: Claude quality regression (↑3340) | P3 |
|| 2026-05-21 | Reddit r/ClaudeCode | Structured vibe coding case study (↑167) | P3 |
|| 2026-05-21 | Reddit r/ClaudeCode | Opus 4.7 opinion (↑116) — no actionable signal | P3 |
|| 2026-05-21 | GitHub CodexCLI #8922 | Login shell PATH override (↑230) — not DvalinCode-relevant | P3 |
|| 2026-05-21 | GitHub CodexCLI #13041 | WebSocket policy error (↑282) — Codex infra bug | P3 |
|| 2026-05-21 | GitHub CodexCLI #16857 | GPU animation usage (↑182) — not DvalinCode-relevant | P3 |
|| 2026-05-21 | GitHub CodexCLI #11023 | Desktop app for Linux (↑674) — incompatible philosophy | P3 |

## Shipped

| Date | Feature | Requirement |
|------|---------|-------------|
| 2026-05-20 | ProviderAdapter + OpenAI-compatible provider | Provider neutrality (P2-3) |
| 2026-05-20 | Session persistence + summary memory | Session management (P2-4) |
| 2026-05-20 | Permission system (read/write/execute) | Execution safety (P2-5) |
